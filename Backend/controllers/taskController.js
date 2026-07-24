const Task = require("../models/Task");
const User = require("../models/User");
const Project = require("../models/Project");
const CustomError = require("../errors/CustomError");
const createActivity = require("../utils/createActivity");
const Activity = require("../models/Activity");
const {
  ROLES,
  TASK_STATUS,
  NOTIFICATION_TYPE,
} = require("../constants/constants");
const createNotification = require("../utils/createNotification");

/* ===========================================================
   CREATE TASK
=========================================================== */

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
    projectDoc = await Project.findOne({
      _id: project,
      isArchived: false,
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

/* ===========================================================
   GET ALL TASKS (Manager)
=========================================================== */

const getAllTasks = async (req, res) => {
  const {
    search,
    status,
    priority,
    employee,
    project,
    overdue,
    isArchived,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

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

  if (employee) {
    query.assignedTo = employee;
  }

  if (project) {
    query.project = project;
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === "true";
  } else {
    query.isArchived = false;
  }

  if (overdue === "true") {
    query.dueDate = {
      $lt: new Date(),
    };

    query.status = {
      $in: ["Assigned", "Accepted", "In Progress"],
    };
  }

  const skip = (page - 1) * limit;

  const tasks = await Task.find(query)
    .populate("assignedTo", "name employeeId")
    .populate("assignedBy", "name")
    .populate("project", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalTasks = await Task.countDocuments(query);

  res.status(200).json({
    success: true,

    totalTasks,

    currentPage: Number(page),

    totalPages: Math.ceil(totalTasks / limit),

    count: tasks.length,

    data: tasks,
  });
};

/* ===========================================================
   GET TASK BY ID
=========================================================== */

const getTaskById = async (req, res) => {
  const query = {
    _id: req.params.id,
  };

  // Employee can only access tasks assigned to themselves
  if (req.user.role === "employee") {
    query.assignedTo = req.user.userId;
  }

  const task = await Task.findOne(query)
    .populate("assignedTo", "name employeeId department designation email")
    .populate("assignedBy", "name")
    .populate("project", "name description")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    data: task,
  });
};

/* ===========================================================
   UPDATE TASK
=========================================================== */

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

  const task = await Task.findById(req.params.id);

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
    projectDoc = await Project.findOne({
      _id: projectId,
      isArchived: false,
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

/* ===========================================================
   WITHDRAW TASK
=========================================================== */

const withdrawTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

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

/* ===========================================================
   REASSIGN TASK
=========================================================== */

const reassignTask = async (req, res) => {
  const { assignedTo } = req.body;

  if (!assignedTo) {
    throw new CustomError("Assigned employee is required", 400);
  }

  const task = await Task.findById(req.params.id);

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
    const project = await Project.findById(task.project);

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

/* ===========================================================
   ARCHIVE TASK
=========================================================== */

const toggleTaskArchive = async (req, res) => {
  const task = await Task.findById(req.params.id);

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

/* ===========================================================
   MY TASKS (Employee)
=========================================================== */

const getMyTasks = async (req, res) => {
  const { search, status, priority, page = 1, limit = 10 } = req.query;

  const query = {
    assignedTo: req.user.userId,
    isArchived: false,
  };

  // Search
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

  // Status
  if (status) {
    query.status = status;
  }

  // Priority
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

/* ===========================================================
   ACCEPT TASK
=========================================================== */

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

  await createNotification({
    user: task.assignedBy,
    title: "Task Accepted",
    message: `Your task "${task.title}" has been accepted.`,
    type: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
    task: task._id,
  });

  res.status(200).json({
    success: true,
    message: "Task accepted successfully",
    data: task,
  });
};

/* ===========================================================
   REJECT TASK
=========================================================== */

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

  await createNotification({
    user: task.assignedBy,
    title: "Assignment Rejected",
    message: `${employee.name} rejected task "${task.title}".`,
    type: NOTIFICATION_TYPE.ASSIGNMENT_REJECTED,
    task: task._id,
  });

  res.status(200).json({
    success: true,
    message: "Task rejected successfully",
    data: task,
  });
};

/* ===========================================================
   START TASK
=========================================================== */

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

/* ===========================================================
   UPDATE CHECKLIST
=========================================================== */

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

  // Toggle completion
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
  const taskQuery = {
    _id: req.params.id,
  };

  if (req.user.role === "employee") {
    taskQuery.assignedTo = req.user.userId;
  }

  const task = await Task.findOne(taskQuery);

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

/* ===========================================================
   EXPORTS
=========================================================== */

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,

  withdrawTask,
  reassignTask,
  toggleTaskArchive,

  getMyTasks,
  acceptTask,
  rejectTask,
  startTask,
  updateChecklist,
  getTaskActivities,
};
