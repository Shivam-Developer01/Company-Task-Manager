const Submission = require("../models/Submission");
const Task = require("../models/Task");
const CustomError = require("../errors/CustomError");
const User = require("../models/User");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
} = require("../constants/constants");

/* ===========================================================
   SUBMIT TASK
=========================================================== */

const submitTask = async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    assignedTo: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.IN_PROGRESS) {
    throw new CustomError("Only tasks in progress can be submitted", 400);
  }

  const existingSubmission = await Submission.findOne({
    task: task._id,
    status: SUBMISSION_STATUS.PENDING_REVIEW,
  });

  if (existingSubmission) {
    throw new CustomError(
      "A submission is already pending review for this task",
      400,
    );
  }
  // Require either a message or at least one attachment
  if (!req.body.message?.trim() && (!req.files || req.files.length === 0)) {
    throw new CustomError(
      "Please provide a message or attach at least one file.",
      400,
    );
  }

  const attachments = (req.files || []).map((file) => ({
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/submissions/${file.filename}`,
    mimeType: file.mimetype,
    fileSize: file.size,
  }));

  const submissionNumber =
    (await Submission.countDocuments({
      task: task._id,
    })) + 1;

  const submission = await Submission.create({
    task: task._id,
    submittedBy: req.user.userId,
    submissionNumber,
    message: req.body.message || "",
    attachments,
  });

  task.status = TASK_STATUS.SUBMITTED;
  task.updatedBy = req.user.userId;

  await task.save();

  await task.populate([
    {
      path: "assignedTo",
      select: "name employeeId",
    },
    {
      path: "assignedBy",
      select: "name",
    },
    {
      path: "project",
      select: "name",
    },
  ]);

  const employee = await User.findById(req.user.userId).select("name");

  await createActivity({
    task: task._id,
    action: `Submission #${submission.submissionNumber} Submitted`,
    performedBy: req.user.userId,
  });

  await createNotification({
    user: task.assignedBy._id,
    title: "Submission Received",
    message: `${employee.name} submitted "${task.title}" for review.`,
    type: NOTIFICATION_TYPE.SUBMISSION_RECEIVED,
    task: task._id,
    submission: submission._id,
  });

  res.status(201).json({
    success: true,
    message: "Submission uploaded successfully",
    submission,
    task,
  });
};

/* ===========================================================
   MY SUBMISSIONS
=========================================================== */

