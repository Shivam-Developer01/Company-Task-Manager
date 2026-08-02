const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const Activity = require("../../models/Activity");

const { TASK_STATUS, SUBMISSION_STATUS } = require("../../constants/constants");

const { getDashboardScope } = require("./dashboardScopeService");

const getEmployeeDashboard = async (req, res) => {
  const today = new Date();

  const { projectIds, projects, noProject } = await getDashboardScope(
    req.user,
    req.query.project,
  );

  const taskProjectFilter = noProject
    ? { project: null }
    : projectIds.length
      ? { project: { $in: projectIds } }
      : {};

  const [
    assigned,
    accepted,
    inProgress,
    submitted,
    closed,
    overdue,

    myUpcomingTasks,
    myRecentActivities,
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
  ]);

  const pendingReviewSubmissions = await Submission.find({
    submittedBy: req.user.userId,
    status: SUBMISSION_STATUS.PENDING_REVIEW,
  }).populate({
    path: "task",
    match: noProject
      ? { project: null }
      : projectIds.length
        ? { project: { $in: projectIds } }
        : {},
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
      match: noProject
        ? { project: null }
        : projectIds.length
          ? { project: { $in: projectIds } }
          : {},
      select: "title project",
    })
    .sort({ createdAt: -1 });

  const myRecentSubmissions = submissions
    .filter((submission) => submission.task)
    .slice(0, 5);

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
      pendingReview,
    },

    myUpcomingTasks,
    myRecentSubmissions,
    myRecentActivities,
  });
};

module.exports = {
  getEmployeeDashboard,
};
