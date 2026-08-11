const mongoose = require("mongoose");
const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");

const { ROLES, TASK_STATUS } = require("../../constants/constants");

/* ===========================================================
   Company Analytics — Metric Definitions (Admin Only)
   ===========================================================

   users.totalEmployees
     Users with role "employee".

   users.activeEmployees
     Active users with role "employee".

   users.inactiveEmployees
     Inactive users with role "employee".

   users.totalManagers
     Users with role "manager".

   projects.totalProjects
     All projects.

   projects.activeProjects
     Non-archived projects.

   projects.archivedProjects
     Archived projects.

   tasks.totalTasks
     All non-archived tasks.

   tasks.activeTasks
     Non-archived tasks with status in
     [Assigned, Accepted, In Progress].

   tasks.completedTasks
     Non-archived tasks with status Closed.

   tasks.overdueTasks
     Non-archived tasks where dueDate < now AND status
     in [Assigned, Accepted, In Progress].

   tasks.taskCompletionRate
     completedTasks / (totalTasks - withdrawnTasks) * 100.
     0 if denominator is 0.

   tasks.taskStatusDistribution
     Object mapping each task status to its count
     (non-archived tasks only).

   =========================================================== */

/**
 * Calculate company-wide analytics metrics, optionally filtered by project scope.
 * Admin-only — authorization enforced at the route level.
 *
 * @param {Object} projectFilter - Optional MongoDB filter (e.g. { project: null } or { project: id })
 * @returns {Object} Company metrics object
 */
const getCompanyMetrics = async (projectFilter = {}) => {
  const today = new Date();

  // Clone projectFilter and ensure string project ID is converted to ObjectId for aggregate pipeline
  const formattedFilter = { ...projectFilter };
  if (
    formattedFilter.project &&
    typeof formattedFilter.project === "string" &&
    mongoose.Types.ObjectId.isValid(formattedFilter.project)
  ) {
    formattedFilter.project = new mongoose.Types.ObjectId(
      formattedFilter.project,
    );
  }

  const taskMatch = { ...formattedFilter, isArchived: { $ne: true } };

  /* -------------------------------------------------------
     Run all independent queries in parallel
     ------------------------------------------------------- */

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    totalManagers,

    totalProjects,
    activeProjects,
    archivedProjects,

    taskStatusAgg,

    overdueTaskCount,
    highPriorityOverdueCount,
    rejectedTaskCount,
  ] = await Promise.all([
    // ===================== USER COUNTS =====================
    User.countDocuments({ role: ROLES.EMPLOYEE }),
    User.countDocuments({ role: ROLES.EMPLOYEE, isActive: true }),
    User.countDocuments({ role: ROLES.EMPLOYEE, isActive: false }),
    User.countDocuments({ role: ROLES.MANAGER }),

    // =================== PROJECT COUNTS ====================
    Project.countDocuments(),
    Project.countDocuments({ isArchived: false }),
    Project.countDocuments({ isArchived: true }),

    // ================ TASK STATUS DISTRIBUTION =============
    Task.aggregate([
      { $match: taskMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // =================== OVERDUE TASKS =====================
    Task.countDocuments({
      ...taskMatch,
      dueDate: { $lt: today },
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    // ============ HIGH PRIORITY OVERDUE TASKS ==============
    Task.countDocuments({
      ...taskMatch,
      dueDate: { $lt: today },
      priority: "High",
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    // ================ REJECTED TASKS COUNT =================
    Task.countDocuments({
      ...taskMatch,
      status: {
        $in: [TASK_STATUS.TASK_REJECTED, TASK_STATUS.ASSIGNMENT_REJECTED],
      },
    }),
  ]);

  /* -------------------------------------------------------
     Parse task status distribution
     ------------------------------------------------------- */

  const taskStatusDistribution = {};
  let totalTasks = 0;

  taskStatusAgg.forEach((item) => {
    taskStatusDistribution[item._id] = item.count;
    totalTasks += item.count;
  });

  const completedTasks = taskStatusDistribution[TASK_STATUS.CLOSED] || 0;
  const submittedTasks = taskStatusDistribution[TASK_STATUS.SUBMITTED] || 0;

  const activeTasks =
    (taskStatusDistribution[TASK_STATUS.ASSIGNED] || 0) +
    (taskStatusDistribution[TASK_STATUS.ACCEPTED] || 0) +
    (taskStatusDistribution[TASK_STATUS.IN_PROGRESS] || 0);

  const withdrawnTasks = taskStatusDistribution[TASK_STATUS.WITHDRAWN] || 0;

  // Completion rate (exclude withdrawn from denominator)
  const completionDenominator = totalTasks - withdrawnTasks;
  const taskCompletionRate =
    completionDenominator > 0
      ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
      : 0;

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    users: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalManagers,
    },
    projects: {
      totalProjects,
      activeProjects,
      archivedProjects,
    },
    tasks: {
      totalTasks,
      activeTasks,
      submittedTasks,
      completedTasks,
      overdueTasks: overdueTaskCount,
      highPriorityOverdue: highPriorityOverdueCount,
      rejectedTasks: rejectedTaskCount,
      taskCompletionRate,
      taskStatusDistribution,
    },
  };
};

module.exports = {
  getCompanyMetrics,
};
