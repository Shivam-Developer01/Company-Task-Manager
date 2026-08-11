const mongoose = require("mongoose");

const Task = require("../../models/Task");
const Submission = require("../../models/Submission");

const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../../constants/constants");

const { getAccessibleProjectIds } = require("../access/projectAccess");

/* ===========================================================
   Manager / Team Analytics — Metric Definitions
   ===========================================================

   teamSize
     Count of unique employees who have non-archived tasks
     within the manager's accessible scope.

   teamTaskCompletion
     (Closed tasks / (Total tasks - Withdrawn tasks)) * 100
     across the manager's scope.

   teamWorkloadDistribution
     Array of { employeeId, employeeName, employeeCode,
     totalTasks, activeTasks, completedTasks, overdueTasks }
     for each employee with tasks in scope.

   taskStatusDistribution
     Object mapping each task status to its count
     across the manager's scope.

   averageTeamDelay
     Average of max(0, completedAt - dueDate) in days
     for closed tasks that were completed after their due date.
     null if no delayed tasks.

   delayedTaskCount
     Number of closed tasks completed after their due date.

   pendingReviewCount
     Submissions with status "Pending Review" for tasks in scope.

   averageReviewTime
     Average (reviewedAt - createdAt) in days for reviewed
     submissions on tasks in scope.
     null if no reviewed submissions.

   =========================================================== */

/**
 * Build the task scope filter for a manager or admin user.
 * Replicates the scoping logic used in managerDashboardService.js.
 *
 * @param {Object} user - { userId, role }
 * @returns {Object} MongoDB query filter for tasks
 */
const buildTaskScopeFilter = async (user) => {
  if (user.role === ROLES.ADMIN) {
    return {};
  }

  const projectIds = await getAccessibleProjectIds(user);

  return {
    $or: [
      { project: { $in: projectIds } },
      {
        project: null,
        assignedBy: new mongoose.Types.ObjectId(user.userId),
      },
      {
        assignedTo: new mongoose.Types.ObjectId(user.userId),
      },
    ],
  };
};

/**
 * Calculate team-level analytics for a manager (or admin).
 *
 * @param {Object} user - { userId, role } from req.user
 * @param {Object|null} customProjectFilter - Filter for project scope (e.g. { project: null } or { project: id })
 * @returns {Object} Manager team metrics object
 */
