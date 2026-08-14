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

async function verifyAuthoritativeMetrics() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Starting V4 Authoritative Metrics Verification...\n");

  const adminUser = await User.findOne({ role: ROLES.ADMIN }).lean();
  const managerUser = await User.findOne({ role: ROLES.MANAGER, isActive: true }).lean();
  const employeeUser = await User.findOne({ role: ROLES.EMPLOYEE }).lean();
  const projectDoc = await Project.findOne({ isArchived: { $ne: true } }).lean();

  const adminViewer = { userId: adminUser._id.toString(), role: ROLES.ADMIN };

  // -------------------------------------------------------------------------
  // 1. EMPLOYEE_PERFORMANCE Verification
  // -------------------------------------------------------------------------
  console.log("--- 1. EMPLOYEE_PERFORMANCE Verification ---");
  const empReportRes = await generateAiReport({
    viewer: adminViewer,
    reportType: "EMPLOYEE_PERFORMANCE",
    targetSubjectId: employeeUser._id.toString(),
  });
  const empMetrics = extractMetricPairs(empReportRes.report.sourceMetrics, "EMPLOYEE_PERFORMANCE");
  console.log(`✓ Count: ${empMetrics.length} metrics extracted (Expected: 9)`);
  empMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const empExpectedLabels = [
    "Total Tasks",
    "Active Tasks",
    "Completed Tasks",
    "Pending Tasks",
    "Overdue Tasks",
    "Completion Rate",
    "On-Time Completion",
    "Avg. Completion Time",
    "Submission Rejection Rate",
  ];
  const empMatch = empMetrics.length === 9 && empMetrics.every((m, i) => m.label === empExpectedLabels[i]);
  console.log(`✓ Employee Metrics Specification Match: ${empMatch ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------------------
  // 2. MANAGER_TEAM_PERFORMANCE Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 2. MANAGER_TEAM_PERFORMANCE Verification ---");
  const mgrReportRes = await generateAiReport({
    viewer: adminViewer,
    reportType: "MANAGER_TEAM_PERFORMANCE",
    targetSubjectId: managerUser ? managerUser._id.toString() : null,
  });
  const mgrMetrics = extractMetricPairs(mgrReportRes.report.sourceMetrics, "MANAGER_TEAM_PERFORMANCE");
  console.log(`✓ Count: ${mgrMetrics.length} metrics extracted (Expected: 8)`);
  mgrMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const mgrExpectedLabels = [
    "Team Size",
    "Active Tasks",
    "Overdue Tasks",
    "Pending Reviews",
    "Team Completion Rate",
    "Avg. Team Delay",
    "Delayed Tasks",
    "Avg. Review Time",
  ];
  const mgrMatch = mgrMetrics.length === 8 && mgrMetrics.every((m, i) => m.label === mgrExpectedLabels[i]);
  console.log(`✓ Manager Metrics Specification Match: ${mgrMatch ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------------------
  // 3. ADMIN_COMPANY_PERFORMANCE Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 3. ADMIN_COMPANY_PERFORMANCE Verification ---");
  const adminReportRes = await generateAiReport({
    viewer: adminViewer,
    reportType: "ADMIN_COMPANY_PERFORMANCE",
  });
  const adminMetrics = extractMetricPairs(adminReportRes.report.sourceMetrics, "ADMIN_COMPANY_PERFORMANCE");
  console.log(`✓ Count: ${adminMetrics.length} metrics extracted (Expected: 10)`);
  adminMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const adminExpectedLabels = [
    "Total Employees",
    "Total Managers",
    "Total Projects",
    "Total Tasks",
    "Active Tasks",
    "Completed Tasks",
    "Task Completion Rate",
    "Overdue Tasks",
    "Pending Reviews",
    "High-Priority Overdue",
  ];
  const adminMatch = adminMetrics.length === 10 && adminMetrics.every((m, i) => m.label === adminExpectedLabels[i]);
  console.log(`✓ Admin Metrics Specification Match: ${adminMatch ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------------------
  // 4. PROJECT_PERFORMANCE Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 4. PROJECT_PERFORMANCE Verification ---");
  const projReportRes = await generateAiReport({
    viewer: adminViewer,
    reportType: "PROJECT_PERFORMANCE",
    projectId: projectDoc ? projectDoc._id.toString() : null,
  });
  const projMetrics = extractMetricPairs(projReportRes.report.sourceMetrics, "PROJECT_PERFORMANCE");
  console.log(`✓ Count: ${projMetrics.length} metrics extracted (Expected: 7)`);
  projMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const projExpectedLabels = [
    "Total Tasks",
    "Active Tasks",
    "Completed Tasks",
    "Pending Reviews",
    "Overdue Tasks",
    "Completion Rate",
    "Phases",
  ];
  const projMatch = projMetrics.length === 7 && projMetrics.every((m, i) => m.label === projExpectedLabels[i]);
  console.log(`✓ Project Metrics Specification Match: ${projMatch ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------------------
  // 5. PDF & DOCX Export Verification across all 4 reports
  // -------------------------------------------------------------------------
  console.log("\n--- 5. PDF & DOCX Export Verification ---");
  const reports = [empReportRes, mgrReportRes, adminReportRes, projReportRes];
  for (const r of reports) {
    const pdfBuf = await generateReportPdfBuffer(r);
    const docxBuf = await generateReportDocxBuffer(r);
    console.log(`✓ ${r.report.reportType}: PDF Buffer (${pdfBuf.length} bytes), DOCX Buffer (${docxBuf.length} bytes)`);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB. Authoritative Metrics Verification Complete!");
}

verifyAuthoritativeMetrics();
