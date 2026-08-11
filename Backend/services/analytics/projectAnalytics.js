const mongoose = require("mongoose");

const Task = require("../../models/Task");
const Project = require("../../models/Project");
const CustomError = require("../../errors/CustomError");

const { TASK_STATUS } = require("../../constants/constants");
const { getProjectFilter } = require("../access/projectAccess");

/* ===========================================================
   Project Analytics — Metric Definitions
   ===========================================================

   totalTasks
     All tasks in the project (all statuses).

   activeTasks
     Tasks with status in [Assigned, Accepted, In Progress].

   completedTasks
     Tasks with status Closed.

   overdueTasks
     Non-archived tasks where dueDate < now AND status
     in [Assigned, Accepted, In Progress].

   completionRate
     completedTasks / (totalTasks - withdrawnTasks) * 100.
     0 if denominator is 0.

   taskStatusDistribution
     Object mapping each task status to its count.

   memberWorkload
     Array of { memberId, memberName, memberEmployeeId,
     totalTasks, activeTasks, completedTasks }
     for each employee with tasks in this project.

   =========================================================== */

/**
 * Calculate analytics metrics for a specific project.
 * Verifies the requesting user has access to the project.
 *
 * @param {string} projectId - The project ObjectId (string)
 * @param {Object} user - { userId, role } from req.user
 * @returns {Object} Project metrics object
 */
const getProjectMetrics = async (projectId, user) => {
  const today = new Date();
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  /* -------------------------------------------------------
     Verify project access
     ------------------------------------------------------- */

  const accessFilter = getProjectFilter(user);

  const project = await Project.findOne({
    _id: projectObjectId,
    ...accessFilter,
  })
    .select("name")
    .lean();

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  /* -------------------------------------------------------
     Single aggregation with $facet
     ------------------------------------------------------- */

  const [metrics] = await Task.aggregate([
    { $match: { project: projectObjectId } },
    {
      $facet: {
        // --- Status distribution ---
        statusDistribution: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],

        // --- Overdue count ---
        overdue: [
          {
            $match: {
              isArchived: { $ne: true },
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

        // --- Member workload ---
        memberWorkload: [
          { $match: { isArchived: { $ne: true } } },
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
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "member",
            },
          },
          { $unwind: "$member" },
          {
            $project: {
              _id: 0,
              memberId: "$member._id",
              memberName: "$member.name",
              memberEmployeeId: "$member.employeeId",
              totalTasks: 1,
              activeTasks: 1,
              completedTasks: 1,
            },
          },
          { $sort: { activeTasks: -1 } },
        ],
      },
    },
  ]);

  /* -------------------------------------------------------
     Parse results
     ------------------------------------------------------- */

  // Status distribution and totals
  const taskStatusDistribution = {};
  let totalTasks = 0;

  metrics.statusDistribution.forEach((item) => {
    taskStatusDistribution[item._id] = item.count;
    totalTasks += item.count;
  });

  const activeTasks =
    (taskStatusDistribution[TASK_STATUS.ASSIGNED] || 0) +
    (taskStatusDistribution[TASK_STATUS.ACCEPTED] || 0) +
    (taskStatusDistribution[TASK_STATUS.IN_PROGRESS] || 0);

  const completedTasks = taskStatusDistribution[TASK_STATUS.CLOSED] || 0;
  const withdrawnTasks = taskStatusDistribution[TASK_STATUS.WITHDRAWN] || 0;

  // Overdue
  const overdueTasks =
    metrics.overdue.length > 0 ? metrics.overdue[0].count : 0;

  // Completion rate (exclude withdrawn from denominator)
  const completionDenominator = totalTasks - withdrawnTasks;
  const completionRate =
    completionDenominator > 0
      ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
      : 0;

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    projectId: project._id,
    projectName: project.name,
    totalTasks,
    activeTasks,
    completedTasks,
    overdueTasks,
    completionRate,
    taskStatusDistribution,
    memberWorkload: metrics.memberWorkload,
  };
};

module.exports = {
  getProjectMetrics,
};
