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

require("../Backend/models/User");
require("../Backend/models/Project");
require("../Backend/models/Phase");
require("../Backend/models/Task");
require("../Backend/models/Submission");

const User = require("../Backend/models/User");
const Task = require("../Backend/models/Task");
const Submission = require("../Backend/models/Submission");
const { TASK_STATUS, SUBMISSION_STATUS, ROLES } = require("../Backend/constants/constants");
const { getAllTasks } = require("../Backend/services/task/taskQueryService");
const { getAllSubmissions } = require("../Backend/services/submission/submissionQueryService");

async function testKanbanLogic() {
  console.log("=== STARTING KANBAN SUBMISSION-BASED PENDING REVIEW TESTS ===\n");
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });
    const manager = await User.findOne({ role: ROLES.MANAGER, isActive: true });
    const emp = await User.findOne({ role: ROLES.EMPLOYEE, isActive: true });

    if (!admin || !manager || !emp) throw new Error("Seed users missing");

    // Create Task A (Submitted with Pending Submission)
    const taskA = await Task.create({
      title: "Task A - Has Pending Submission",
      description: "Should appear in Pending Review",
      assignedTo: emp._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.SUBMITTED,
    });

    const subA = await Submission.create({
      task: taskA._id,
      submittedBy: emp._id,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
      submissionNumber: 1,
      notes: "Submission for Task A",
    });

    // Create Task B (Submitted with APPROVED Submission, no pending submission)
    const taskB = await Task.create({
      title: "Task B - Has Approved Submission",
      description: "Should NOT appear in Pending Review",
      assignedTo: emp._id,
      assignedBy: manager._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.SUBMITTED,
    });

    const subB = await Submission.create({
      task: taskB._id,
      submittedBy: emp._id,
      status: SUBMISSION_STATUS.APPROVED,
      submissionNumber: 1,
      notes: "Historical approved submission for Task B",
    });

    console.log("Created Task A (with Pending Sub) and Task B (with Approved Sub)");

    // Simulate Kanban backend data fetching logic
    // 1. Fetch tasks
    const reqTasks = { query: { isArchived: "false", limit: 100 }, user: { userId: manager._id.toString(), role: ROLES.MANAGER } };
    let tasksData = [];
    const resTasks = { status: () => resTasks, json: (p) => { tasksData = p.data; return resTasks; } };
    await getAllTasks(reqTasks, resTasks);

    // 2. Fetch pending submissions
    const reqSubs = { query: { status: "Pending Review", limit: 100 }, user: { userId: manager._id.toString(), role: ROLES.MANAGER } };
    let subsData = [];
    const resSubs = { status: () => resSubs, json: (p) => { subsData = p.data; return resSubs; } };
    await getAllSubmissions(reqSubs, resSubs);

    // Build Pending Submission Map
    const pendingSubMap = new Map();
    subsData.forEach((s) => {
      const taskId = s.task?._id || (typeof s.task === "string" ? s.task : null);
      if (taskId) {
        pendingSubMap.set(taskId.toString(), s);
      }
    });

    // Filter tasks for Submitted / Pending Reviews column
    const pendingReviewColumnTasks = tasksData.filter((t) => {
      const isSubmittedStatus = t.status === "Submitted";
      const hasPendingSub = pendingSubMap.has(t._id.toString());
      return isSubmittedStatus && hasPendingSub;
    });

    console.log(`\nPending Review Column Task Count: ${pendingReviewColumnTasks.length}`);
    const foundA = pendingReviewColumnTasks.some(t => t._id.toString() === taskA._id.toString());
    const foundB = pendingReviewColumnTasks.some(t => t._id.toString() === taskB._id.toString());

    console.log("Task A in Pending Review column:", foundA ? "YES (CORRECT)" : "NO (ERROR)");
    console.log("Task B in Pending Review column:", foundB ? "YES (ERROR)" : "NO (CORRECT)");

    if (foundA && !foundB) {
      console.log("\nPASSED: Kanban Pending Review filtering is correctly submission-based!");
    } else {
      console.error("\nFAILED: Kanban Pending Review filtering logic is incorrect!");
    }

    // Cleanup test data
    await Task.deleteMany({ _id: { $in: [taskA._id, taskB._id] } });
    await Submission.deleteMany({ _id: { $in: [subA._id, subB._id] } });
    console.log("\nCleaned up test tasks and submissions.");
  } catch (err) {
    console.error("TEST ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testKanbanLogic();
