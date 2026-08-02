const Submission = require("../../models/Submission");
const Task = require("../../models/Task");
const User = require("../../models/User");

const {
  getSubmissionFilter,
  getAccessibleSubmission,
} = require("../access/submissionAccess");

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

  const query = await getSubmissionFilter(req.user);

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
  const submission = await getAccessibleSubmission(req.params.id, req.user);
  await submission.populate({
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
  });

  await submission.populate("submittedBy", "name employeeId");
  await submission.populate("reviewedBy", "name");

  res.status(200).json({
    success: true,
    data: submission,
  });
};

module.exports = {
  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
};
