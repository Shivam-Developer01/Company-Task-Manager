const mongoose = require("mongoose");

/**
 * DepartmentPerformanceSnapshot Schema
 * Compact, deterministic historical snapshot stored at the end of each reporting period.
 * Stores raw counts only; rates are derived dynamically at query time.
 */
const DepartmentPerformanceSnapshotSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    departmentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    departmentName: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: String, // Format: "YYYY-MM" (e.g., "2026-07")
      required: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // WORKFORCE COUNTS
    employeeCount: { type: Number, required: true, default: 0 },
    activeEmployeeCount: { type: Number, required: true, default: 0 },
    managerCount: { type: Number, required: true, default: 0 },

    // TASK PERFORMANCE COUNTS
    totalTasks: { type: Number, required: true, default: 0 },
    activeTasks: { type: Number, required: true, default: 0 },
    completedTasks: { type: Number, required: true, default: 0 },
    overdueTasks: { type: Number, required: true, default: 0 },
    withdrawnTasks: { type: Number, required: true, default: 0 },
    onTimeCompletedTasks: { type: Number, required: true, default: 0 },
    averageCompletionTimeDays: { type: Number, default: 0 },

    // SUBMISSION & REVIEW COUNTS
    totalSubmissions: { type: Number, required: true, default: 0 },
    pendingReviews: { type: Number, required: true, default: 0 },
    approvedSubmissions: { type: Number, required: true, default: 0 },
    rejectedSubmissions: { type: Number, required: true, default: 0 },

    // PROJECT AGGREGATES
    activeProjectsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Unique compound index guaranteeing exactly 1 snapshot per department per reporting period
DepartmentPerformanceSnapshotSchema.index(
  { departmentId: 1, period: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.DepartmentPerformanceSnapshot ||
  mongoose.model("DepartmentPerformanceSnapshot", DepartmentPerformanceSnapshotSchema);
