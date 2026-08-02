const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

ActivitySchema.index({
  project: 1,
  createdAt: -1,
});

ActivitySchema.index({
  task: 1,
  createdAt: -1,
});

ActivitySchema.index({
  performedBy: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Activity", ActivitySchema);
