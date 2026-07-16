const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
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
  task: 1,
  createdAt: -1,
});

ActivitySchema.index({
  performedBy: 1,
});

module.exports = mongoose.model("Activity", ActivitySchema);
