const path = require("path");
const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
const Phase = require("../../models/Phase");
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
const {
  BUCKETS,
  uploadFile,
  createSignedUrl,
  deleteFiles,
  getSafeFileName,
} = require("../../utils/supabaseStorage");

const createTask = async (req, res) => {
  const {
    title,
    description,
    assignedTo,
    priority,
    dueDate,
    project,
    phase,
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

  let phaseDoc = null;

  if (projectDoc) {
    const projectPhases = await Phase.find({
      project: projectDoc._id,
      isArchived: false,
    });

    if (projectPhases.length > 0) {
      if (!phase) {
        throw new CustomError(
          `Please select a phase for project "${projectDoc.name}".`,
          400,
        );
      }

      phaseDoc = await Phase.findOne({
        _id: phase,
        project: projectDoc._id,
        isArchived: false,
      });

      if (!phaseDoc) {
        throw new CustomError(
          "Selected phase does not belong to the selected project.",
          400,
        );
      }
    } else {
      if (phase) {
        throw new CustomError(
          `Project "${projectDoc.name}" does not have phases.`,
          400,
        );
      }
    }
  } else {
    if (phase) {
      throw new CustomError(
        "Independent tasks cannot be assigned to a project phase.",
        400,
      );
    }
  }

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

  // Upload reference attachments to Supabase Storage
  const referenceAttachments = [];
  const uploadedPaths = [];

  if (req.files && req.files.length > 0) {
    const tempBatchId = Date.now() + "-" + Math.round(Math.random() * 1e9);

    for (const file of req.files) {
      const safeName = getSafeFileName(file.originalname);
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
      const storagePath = `references/${tempBatchId}/${uniqueFileName}`;

      try {
        const uploadResult = await uploadFile({
          bucket: BUCKETS.REFERENCES,
          path: storagePath,
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
        });

        uploadedPaths.push(uploadResult.storagePath);

        const signedUrl = await createSignedUrl({
          bucket: BUCKETS.REFERENCES,
          path: uploadResult.storagePath,
          expiresIn: 3600,
        });

        referenceAttachments.push({
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileUrl: signedUrl || "",
          mimeType: file.mimetype,
          fileSize: file.size,
          storagePath: uploadResult.storagePath,
          bucket: BUCKETS.REFERENCES,
        });
      } catch (uploadErr) {
        if (uploadedPaths.length > 0) {
          await deleteFiles({
            bucket: BUCKETS.REFERENCES,
            paths: uploadedPaths,
          });
        }
        throw new CustomError(
          "Unable to upload the attachment. The task was not created. Please try again.",
          500,
        );
      }
    }
  }

  // Create task with compensating cleanup if MongoDB task creation fails
  let task;
  try {
    task = await Task.create({
      title,
      description,
      project: projectDoc ? projectDoc._id : null,
      phase: phaseDoc ? phaseDoc._id : null,
      assignedTo,
      assignedBy: req.user.userId,
      priority,
      dueDate,
      checklist: parsedChecklist,
      referenceAttachments,
      createdBy: req.user.userId,
    });
  } catch (dbErr) {
    if (uploadedPaths.length > 0) {
      await deleteFiles({
        bucket: BUCKETS.REFERENCES,
        paths: uploadedPaths,
      });
    }
    throw dbErr;
  }

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
    phase,
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

  const finalProjectId = task.project;

  if (!finalProjectId) {
    if (phase) {
      throw new CustomError(
        "Independent tasks cannot be assigned to a project phase.",
        400,
      );
    }
    task.phase = null;
  } else {
    const projectPhases = await Phase.find({
      project: finalProjectId,
      isArchived: false,
    });

    if (projectPhases.length > 0) {
      const targetPhase = phase !== undefined ? phase : task.phase;

      if (!targetPhase) {
        throw new CustomError(
          "A phase is required for tasks in this project.",
          400,
        );
      }

      const phaseDoc = await Phase.findOne({
        _id: targetPhase,
        project: finalProjectId,
        isArchived: false,
      });

      if (!phaseDoc) {
        throw new CustomError(
          "Selected phase does not belong to the selected project.",
          400,
        );
      }

      task.phase = phaseDoc._id;
    } else {
      if (phase) {
        throw new CustomError(
          "Selected project has no phases.",
          400,
        );
      }
      task.phase = null;
    }
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (checklist !== undefined) task.checklist = checklist;

  const newlyUploadedPaths = [];
  if (req.files?.length) {
    const newAttachments = [];
    for (const file of req.files) {
      const safeName = getSafeFileName(file.originalname);
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
      const storagePath = `references/${task._id}/${uniqueFileName}`;

      try {
        const uploadResult = await uploadFile({
          bucket: BUCKETS.REFERENCES,
          path: storagePath,
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
        });

        newlyUploadedPaths.push(uploadResult.storagePath);

        const signedUrl = await createSignedUrl({
          bucket: BUCKETS.REFERENCES,
          path: uploadResult.storagePath,
          expiresIn: 3600,
        });

        newAttachments.push({
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileUrl: signedUrl || "",
          mimeType: file.mimetype,
          fileSize: file.size,
          storagePath: uploadResult.storagePath,
          bucket: BUCKETS.REFERENCES,
        });
      } catch (uploadErr) {
        if (newlyUploadedPaths.length > 0) {
          await deleteFiles({
            bucket: BUCKETS.REFERENCES,
            paths: newlyUploadedPaths,
          });
        }
        throw new CustomError(
          "Unable to upload reference attachment. Task update failed.",
          500,
        );
      }
    }

    task.referenceAttachments.push(...newAttachments);

    await createActivity({
      task: task._id,
      action: "Reference Attachments Added",
      performedBy: req.user.userId,
    });
  }

  task.updatedBy = req.user.userId;

  try {
    await task.save();
  } catch (dbErr) {
    if (newlyUploadedPaths.length > 0) {
      await deleteFiles({
        bucket: BUCKETS.REFERENCES,
        paths: newlyUploadedPaths,
      });
    }
    throw dbErr;
  }

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
