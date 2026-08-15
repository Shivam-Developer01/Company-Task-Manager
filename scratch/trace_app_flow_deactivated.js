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
const { submitTask } = require("../Backend/services/submission/submissionManagementService");
const { getAllSubmissions, getSubmissionById } = require("../Backend/services/submission/submissionQueryService");
const { getAllTasks, getTaskById } = require("../Backend/services/task/taskQueryService");
const { getManagerDashboard } = require("../Backend/services/dashboard/managerDashboardService");

async function traceFlow() {
  console.log("=== TRACING APP FLOW FOR DEACTIVATED EMPLOYEE SUBMITTED TASK ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });
    const manager = await User.findOne({ role: ROLES.MANAGER, isActive: true });

    // Create an employee
    const emp = await User.create({
      name: `Trace Emp ${Date.now()}`,
      email: `trace_emp_${Date.now()}@test.com`,
      password: "password123",
      employeeId: `TRC_${Date.now().toString().slice(-4)}`,
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    // Create task
    const task = await Task.create({
      title: "Trace Submitted Task",
      description: "Testing real app flow",
      assignedTo: emp._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    // Submit task
    const reqSub = {
      params: { taskId: task._id.toString() },
      body: { message: "Work completed" },
      user: { userId: emp._id.toString(), role: ROLES.EMPLOYEE },
    };
    const resSub = { status: () => resSub, json: (p) => { resSub.data = p; return resSub; } };
    await submitTask(reqSub, resSub);

    const submission = await Submission.findOne({ task: task._id });

    console.log("BEFORE DEACTIVATION:");
    console.log("Task Status:", (await Task.findById(task._id)).status);
    console.log("Submission Status:", submission.status);

    // Deactivate employee
    const reqDeact = {
      params: { id: emp._id.toString() },
      user: { userId: admin._id.toString(), role: ROLES.ADMIN },
    };
    const resDeact = { status: () => resDeact, json: (p) => { resDeact.data = p; return resDeact; } };
    await toggleUserStatus(reqDeact, resDeact);

    console.log("\nAFTER DEACTIVATION:");
    const taskDbAfter = await Task.findById(task._id);
    const subDbAfter = await Submission.findById(submission._id);
    console.log("Task DB status:", taskDbAfter.status);
    console.log("Submission DB status:", subDbAfter.status);

    // 1. Call getAllTasks endpoint as Manager
    let tasksResp = null;
    const reqTasks = {
      query: { status: "Submitted" },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };
    const resTasks = { status: () => resTasks, json: (p) => { tasksResp = p; return resTasks; } };
    await getAllTasks(reqTasks, resTasks);
    console.log("\ngetAllTasks count for Submitted status:", tasksResp?.count);
    const foundTaskInList = tasksResp?.data?.find(t => t._id.toString() === task._id.toString());
    console.log("Found task in getAllTasks list:", foundTaskInList ? { title: foundTaskInList.title, status: foundTaskInList.status, assignedTo: foundTaskInList.assignedTo } : "NOT FOUND");

    // 2. Call getTaskById endpoint as Manager
    let taskByIdResp = null;
    const reqTaskById = {
      params: { id: task._id.toString() },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };
    const resTaskById = { status: () => resTaskById, json: (p) => { taskByIdResp = p; return resTaskById; } };
    await getTaskById(reqTaskById, resTaskById);
    console.log("getTaskById result:", { title: taskByIdResp?.data?.title, status: taskByIdResp?.data?.status, assignedTo: taskByIdResp?.data?.assignedTo });

    // 3. Call getAllSubmissions endpoint as Manager
    let subsResp = null;
    const reqSubs = {
      query: { status: "Pending Review" },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };
    const resSubs = { status: () => resSubs, json: (p) => { subsResp = p; return resSubs; } };
    await getAllSubmissions(reqSubs, resSubs);
    console.log("\ngetAllSubmissions count for Pending Review:", subsResp?.count);
    const foundSubInList = subsResp?.data?.find(s => s._id.toString() === submission._id.toString());
    console.log("Found submission in getAllSubmissions list:", foundSubInList ? { id: foundSubInList._id, status: foundSubInList.status, task: foundSubInList.task?.title, submittedBy: foundSubInList.submittedBy } : "NOT FOUND");

    // 4. Call getSubmissionById endpoint as Manager
    let subByIdResp = null;
    const reqSubById = {
      params: { id: submission._id.toString() },
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };
    const resSubById = { status: () => resSubById, json: (p) => { subByIdResp = p; return resSubById; } };
    await getSubmissionById(reqSubById, resSubById);
    console.log("getSubmissionById result:", { id: subByIdResp?.data?._id, status: subByIdResp?.data?.status, task: subByIdResp?.data?.task?.title, assignedTo: subByIdResp?.data?.task?.assignedTo, submittedBy: subByIdResp?.data?.submittedBy });

    // 5. Call getManagerDashboard
    let dashResp = null;
    const reqDash = {
      query: {},
      user: { userId: manager._id.toString(), role: ROLES.MANAGER },
    };
    const resDash = { status: () => resDash, json: (p) => { dashResp = p; return resDash; } };
    await getManagerDashboard(reqDash, resDash);
    console.log("\ngetManagerDashboard pendingReviews count:", dashResp?.data?.pendingReviews?.length);

    // Clean up
    await Task.findByIdAndDelete(task._id);
    await Submission.findByIdAndDelete(submission._id);
    await User.findByIdAndDelete(emp._id);

    console.log("\nTrace completed cleanly.");
  } catch (err) {
    console.error("TRACE ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

traceFlow();
