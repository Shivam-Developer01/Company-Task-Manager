const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const mongoose = require(path.join(__dirname, "../Backend/node_modules/mongoose"));

const envPath = path.join(__dirname, "../Backend/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const User = require("../Backend/models/User");
const Project = require("../Backend/models/Project");
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { extractMetricPairs } = require("../Backend/services/ai/aiReportExportHelper");
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");
const { generateReportDocxBuffer } = require("../Backend/services/ai/docxReportGenerator");
const { ROLES } = require("../Backend/constants/constants");

async function runAllEmployeesVerification() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Starting V4 ALL EMPLOYEES ENHANCEMENT Verification...\n");

  const adminUser = await User.findOne({ role: ROLES.ADMIN }).lean();
  const managerUser = await User.findOne({ role: ROLES.MANAGER, isActive: true }).lean();
  const employeeUser = await User.findOne({ role: ROLES.EMPLOYEE }).lean();
  const projectDoc = await Project.findOne({ isArchived: { $ne: true } }).lean();

  const adminViewer = { userId: adminUser._id.toString(), role: ROLES.ADMIN };

  // TEST 1: Admin + All Employees Scope (EMPLOYEE_PERFORMANCE)
  console.log("--- TEST 1: Admin + All Employees Scope (EMPLOYEE_PERFORMANCE) ---");
  const allEmpReport = await generateAiReport({
    viewer: adminViewer,
    reportType: "EMPLOYEE_PERFORMANCE",
    targetSubjectId: "all_employees",
  });

  console.log(`✓ Report Type: ${allEmpReport.report.reportType} (Must remain EMPLOYEE_PERFORMANCE)`);
  console.log(`✓ Subject Name: ${allEmpReport.report.subject.name}`);
  console.log(`✓ Subject Type: ${allEmpReport.report.subject.type}`);
  const allEmpMetrics = extractMetricPairs(allEmpReport.report.sourceMetrics, "EMPLOYEE_PERFORMANCE");
  console.log(`✓ Authoritative Source Metrics Count: ${allEmpMetrics.length}`);
  allEmpMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const pdfBuf1 = await generateReportPdfBuffer(allEmpReport);
  const docxBuf1 = await generateReportDocxBuffer(allEmpReport);
  console.log(`✓ All Employees Exports: PDF (${pdfBuf1.length} bytes), DOCX (${docxBuf1.length} bytes)`);

  // TEST 2: Admin + Specific Employee Scope (EMPLOYEE_PERFORMANCE)
  if (employeeUser) {
    console.log(`\n--- TEST 2: Admin + Specific Employee Scope (${employeeUser.name}) ---`);
    const singleEmpReport = await generateAiReport({
      viewer: adminViewer,
      reportType: "EMPLOYEE_PERFORMANCE",
      targetSubjectId: employeeUser._id.toString(),
    });

    console.log(`✓ Report Type: ${singleEmpReport.report.reportType}`);
    console.log(`✓ Subject Name: ${singleEmpReport.report.subject.name}`);
    console.log(`✓ Subject Type: ${singleEmpReport.report.subject.type}`);
    const singleEmpMetrics = extractMetricPairs(singleEmpReport.report.sourceMetrics, "EMPLOYEE_PERFORMANCE");
    console.log(`✓ Authoritative Source Metrics Count: ${singleEmpMetrics.length}`);
    singleEmpMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

    const pdfBuf2 = await generateReportPdfBuffer(singleEmpReport);
    const docxBuf2 = await generateReportDocxBuffer(singleEmpReport);
    console.log(`✓ Single Employee Exports: PDF (${pdfBuf2.length} bytes), DOCX (${docxBuf2.length} bytes)`);
  }

  // TEST 3: Manager + All Accessible Employees Scope
  if (managerUser) {
    console.log(`\n--- TEST 3: Manager + All Accessible Employees Scope (${managerUser.name}) ---`);
    const mgrViewer = { userId: managerUser._id.toString(), role: ROLES.MANAGER, name: managerUser.name };
    const mgrAllEmpReport = await generateAiReport({
      viewer: mgrViewer,
      reportType: "EMPLOYEE_PERFORMANCE",
      targetSubjectId: "all_employees",
    });

    console.log(`✓ Manager All Employees Report Generated for: ${mgrAllEmpReport.report.subject.name}`);
    console.log(`✓ Total Employees in Manager Scope: ${mgrAllEmpReport.report.sourceMetrics.totalEmployees}`);
  }

  // TEST 4: Employee Access Block for "all_employees"
  if (employeeUser) {
    console.log("\n--- TEST 4: Employee Access Block for 'all_employees' ---");
    const empViewer = { userId: employeeUser._id.toString(), role: ROLES.EMPLOYEE };
    try {
      await generateAiReport({
        viewer: empViewer,
        reportType: "EMPLOYEE_PERFORMANCE",
        targetSubjectId: "all_employees",
      });
      console.error("❌ FAIL: Employee was able to access all_employees scope!");
    } catch (err) {
      console.log(`✓ SUCCESS: Employee all_employees access blocked with: "${err.message}"`);
    }

    // Employee self-view should continue working 100%
    const selfEmpReport = await generateAiReport({
      viewer: empViewer,
      reportType: "EMPLOYEE_PERFORMANCE",
      targetSubjectId: employeeUser._id.toString(),
    });
    console.log(`✓ Employee Self-View PASS for: ${selfEmpReport.report.subject.name}`);
  }

  // TEST 5: Full Regression Check on All Reports
  console.log("\n--- TEST 5: Full Regression Check on All Reports ---");
  const reportsToTest = [
    { type: "EMPLOYEE_PERFORMANCE", target: "all_employees" },
    { type: "EMPLOYEE_PERFORMANCE", target: employeeUser ? employeeUser._id.toString() : null },
    { type: "MANAGER_TEAM_PERFORMANCE", target: null },
    { type: "MANAGER_PERFORMANCE", target: null },
    { type: "ADMIN_COMPANY_PERFORMANCE", target: null },
    { type: "PROJECT_PERFORMANCE", project: projectDoc ? projectDoc._id.toString() : null },
  ];

  for (const r of reportsToTest) {
    const res = await generateAiReport({
      viewer: adminViewer,
      reportType: r.type,
      targetSubjectId: r.target,
      projectId: r.project,
    });
    console.log(`✓ Regression PASS: ${r.type} (target: ${r.target || "default"}) generated successfully.`);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB. All Employees Enhancement Verification Complete!");
}

runAllEmployeesVerification();
