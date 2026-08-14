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
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { extractMetricPairs } = require("../Backend/services/ai/aiReportExportHelper");
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");
const { generateReportDocxBuffer } = require("../Backend/services/ai/docxReportGenerator");
const { ROLES } = require("../Backend/constants/constants");

async function runManagerPerformanceVerification() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Starting MANAGER_PERFORMANCE Verification...\n");

  const adminUser = await User.findOne({ role: ROLES.ADMIN }).lean();
  const managers = await User.find({ role: ROLES.MANAGER, isActive: true }).lean();
  const employeeUser = await User.findOne({ role: ROLES.EMPLOYEE }).lean();

  if (!adminUser) {
    console.error("❌ No admin user found!");
    await mongoose.disconnect();
    return;
  }

  const adminViewer = { userId: adminUser._id.toString(), role: ROLES.ADMIN };

  // TEST 1: Admin + All Managers Scope
  console.log("--- TEST 1: Admin + All Managers Scope (MANAGER_PERFORMANCE) ---");
  const allMgrReport = await generateAiReport({
    viewer: adminViewer,
    reportType: "MANAGER_PERFORMANCE",
    targetSubjectId: null,
  });

  console.log(`✓ Report Generated: ${allMgrReport.report.reportType}`);
  console.log(`✓ Subject Name: ${allMgrReport.report.subject.name}`);
  console.log(`✓ Subject Target ID: ${allMgrReport.report.subject.targetId}`);
  const allMgrMetrics = extractMetricPairs(allMgrReport.report.sourceMetrics, "MANAGER_PERFORMANCE");
  console.log(`✓ Authoritative Source Metrics Count: ${allMgrMetrics.length}`);
  allMgrMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

  const pdfBuf1 = await generateReportPdfBuffer(allMgrReport);
  const docxBuf1 = await generateReportDocxBuffer(allMgrReport);
  console.log(`✓ All Managers Exports: PDF (${pdfBuf1.length} bytes), DOCX (${docxBuf1.length} bytes)`);

  // TEST 2: Admin + Specific Manager Scope
  if (managers.length > 0) {
    const targetMgr = managers[0];
    console.log(`\n--- TEST 2: Admin + Specific Manager Scope (${targetMgr.name}) ---`);
    const singleMgrReport = await generateAiReport({
      viewer: adminViewer,
      reportType: "MANAGER_PERFORMANCE",
      targetSubjectId: targetMgr._id.toString(),
    });

    console.log(`✓ Report Generated: ${singleMgrReport.report.reportType}`);
    console.log(`✓ Subject Name: ${singleMgrReport.report.subject.name}`);
    console.log(`✓ Subject Target ID: ${singleMgrReport.report.subject.targetId}`);
    const singleMgrMetrics = extractMetricPairs(singleMgrReport.report.sourceMetrics, "MANAGER_PERFORMANCE");
    console.log(`✓ Authoritative Source Metrics Count: ${singleMgrMetrics.length}`);
    singleMgrMetrics.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.label} ➔ ${m.value}`));

    const pdfBuf2 = await generateReportPdfBuffer(singleMgrReport);
    const docxBuf2 = await generateReportDocxBuffer(singleMgrReport);
    console.log(`✓ Single Manager Exports: PDF (${pdfBuf2.length} bytes), DOCX (${docxBuf2.length} bytes)`);

    // TEST 3: Manager Self-View & Target Tampering Block
    console.log(`\n--- TEST 3: Manager Self-View & Tampering Block ---`);
    const mgrViewer = { userId: targetMgr._id.toString(), role: ROLES.MANAGER, name: targetMgr.name };
    const selfMgrReport = await generateAiReport({
      viewer: mgrViewer,
      reportType: "MANAGER_PERFORMANCE",
    });
    console.log(`✓ Self-View Generated for: ${selfMgrReport.report.subject.name}`);

    if (managers.length > 1) {
      const otherMgr = managers[1];
      try {
        await generateAiReport({
          viewer: mgrViewer,
          reportType: "MANAGER_PERFORMANCE",
          targetSubjectId: otherMgr._id.toString(),
        });
        console.error("❌ FAIL: Manager target tampering was not blocked!");
      } catch (err) {
        console.log(`✓ SUCCESS: Manager target tampering blocked with: "${err.message}"`);
      }
    }
  }

  // TEST 4: Employee Access Block
  if (employeeUser) {
    console.log("\n--- TEST 4: Employee Access Block ---");
    const empViewer = { userId: employeeUser._id.toString(), role: ROLES.EMPLOYEE };
    try {
      await generateAiReport({
        viewer: empViewer,
        reportType: "MANAGER_PERFORMANCE",
      });
      console.error("❌ FAIL: Employee was able to generate MANAGER_PERFORMANCE!");
    } catch (err) {
      console.log(`✓ SUCCESS: Employee access blocked with: "${err.message}"`);
    }
  }

  // TEST 5: Regression Check on existing 4 reports
  console.log("\n--- TEST 5: Regression Check on Existing Reports ---");
  const Project = require("../Backend/models/Project");
  const projectDoc = await Project.findOne({ isArchived: { $ne: true } }).lean();

  const regressionTypes = ["EMPLOYEE_PERFORMANCE", "MANAGER_TEAM_PERFORMANCE", "ADMIN_COMPANY_PERFORMANCE", "PROJECT_PERFORMANCE"];
  for (const rType of regressionTypes) {
    const regRes = await generateAiReport({
      viewer: adminViewer,
      reportType: rType,
      targetSubjectId: rType === "EMPLOYEE_PERFORMANCE" && employeeUser ? employeeUser._id.toString() : null,
      projectId: rType === "PROJECT_PERFORMANCE" && projectDoc ? projectDoc._id.toString() : null,
    });
    console.log(`✓ Regression PASS: ${rType} generated successfully.`);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB. MANAGER_PERFORMANCE Verification Complete!");
}

runManagerPerformanceVerification();
