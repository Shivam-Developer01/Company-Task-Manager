const mongoose = require("mongoose");

const NOTIFICATION_RETENTION_DAYS =
  parseInt(process.env.NOTIFICATION_RETENTION_DAYS, 10) || 180;

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Task Assigned",
        "Task Updated",
        "Task Reassigned",
        "Task Withdrawn",

        "Assignment Accepted",
        "Assignment Rejected",

        "Submission Received",
        "Submission Approved",
        "Submission Rejected",
      ],
      required: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Automatically expires after retention period
    expiresAt: {
      type: Date,
      default: () =>
        new Date(
          Date.now() + NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        ),
    },
  },
  {
    timestamps: true,
  },
);

/* ===========================================================
                        INDEXES
=========================================================== */

// Fast lookup for user's notifications
NotificationSchema.index({
  user: 1,
  isRead: 1,
  createdAt: -1,
});

// Automatically delete expired notifications
NotificationSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

module.exports = mongoose.model("Notification", NotificationSchema);
