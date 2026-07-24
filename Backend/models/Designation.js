const mongoose = require("mongoose");

const DesignationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

DesignationSchema.index(
  {
    department: 1,
    name: 1,
  },
  {
    unique: true,
  },
);

DesignationSchema.index(
  {
    department: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Designation", DesignationSchema);
