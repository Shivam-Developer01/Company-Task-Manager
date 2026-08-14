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
const Task = require("../Backend/models/Task");
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");
const { generateReportDocxBuffer } = require("../Backend/services/ai/docxReportGenerator");
const { ROLES } = require("../Backend/constants/constants");

async function runAuditTests() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Starting V4 Manager Scope Audit & Verification...\n");

  const adminUser = await User.findOne({ role: ROLES.ADMIN }).lean();
  const managers = await User.find({ role: ROLES.MANAGER, isActive: true }).lean();
  const employeeUser = await User.findOne({ role: ROLES.EMPLOYEE }).lean();

  if (!adminUser) {
    console.error("❌ No admin user found in database!");
    await mongoose.disconnect();
    return;
  }

  console.log(`✓ Admin User: ${adminUser.name} (${adminUser._id})`);
  console.log(`✓ Active Managers Count: ${managers.length}`);

  const adminViewer = { userId: adminUser._id.toString(), role: ROLES.ADMIN };

  // TEST 1: Admin + "All Managers" (Default: targetSubjectId = null)
  console.log("\n--- TEST 1: Admin + 'All Managers' (targetSubjectId: null) ---");
  const allManagersResult = await generateAiReport({
    viewer: adminViewer,
    reportType: "MANAGER_TEAM_PERFORMANCE",
    targetSubjectId: null,
  });
  console.log(`✓ Report Generated: ${allManagersResult.report.reportType}`);
  console.log(`✓ Subject Name: ${allManagersResult.report.subject.name}`);
  console.log(`✓ Subject Target ID: ${allManagersResult.report.subject.targetId}`);
  console.log(`✓ Team Size (All Managers): ${allManagersResult.report.sourceMetrics.teamSize}`);
  console.log(`✓ Total Active Tasks (All Managers): ${allManagersResult.report.sourceMetrics.totalActiveTasks}`);

  // TEST 2: Admin + Specific Manager (targetSubjectId = managerId)
  if (managers.length > 0) {
    const targetMgr = managers[0];
    console.log(`\n--- TEST 2: Admin + Specific Manager (${targetMgr.name}) ---`);
    const specificMgrResult = await generateAiReport({
      viewer: adminViewer,
      reportType: "MANAGER_TEAM_PERFORMANCE",
      targetSubjectId: targetMgr._id.toString(),
    });
    console.log(`✓ Report Generated: ${specificMgrResult.report.reportType}`);
    console.log(`✓ Subject Name: ${specificMgrResult.report.subject.name}`);
    console.log(`✓ Subject Target ID: ${specificMgrResult.report.subject.targetId}`);
    console.log(`✓ Team Size (${targetMgr.name}): ${specificMgrResult.report.sourceMetrics.teamSize}`);
    console.log(`✓ Total Active Tasks (${targetMgr.name}): ${specificMgrResult.report.sourceMetrics.totalActiveTasks}`);

    // PDF & DOCX Export Verification for Specific Manager
    const pdfBuffer = await generateReportPdfBuffer(specificMgrResult);
    const docxBuffer = await generateReportDocxBuffer(specificMgrResult);
    console.log(`✓ PDF Export Buffer: ${pdfBuffer.length} bytes`);
    console.log(`✓ DOCX Export Buffer: ${docxBuffer.length} bytes`);

    // TEST 3: Manager Self-Scoped Report vs Admin Specific Manager Report Match
    console.log(`\n--- TEST 3: Manager ${targetMgr.name} Generating Own Report ---`);
    const managerViewer = { userId: targetMgr._id.toString(), role: ROLES.MANAGER, name: targetMgr.name };
    const managerOwnResult = await generateAiReport({
      viewer: managerViewer,
      reportType: "MANAGER_TEAM_PERFORMANCE",
      targetSubjectId: null,
    });
    console.log(`✓ Manager Own Team Size: ${managerOwnResult.report.sourceMetrics.teamSize}`);
    console.log(`✓ Manager Own Total Active Tasks: ${managerOwnResult.report.sourceMetrics.totalActiveTasks}`);

    if (
      specificMgrResult.report.sourceMetrics.teamSize === managerOwnResult.report.sourceMetrics.teamSize &&
      specificMgrResult.report.sourceMetrics.totalActiveTasks === managerOwnResult.report.sourceMetrics.totalActiveTasks
    ) {
      console.log("✓ PERFECT SCOPE MATCH: Admin selecting Manager A produces exact 1:1 metrics to Manager A generating their own report!");
    } else {
      console.error("❌ SCOPE MISMATCH between Admin selecting manager vs Manager generating own report!");
    }

    // TEST 4: Manager Target-Tampering Block
    if (managers.length > 1) {
      const otherMgr = managers[1];
      console.log(`\n--- TEST 4: Manager Tampering Test (Manager A targeting Manager B) ---`);
      try {
        await generateAiReport({
          viewer: managerViewer,
          reportType: "MANAGER_TEAM_PERFORMANCE",
          targetSubjectId: otherMgr._id.toString(),
        });
        console.error("❌ FAIL: Manager was able to target another manager!");
      } catch (err) {
        console.log(`✓ SUCCESS: Target tampering blocked with message: "${err.message}"`);
      }
    }
  }

  // TEST 5: Employee Access Block
  if (employeeUser) {
    console.log("\n--- TEST 5: Employee Access Block ---");
    const empViewer = { userId: employeeUser._id.toString(), role: ROLES.EMPLOYEE };
    try {
      await generateAiReport({
        viewer: empViewer,
        reportType: "MANAGER_TEAM_PERFORMANCE",
      });
      console.error("❌ FAIL: Employee was able to generate MANAGER_TEAM_PERFORMANCE!");
    } catch (err) {
      console.log(`✓ SUCCESS: Employee access blocked with message: "${err.message}"`);
    }
  }

  // TEST 6: Admin Invalid Target Manager ID
  console.log("\n--- TEST 6: Admin Invalid Manager Target ID ---");
  try {
    await generateAiReport({
      viewer: adminViewer,
      reportType: "MANAGER_TEAM_PERFORMANCE",
      targetSubjectId: "invalid_id_format",
    });
    console.error("❌ FAIL: Invalid manager ID was accepted!");
  } catch (err) {
    console.log(`✓ SUCCESS: Invalid manager ID rejected with message: "${err.message}"`);
  }

  if (employeeUser) {
    console.log("\n--- TEST 7: Admin Targeting Employee ID as Manager ---");
    try {
      await generateAiReport({
        viewer: adminViewer,
        reportType: "MANAGER_TEAM_PERFORMANCE",
        targetSubjectId: employeeUser._id.toString(),
      });
      console.error("❌ FAIL: Employee user was accepted as target manager!");
    } catch (err) {
      console.log(`✓ SUCCESS: Employee targeted as manager rejected with message: "${err.message}"`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB. All V4 Manager Scope Audit tests completed!");
}

runAuditTests();