const getMySubmissions = async (req, res) => {
  const {
    search = "",
    status,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {
    submittedBy: req.user.userId,
  };

  if (status) {
    query.status = status;
  }

  if (search) {
    const tasks = await Task.find({
      title: {
        $regex: search,
        $options: "i",
      },
    }).select("_id");

    query.task = {
      $in: tasks.map((task) => task._id),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const submissions = await Submission.find(query)
    .populate({
      path: "task",
      select: "title status priority dueDate",
    })
    .populate("reviewedBy", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalSubmissions = await Submission.countDocuments(query);

  res.status(200).json({
    success: true,

    currentPage: Number(page),

    totalPages: Math.ceil(totalSubmissions / Number(limit)),

    totalSubmissions,

    count: submissions.length,

    data: submissions,
  });
};

/* ===========================================================
   GET ALL SUBMISSIONS
=========================================================== */

const getAllSubmissions = async (req, res) => {
  const {
    search,
    status,
    employee,
    task,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  if (status) query.status = status;

  if (employee) query.submittedBy = employee;

  if (task) query.task = task;

  // ===========================
  // Search
  // ===========================

  if (search) {
    const [matchedTasks, matchedEmployees] = await Promise.all([
      Task.find({
        title: {
          $regex: search,
          $options: "i",
        },
      }).select("_id"),

      User.find({
        name: {
          $regex: search,
          $options: "i",
        },
      }).select("_id"),
    ]);

    const taskIds = matchedTasks.map((task) => task._id);

    const employeeIds = matchedEmployees.map((user) => user._id);

    query.$or = [
      {
        task: {
          $in: taskIds,
        },
      },
      {
        submittedBy: {
          $in: employeeIds,
        },
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const submissions = await Submission.find(query)
    .populate("task", "title status priority dueDate")
    .populate("submittedBy", "name employeeId")
    .populate("reviewedBy", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalSubmissions = await Submission.countDocuments(query);

  res.status(200).json({
    success: true,
    totalSubmissions,
    currentPage: Number(page),
    totalPages: Math.ceil(totalSubmissions / Number(limit)),
    count: submissions.length,
    data: submissions,
  });
};

/* ===========================================================
   GET SUBMISSION BY ID
=========================================================== */

const getSubmissionById = async (req, res) => {
  let query = {
    _id: req.params.id,
  };

  // Employees can only access their own submissions
  if (req.user.role === ROLES.EMPLOYEE) {
    query.submittedBy = req.user.userId;
  }

  const submission = await Submission.findOne(query)
    .populate({
      path: "task",
      populate: [
        {
          path: "project",
          select: "name",
        },
        {
          path: "assignedTo",
          select: "name employeeId department designation",
        },
        {
          path: "assignedBy",
          select: "name",
        },
      ],
    })
    .populate("submittedBy", "name employeeId")
    .populate("reviewedBy", "name");

  if (!submission) {
    throw new CustomError("Submission not found", 404);
  }

  res.status(200).json({
    success: true,
    data: submission,
  });
};

/* ===========================================================
   REVIEW SUBMISSION
=========================================================== */

const reviewSubmission = async (req, res) => {
  const { action, feedback } = req.body;

  if (!["approve", "reject"].includes(action)) {
    throw new CustomError("Action must be approve or reject", 400);
  }

  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    throw new CustomError("Submission not found", 404);
  }

  if (submission.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
    throw new CustomError("Submission has already been reviewed", 400);
  }

  const task = await Task.findById(submission.task);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  // ===========================================================
  // Validation
  // ===========================================================

  if (task.status !== TASK_STATUS.SUBMITTED) {
    throw new CustomError("This task is not awaiting review", 400);
  }

  const latestSubmission = await Submission.findOne({
    task: submission.task,
  }).sort({ createdAt: -1 });

  if (!latestSubmission._id.equals(submission._id)) {
    throw new CustomError("Only the latest submission can be reviewed", 400);
  }

  // ===========================================================
  // Update Submission
  // ===========================================================

  submission.status =
    action === "approve"
      ? SUBMISSION_STATUS.APPROVED
      : SUBMISSION_STATUS.REJECTED;

  submission.managerFeedback = feedback || "";
  submission.reviewedBy = req.user.userId;
  submission.reviewedAt = new Date();

  await submission.save();

  // ===========================================================
  // Update Task
  // ===========================================================

  if (action === "approve") {
    task.status = TASK_STATUS.CLOSED;
    task.completedAt = new Date();

    await createActivity({
      task: task._id,
      action: "Submission Approved",
      performedBy: req.user.userId,
      remarks: feedback || "",
    });

    await createActivity({
      task: task._id,
      action: "Task Closed",
      performedBy: req.user.userId,
    });

    await createNotification({
      user: task.assignedTo,
      title: "Submission Approved",
      message: `Your submission for "${task.title}" has been approved.`,
      type: NOTIFICATION_TYPE.SUBMISSION_APPROVED,
      task: task._id,
      submission: submission._id,
    });
  } else {
    task.status = TASK_STATUS.IN_PROGRESS;

    await createActivity({
      task: task._id,
      action: "Submission Rejected",
      performedBy: req.user.userId,
      remarks: feedback || "",
    });

    await createNotification({
      user: task.assignedTo,
      title: "Submission Rejected",
      message: feedback
        ? `Your submission for "${task.title}" was rejected.\n\nManager Feedback:\n${feedback}`
        : `Your submission for "${task.title}" was rejected. Please review the task and resubmit.`,
      type: NOTIFICATION_TYPE.SUBMISSION_REJECTED,
      task: task._id,
      submission: submission._id,
    });
  }

  task.updatedBy = req.user.userId;

  await task.save();

  // ===========================================================
  // Populate Updated Submission
  // ===========================================================

  const populatedSubmission = await Submission.findById(submission._id)
    .populate({
      path: "task",
      populate: [
        {
          path: "project",
          select: "name",
        },
        {
          path: "assignedTo",
          select: "name employeeId department designation",
        },
        {
          path: "assignedBy",
          select: "name",
        },
      ],
    })
    .populate("submittedBy", "name employeeId")
    .populate("reviewedBy", "name");

  res.status(200).json({
    success: true,
    message: `Submission #${submission.submissionNumber} ${submission.status.toLowerCase()} successfully`,
    data: populatedSubmission,
  });
};

module.exports = {
  submitTask,
  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
  reviewSubmission,
};
