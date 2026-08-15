const mongoose = require("mongoose");
const Department = require("../../models/Department");
const DepartmentPerformanceSnapshot = require("../../models/DepartmentPerformanceSnapshot");
const { ROLES } = require("../../constants/constants");
const CustomError = require("../../errors/CustomError");

/**
 * Get current year-month string in "YYYY-MM" format.
 * @param {Date} [date] Optional date object (defaults to current date)
 * @returns {string} Period string (e.g., "2026-08")
 */
const getCurrentPeriodString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Calculate the previous completed reporting month string in "YYYY-MM" format in Asia/Kolkata timezone.
 * Handles year boundaries (January -> December of previous year) and leap years cleanly.
 * @param {Date} [date] Date object (defaults to current system time)
 * @param {string} [timeZone="Asia/Kolkata"] Target timezone string
 * @returns {string} Previous completed period string "YYYY-MM" (e.g., "2026-08" when called in September 2026)
 */
const getPreviousCompletedPeriodString = (date = new Date(), timeZone = "Asia/Kolkata") => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  let year = parseInt(parts.find((p) => p.type === "year").value, 10);
  let month = parseInt(parts.find((p) => p.type === "month").value, 10);

  // Subtract 1 month to target previous completed period
  month -= 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  const formattedMonth = String(month).padStart(2, "0");
  return `${year}-${formattedMonth}`;
};

/**
 * Generate and persist an idempotent historical snapshot for a single department.
 * @param {Object} params
 * @param {string} params.departmentId Department ObjectId string
 * @param {string} [params.period] Optional target period "YYYY-MM"
 * @param {Object} params.viewer Authenticated user object from req.user
 * @returns {Promise<Object>} Saved snapshot document
 */
const generateDepartmentSnapshot = async ({ departmentId, period = null, viewer }) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  const viewerRoleLower = (viewer.role || "").toLowerCase();
  if (viewerRoleLower !== ROLES.ADMIN) {
    throw new CustomError("Forbidden: Snapshot generation is restricted to Admin access.", 403);
  }

  if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new CustomError("Valid Department ID is required for snapshot generation.", 400);
  }

  const targetPeriod = period || getCurrentPeriodString();

  const { getSingleDepartmentAnalytics } = require("./departmentAnalytics");
  // Fetch current deterministic analytics for department (preventing recursive snapshot lookup)
  const deptAnalytics = await getSingleDepartmentAnalytics(departmentId, { skipHistoricalComparison: true });

  const deptObjId = new mongoose.Types.ObjectId(departmentId);

  const snapshotData = {
    departmentId: deptObjId,
    departmentCode: deptAnalytics.department?.code || "DEPT",
    departmentName: deptAnalytics.department?.name || "Department",
    period: targetPeriod,
    snapshotDate: new Date(),

    // Workforce counts
    employeeCount: deptAnalytics.workforce?.totalEmployees || 0,
    activeEmployeeCount: deptAnalytics.workforce?.activeEmployees || 0,
    managerCount: deptAnalytics.workforce?.managerCount || 0,

    // Task performance counts
    totalTasks: deptAnalytics.taskMetrics?.totalTasks || 0,
    activeTasks: deptAnalytics.taskMetrics?.activeTasks || 0,
    completedTasks: deptAnalytics.taskMetrics?.completedTasks || 0,
    overdueTasks: deptAnalytics.taskMetrics?.overdueTasks || 0,
    withdrawnTasks: deptAnalytics.taskMetrics?.withdrawnTasks || 0,
    onTimeCompletedTasks: deptAnalytics.taskMetrics?.onTimeCompletedTasks || 0,
    averageCompletionTimeDays: deptAnalytics.taskMetrics?.averageCompletionTime || 0,

    // Submission & review counts
    totalSubmissions: deptAnalytics.submissionMetrics?.totalSubmissions || 0,
    pendingReviews: deptAnalytics.submissionMetrics?.pendingReviews || 0,
    approvedSubmissions: deptAnalytics.submissionMetrics?.approvedSubmissions || 0,
    rejectedSubmissions: deptAnalytics.submissionMetrics?.rejectedSubmissions || 0,

    // Project aggregates
    activeProjectsCount: deptAnalytics.projectOverview?.activeProjectsCount || 0,
  };

  // Upsert snapshot idempotently (1 snapshot per department per period)
  const savedSnapshot = await DepartmentPerformanceSnapshot.findOneAndUpdate(
    { departmentId: deptObjId, period: targetPeriod },
    snapshotData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return savedSnapshot;
};

/**
 * Generate idempotent historical snapshots for all active departments in the organization.
 * @param {Object} params
 * @param {string} [params.period] Target period string "YYYY-MM"
 * @param {Object} params.viewer Authenticated user object from req.user
 * @returns {Promise<Object>} Result payload with generated snapshot list
 */
const generateAllActiveDepartmentSnapshots = async ({ period = null, viewer }) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  const viewerRoleLower = (viewer.role || "").toLowerCase();
  if (viewerRoleLower !== ROLES.ADMIN) {
    throw new CustomError("Forbidden: Snapshot generation is restricted to Admin access.", 403);
  }

  const targetPeriod = period || getCurrentPeriodString();

  const activeDepartments = await Department.find({ isActive: true }).select("_id name code").lean();

  const results = [];
  for (const dept of activeDepartments) {
    try {
      const snapshot = await generateDepartmentSnapshot({
        departmentId: dept._id.toString(),
        period: targetPeriod,
        viewer,
      });
      results.push(snapshot);
    } catch (err) {
      console.error(`Failed to generate snapshot for department ${dept.name}:`, err.message);
    }
  }

  return {
    success: true,
    period: targetPeriod,
    totalDepartments: activeDepartments.length,
    generatedCount: results.length,
    snapshots: results,
  };
};

/**
 * Retrieve the latest historical snapshot created prior to a specified period.
 * @param {string} departmentId Department ObjectId string
 * @param {string} currentPeriod Current reporting period string "YYYY-MM"
 * @returns {Promise<Object|null>} Previous snapshot document or null
 */
const getPreviousDepartmentSnapshot = async (departmentId, currentPeriod = getCurrentPeriodString()) => {
  if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
    return null;
  }

  const deptObjId = new mongoose.Types.ObjectId(departmentId);

  const previousSnapshot = await DepartmentPerformanceSnapshot.findOne({
    departmentId: deptObjId,
    period: { $lt: currentPeriod },
  })
    .sort({ period: -1 })
    .lean();

  return previousSnapshot;
};

/**
 * Retrieve historical snapshot timeline for a department.
 * @param {string} departmentId Department ObjectId string
 * @param {number} [limit=6] Maximum number of historical snapshot periods to retrieve
 * @returns {Promise<Array>} Historical snapshot list sorted by period descending
 */
const getDepartmentSnapshotHistory = async (departmentId, limit = 6) => {
  if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
    return [];
  }

  const deptObjId = new mongoose.Types.ObjectId(departmentId);

  return await DepartmentPerformanceSnapshot.find({ departmentId: deptObjId })
    .sort({ period: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  getCurrentPeriodString,
  getPreviousCompletedPeriodString,
  generateDepartmentSnapshot,
  generateAllActiveDepartmentSnapshots,
  getPreviousDepartmentSnapshot,
  getDepartmentSnapshotHistory,
};
