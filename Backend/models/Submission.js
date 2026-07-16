const mongoose = require("mongoose");

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

const SubmissionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    submissionNumber: {
      type: Number,
      required: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    attachments: [AttachmentSchema],

    status: {
      type: String,
      enum: ["Pending Review", "Approved", "Rejected"],
      default: "Pending Review",
    },

    managerFeedback: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

SubmissionSchema.index({
  task: 1,
});

SubmissionSchema.index({
  submittedBy: 1,
});

SubmissionSchema.index({
  status: 1,
});

module.exports = mongoose.model("Submission", SubmissionSchema);
