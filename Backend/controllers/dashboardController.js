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

module.exports = {
  getManagerDashboard,
  getEmployeeDashboard,
};
