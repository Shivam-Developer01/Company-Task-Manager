const path = require("path");
const Submission = require("../../models/Submission");
const Task = require("../../models/Task");
const User = require("../../models/User");

const CustomError = require("../../errors/CustomError");

const createActivity = require("../../utils/createActivity");
const createNotification = require("../../utils/createNotification");
const getNotificationRecipients = require("../../utils/getNotificationRecipients");

const {
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

const { getAccessibleSubmission } = require("../access/submissionAccess");
const {
  BUCKETS,
  uploadFile,
  createSignedUrl,
  deleteFiles,
  getSafeFileName,
} = require("../../utils/supabaseStorage");

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

  // Upload submission files to Supabase Storage
  const attachments = [];
  const uploadedPaths = [];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const safeName = getSafeFileName(file.originalname);
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
      const storagePath = `submissions/${task._id}/${uniqueFileName}`;

      try {
        const uploadResult = await uploadFile({
          bucket: BUCKETS.SUBMISSIONS,
          path: storagePath,
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
        });

        uploadedPaths.push(uploadResult.storagePath);

        const signedUrl = await createSignedUrl({
          bucket: BUCKETS.SUBMISSIONS,
          path: uploadResult.storagePath,
          expiresIn: 3600,
        });

        attachments.push({
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileUrl: signedUrl || "",
          mimeType: file.mimetype,
          fileSize: file.size,
          storagePath: uploadResult.storagePath,
          bucket: BUCKETS.SUBMISSIONS,
        });
      } catch (uploadErr) {
        if (uploadedPaths.length > 0) {
          await deleteFiles({
            bucket: BUCKETS.SUBMISSIONS,
            paths: uploadedPaths,
          });
        }
        throw new CustomError(
          "Unable to upload submission attachment. Submission was not created.",
          500,
        );
      }
    }
  }

  const submissionNumber =
    (await Submission.countDocuments({
      task: task._id,
    })) + 1;

  let submission;
  try {
    submission = await Submission.create({
      task: task._id,
      submittedBy: req.user.userId,
      submissionNumber,
      message: req.body.message || "",
      attachments,
    });

    task.status = TASK_STATUS.SUBMITTED;
    task.updatedBy = req.user.userId;

    await task.save();
  } catch (dbErr) {
    if (uploadedPaths.length > 0) {
      await deleteFiles({
        bucket: BUCKETS.SUBMISSIONS,
        paths: uploadedPaths,
      });
    }
    throw dbErr;
  }

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

  const recipients = await getNotificationRecipients({
    type: NOTIFICATION_TYPE.SUBMISSION_RECEIVED,
    task,
    actor: req.user.userId,
  });

  for (const user of recipients) {
    await createNotification({
      user,
      title: "Submission Received",
      message: `${employee.name} submitted "${task.title}" for review.`,
      type: NOTIFICATION_TYPE.SUBMISSION_RECEIVED,
      task: task._id,
      submission: submission._id,
    });
  }

  res.status(201).json({
    success: true,
    message: "Submission uploaded successfully",
    submission,
    task,
  });
};

const reviewSubmission = async (req, res) => {
  const { action, feedback } = req.body;

  if (!["approve", "reject"].includes(action)) {
    throw new CustomError("Action must be approve or reject", 400);
  }

  const submission = await getAccessibleSubmission(req.params.id, req.user);

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
    task.status = TASK_STATUS.SUBMITTED;
    await task.save();
  }

  const latestSubmission = await Submission.findOne({
    task: submission.task,
  }).sort({ createdAt: -1 });

  if (!latestSubmission._id.equals(submission._id)) {
    throw new CustomError("Only the latest submission can be reviewed", 400);
  }

  if (action === "reject") {
    const assignedUser = await User.findById(task.assignedTo);
    if (assignedUser && !assignedUser.isActive) {
      throw new CustomError(
        "Cannot reject submission for a deactivated employee. Only approval is allowed.",
        400,
      );
    }
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
    .populate("reviewedBy", "name role");

  res.status(200).json({
    success: true,
    message: `Submission #${submission.submissionNumber} ${submission.status.toLowerCase()} successfully`,
    data: populatedSubmission,
  });
};

module.exports = {
  submitTask,
  reviewSubmission,
};
