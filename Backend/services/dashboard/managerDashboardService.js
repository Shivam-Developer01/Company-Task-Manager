const User = require("../../models/User");
const Project = require("../../models/Project");
const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const Activity = require("../../models/Activity");
const { getSubmissionFilter } = require("../access/submissionAccess");

const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../../constants/constants");

const { getDashboardScope } = require("./dashboardScopeService");

const { getAdminDashboardOverview } = require("./adminDashboardOverview");

const getManagerDashboard = async (req, res) => {
  const today = new Date();

  const { projectIds, projects, noProject, allProjects } =
    await getDashboardScope(req.user, req.query.project);

  console.log("Logged In Manager:", req.user.userId);

  console.log(
    "Accessible Projects:",
    await Project.find({
      _id: { $in: projectIds },
    })
      .select("name createdBy members")
      .lean(),
  );

  let projectFilter;

  if (noProject) {
    projectFilter =
      req.user.role === ROLES.ADMIN
        ? {
            project: null,
          }
        : {
            project: null,
            assignedBy: req.user.userId,
          };
  } else if (allProjects) {
    projectFilter =
      req.user.role === ROLES.ADMIN
        ? {
            $or: [
              {
                project: {
                  $in: projectIds,
                },
              },
              {
                project: null,
              },
            ],
          }
        : {
            $or: [
              {
                project: {
                  $in: projectIds,
                },
              },
              {
                project: null,
                assignedBy: req.user.userId,
              },
            ],
          };
  } else {
    projectFilter = {
      project: projectIds[0],
    };
  }

  console.log(
    "Recent Tasks:",
    await Task.find(projectFilter)
      .populate("project", "name")
      .select("title project assignedBy")
      .lean(),
  );

  // let accessibleTaskFilter;

  // if (noProject) {
  //   accessibleTaskFilter =
  //     req.user.role === ROLES.ADMIN
  //       ? {
  //           project: null,
  //         }
  //       : {
  //           project: null,
  //           assignedBy: req.user.userId,
  //         };
  // } else if (allProjects) {
  //   accessibleTaskFilter =
  //     req.user.role === ROLES.ADMIN
  //       ? {
  //           $or: [
  //             {
  //               project: {
  //                 $in: projectIds,
  //               },
  //             },
  //             {
  //               project: null,
  //             },
  //           ],
  //         }
  //       : {
  //           $or: [
  //             {
  //               project: {
  //                 $in: projectIds,
  //               },
  //             },
  //             {
  //               project: null,
  //               assignedBy: req.user.userId,
  //             },
  //           ],
  //         };
  // } else {
  //   accessibleTaskFilter = {
  //     project: projectIds[0],
  //   };
  // }

  // const accessibleTaskIds =
  //   await Task.find(accessibleTaskFilter).distinct("_id");

  const filteredTaskIds = await Task.find(projectFilter).distinct("_id");

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,

    totalProjects,
    activeProjects,

    assigned,
    accepted,
    inProgress,
    submitted,
    closed,
    withdrawn,
    assignmentRejected,

    overdueTasks,

    recentTasks,
    upcomingDeadlines,
    recentActivities,
    projectInfo,
    projectTasks,
  ] = await Promise.all([
    // ===========================================================
    // Employee Statistics
    // ===========================================================
    User.countDocuments({ role: ROLES.EMPLOYEE }),
    User.countDocuments({
      role: ROLES.EMPLOYEE,
      isActive: true,
    }),
    User.countDocuments({
      role: ROLES.EMPLOYEE,
      isActive: false,
    }),

    // ===========================================================
    // Project Statistics
    // ===========================================================
    Project.countDocuments({
      _id: { $in: projectIds },
    }),
    Project.countDocuments({
      _id: { $in: projectIds },
      isArchived: false,
    }),

    // ===========================================================
    // Task Statistics
    // ===========================================================
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.ASSIGNED,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.ACCEPTED,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.IN_PROGRESS,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.SUBMITTED,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.CLOSED,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.WITHDRAWN,
    }),
    Task.countDocuments({
      ...projectFilter,
      status: TASK_STATUS.ASSIGNMENT_REJECTED,
    }),

    // ===========================================================
    // Overdue Tasks
    // ===========================================================
    Task.countDocuments({
      isArchived: false,
      ...projectFilter,
      dueDate: { $lt: today },
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    // ===========================================================
    // Recent Tasks
    // ===========================================================
    Task.find({
      ...projectFilter,
      isArchived: false,
    })
      .populate("assignedTo", "name")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(5),

    // ===========================================================
    // Upcoming Deadlines
    // ===========================================================
    Task.find({
      ...projectFilter,
      isArchived: false,
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    })
      .populate("assignedTo", "name")
      .populate("project", "name")
      .sort({ dueDate: 1 })
      .limit(5),

    // ===========================================================
    // Recent Activities
    // ===========================================================
    Activity.find({
      task: {
        $in: filteredTaskIds,
      },
    })
      .populate("performedBy", "name")
      .populate("task", "title")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(5),

    // ===========================================================
    // Project Members
    // ===========================================================
    allProjects || noProject
      ? Promise.resolve(null)
      : Project.findById(projectIds[0]).populate("members", "name role").lean(),

    // ===========================================================
    // Project Tasks
    // ===========================================================
    allProjects || noProject
      ? Promise.resolve([])
      : Task.find({
          project: projectIds[0],
          isArchived: false,
        })
          .select("title status assignedTo")
          .populate("assignedTo", "name")
          .lean(),
  ]);

  const submissionFilter = await getSubmissionFilter(req.user);

  submissionFilter.task = {
    $in: filteredTaskIds,
  };

  submissionFilter.status = SUBMISSION_STATUS.PENDING_REVIEW;

  const pendingReviews = await Submission.find(submissionFilter)
    .populate("task", "title project")
    .populate("submittedBy", "name employeeId")
    .sort({ createdAt: -1 })
    .limit(5);

  const pendingReviewCount = await Submission.countDocuments(submissionFilter);

  let projectMembers = [];

  if (projectInfo) {
    projectMembers = await Promise.all(
      projectInfo.members.map(async (member) => {
        let activeTasks = 0;

        if (member.role === ROLES.EMPLOYEE) {
          activeTasks = await Task.countDocuments({
            project: projectIds[0],
            assignedTo: member._id,
            isArchived: false,
            status: {
              $in: [
                TASK_STATUS.ASSIGNED,
                TASK_STATUS.ACCEPTED,
                TASK_STATUS.IN_PROGRESS,
              ],
            },
          });
        }

        return {
          _id: member._id,
          name: member.name,
          role: member.role,
          activeTasks: member.role === ROLES.EMPLOYEE ? activeTasks : null,
        };
      }),
    );
  }

  let admin = null;

  if (req.user.role === ROLES.ADMIN) {
    admin = await getAdminDashboardOverview();
  }

  res.status(200).json({
    success: true,

    projects,

    statistics: {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
      },

      projects: {
        total: totalProjects,
        active: activeProjects,
      },

      tasks: {
        assigned,
        accepted,
        inProgress,
        submitted,
        closed,
        withdrawn,
        assignmentRejected,
      },

      overdueTasks,
      pendingReviews: pendingReviewCount,
    },

    recentTasks,

    recentActivities,

    pendingReviews,

    upcomingDeadlines,

    admin,

    projectMembers,

    projectTasks,
  });
};

module.exports = {
  getManagerDashboard,
};
