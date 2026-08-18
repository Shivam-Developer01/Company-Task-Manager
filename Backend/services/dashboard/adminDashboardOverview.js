const User = require("../../models/User");
const Project = require("../../models/Project");
const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../../constants/constants");

const getUserOverview = async () => {
  const [admins, managers, employees, activeUsers, inactiveUsers] =
    await Promise.all([
      User.countDocuments({
        role: ROLES.ADMIN,
      }),

      User.countDocuments({
        role: ROLES.MANAGER,
      }),

      User.countDocuments({
        role: ROLES.EMPLOYEE,
      }),

      User.countDocuments({
        isActive: true,
      }),

      User.countDocuments({
        isActive: false,
      }),
    ]);

  return {
    totalUsers: admins + managers + employees,

    admins,

    managers,

    employees,

    activeUsers,

    inactiveUsers,
  };
};

const getProjectOverview = async () => {
  const today = new Date();

  const [
    totalProjects,
    activeProjects,
    archivedProjects,
    overdueProjects,
    independentTasks,
  ] = await Promise.all([
    Project.countDocuments(),

    Project.countDocuments({
      isArchived: false,
    }),

    Project.countDocuments({
      isArchived: true,
    }),

    Task.distinct("project", {
      project: { $ne: null },
      isArchived: false,
      dueDate: { $lt: today },
      status: {
        $nin: [TASK_STATUS.CLOSED, TASK_STATUS.WITHDRAWN],
      },
    }).then((projects) => projects.length),

    Task.countDocuments({
      project: null,
      isArchived: false,
    }),
  ]);

  return {
    totalProjects,
    activeProjects,
    archivedProjects,
    overdueProjects,
    independentTasks,
  };
};

const getManagerPerformance = async () => {
  const today = new Date();

  const managers = await User.find({
    role: ROLES.MANAGER,
    isActive: true,
  })
    .select("_id name email")
    .lean();

  const performance = await Promise.all(
    managers.map(async (manager) => {
      // Projects manager can manage
      const projectIds = await Project.find({
        isArchived: false,
        $or: [{ createdBy: manager._id }, { members: manager._id }],
      }).distinct("_id");

      const [projects, activeTasks, overdueTasks, pendingReviews] =
        await Promise.all([
          // Managed Projects
          Project.countDocuments({
            _id: { $in: projectIds },
          }),

          // Active Tasks under managed projects + independent tasks created by manager
          Task.countDocuments({
            isArchived: false,
            status: {
              $nin: [TASK_STATUS.CLOSED, TASK_STATUS.WITHDRAWN],
            },
            $or: [
              {
                project: {
                  $in: projectIds,
                },
              },
              {
                project: null,
                assignedBy: manager._id,
              },
            ],
          }),

          // Overdue Tasks
          Task.countDocuments({
            isArchived: false,
            dueDate: { $lt: today },
            status: {
              $nin: [TASK_STATUS.CLOSED, TASK_STATUS.WITHDRAWN],
            },
            $or: [
              {
                project: {
                  $in: projectIds,
                },
              },
              {
                project: null,
                assignedBy: manager._id,
              },
            ],
          }),

          // Pending Reviews
          Submission.aggregate([
            {
              $match: {
                status: SUBMISSION_STATUS.PENDING_REVIEW,
              },
            },
            {
              $lookup: {
                from: "tasks",
                localField: "task",
                foreignField: "_id",
                as: "task",
              },
            },
            {
              $unwind: "$task",
            },
            {
              $match: {
                "task.isArchived": false,
                $or: [
                  {
                    "task.project": {
                      $in: projectIds,
                    },
                  },
                  {
                    "task.project": null,
                    "task.assignedBy": manager._id,
                  },
                ],
              },
            },
            {
              $count: "count",
            },
          ]),
        ]);

      return {
        manager,

        projects,

        activeTasks,

        overdueTasks,

        pendingReviews: pendingReviews.length > 0 ? pendingReviews[0].count : 0,
      };
    }),
  );

  performance.sort((a, b) => {
    if (b.projects !== a.projects) {
      return b.projects - a.projects;
    }

    if (b.activeTasks !== a.activeTasks) {
      return b.activeTasks - a.activeTasks;
    }

    if (a.overdueTasks !== b.overdueTasks) {
      return a.overdueTasks - b.overdueTasks;
    }

    return a.pendingReviews - b.pendingReviews;
  });

  return performance;
};

const { getCompanyMetrics } = require("../analytics/companyAnalytics");

