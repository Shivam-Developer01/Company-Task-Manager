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

const getAdminDashboardOverview = async () => {
  const [userOverview, projectOverview, managerPerformance] = await Promise.all(
    [getUserOverview(), getProjectOverview(), getManagerPerformance()],
  );

  return {
    userOverview,
    projectOverview,
    managerPerformance,
  };
};

module.exports = {
  getUserOverview,
  getProjectOverview,
  getManagerPerformance,
  getAdminDashboardOverview,
};
