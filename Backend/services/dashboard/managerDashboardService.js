const User = require("../../models/User");
const Project = require("../../models/Project");
const Task = require("../../models/Task");
const Phase = require("../../models/Phase");
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
const { getManagerTeamMetrics } = require("../analytics/managerAnalytics");

const getManagerAttentionItems = (
  teamMetrics,
  overdueTasks,
  pendingReviewCount,
  rejectedTaskCount = 0,
) => {
  const items = [];

  if (pendingReviewCount > 0) {
    items.push({
      type: "info",
      title: "Pending Submissions",
      message: `${pendingReviewCount} task submission(s) are awaiting your review.`,
    });
  }

  if (overdueTasks > 0) {
    items.push({
      type: "warning",
      title: "Overdue Tasks",
      message: `${overdueTasks} task(s) in your scope are currently past their due date.`,
    });
  }

  if (rejectedTaskCount > 0) {
    items.push({
      type: "warning",
      title: "Task Rejections",
      message: `${rejectedTaskCount} task assignment(s) were rejected by team members and require reassignment.`,
    });
  }

  const overloaded = (teamMetrics?.teamWorkloadDistribution || []).filter(
    (e) => e.activeTasks >= 5,
  );
  if (overloaded.length > 0) {
    items.push({
      type: "warning",
      title: "High Workload Alert",
      message: `${overloaded.length} team member(s) have 5 or more active tasks assigned.`,
    });
  }

  if (items.length === 0) {
    items.push({
      type: "success",
      title: "All Clear",
      message: "No immediate bottlenecks or overdue items requiring action in this scope.",
    });
  }

  return items;
};

const getManagerDashboard = async (req, res) => {
  const today = new Date();

  const { projectIds, projects, noProject, allProjects } =
    await getDashboardScope(req.user, req.query.project);

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
        ? {}
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
              {
                assignedTo: req.user.userId,
              },
            ],
          };
  } else if (projectIds.length > 0) {
    projectFilter = {
      project: projectIds[0],
    };
  } else {
    projectFilter = {
      _id: null,
    };
  }

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
    projectPhasesList,
    teamMetrics,
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
    allProjects || noProject || !projectIds.length
      ? Promise.resolve(null)
      : Project.findById(projectIds[0]).populate("members", "name role").lean(),

    // ===========================================================
    // Project Tasks
    // ===========================================================
    allProjects || noProject || !projectIds.length
      ? Promise.resolve([])
      : Task.find({
          project: projectIds[0],
          isArchived: false,
        })
          .select("title status assignedTo")
          .populate("assignedTo", "name")
          .lean(),

    // ===========================================================
    // Project Phases
    // ===========================================================
    allProjects || noProject || !projectIds.length
      ? Promise.resolve([])
      : Phase.find({
          project: projectIds[0],
          isArchived: false,
        })
          .sort({ order: 1, createdAt: 1 })
          .lean(),

    // ===========================================================
    // Manager Team Metrics
    // ===========================================================
    getManagerTeamMetrics(req.user, projectFilter),
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

  const rejectedTaskCount = await Task.countDocuments({
    ...projectFilter,
    status: {
      $in: [TASK_STATUS.TASK_REJECTED, TASK_STATUS.ASSIGNMENT_REJECTED],
    },
  });

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

  let projectPhases = [];

  if (projectPhasesList && projectPhasesList.length > 0) {
    projectPhases = await Promise.all(
      projectPhasesList.map(async (phase) => {
        const totalTasks = await Task.countDocuments({
          project: projectIds[0],
          phase: phase._id,
          isArchived: false,
        });

        const completedTasks = await Task.countDocuments({
          project: projectIds[0],
          phase: phase._id,
          isArchived: false,
          status: TASK_STATUS.CLOSED,
        });

        const inProgressTasks = await Task.countDocuments({
          project: projectIds[0],
          phase: phase._id,
          isArchived: false,
          status: TASK_STATUS.IN_PROGRESS,
        });

        const overdueTasks = await Task.countDocuments({
          project: projectIds[0],
          phase: phase._id,
          isArchived: false,
          dueDate: { $lt: today },
          status: {
            $in: [
              TASK_STATUS.ASSIGNED,
              TASK_STATUS.ACCEPTED,
              TASK_STATUS.IN_PROGRESS,
            ],
          },
        });

        return {
          _id: phase._id,
          name: phase.name,
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
        };
      }),
    );
  }

  let admin = null;

  if (req.user.role === ROLES.ADMIN) {
    admin = await getAdminDashboardOverview(projectFilter, !allProjects);
  }

  const managerAttention = getManagerAttentionItems(
    teamMetrics,
    overdueTasks,
    pendingReviewCount,
    rejectedTaskCount,
  );

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

    teamMetrics,

    managerAttention,

    projectMembers,

    projectTasks,

    projectPhases,
  });
};

module.exports = {
  getManagerDashboard,
};