const getAttentionItems = (companyMetrics, projectOverview, managerPerformance, isFiltered = false) => {
  const items = [];

  if (companyMetrics.tasks.overdueTasks > 0) {
    items.push({
      type: "warning",
      title: "Overdue Tasks",
      message: `${companyMetrics.tasks.overdueTasks} task(s) in this scope are past their due date and require attention.`,
    });
  }

  if (companyMetrics.tasks.highPriorityOverdue > 0) {
    items.push({
      type: "warning",
      title: "High-Priority Delays",
      message: `${companyMetrics.tasks.highPriorityOverdue} high-priority task(s) are currently overdue.`,
    });
  }

  if (companyMetrics.tasks.rejectedTasks > 0) {
    items.push({
      type: "warning",
      title: "Rejected Assignments",
      message: `${companyMetrics.tasks.rejectedTasks} task assignment(s) were rejected by employees and require review/reassignment.`,
    });
  }

  if (!isFiltered && projectOverview.overdueProjects > 0) {
    items.push({
      type: "warning",
      title: "Overdue Projects",
      message: `${projectOverview.overdueProjects} active project(s) contain overdue tasks.`,
    });
  }

  const managersWithBacklog = managerPerformance.filter(
    (m) => m.pendingReviews >= 3,
  );
  if (!isFiltered && managersWithBacklog.length > 0) {
    items.push({
      type: "info",
      title: "Review Backlog",
      message: `${managersWithBacklog.length} manager(s) have 3 or more pending submissions awaiting review.`,
    });
  }

  const highOverdueManagers = managerPerformance.filter(
    (m) => m.overdueTasks >= 3,
  );
  if (!isFiltered && highOverdueManagers.length > 0) {
    items.push({
      type: "warning",
      title: "Team Delays",
      message: `${highOverdueManagers.length} manager team(s) have 3 or more overdue tasks.`,
    });
  }

  if (items.length === 0) {
    items.push({
      type: "success",
      title: "Healthy Operations",
      message: "No critical operational risks or high backlogs detected in this scope.",
    });
  }

  return items;
};

const getOperationalInsights = (companyMetrics, userOverview, projectOverview, isFiltered = false) => {
  const insights = [];

  const scopeLabel = isFiltered ? "selected filter scope" : "the company";
  const tasks = companyMetrics.tasks || {};

  insights.push(
    `Overall task completion rate for ${scopeLabel} is ${tasks.taskCompletionRate || 0}%.`,
  );

  insights.push(
    `Currently tracking ${tasks.totalTasks || 0} total task(s) (${tasks.completedTasks || 0} closed, ${tasks.activeTasks || 0} active in progress, ${tasks.submittedTasks || 0} submitted for review).`,
  );

  if (tasks.taskStatusDistribution) {
    const submittedCount = tasks.taskStatusDistribution[TASK_STATUS.SUBMITTED] || 0;
    const inProgressCount = tasks.taskStatusDistribution[TASK_STATUS.IN_PROGRESS] || 0;
    const acceptedCount = tasks.taskStatusDistribution[TASK_STATUS.ACCEPTED] || 0;
    const assignedCount = tasks.taskStatusDistribution[TASK_STATUS.ASSIGNED] || 0;

    insights.push(
      `Workload status breakdown: ${assignedCount} assigned, ${acceptedCount} accepted, ${inProgressCount} in progress, ${submittedCount} pending review.`,
    );
  }

  if (!isFiltered) {
    insights.push(
      `Workforce consists of ${userOverview.activeUsers} active user(s) (${userOverview.employees} employees, ${userOverview.managers} managers, ${userOverview.admins} admins).`,
    );

    insights.push(
      `Currently managing ${projectOverview.activeProjects} active project(s).`,
    );

    if (projectOverview.independentTasks > 0) {
      insights.push(
        `There are ${projectOverview.independentTasks} independent task(s) assigned outside of standard projects.`,
      );
    }
  }

  return insights;
};

const getAdminDashboardOverview = async (projectFilter = {}, isFiltered = false) => {
  const [userOverview, projectOverview, managerPerformance, companyMetrics] =
    await Promise.all([
      getUserOverview(),
      getProjectOverview(),
      getManagerPerformance(),
      getCompanyMetrics(projectFilter),
    ]);

  const attentionItems = getAttentionItems(
    companyMetrics,
    projectOverview,
    managerPerformance,
    isFiltered,
  );
  const insights = getOperationalInsights(
    companyMetrics,
    userOverview,
    projectOverview,
    isFiltered,
  );

  return {
    userOverview,
    projectOverview,
    managerPerformance,
    companyMetrics,
    attentionItems,
    insights,
  };
};

module.exports = {
  getUserOverview,
  getProjectOverview,
  getManagerPerformance,
  getAdminDashboardOverview,
};
