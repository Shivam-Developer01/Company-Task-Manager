const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const Activity = require("../../models/Activity");

const { TASK_STATUS, SUBMISSION_STATUS } = require("../../constants/constants");
const { getDashboardScope } = require("./dashboardScopeService");
const { getEmployeeMetrics } = require("../analytics/employeeAnalytics");

const getEmployeeAttentionItems = async (userId, taskProjectFilter, overdueCount) => {
  const items = [];

  // Overdue tasks
  if (overdueCount > 0) {
    items.push({
      type: "warning",
      title: "Overdue Tasks",
      message: `You have ${overdueCount} task(s) past their due date. Please complete or update your status.`,
    });
  }

  // High priority active tasks
  const highPriorityCount = await Task.countDocuments({
    assignedTo: userId,
    ...taskProjectFilter,
    priority: "High",
    isArchived: false,
    status: {
      $in: [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS],
    },
  });

  if (highPriorityCount > 0) {
    items.push({
      type: "warning",
      title: "High Priority Tasks",
      message: `You have ${highPriorityCount} high-priority task(s) active in your queue.`,
    });
  }

  // Tasks assigned awaiting acceptance
  const assignedAwaitingAcceptance = await Task.countDocuments({
    assignedTo: userId,
    ...taskProjectFilter,
    isArchived: false,
    status: TASK_STATUS.ASSIGNED,
  });

  if (assignedAwaitingAcceptance > 0) {
    items.push({
      type: "info",
      title: "Tasks Awaiting Acceptance",
      message: `You have ${assignedAwaitingAcceptance} new task(s) assigned awaiting your acceptance.`,
    });
  }

  // Rejected submissions requiring revision (only tasks whose LATEST submission is REJECTED)
  const userSubmissions = await Submission.find({ submittedBy: userId })
    .select("task status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const processedTasks = new Set();
  let pendingResubmissionCount = 0;

  for (const sub of userSubmissions) {
    if (sub.task) {
      const taskIdStr = sub.task.toString();
      if (!processedTasks.has(taskIdStr)) {
        processedTasks.add(taskIdStr);
        if (sub.status === SUBMISSION_STATUS.REJECTED) {
          pendingResubmissionCount++;
        }
      }
    }
  }

  if (pendingResubmissionCount > 0) {
    items.push({
      type: "info",
      title: "Submission Feedback",
      message: `You have ${pendingResubmissionCount} rejected submission(s) requiring review and resubmission.`,
    });
  }

  if (items.length === 0) {
    items.push({
      type: "success",
      title: "All Caught Up",
      message: "No urgent task alerts or overdue deadlines at this time.",
    });
  }

  return items;
};

const getEmployeeDashboard = async (req, res) => {
  const today = new Date();

  const { projectIds, projects, noProject, allProjects } = await getDashboardScope(
    req.user,
    req.query.project,
  );

  const taskProjectFilter = noProject
    ? { project: null }
    : allProjects
      ? {}
      : projectIds.length
        ? { project: { $in: projectIds } }
        : {};

  const projectScopeParam = noProject
    ? "NO_PROJECT"
    : allProjects
      ? null
      : projectIds.length === 1
        ? projectIds[0].toString()
        : null;

  const [
    assigned,
    accepted,
    inProgress,
    submitted,
    closed,
    overdue,
    dueSoon,

    myUpcomingTasks,
    myRecentActivities,
    performanceMetrics,
  ] = await Promise.all([
    /* ===========================
       Statistics
    =========================== */

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      status: TASK_STATUS.ASSIGNED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      status: TASK_STATUS.ACCEPTED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      status: TASK_STATUS.IN_PROGRESS,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      status: TASK_STATUS.SUBMITTED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      status: TASK_STATUS.CLOSED,
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      dueDate: { $lt: today },
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    Task.countDocuments({
      assignedTo: req.user.userId,
      ...taskProjectFilter,
      dueDate: {
        $gte: today,
        $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
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
      ...taskProjectFilter,
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
       Recent Activities
    =========================== */

    Activity.find({
      performedBy: req.user.userId,
      ...taskProjectFilter,
    })
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(5),

    /* ===========================
       Performance Metrics (Phase 1)
    =========================== */

    getEmployeeMetrics(req.user.userId, projectScopeParam),
  ]);

  const taskMatchFilter = noProject
    ? { project: null }
    : allProjects
      ? {}
      : projectIds.length
        ? { project: { $in: projectIds } }
        : {};

  const pendingReviewSubmissions = await Submission.find({
    submittedBy: req.user.userId,
    status: SUBMISSION_STATUS.PENDING_REVIEW,
  }).populate({
    path: "task",
    match: taskMatchFilter,
    select: "_id",
  });

  const pendingReview = pendingReviewSubmissions.filter(
    (submission) => submission.task,
  ).length;

  const submissions = await Submission.find({
    submittedBy: req.user.userId,
  })
    .populate({
      path: "task",
      match: taskMatchFilter,
      select: "title project",
    })
    .sort({ createdAt: -1 });

  const myRecentSubmissions = submissions
    .filter((submission) => submission.task)
    .slice(0, 5);

  const myAttentionItems = await getEmployeeAttentionItems(
    req.user.userId,
    taskProjectFilter,
    overdue,
  );

  res.status(200).json({
    success: true,

    projects,

    statistics: {
      assigned,
      accepted,
      inProgress,
      submitted,
      closed,
      overdue,
      dueSoon,
      pendingReview,
      workloadAttention: {
        overdue,
        dueSoon,
        pendingReview,
        awaitingAcceptance: assigned,
      },
    },

    performanceMetrics,
    myAttentionItems,

    myUpcomingTasks,
    myRecentSubmissions,
    myRecentActivities,
  });
};

module.exports = {
  getEmployeeDashboard,
};

