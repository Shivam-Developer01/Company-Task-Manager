const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
const CustomError = require("../../errors/CustomError");

const createActivity = require("../../utils/createActivity");
const createNotification = require("../../utils/createNotification");

const { TASK_STATUS, NOTIFICATION_TYPE } = require("../../constants/constants");

const { getProjectFilter } = require("../access/projectAccess");

const { getAccessibleTask } = require("../access/taskAccess");

const withdrawTask = async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  const withdrawableStatuses = [
    TASK_STATUS.ASSIGNED,
    TASK_STATUS.ACCEPTED,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.TASK_REJECTED,
  ];

  if (!withdrawableStatuses.includes(task.status)) {
    throw new CustomError(
      `Tasks with status "${task.status}" cannot be withdrawn.`,
      400,
    );
  }

  task.status = TASK_STATUS.WITHDRAWN;
  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: NOTIFICATION_TYPE.TASK_WITHDRAWN,
    performedBy: req.user.userId,
  });

  await createNotification({
    user: task.assignedTo,
    title: "Task Withdrawn",
    message: `Task "${task.title}" has been withdrawn by the manager.`,
    type: NOTIFICATION_TYPE.TASK_WITHDRAWN,
    task: task._id,
  });

  res.status(200).json({
    success: true,
    message: "Task withdrawn successfully",
    data: task,
  });
};

const reassignTask = async (req, res) => {
  const { assignedTo } = req.body;

  if (!assignedTo) {
    throw new CustomError("Assigned employee is required", 400);
  }

  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.WITHDRAWN) {
    throw new CustomError("Task must be withdrawn before reassignment.", 400);
  }

  const employee = await User.findOne({
    _id: assignedTo,
    role: ROLES.EMPLOYEE,
    isActive: true,
  });

  if (!employee) {
    throw new CustomError("Employee not found", 404);
  }

  if (task.project) {
    const accessFilter = getProjectFilter(req.user);

    const project = await Project.findOne({
      _id: task.project,
      ...accessFilter,
    });

    const isMember = project.members.some(
      (member) => member.toString() === assignedTo.toString(),
    );

    if (!isMember) {
      throw new CustomError(
        "Selected employee is not a member of this project.",
        400,
      );
    }
  }

  task.assignedTo = assignedTo;
  task.assignedBy = req.user.userId;

  task.status = TASK_STATUS.ASSIGNED;
  task.rejectionReason = "";

  task.checklist.forEach((item) => {
    item.completed = false;
  });

  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: NOTIFICATION_TYPE.TASK_REASSIGNED,
    performedBy: req.user.userId,
  });

  await createNotification({
    user: task.assignedTo,
    title: "Task Reassigned",
    message: `Task "${task.title}" has been assigned to you.`,
    type: NOTIFICATION_TYPE.TASK_REASSIGNED,
    task: task._id,
  });

  res.status(200).json({
    success: true,
    message: "Task reassigned successfully",
    data: task,
  });
};

const toggleTaskArchive = async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  if (!task.isArchived) {
    const archivableStatuses = [TASK_STATUS.CLOSED, TASK_STATUS.WITHDRAWN];

    if (!archivableStatuses.includes(task.status)) {
      throw new CustomError(
        "Only closed or withdrawn tasks can be archived.",
        400,
      );
    }
  }

  task.isArchived = !task.isArchived;
  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: task.isArchived ? "Task Archived" : "Task Restored",
    performedBy: req.user.userId,
  });

  res.status(200).json({
    success: true,
    message: `Task ${task.isArchived ? "archived" : "restored"} successfully`,
    data: task,
  });
};

module.exports = {
  withdrawTask,
  reassignTask,
  toggleTaskArchive,
};
