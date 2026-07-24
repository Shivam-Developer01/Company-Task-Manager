const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Submission = require("../models/Submission");
const Activity = require("../models/Activity");
const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../constants/constants");

/* ===========================================================
                    MANAGER DASHBOARD
=========================================================== */

const getManagerDashboard = async (req, res) => {
  const today = new Date();

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
    pendingReviews,
    upcomingDeadlines,
    recentActivities,
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
    Project.countDocuments(),
    Project.countDocuments({ isArchived: false }),

    // ===========================================================
    // Task Statistics
    // ===========================================================
    Task.countDocuments({ status: TASK_STATUS.ASSIGNED }),
    Task.countDocuments({ status: TASK_STATUS.ACCEPTED }),
    Task.countDocuments({ status: TASK_STATUS.IN_PROGRESS }),
    Task.countDocuments({ status: TASK_STATUS.SUBMITTED }),
    Task.countDocuments({ status: TASK_STATUS.CLOSED }),
    Task.countDocuments({ status: TASK_STATUS.WITHDRAWN }),
    Task.countDocuments({
      status: TASK_STATUS.ASSIGNMENT_REJECTED,
    }),

    // ===========================================================
    // Overdue Tasks
    // ===========================================================
    Task.countDocuments({
      isArchived: false,
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
      isArchived: false,
    })
      .populate("assignedTo", "name")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(5),

    // ===========================================================
    // Pending Reviews
    // ===========================================================
    Submission.find({
      status: SUBMISSION_STATUS.PENDING_REVIEW,
    })
      .populate("task", "title")
      .populate("submittedBy", "name employeeId")
      .sort({ createdAt: -1 })
      .limit(5),

    // ===========================================================
    // Upcoming Deadlines
    // ===========================================================
    Task.find({
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
    Activity.find()
      .populate("performedBy", "name")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  res.status(200).json({
    success: true,

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
    },

    recentTasks,

    recentActivities,

    pendingReviews,

    upcomingDeadlines,
  });
};

/* ===========================================================
                    EMPLOYEE DASHBOARD
=========================================================== */

const getEmployeeDashboard = async (req, res) => {
  const today = new Date();

  const [
    assigned,
    accepted,
    inProgress,
    submitted,
    closed,
    pendingReview,
    overdue,

    myUpcomingTasks,
    myRecentSubmissions,
    myRecentActivities,
  ] = await Promise.all([
    /* ===========================
       Statistics
    =========================== */

    Task.countDocuments({
      assignedTo: req.user.userId,
      status: TASK_STATUS.ASSIGNED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      status: TASK_STATUS.ACCEPTED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      status: TASK_STATUS.IN_PROGRESS,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      status: TASK_STATUS.SUBMITTED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      status: TASK_STATUS.CLOSED,
    }),

    Submission.countDocuments({
      submittedBy: req.user.userId,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      dueDate: { $lt: today },
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    /* ===========================
       My Upcoming Tasks
    =========================== */

    Task.find({
      assignedTo: req.user.userId,
      isArchived: false,
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    })
      .populate("project", "name")
      .sort({ dueDate: 1 })
      .limit(5),

    /* ===========================
       Recent Submissions
    =========================== */

    Submission.find({
      submittedBy: req.user.userId,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(5),

    /* ===========================
       Recent Activities
    =========================== */

    Activity.find({
      performedBy: req.user.userId,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  res.status(200).json({
    success: true,

    statistics: {
      assigned,
      accepted,
      inProgress,
      submitted,
      closed,
      overdue,
      pendingReview,
    },

    myUpcomingTasks,

    myRecentSubmissions,

    myRecentActivities,
  });
};

const getProjectDashboard = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  const totalMembers = project.members.length;

  const taskStats = await Task.aggregate([
    {
      $match: {
        project: project._id,
      },
    },
    {
      $group: {
        _id: "$status",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const summary = {
    totalTasks: 0,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    submitted: 0,
    closed: 0,
    rejected: 0,
    withdrawn: 0,
  };

  taskStats.forEach((item) => {
    summary.totalTasks += item.count;

    switch (item._id) {
      case TASK_STATUS.ASSIGNED:
        summary.assigned = item.count;
        break;

      case TASK_STATUS.ACCEPTED:
        summary.accepted = item.count;
        break;

      case TASK_STATUS.IN_PROGRESS:
        summary.inProgress = item.count;
        break;

      case TASK_STATUS.SUBMITTED:
        summary.submitted = item.count;
        break;

      case TASK_STATUS.CLOSED:
        summary.closed = item.count;
        break;

      case TASK_STATUS.TASK_REJECTED:
        summary.rejected = item.count;
        break;

      case TASK_STATUS.WITHDRAWN:
        summary.withdrawn = item.count;
        break;
    }
  });

  const completionPercentage =
    summary.totalTasks === 0
      ? 0
      : Number(((summary.closed / summary.totalTasks) * 100).toFixed(2));

  res.status(200).json({
    success: true,
    data: {
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        isArchived: project.isArchived,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy,
        updatedBy: project.updatedBy,
      },

      summary: {
        totalMembers,
        totalTasks: summary.totalTasks,
        completionPercentage,
      },

      taskStatus: {
        assigned: summary.assigned,
        accepted: summary.accepted,
        inProgress: summary.inProgress,
        submitted: summary.submitted,
        closed: summary.closed,
        rejected: summary.rejected,
        withdrawn: summary.withdrawn,
      },
    },
  });
};

const getProjectAnalytics = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  /*
  ----------------------------------
  Priority Distribution
  ----------------------------------
  */

  const priorityAggregation = await Task.aggregate([
    {
      $match: {
        project: project._id,
      },
    },
    {
      $group: {
        _id: "$priority",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const priorityDistribution = {};

  priorityAggregation.forEach((item) => {
    priorityDistribution[item._id] = item.count;
  });

  /*
  ----------------------------------
  Member Workload
  ----------------------------------
  */

  const memberWorkload = await Task.aggregate([
    {
      $match: {
        project: project._id,
      },
    },
    {
      $group: {
        _id: "$assignedTo",

        assignedTasks: {
          $sum: 1,
        },

        completedTasks: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", TASK_STATUS.CLOSED],
              },
              1,
              0,
            ],
          },
        },

        pendingTasks: {
          $sum: {
            $cond: [
              {
                $ne: ["$status", TASK_STATUS.CLOSED],
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
    {
      $unwind: "$employee",
    },
    {
      $project: {
        _id: "$employee._id",
        name: "$employee.name",
        employeeId: "$employee.employeeId",
        assignedTasks: 1,
        completedTasks: 1,
        pendingTasks: 1,
      },
    },
    {
      $sort: {
        assignedTasks: -1,
      },
    },
  ]);

  /*
  ----------------------------------
  Upcoming Deadlines
  ----------------------------------
  */

  const today = new Date();

  const next7Days = new Date();

  next7Days.setDate(today.getDate() + 7);

  const upcomingDeadlines = await Task.find({
    project: project._id,

    dueDate: {
      $gte: today,
      $lte: next7Days,
    },

    status: {
      $ne: TASK_STATUS.CLOSED,
    },
  })
    .populate("assignedTo", "name employeeId")
    .select("title dueDate priority assignedTo")
    .sort({
      dueDate: 1,
    });

  /*
  ----------------------------------
  Overdue Tasks
  ----------------------------------
  */

  const overdueTasks = await Task.countDocuments({
    project: project._id,

    dueDate: {
      $lt: today,
    },

    status: {
      $ne: TASK_STATUS.CLOSED,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      priorityDistribution,
      memberWorkload,
      upcomingDeadlines,
      overdueTasks,
    },
  });
};

module.exports = {
  getManagerDashboard,
  getEmployeeDashboard,
  getProjectDashboard,
  getProjectAnalytics,
};
