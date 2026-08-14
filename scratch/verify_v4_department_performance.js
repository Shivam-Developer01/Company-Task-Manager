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

const Department = require("../Backend/models/Department");
const User = require("../Backend/models/User");
const Task = require("../Backend/models/Task");
const Project = require("../Backend/models/Project");

const { getDepartmentPerformanceAnalytics } = require("../Backend/services/analytics/departmentAnalytics");
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { exportAiReportDocument } = require("../Backend/services/ai/aiReportExportService");
const { ROLES } = require("../Backend/constants/constants");

async function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING V4 FINAL REPORT: DEPARTMENT_PERFORMANCE");
  console.log("=================================================");

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/taskmanager";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  try {
    // Fetch test users and departments
    const adminUserDoc = await User.findOne({ role: "admin" }).lean();
    if (!adminUserDoc) throw new Error("No Admin user found in DB.");

    const managerUserDoc = await User.findOne({ role: "manager" }).lean();
    if (!managerUserDoc) throw new Error("No Manager user found in DB.");

    const employeeUserDoc = await User.findOne({ role: "employee" }).lean();
    if (!employeeUserDoc) throw new Error("No Employee user found in DB.");

    const deptDocs = await Department.find({ isActive: true }).lean();
    if (deptDocs.length === 0) throw new Error("No active departments found in DB.");

    const sampleDeptA = deptDocs[0];
    const sampleDeptB = deptDocs.length > 1 ? deptDocs[1] : deptDocs[0];
    console.log(`Departments found: Dept A = ${sampleDeptA.name} (${sampleDeptA.code}), Dept B = ${sampleDeptB.name} (${sampleDeptB.code})`);

    const adminViewer = {
      userId: adminUserDoc._id.toString(),
      role: ROLES.ADMIN,
      name: adminUserDoc.name,
    };

    const managerViewer = {
      userId: managerUserDoc._id.toString(),
      role: ROLES.MANAGER,
      name: managerUserDoc.name,
    };

    const empViewer = {
      userId: employeeUserDoc._id.toString(),
      role: ROLES.EMPLOYEE,
      name: employeeUserDoc.name,
    };

    // TEST 1 — ADMIN ALL DEPARTMENTS
    console.log("\n[TEST 1] ADMIN ALL DEPARTMENTS REPORT...");
    const allDeptReport = await generateAiReport({
      viewer: adminViewer,
      reportType: "DEPARTMENT_PERFORMANCE",
      targetSubjectId: "all_departments",
    });

    console.log("Status: PASS");
    console.log("Report Type:", allDeptReport.report.reportType);
    console.log("Subject Name:", allDeptReport.report.subject.name);
    console.log("Scope Mode:", allDeptReport.report.sourceMetrics.scopeMode);
    console.log("Depts Count:", allDeptReport.report.sourceMetrics.summary.totalDepartments);
    if (allDeptReport.report.sourceMetrics.scopeMode !== "ALL_DEPARTMENTS") throw new Error("Test 1 scope mode mismatch.");

    // TEST 2 — ADMIN SPECIFIC DEPARTMENT
    console.log("\n[TEST 2] ADMIN SPECIFIC DEPARTMENT REPORT (Dept A)...");
    const deptAReport = await generateAiReport({
      viewer: adminViewer,
      reportType: "DEPARTMENT_PERFORMANCE",
      targetSubjectId: sampleDeptA._id.toString(),
    });

    console.log("Status: PASS");
    console.log("Subject Name:", deptAReport.report.subject.name);
    console.log("Scope Mode:", deptAReport.report.sourceMetrics.scopeMode);
    console.log("Dept Name in Metrics:", deptAReport.report.sourceMetrics.department.name);
    if (deptAReport.report.sourceMetrics.department.name !== sampleDeptA.name) throw new Error("Test 2 department name mismatch.");

    // TEST 3 — ADMIN SWITCHING (Dept A -> Dept B)
    console.log("\n[TEST 3] ADMIN SWITCHING DEPARTMENTS (Dept B)...");
    const deptBReport = await generateAiReport({
      viewer: adminViewer,
      reportType: "DEPARTMENT_PERFORMANCE",
      targetSubjectId: sampleDeptB._id.toString(),
    });

    console.log("Status: PASS");
    console.log("Dept B Subject Name:", deptBReport.report.subject.name);
    console.log("Dept B Dept Name in Metrics:", deptBReport.report.sourceMetrics.department.name);
    if (deptBReport.report.sourceMetrics.department.name !== sampleDeptB.name) throw new Error("Test 3 department name mismatch.");

    // TEST 4 & 5 — MANAGER API TAMPERING (403 FORBIDDEN)
    console.log("\n[TEST 4 & 5] MANAGER API TAMPERING FOR DEPARTMENT_PERFORMANCE...");
    try {
      await generateAiReport({
        viewer: managerViewer,
        reportType: "DEPARTMENT_PERFORMANCE",
        targetSubjectId: sampleDeptA._id.toString(),
      });
      throw new Error("FAIL: Manager was able to generate DEPARTMENT_PERFORMANCE!");
    } catch (err) {
      if (err.statusCode === 403) {
        console.log("Status: PASS (HTTP 403 Forbidden properly thrown for Manager).");
      } else {
        throw err;
      }
    }

    // TEST 6 & 7 — EMPLOYEE API TAMPERING (403 FORBIDDEN)
    console.log("\n[TEST 6 & 7] EMPLOYEE API TAMPERING FOR DEPARTMENT_PERFORMANCE...");
    try {
      await generateAiReport({
        viewer: empViewer,
        reportType: "DEPARTMENT_PERFORMANCE",
        targetSubjectId: sampleDeptA._id.toString(),
      });
      throw new Error("FAIL: Employee was able to generate DEPARTMENT_PERFORMANCE!");
    } catch (err) {
      if (err.statusCode === 403) {
        console.log("Status: PASS (HTTP 403 Forbidden properly thrown for Employee).");
      } else {
        throw err;
      }
    }

    // TEST 8 — INVALID DEPARTMENT ID
    console.log("\n[TEST 8] INVALID DEPARTMENT ID VALIDATION...");
    try {
      await getDepartmentPerformanceAnalytics({
        viewer: adminViewer,
        targetDepartmentId: "invalid_mongo_id_123",
      });
      throw new Error("FAIL: Invalid department ID was accepted!");
    } catch (err) {
      if (err.statusCode === 400 || err.statusCode === 404) {
        console.log(`Status: PASS (Safe validation error HTTP ${err.statusCode}: "${err.message}").`);
      } else {
        throw err;
      }
    }

    // TEST 9 — PDF EXPORT
    console.log("\n[TEST 9] PDF EXPORT FOR ALL DEPARTMENTS & INDIVIDUAL DEPT...");
    const pdfAll = await exportAiReportDocument({
      viewer: adminViewer,
      format: "pdf",
      reportPayload: allDeptReport,
    });
    console.log("All Depts PDF Size:", pdfAll.buffer.length, "bytes");

    const pdfSingle = await exportAiReportDocument({
      viewer: adminViewer,
      format: "pdf",
      reportPayload: deptAReport,
    });
    console.log("Single Dept PDF Size:", pdfSingle.buffer.length, "bytes");
    console.log("Status: PASS");

    // TEST 10 — DOCX EXPORT
    console.log("\n[TEST 10] DOCX EXPORT FOR ALL DEPARTMENTS & INDIVIDUAL DEPT...");
    const docxAll = await exportAiReportDocument({
      viewer: adminViewer,
      format: "docx",
      reportPayload: allDeptReport,
    });
    console.log("All Depts DOCX Size:", docxAll.buffer.length, "bytes");

    const docxSingle = await exportAiReportDocument({
      viewer: adminViewer,
      format: "docx",
      reportPayload: deptAReport,
    });
    console.log("Single Dept DOCX Size:", docxSingle.buffer.length, "bytes");
    console.log("Status: PASS");

    console.log("\n=================================================");
    console.log("ALL ACCESS CONTROL VERIFICATION TESTS PASSED (100%)");
    console.log("DEPARTMENT PERFORMANCE ACCESS CONTROL: PASS");
    console.log("=================================================");
  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runVerification();
