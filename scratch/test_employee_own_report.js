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
const { ROLES } = require("../Backend/constants/constants");
const { validateContextAccess } = require("../Backend/services/ai/aiContextPolicy");
const { buildAiContext } = require("../Backend/services/ai/aiContextBuilder");

async function runTests() {
  console.log("=== STARTING EMPLOYEE PERFORMANCE REPORT AUTHORIZATION TESTS ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const emp1 = await User.findOne({ role: ROLES.EMPLOYEE, isActive: true });
    const emp2 = await User.findOne({ role: ROLES.EMPLOYEE, _id: { $ne: emp1._id }, isActive: true });
    const manager = await User.findOne({ role: ROLES.MANAGER, isActive: true });

    if (!emp1 || !emp2 || !manager) throw new Error("Seed users needed for test");

    console.log(`Test Users: Emp1 (${emp1._id}), Emp2 (${emp2._id}), Manager (${manager._id})`);

    // -------------------------------------------------------------
    // TEST 1: Employee requests their OWN report (targetSubjectId = null)
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Employee 1 requests own report with targetSubjectId = null ---");
    const viewer1 = { userId: emp1._id.toString(), role: ROLES.EMPLOYEE };
    try {
      validateContextAccess(viewer1, "EMPLOYEE_REPORT", null);
      const context = await buildAiContext({
        viewer: viewer1,
        contextType: "EMPLOYEE_REPORT",
        targetSubjectId: null,
      });
      console.log("PASSED: Employee 1 successfully built AI context for own report!");
      console.log("Context Subject:", context.contextMetadata.subject);
    } catch (err) {
      console.error("FAILED: Employee 1 failed to build own report context:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Employee requests their OWN report with targetSubjectId = emp1._id
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Employee 1 requests own report with targetSubjectId = emp1._id ---");
    try {
      validateContextAccess(viewer1, "EMPLOYEE_REPORT", emp1._id.toString());
      const context = await buildAiContext({
        viewer: viewer1,
        contextType: "EMPLOYEE_REPORT",
        targetSubjectId: emp1._id.toString(),
      });
      console.log("PASSED: Employee 1 successfully built AI context with explicit own ID!");
      console.log("Context Subject:", context.contextMetadata.subject);
    } catch (err) {
      console.error("FAILED: Employee 1 failed with explicit own ID:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 3: Employee 1 requests Employee 2's report (SHOULD BE DENIED with 403)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Employee 1 requests Employee 2's report (DENY CHECK) ---");
    let caughtErr = null;
    try {
      validateContextAccess(viewer1, "EMPLOYEE_REPORT", emp2._id.toString());
      await buildAiContext({
        viewer: viewer1,
        contextType: "EMPLOYEE_REPORT",
        targetSubjectId: emp2._id.toString(),
      });
    } catch (err) {
      caughtErr = err;
    }

    if (caughtErr && (caughtErr.statusCode === 403 || caughtErr.message.includes("Forbidden"))) {
      console.log("PASSED: Access correctly denied when Employee 1 tries to access Employee 2's report! Error:", caughtErr.message);
    } else {
      console.error("FAILED: Security breach! Employee 1 was allowed to access Employee 2's report!");
    }

    // -------------------------------------------------------------
    // TEST 4: Manager requests Employee 1's report (SHOULD BE ALLOWED)
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Manager requests Employee 1's report ---");
    const viewerMgr = { userId: manager._id.toString(), role: ROLES.MANAGER };
    try {
      validateContextAccess(viewerMgr, "EMPLOYEE_REPORT", emp1._id.toString());
      const context = await buildAiContext({
        viewer: viewerMgr,
        contextType: "EMPLOYEE_REPORT",
        targetSubjectId: emp1._id.toString(),
      });
      console.log("PASSED: Manager successfully built AI context for Employee 1!");
      console.log("Context Subject:", context.contextMetadata.subject);
    } catch (err) {
      console.error("FAILED: Manager failed to build Employee 1 context:", err.message);
    }

    console.log("\n=== ALL AUTHORIZATION TESTS COMPLETED ===");
  } catch (err) {
    console.error("TEST SCRIPT ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
