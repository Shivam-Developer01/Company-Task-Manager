const Task = require("../../models/Task");
const User = require("../../models/User");
const Activity = require("../../models/Activity");

const CustomError = require("../../errors/CustomError");

const createActivity = require("../../utils/createActivity");
const createNotification = require("../../utils/createNotification");
const getNotificationRecipients = require("../../utils/getNotificationRecipients");

const { TASK_STATUS, NOTIFICATION_TYPE } = require("../../constants/constants");

const { getAccessibleTask } = require("../access/taskAccess");

const getMyTasks = async (req, res) => {
  const { search, status, priority, page = 1, limit = 10 } = req.query;

  const query = {
    assignedTo: req.user.userId,
    isArchived: false,
  };

  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const tasks = await Task.find(query)
    .populate("project", "name")
    .populate("assignedBy", "name")
    .sort({
      dueDate: 1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalTasks = await Task.countDocuments(query);

  res.status(200).json({
    success: true,
    totalTasks,
    currentPage: Number(page),
    totalPages: Math.ceil(totalTasks / Number(limit)),
    count: tasks.length,
    data: tasks,
  });
};

const acceptTask = async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.ASSIGNED) {
    throw new CustomError("Only assigned tasks can be accepted", 400);
  }

  task.status = TASK_STATUS.ACCEPTED;
  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
    performedBy: req.user.userId,
  });

  const recipients = await getNotificationRecipients({
    type: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
    task,
    actor: req.user.userId,
  });

  for (const user of recipients) {
    await createNotification({
      user,
      title: "Task Accepted",
      message: `Task "${task.title}" has been accepted.`,
      type: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
      task: task._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Task accepted successfully",
    data: task,
  });
};

const rejectTask = async (req, res) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    throw new CustomError("Rejection reason is required", 400);
  }

  const employee = await User.findById(req.user.userId).select("name");

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.ASSIGNED) {
    throw new CustomError("Only assigned tasks can be rejected", 400);
  }

  task.status = TASK_STATUS.TASK_REJECTED;
  task.rejectionReason = rejectionReason;
  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: NOTIFICATION_TYPE.ASSIGNMENT_REJECTED,
    performedBy: req.user.userId,
    remarks: rejectionReason,
  });

  const recipients = await getNotificationRecipients({
    type: NOTIFICATION_TYPE.ASSIGNMENT_REJECTED,
    task,
    actor: req.user.userId,
  });

  for (const user of recipients) {
    await createNotification({
      user,
      title: "Assignment Rejected",
      message: `${employee.name} rejected task "${task.title}".`,
      type: NOTIFICATION_TYPE.ASSIGNMENT_REJECTED,
      task: task._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Task rejected successfully",
    data: task,
  });
};

const startTask = async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.ACCEPTED) {
    throw new CustomError("Task must be accepted before starting", 400);
  }

  task.status = TASK_STATUS.IN_PROGRESS;
  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: "Task Started",
    performedBy: req.user.userId,
  });

  res.status(200).json({
    success: true,
    message: "Task started successfully",
    data: task,
  });
};

const updateChecklist = async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    assignedTo: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.IN_PROGRESS) {
    throw new CustomError(
      "Checklist can only be updated while task is in progress",
      400,
    );
  }

  const item = task.checklist.id(req.params.checklistId);

  if (!item) {
    throw new CustomError("Checklist item not found", 404);
  }

  item.completed = !item.completed;

  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: item.completed
      ? "Checklist Item Completed"
      : "Checklist Item Unchecked",
    performedBy: req.user.userId,
    remarks: item.title,
  });

  res.status(200).json({
    success: true,
    message: "Checklist updated successfully",
    data: task,
  });
};

const getTaskActivities = async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  const activities = await Activity.find({
    task: task._id,
  })
    .populate("performedBy", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
};

module.exports = {
  getMyTasks,
  acceptTask,
  rejectTask,
  startTask,
  updateChecklist,
  getTaskActivities,
};
