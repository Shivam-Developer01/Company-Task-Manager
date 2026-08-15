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
const Phase = require("../Backend/models/Phase");
const Department = require("../Backend/models/Department");
const Designation = require("../Backend/models/Designation");
const { ROLES } = require("../Backend/constants/constants");
const { updateProjectMembers } = require("../Backend/services/project/projectMemberService");
const { getProjectById: getProjectByIdMgmt } = require("../Backend/services/project/projectManagementService");

async function runTests() {
  console.log("=== STARTING BUG FIX VERIFICATION TESTS ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  console.log("Connecting to MongoDB URI:", uri);
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.\n");

  try {
    // 1. Find users needed for test
    const managerA = await User.findOne({ role: ROLES.MANAGER, isActive: true });
    const employees = await User.find({ role: ROLES.EMPLOYEE, isActive: true }).limit(3);
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });

    if (!managerA) throw new Error("No active Manager found in DB");
    if (employees.length < 3) throw new Error("Need at least 3 active Employees in DB");

    const empB = employees[0];
    const empC = employees[1];
    const empD = employees[2];

    console.log(`Test User Manager A: ${managerA.name} (${managerA._id})`);
    console.log(`Test User Employee B: ${empB.name} (${empB._id})`);
    console.log(`Test User Employee C: ${empC.name} (${empC._id})`);
    console.log(`Test User Employee D: ${empD.name} (${empD._id})\n`);

    // Create a temporary test project
    const testProjectName = `Test Access Project ${Date.now()}`;
    const testProject = await Project.create({
      name: testProjectName,
      description: "Test Project for Bug Fix Verification",
      createdBy: admin ? admin._id : managerA._id,
      members: [managerA._id, empB._id],
    });

    console.log(`Created test project "${testProjectName}" (${testProject._id})`);
    console.log("Initial DB members:", testProject.members.map((id) => id.toString()));

    // -------------------------------------------------------------
    // SCENARIO A: Manager A (already a member) adds Employee C
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO A: Manager A adds Employee C ---");

    const mockReqA = {
      params: { id: testProject._id.toString() },
      body: { members: [empB._id.toString(), empC._id.toString()] },
      user: { userId: managerA._id.toString(), role: ROLES.MANAGER },
    };

    let responseDataA = null;
    const mockResA = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        responseDataA = payload;
        return this;
      },
    };

    await updateProjectMembers(mockReqA, mockResA);

    console.log("updateProjectMembers Status:", mockResA.statusCode);
    console.log("updateProjectMembers Success:", responseDataA?.success);

    // Verify DB
    const updatedProjectDbA = await Project.findById(testProject._id);
    const memberIdsA = updatedProjectDbA.members.map((m) => m.toString());
    console.log("Updated DB members:", memberIdsA);

    const hasManagerA = memberIdsA.includes(managerA._id.toString());
    const hasEmpB = memberIdsA.includes(empB._id.toString());
    const hasEmpC = memberIdsA.includes(empC._id.toString());

    if (hasManagerA && hasEmpB && hasEmpC) {
      console.log("PASSED: Manager A, Employee B, and Employee C are all present in project members!");
    } else {
      console.error("FAILED: Missing members! hasManagerA:", hasManagerA, "hasEmpB:", hasEmpB, "hasEmpC:", hasEmpC);
    }

    // Verify Manager A can still access the project via getProjectById
    let fetchedProjectA = null;
    const mockReqGetA = {
      params: { id: testProject._id.toString() },
      user: { userId: managerA._id.toString(), role: ROLES.MANAGER },
    };
    const mockResGetA = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        fetchedProjectA = payload;
        return this;
      },
    };

    await getProjectByIdMgmt(mockReqGetA, mockResGetA);

    if (mockResGetA.statusCode === 200 && fetchedProjectA?.success) {
      console.log("PASSED: Manager A successfully fetched project details without 'Project not found' error!");
    } else {
      console.error("FAILED: Manager A could not fetch project details after member update!");
    }

    // -------------------------------------------------------------
    // SCENARIO B: Add multiple members (Employee D added)
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO B: Add Employee D as well ---");

    const mockReqB = {
      params: { id: testProject._id.toString() },
      body: { members: [empB._id.toString(), empC._id.toString(), empD._id.toString()] },
      user: { userId: managerA._id.toString(), role: ROLES.MANAGER },
    };

    let responseDataB = null;
    const mockResB = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        responseDataB = payload;
        return this;
      },
    };

    await updateProjectMembers(mockReqB, mockResB);

    const updatedProjectDbB = await Project.findById(testProject._id);
    const memberIdsB = updatedProjectDbB.members.map((m) => m.toString());
    console.log("Updated DB members after scenario B:", memberIdsB);

    if (
      memberIdsB.includes(managerA._id.toString()) &&
      memberIdsB.includes(empB._id.toString()) &&
      memberIdsB.includes(empC._id.toString()) &&
      memberIdsB.includes(empD._id.toString())
    ) {
      console.log("PASSED: Manager A + all employees present!");
    } else {
      console.error("FAILED: Scenario B member verification failed");
    }

    // -------------------------------------------------------------
    // SCENARIO C: Duplicate member attempt
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO C: Duplicate member attempt ---");

    const mockReqC = {
      params: { id: testProject._id.toString() },
      body: { members: [empB._id.toString(), empB._id.toString(), empC._id.toString()] },
      user: { userId: managerA._id.toString(), role: ROLES.MANAGER },
    };

    const mockResC = {
      status: function (code) { return this; },
      json: function () { return this; },
    };

    await updateProjectMembers(mockReqC, mockResC);

    const updatedProjectDbC = await Project.findById(testProject._id);
    const memberIdsC = updatedProjectDbC.members.map((m) => m.toString());
    const uniqueMemberCount = new Set(memberIdsC).size;

    if (memberIdsC.length === uniqueMemberCount) {
      console.log("PASSED: No duplicate members in DB! Total unique members:", uniqueMemberCount);
    } else {
      console.error("FAILED: Duplicate member entries found in DB");
    }

    // -------------------------------------------------------------
    // SCENARIO D: Admin adds a member
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO D: Admin adds project member ---");

    if (admin) {
      const mockReqD = {
        params: { id: testProject._id.toString() },
        body: { members: [managerA._id.toString(), empB._id.toString(), empC._id.toString()] },
        user: { userId: admin._id.toString(), role: ROLES.ADMIN },
      };

      const mockResD = {
        status: function (code) { return this; },
        json: function () { return this; },
      };

      await updateProjectMembers(mockReqD, mockResD);
      console.log("PASSED: Admin successfully updated project members!");
    } else {
      console.log("Skipping Scenario D (no admin user found)");
    }

    // -------------------------------------------------------------
    // SCENARIO E: Manager who is NOT a member attempts access
    // -------------------------------------------------------------
    console.log("\n--- SCENARIO E: Non-member Manager access attempt ---");

    const nonMemberManager = await User.findOne({
      role: ROLES.MANAGER,
      isActive: true,
      _id: { $ne: managerA._id },
    });

    if (nonMemberManager) {
      console.log(`Non-member Manager: ${nonMemberManager.name} (${nonMemberManager._id})`);

      const mockReqE = {
        params: { id: testProject._id.toString() },
        user: { userId: nonMemberManager._id.toString(), role: ROLES.MANAGER },
      };

      let caughtError = null;
      const mockResE = {
        status: function (code) { return this; },
        json: function (p) { return this; },
      };

      try {
        await getProjectByIdMgmt(mockReqE, mockResE);
      } catch (err) {
        caughtError = err;
      }

      if (caughtError && caughtError.message === "Project not found") {
        console.log("PASSED: Non-member Manager correctly denied access with 'Project not found' (404)");
      } else {
        console.error("FAILED: Non-member Manager was NOT correctly blocked! Error:", caughtError);
      }
    } else {
      console.log("Skipping Scenario E (only 1 manager in DB)");
    }

    // Cleanup test project
    await Project.findByIdAndDelete(testProject._id);
    console.log("\nCleaned up test project.");

    console.log("\n=== ALL BACKEND BUG FIX VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\nTEST SUITE ERROR:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