const getManagerTeamMetrics = async (user, customProjectFilter = null) => {
  const today = new Date();
  const taskScopeFilter = await buildTaskScopeFilter(user);

  const formattedCustomFilter = customProjectFilter
    ? { ...customProjectFilter }
    : {};
  if (
    formattedCustomFilter.project &&
    typeof formattedCustomFilter.project === "string" &&
    mongoose.Types.ObjectId.isValid(formattedCustomFilter.project)
  ) {
    formattedCustomFilter.project = new mongoose.Types.ObjectId(
      formattedCustomFilter.project,
    );
  }

  const baseMatch = {
    ...taskScopeFilter,
    ...formattedCustomFilter,
    isArchived: { $ne: true },
  };

  /* -------------------------------------------------------
     Single task aggregation with $facet
     ------------------------------------------------------- */

  const [taskMetrics] = await Task.aggregate([
    { $match: baseMatch },
    {
      $facet: {
        // --- Workload per employee ---
        workloadDistribution: [
          {
            $group: {
              _id: "$assignedTo",
              totalTasks: { $sum: 1 },
              activeTasks: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$status",
                        [
                          TASK_STATUS.ASSIGNED,
                          TASK_STATUS.ACCEPTED,
                          TASK_STATUS.IN_PROGRESS,
                        ],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              completedTasks: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
                },
              },
              overdueTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $in: [
                            "$status",
                            [
                              TASK_STATUS.ASSIGNED,
                              TASK_STATUS.ACCEPTED,
                              TASK_STATUS.IN_PROGRESS,
                            ],
                          ],
                        },
                        { $lt: ["$dueDate", today] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "employee",
            },
          },
          { $unwind: "$employee" },
          {
            $project: {
              _id: 0,
              employeeId: "$employee._id",
              employeeName: "$employee.name",
              employeeCode: "$employee.employeeId",
              totalTasks: 1,
              activeTasks: 1,
              completedTasks: 1,
              overdueTasks: 1,
            },
          },
          { $sort: { activeTasks: -1 } },
        ],

        // --- Status distribution ---
        statusDistribution: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],

        // --- Totals for completion rate ---
        taskTotals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
                },
              },
              withdrawn: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0],
                },
              },
            },
          },
        ],

        // --- Average delay for overdue completed tasks ---
        delay: [
          {
            $match: {
              status: TASK_STATUS.CLOSED,
              completedAt: { $ne: null },
            },
          },
          {
            $match: {
              $expr: { $gt: ["$completedAt", "$dueDate"] },
            },
          },
          {
            $project: {
              delayDays: {
                $divide: [
                  { $subtract: ["$completedAt", "$dueDate"] },
                  86400000,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgDelay: { $avg: "$delayDays" },
              count: { $sum: 1 },
            },
          },
        ],

        // --- Collect task IDs for submission queries ---
        taskIds: [{ $project: { _id: 1 } }],
      },
    },
  ]);

  /* -------------------------------------------------------
     Parse task metrics
     ------------------------------------------------------- */

  // Team size
  const teamSize = taskMetrics.workloadDistribution.length;

  // Team task completion
  let teamTaskCompletion = 0;

  if (taskMetrics.taskTotals.length > 0) {
    const { total, completed, withdrawn } = taskMetrics.taskTotals[0];
    const denominator = total - withdrawn;

    teamTaskCompletion =
      denominator > 0
        ? Number(((completed / denominator) * 100).toFixed(2))
        : 0;
  }

  // Status distribution
  const taskStatusDistribution = {};

  taskMetrics.statusDistribution.forEach((item) => {
    taskStatusDistribution[item._id] = item.count;
  });

  // Average delay
  const averageTeamDelay =
    taskMetrics.delay.length > 0
      ? Number(taskMetrics.delay[0].avgDelay.toFixed(2))
      : null;

  const delayedTaskCount =
    taskMetrics.delay.length > 0 ? taskMetrics.delay[0].count : 0;

  /* -------------------------------------------------------
     Submission metrics (pending reviews + review time)
     ------------------------------------------------------- */

  const taskIdsInScope = taskMetrics.taskIds.map((t) => t._id);

  let pendingReviewCount = 0;
  let averageReviewTime = null;

  if (taskIdsInScope.length > 0) {
    const [submissionMetrics] = await Submission.aggregate([
      { $match: { task: { $in: taskIdsInScope } } },
      {
        $facet: {
          pending: [
            { $match: { status: SUBMISSION_STATUS.PENDING_REVIEW } },
            { $count: "count" },
          ],
          reviewTime: [
            { $match: { reviewedAt: { $ne: null } } },
            {
              $project: {
                days: {
                  $divide: [
                    { $subtract: ["$reviewedAt", "$createdAt"] },
                    86400000,
                  ],
                },
              },
            },
            { $group: { _id: null, avg: { $avg: "$days" } } },
          ],
        },
      },
    ]);

    pendingReviewCount =
      submissionMetrics.pending.length > 0
        ? submissionMetrics.pending[0].count
        : 0;

    averageReviewTime =
      submissionMetrics.reviewTime.length > 0
        ? Number(submissionMetrics.reviewTime[0].avg.toFixed(2))
        : null;
  }

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    teamSize,
    teamTaskCompletion,
    teamWorkloadDistribution: taskMetrics.workloadDistribution,
    taskStatusDistribution,
    averageTeamDelay,
    delayedTaskCount,
    pendingReviewCount,
    averageReviewTime,
  };
};

module.exports = {
  getManagerTeamMetrics,
};
