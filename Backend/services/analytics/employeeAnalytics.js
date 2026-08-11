const mongoose = require("mongoose");

const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const Activity = require("../../models/Activity");

const {
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

/* ===========================================================
   Employee Analytics — Metric Definitions
   ===========================================================

   activeTaskCount
     Non-archived tasks assigned to employee with status
     in [Assigned, Accepted, In Progress].

   completedTaskCount
     Non-archived tasks assigned to employee with status Closed.

   pendingTaskCount
     Non-archived tasks assigned to employee with status Submitted.

   overdueTaskCount
     Non-archived tasks assigned to employee where
     dueDate < now AND status in [Assigned, Accepted, In Progress].

   totalAssignedCount
     Total non-archived tasks assigned to employee (all statuses).

   completionRate
     completedTaskCount / (totalAssignedCount - withdrawnCount) * 100.
     0 if denominator is 0.

   averageCompletionTime
     Average (completedAt - createdAt) in days for Closed tasks
     with non-null completedAt. null if no completed tasks.

   averageAcceptanceTime
     Average time from task creation to employee acceptance in days.
     Derived from Activity records with action "Assignment Accepted".
     null if no acceptance records exist.

   rejectionRate
     (Rejected submissions / total submissions) * 100.
     0 if no submissions.

   =========================================================== */

/**
 * Calculate analytics metrics for a specific employee.
 *
 * @param {string} employeeId - The employee's user ObjectId (string)
 * @param {string|null} projectScope - Project filter:
 *   null/undefined = all tasks
 *   "NO_PROJECT"   = independent tasks only (project: null)
 *   "<objectId>"   = specific project
 * @returns {Object} Employee metrics object
 */
const getEmployeeMetrics = async (employeeId, projectScope = null) => {
  const today = new Date();
  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

  /* -------------------------------------------------------
     Build base match filter for Task queries
     ------------------------------------------------------- */

  const taskMatch = {
    assignedTo: employeeObjectId,
    isArchived: { $ne: true },
  };

  if (projectScope === "NO_PROJECT") {
    taskMatch.project = null;
  } else if (projectScope) {
    taskMatch.project = new mongoose.Types.ObjectId(projectScope);
  }

  /* -------------------------------------------------------
     Build project-scope match for $lookup pipelines
     (applied on the joined "taskDoc" field)
     ------------------------------------------------------- */

  const taskDocProjectMatch = { "taskDoc.isArchived": { $ne: true } };

  if (projectScope === "NO_PROJECT") {
    taskDocProjectMatch["taskDoc.project"] = null;
  } else if (projectScope) {
    taskDocProjectMatch["taskDoc.project"] = new mongoose.Types.ObjectId(
      projectScope,
    );
  }

  /* -------------------------------------------------------
     Run all independent aggregations in parallel
     ------------------------------------------------------- */

  const [taskResults, submissionResults, acceptanceResults] = await Promise.all(
    [
      // ===================== TASK METRICS =====================
      Task.aggregate([
        { $match: taskMatch },
        {
          $facet: {
            // Status counts
            statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],

            // Overdue count
            overdue: [
              {
                $match: {
                  dueDate: { $lt: today },
                  status: {
                    $in: [
                      TASK_STATUS.ASSIGNED,
                      TASK_STATUS.ACCEPTED,
                      TASK_STATUS.IN_PROGRESS,
                    ],
                  },
                },
              },
              { $count: "count" },
            ],

            // Average completion time
            completionTime: [
              {
                $match: {
                  status: TASK_STATUS.CLOSED,
                  completedAt: { $ne: null },
                },
              },
              {
                $project: {
                  days: {
                    $divide: [
                      { $subtract: ["$completedAt", "$createdAt"] },
                      86400000,
                    ],
                  },
                },
              },
              { $group: { _id: null, avg: { $avg: "$days" } } },
            ],
          },
        },
      ]),

      // =================== SUBMISSION METRICS ===================
      Submission.aggregate([
        { $match: { submittedBy: employeeObjectId } },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "taskDoc",
          },
        },
        { $unwind: "$taskDoc" },
        { $match: taskDocProjectMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            rejected: {
              $sum: {
                $cond: [
                  { $eq: ["$status", SUBMISSION_STATUS.REJECTED] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // ================== ACCEPTANCE TIME ====================
      Activity.aggregate([
        {
          $match: {
            performedBy: employeeObjectId,
            action: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
          },
        },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "taskDoc",
          },
        },
        { $unwind: "$taskDoc" },
        { $match: taskDocProjectMatch },
        {
          $project: {
            days: {
              $divide: [
                { $subtract: ["$createdAt", "$taskDoc.createdAt"] },
                86400000,
              ],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: "$days" } } },
      ]),
    ],
  );

  /* -------------------------------------------------------
     Parse task results
     ------------------------------------------------------- */

  const taskAgg = taskResults[0];

  const statusCounts = {};
  let totalAssignedCount = 0;

  taskAgg.statusCounts.forEach((item) => {
    statusCounts[item._id] = item.count;
    totalAssignedCount += item.count;
  });

  const activeTaskCount =
    (statusCounts[TASK_STATUS.ASSIGNED] || 0) +
    (statusCounts[TASK_STATUS.ACCEPTED] || 0) +
    (statusCounts[TASK_STATUS.IN_PROGRESS] || 0);

  const completedTaskCount = statusCounts[TASK_STATUS.CLOSED] || 0;
  const pendingTaskCount = statusCounts[TASK_STATUS.SUBMITTED] || 0;
  const withdrawnCount = statusCounts[TASK_STATUS.WITHDRAWN] || 0;

  const overdueTaskCount =
    taskAgg.overdue.length > 0 ? taskAgg.overdue[0].count : 0;

  const completionDenominator = totalAssignedCount - withdrawnCount;
  const completionRate =
    completionDenominator > 0
      ? Number(((completedTaskCount / completionDenominator) * 100).toFixed(2))
      : 0;

  const averageCompletionTime =
    taskAgg.completionTime.length > 0
      ? Number(taskAgg.completionTime[0].avg.toFixed(2))
      : null;

  /* -------------------------------------------------------
     Parse submission results
     ------------------------------------------------------- */

  let totalSubmissions = 0;
  let rejectedSubmissions = 0;
  let rejectionRate = 0;

  if (submissionResults.length > 0) {
    totalSubmissions = submissionResults[0].total;
    rejectedSubmissions = submissionResults[0].rejected;
    rejectionRate =
      totalSubmissions > 0
        ? Number(((rejectedSubmissions / totalSubmissions) * 100).toFixed(2))
        : 0;
  }

  /* -------------------------------------------------------
     Parse acceptance time results
     ------------------------------------------------------- */

  const averageAcceptanceTime =
    acceptanceResults.length > 0
      ? Number(acceptanceResults[0].avg.toFixed(2))
      : null;

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    activeTaskCount,
    completedTaskCount,
    pendingTaskCount,
    overdueTaskCount,
    totalAssignedCount,
    withdrawnCount,
    completionRate,
    averageCompletionTime,
    averageAcceptanceTime,
    rejectionRate,
    totalSubmissions,
    rejectedSubmissions,
  };
};

module.exports = {
  getEmployeeMetrics,
};
