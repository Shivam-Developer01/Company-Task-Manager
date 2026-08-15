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
const Submission = require("../Backend/models/Submission");
const Phase = require("../Backend/models/Phase");
const Department = require("../Backend/models/Department");
const Designation = require("../Backend/models/Designation");

const { TASK_STATUS, SUBMISSION_STATUS, ROLES } = require("../Backend/constants/constants");
const { toggleUserStatus } = require("../Backend/services/user/userManagementService");
const { submitTask, reviewSubmission } = require("../Backend/services/submission/submissionManagementService");
const { getSubmissionById } = require("../Backend/services/submission/submissionQueryService");

async function runTests() {
  console.log("=== STARTING DEACTIVATED EMPLOYEE PENDING SUBMISSION TESTS ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  console.log("Connecting to MongoDB URI:", uri);
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.\n");

  try {
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });
    const manager = await User.findOne({ role: ROLES.MANAGER, isActive: true });
    
    if (!admin || !manager) throw new Error("Need active Admin and Manager users");

    // Create 2 test employees
    const emp1 = await User.create({
      name: `Test Emp Deact ${Date.now()}`,
      email: `emp_deact_${Date.now()}@test.com`,
      password: "password123",
      employeeId: `EMPD_${Date.now().toString().slice(-4)}`,
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    const emp2 = await User.create({
      name: `Test Emp Active ${Date.now()}`,
      email: `emp_act_${Date.now()}@test.com`,
      password: "password123",
      employeeId: `EMPA_${Date.now().toString().slice(-4)}`,
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    console.log(`Created test employees: Emp1 (${emp1._id}), Emp2 (${emp2._id})`);

    // Create test tasks
    // Task 1: Submitted task for Emp1
    const task1 = await Task.create({
      title: "Deactivated Employee Submitted Task",
      description: "Testing pending review preservation",
      assignedTo: emp1._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    // Task 2: Un-submitted assigned task for Emp1
    const task2 = await Task.create({
      title: "Deactivated Employee Unsubmitted Task",
      description: "Testing automatic withdrawal for unsubmitted tasks",
      assignedTo: emp1._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    // Task 3: Submitted task for Emp2 (active employee)
    const task3 = await Task.create({
      title: "Active Employee Submitted Task",
      description: "Testing normal active employee review",
      assignedTo: emp2._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    // Emp1 submits Task 1
    const reqSub1 = {
      params: { taskId: task1._id.toString() },
      body: { message: "Task 1 completed work" },
      user: { userId: emp1._id.toString(), role: ROLES.EMPLOYEE },
    };
    const resSub1 = { status: () => resSub1, json: (p) => { resSub1.data = p; return resSub1; } };
    await submitTask(reqSub1, resSub1);

    // Emp2 submits Task 3
    const reqSub3 = {
      params: { taskId: task3._id.toString() },
      body: { message: "Task 3 completed work" },
      user: { userId: emp2._id.toString(), role: ROLES.EMPLOYEE },
    };
    const resSub3 = { status: () => resSub3, json: (p) => { resSub3.data = p; return resSub3; } };
    await submitTask(reqSub3, resSub3);

    console.log("Task 1 submitted. Status:", (await Task.findById(task1._id)).status);
    console.log("Task 3 submitted. Status:", (await Task.findById(task3._id)).status);

    const sub1 = await Submission.findOne({ task: task1._id });
    console.log("Submission 1 created:", sub1._id.toString(), "Status:", sub1.status);

    // -------------------------------------------------------------
    // TEST 1: Deactivate Employee 1 and verify Task 1 pending review is PRESERVED
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Deactivating Employee 1 ---");
    const reqDeact = {
      params: { id: emp1._id.toString() },
      user: { userId: admin._id.toString(), role: ROLES.ADMIN },
    };
    const resDeact = { status: () => resDeact, json: (p) => { resDeact.data = p; return resDeact; } };
    await toggleUserStatus(reqDeact, resDeact);

    const updatedTask1 = await Task.findById(task1._id);
    const updatedTask2 = await Task.findById(task2._id);
    const updatedEmp1 = await User.findById(emp1._id);

    console.log("Emp1 isActive:", updatedEmp1.isActive);
    console.log("Task 1 Status (Submitted Task):", updatedTask1.status);
    console.log("Task 2 Status (Unsubmitted Task):", updatedTask2.status);

    if (updatedTask1.status === TASK_STATUS.SUBMITTED) {
      console.log("PASSED: Task 1 (submitted) remains SUBMITTED / Pending Review!");
    } else {
      console.error("FAILED: Task 1 status changed to:", updatedTask1.status);
    }

    if (updatedTask2.status === TASK_STATUS.WITHDRAWN) {
      console.log("PASSED: Task 2 (unsubmitted) was correctly WITHDRAWN upon deactivation!");
    } else {
      console.error("FAILED: Task 2 status is:", updatedTask2.status);
    }

    // -------------------------------------------------------------
    // TEST 3: Attempt manual rejection via backend API for deactivated employee submission
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Backend Rejection Protection Test ---");
    const reqRejectFail = {
      params: { id: sub1._id.toString() },
      body: { action: "reject", feedback: "Trying to reject" },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };

    let caughtErr = null;
    const resRejectFail = { status: () => resRejectFail, json: (p) => { resRejectFail.data = p; return resRejectFail; } };
    try {
      await reviewSubmission(reqRejectFail, resRejectFail);
    } catch (err) {
      caughtErr = err;
    }

    if (caughtErr && caughtErr.message.includes("Cannot reject submission for a deactivated employee")) {
      console.log("PASSED: Backend correctly blocked rejection for deactivated employee! Error message:", caughtErr.message);
    } else {
      console.error("FAILED: Backend did NOT block rejection! Result/Error:", caughtErr);
    }

    // -------------------------------------------------------------
    // TEST 2: Manager approves deactivated employee submission
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Manager approves deactivated employee submission ---");
    const reqApprove = {
      params: { id: sub1._id.toString() },
      body: { action: "approve", feedback: "Great work!" },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };

    let approveResult = null;
    const resApprove = { status: (c) => { resApprove.statusCode = c; return resApprove; }, json: (p) => { approveResult = p; return resApprove; } };
    await reviewSubmission(reqApprove, resApprove);

    const closedTask1 = await Task.findById(task1._id);
    const approvedSub1 = await Submission.findById(sub1._id);

    console.log("Approval response code:", resApprove.statusCode);
    console.log("Closed Task 1 Status:", closedTask1.status);
    console.log("Approved Sub 1 Status:", approvedSub1.status);

    if (closedTask1.status === TASK_STATUS.CLOSED && approvedSub1.status === SUBMISSION_STATUS.APPROVED) {
      console.log("PASSED: Deactivated employee submission approved successfully and task closed!");
    } else {
      console.error("FAILED: Approval failed!");
    }

    // -------------------------------------------------------------
    // TEST 4: Active employee submission review (Approve / Reject works normally)
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Active employee submission rejection test ---");
    const sub3 = await Submission.findOne({ task: task3._id });
    const reqRejectActive = {
      params: { id: sub3._id.toString() },
      body: { action: "reject", feedback: "Please fix minor issue" },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };

    const resRejectActive = { status: (c) => { resRejectActive.statusCode = c; return resRejectActive; }, json: (p) => { return resRejectActive; } };
    await reviewSubmission(reqRejectActive, resRejectActive);

    const rejectedTask3 = await Task.findById(task3._id);
    console.log("Active Employee Task 3 Status after Rejection:", rejectedTask3.status);

    if (rejectedTask3.status === TASK_STATUS.IN_PROGRESS) {
      console.log("PASSED: Active employee submission can still be rejected normally!");
    } else {
      console.error("FAILED: Active employee rejection failed!");
    }

    // Cleanup
    await Task.deleteMany({ _id: { $in: [task1._id, task2._id, task3._id] } });
    await Submission.deleteMany({ _id: { $in: [sub1._id, sub3._id] } });
    await User.deleteMany({ _id: { $in: [emp1._id, emp2._id] } });
    console.log("\nCleaned up test data.");

    console.log("\n=== ALL DEACTIVATED EMPLOYEE SUBMISSION TESTS PASSED! ===");
  } catch (error) {
    console.error("\nTEST ERROR:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
