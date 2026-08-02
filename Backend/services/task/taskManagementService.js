const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
const CustomError = require("../../errors/CustomError");

const createActivity = require("../../utils/createActivity");
const createNotification = require("../../utils/createNotification");

const {
  ROLES,
  TASK_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

const { getProjectFilter } = require("../access/projectAccess");

const { getAccessibleTask } = require("../access/taskAccess");

const createTask = async (req, res) => {
  const {
    title,
    description,
    assignedTo,
    priority,
    dueDate,
    project,
    checklist,
  } = req.body;

  // Validate employee
  const employee = await User.findOne({
    _id: assignedTo,
    role: ROLES.EMPLOYEE,
    isActive: true,
  });

  if (!employee) {
    throw new CustomError("Employee not found or inactive", 404);
  }

  let projectDoc = null;

  // Validate project and membership
  if (project) {
    const accessFilter = getProjectFilter(req.user);

    projectDoc = await Project.findOne({
      _id: project,
      isArchived: false,
      ...accessFilter,
    });

    if (!projectDoc) {
      throw new CustomError("Project not found", 404);
    }

    const isMember = projectDoc.members.some(
      (member) => member.toString() === assignedTo.toString(),
    );

    if (!isMember) {
      throw new CustomError(
        "Assigned employee is not a member of this project",
        400,
      );
    }
  }

  // Upload reference attachments
  const referenceAttachments = (req.files || []).map((file) => ({
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/references/${file.filename}`,
    mimeType: file.mimetype,
    fileSize: file.size,
  }));

  // Parse checklist if it comes as JSON string (multipart/form-data)
  let parsedChecklist = [];

  if (checklist) {
    try {
      parsedChecklist =
        typeof checklist === "string" ? JSON.parse(checklist) : checklist;
    } catch {
      throw new CustomError("Invalid checklist format", 400);
    }
  }

  // Create task
  const task = await Task.create({
    title,
    description,
    project: projectDoc ? projectDoc._id : null,
    assignedTo,
    assignedBy: req.user.userId,
    priority,
    dueDate,
    checklist: parsedChecklist,
    referenceAttachments,
    createdBy: req.user.userId,
  });

  // Activity log
  await createActivity({
    project: task.project || null,
    task: task._id,
    action: "Task Created",
    performedBy: req.user.userId,
  });

  // Notification
  await createNotification({
    user: task.assignedTo,
    title: "New Task Assigned",
    message: `A new task "${task.title}" has been assigned to you.`,
    type: NOTIFICATION_TYPE.TASK_ASSIGNED,
    task: task._id,
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
};

const updateTask = async (req, res) => {
  const {
    title,
    description,
    assignedTo,
    priority,
    dueDate,
    project,
    checklist,
  } = req.body;

  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  const editableStatuses = [
    TASK_STATUS.ASSIGNED,
    TASK_STATUS.ACCEPTED,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.TASK_REJECTED,
    TASK_STATUS.WITHDRAWN,
  ];

  if (!editableStatuses.includes(task.status)) {
    throw new CustomError(
      `Tasks with status "${task.status}" cannot be edited.`,
      400,
    );
  }

  // Determine final project and assignee
  const projectId = project ?? task.project;
  const assignedEmployeeId = assignedTo ?? task.assignedTo;

  let projectDoc = null;

  if (projectId) {
    const accessFilter = getProjectFilter(req.user);

    projectDoc = await Project.findOne({
      _id: projectId,
      isArchived: false,
      ...accessFilter,
    });
    if (!projectDoc) {
      throw new CustomError("Project not found", 404);
    }

    const employee = await User.findOne({
      _id: assignedEmployeeId,
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    if (!employee) {
      throw new CustomError("Employee not found or inactive", 404);
    }

    const isMember = projectDoc.members.some(
      (member) => member.toString() === assignedEmployeeId.toString(),
    );

    if (!isMember) {
      throw new CustomError(
        "Selected employee is not a member of this project",
        400,
      );
    }

    task.project = projectId;
    task.assignedTo = assignedEmployeeId;
  } else if (assignedTo) {
    // For tasks without a project
    const employee = await User.findOne({
      _id: assignedTo,
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    if (!employee) {
      throw new CustomError("Employee not found or inactive", 404);
    }

    task.assignedTo = assignedTo;
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (checklist !== undefined) task.checklist = checklist;

  if (req.files?.length) {
    const newAttachments = req.files.map((file) => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/references/${file.filename}`,
      mimeType: file.mimetype,
      fileSize: file.size,
    }));

    task.referenceAttachments.push(...newAttachments);

    await createActivity({
      task: task._id,
      action: "Reference Attachments Added",
      performedBy: req.user.userId,
    });
  }

  task.updatedBy = req.user.userId;

  await task.save();

  await createActivity({
    task: task._id,
    action: "Task Updated",
    performedBy: req.user.userId,
  });

  await createNotification({
    user: task.assignedTo,
    title: "Task Updated",
    message: `Task "${task.title}" has been updated.`,
    type: NOTIFICATION_TYPE.TASK_UPDATED,
    task: task._id,
  });

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: task,
  });
};

module.exports = {
  createTask,
  updateTask,
};
