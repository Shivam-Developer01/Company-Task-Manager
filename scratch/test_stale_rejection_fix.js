const path = require("path");
module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../Backend/.env") });

const {
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../Backend/constants/constants");

// Simulation unit tests for getEmployeeActionCenter logic
function runUnitTests() {
  console.log("==================================================");
  console.log("RUNNING UNIT TESTS FOR STALE SUBMISSION FIX");
  console.log("==================================================\n");

  const getContextInfo = (taskDoc) => ({
    projName: taskDoc && taskDoc.project ? taskDoc.project.name : "Independent Task",
    phaseName: taskDoc && taskDoc.phase ? taskDoc.phase.name : null,
  });

  // Replicate fixed getEmployeeActionCenter core logic
  function simulateActionCenter(tasks, submissions) {
    const needsAttention = [];
    const statusUpdates = [];

    // 1. Rejected Submissions requiring employee action
    const processedTaskIds = new Set();
    submissions.forEach((sub) => {
      if (needsAttention.length >= 5) return;
      const taskDoc = sub.task;
      if (taskDoc && !processedTaskIds.has(taskDoc._id.toString())) {
        processedTaskIds.add(taskDoc._id.toString());
        if (sub.status === SUBMISSION_STATUS.REJECTED) {
          const { projName, phaseName } = getContextInfo(taskDoc);
          needsAttention.push({
            id: `na-rejected-${sub._id}`,
            taskId: taskDoc._id,
            submissionId: sub._id,
            category: "Submission Feedback",
            severity: "High",
            title: taskDoc.title,
            evidence: sub.managerFeedback
              ? `Submission rejected by reviewer. Feedback: "${sub.managerFeedback}"`
              : "Your submission was rejected and requires further work.",
            status: taskDoc.status || TASK_STATUS.IN_PROGRESS,
            priority: taskDoc.priority || "Medium",
            actionRequired: "Revision & Resubmission Required",
            type: "rejected_submission",
          });
        }
      }
    });

    // 2. Tasks Awaiting Acceptance
    tasks.forEach((taskDoc) => {
      if (needsAttention.length >= 5) return;
      if (taskDoc.status === TASK_STATUS.ASSIGNED) {
        if (!processedTaskIds.has(taskDoc._id.toString())) {
          processedTaskIds.add(taskDoc._id.toString());
          const { projName, phaseName } = getContextInfo(taskDoc);
          needsAttention.push({
            id: `na-assigned-${taskDoc._id}`,
            taskId: taskDoc._id,
            category: "Pending Acceptance",
            severity: "High",
            title: taskDoc.title,
            status: taskDoc.status,
            actionRequired: "Acceptance Required",
            type: "awaiting_acceptance",
          });
        }
      }
    });

    // 3. Status updates - Pending review
    const pendingSubmissions = submissions.filter(
      (sub) => sub.status === SUBMISSION_STATUS.PENDING_REVIEW && sub.task
    );

    pendingSubmissions.forEach((sub) => {
      if (statusUpdates.length >= 5) return;
      const taskDoc = sub.task;
      const { projName, phaseName } = getContextInfo(taskDoc);
      statusUpdates.push({
        id: `su-pending-${sub._id}`,
        taskId: taskDoc._id,
        submissionId: sub._id,
        category: "Awaiting Review",
        title: taskDoc.title,
        status: "Submitted",
        type: "pending_review",
      });
    });

    // Status updates - Approved
    const approvedSubmissions = submissions.filter(
      (sub) => sub.status === SUBMISSION_STATUS.APPROVED && sub.task
    );

    approvedSubmissions.forEach((sub) => {
      if (statusUpdates.length >= 5) return;
      const taskDoc = sub.task;
      const { projName, phaseName } = getContextInfo(taskDoc);
      statusUpdates.push({
        id: `su-approved-${sub._id}`,
        taskId: taskDoc._id,
        submissionId: sub._id,
        category: "Submission Approved",
        title: taskDoc.title,
        status: "Closed",
        type: "approved_submission",
      });
    });

    return { needsAttention, statusUpdates };
  }

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failedCount++;
    }
  }

  // TEST A: Rejected submission, employee has not resubmitted
  console.log("Test A: Rejected submission, employee has not resubmitted.");
  {
    const task1 = { _id: "task1", title: "Task 1", status: TASK_STATUS.IN_PROGRESS };
    const sub1 = {
      _id: "sub1",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      managerFeedback: "Fix issue X",
      createdAt: new Date("2026-08-01T10:00:00Z"),
    };

    const res = simulateActionCenter([task1], [sub1]);
    assert(
      res.needsAttention.length === 1 &&
        res.needsAttention[0].actionRequired === "Revision & Resubmission Required" &&
        res.needsAttention[0].taskId === "task1",
      "Revision & Resubmission Required appears under Needs Attention."
    );
  }

  // TEST B: Rejected submission, employee submits again
  console.log("\nTest B: Rejected submission, employee submits again.");
  {
    const task1 = { _id: "task1", title: "Task 1", status: TASK_STATUS.SUBMITTED };
    const sub1 = {
      _id: "sub1",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      managerFeedback: "Fix issue X",
      createdAt: new Date("2026-08-01T10:00:00Z"),
    };
    const sub2 = {
      _id: "sub2",
      task: task1,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
      createdAt: new Date("2026-08-02T10:00:00Z"),
    };

    // Array sorted newest first: [sub2, sub1]
    const res = simulateActionCenter([task1], [sub2, sub1]);
    const staleRejectionInNeedsAttention = res.needsAttention.some(
      (item) => item.taskId === "task1" && item.type === "rejected_submission"
    );
    assert(
      !staleRejectionInNeedsAttention,
      "Old rejection DISAPPEARS from Needs Attention after resubmission."
    );
  }

  // TEST C: Second submission is Pending Review
  console.log("\nTest C: Second submission is Pending Review.");
  {
    const task1 = { _id: "task1", title: "Task 1", status: TASK_STATUS.SUBMITTED };
    const sub1 = {
      _id: "sub1",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      createdAt: new Date("2026-08-01T10:00:00Z"),
    };
    const sub2 = {
      _id: "sub2",
      task: task1,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
      createdAt: new Date("2026-08-02T10:00:00Z"),
    };

    const res = simulateActionCenter([task1], [sub2, sub1]);
    const pendingReviewItem = res.statusUpdates.find((item) => item.taskId === "task1");
    assert(
      res.needsAttention.length === 0 &&
        pendingReviewItem &&
        pendingReviewItem.status === "Submitted" &&
        pendingReviewItem.type === "pending_review",
      "Task is NOT shown as requiring resubmission and appears under Status Updates as Pending Review / Submitted."
    );
  }

  // TEST D: Second submission is Approved
  console.log("\nTest D: Second submission is Approved.");
  {
    const task1 = { _id: "task1", title: "Task 1", status: TASK_STATUS.CLOSED };
    const sub1 = {
      _id: "sub1",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      createdAt: new Date("2026-08-01T10:00:00Z"),
    };
    const sub2 = {
      _id: "sub2",
      task: task1,
      status: SUBMISSION_STATUS.APPROVED,
      createdAt: new Date("2026-08-02T10:00:00Z"),
    };

    const res = simulateActionCenter([task1], [sub2, sub1]);
    const approvedItem = res.statusUpdates.find((item) => item.taskId === "task1");
    assert(
      res.needsAttention.length === 0 &&
        approvedItem &&
        approvedItem.type === "approved_submission",
      "No resubmission action appears when second submission is Approved."
    );
  }

  // TEST E: Multiple historical submissions
  console.log("\nTest E: Multiple historical submissions.");
  {
    const task1 = { _id: "task1", title: "Task 1", status: TASK_STATUS.SUBMITTED };
    const sub1 = {
      _id: "sub1",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      createdAt: new Date("2026-08-01T10:00:00Z"),
    };
    const sub2 = {
      _id: "sub2",
      task: task1,
      status: SUBMISSION_STATUS.REJECTED,
      createdAt: new Date("2026-08-02T10:00:00Z"),
    };
    const sub3 = {
      _id: "sub3",
      task: task1,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
      createdAt: new Date("2026-08-03T10:00:00Z"),
    };

    // Array sorted newest first: [sub3, sub2, sub1]
    const res = simulateActionCenter([task1], [sub3, sub2, sub1]);
    assert(
      res.needsAttention.length === 0 &&
        res.statusUpdates.length === 1 &&
        res.statusUpdates[0].submissionId === "sub3",
      "Only the latest submission state determines current action state. Multiple stale rejections ignored."
    );
  }

  // TEST F: Existing unrelated Needs Attention items continue working
  console.log("\nTest F: Unrelated Needs Attention items.");
  {
    const taskAssigned = { _id: "taskAssigned", title: "New Assignment", status: TASK_STATUS.ASSIGNED };
    const res = simulateActionCenter([taskAssigned], []);
    assert(
      res.needsAttention.length === 1 &&
        res.needsAttention[0].type === "awaiting_acceptance" &&
        res.needsAttention[0].actionRequired === "Acceptance Required",
      "Unrelated Needs Attention items (e.g. pending acceptance) continue working properly."
    );
  }

  console.log("\n==================================================");
  console.log(`RESULTS: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("==================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runUnitTests();
