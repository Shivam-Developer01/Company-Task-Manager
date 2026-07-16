const mongoose = require("mongoose");

const ChecklistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

const AttachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    originalName: String,
    fileUrl: String,
    mimeType: String,
    fileSize: Number,
  },
  { _id: false },
);

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Assigned",
        "Accepted",
        "Rejected",
        "In Progress",
        "Submitted",
        "Closed",
        "Withdrawn",
      ],
      default: "Assigned",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    checklist: [ChecklistSchema],

    referenceAttachments: [AttachmentSchema],

    isArchived: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

TaskSchema.index({
  assignedTo: 1,
  status: 1,
});

TaskSchema.index({
  priority: 1,
});

TaskSchema.index({
  dueDate: 1,
});

TaskSchema.index({
  project: 1,
});

TaskSchema.index({
  isArchived: 1,
});

TaskSchema.index({
  title: "text",
  description: "text",
});

module.exports = mongoose.model("Task", TaskSchema);
