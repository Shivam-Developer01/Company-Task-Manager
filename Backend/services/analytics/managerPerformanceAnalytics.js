const mongoose = require("mongoose");
const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
const Submission = require("../../models/Submission");
const Department = require("../../models/Department");
const CustomError = require("../../errors/CustomError");

const { ROLES, TASK_STATUS, SUBMISSION_STATUS } = require("../../constants/constants");

/**
 * Dedicated Manager Performance & Effectiveness Analytics Service.
 * Computes deterministic metrics focusing on:
 * - Manager workload & managed project load
 * - Manager review turnaround speed & submission handling
 * - Manager scope task completion & overdue rates
 * - Department-wise manager comparisons
 * - Top performing managers & managers requiring attention (evidence-based)
 */

/**
 * Calculate Manager Performance Metrics.
 * @param {Object} params
 * @param {Object} params.viewer User object { userId, role }
 * @param {string|null} params.targetManagerId Target manager ID (Admin view: null = All Managers, id = Specific Manager)
 * @returns {Promise<Object>} Manager performance metrics DTO
 */
const getManagerPerformanceAnalytics = async ({ viewer, targetManagerId = null }) => {
  const today = new Date();
  const viewerRoleLower = (viewer.role || "").toLowerCase();

  // If Manager role, targetManagerId MUST be self
  let effectiveManagerId = null;
  if (viewerRoleLower === ROLES.MANAGER) {
    effectiveManagerId = viewer.userId;
  } else if (viewerRoleLower === ROLES.ADMIN && targetSubjectIdToUse(targetManagerId)) {
    effectiveManagerId = targetManagerId;
  }

  if (effectiveManagerId) {
    return getSingleManagerPerformanceMetrics(effectiveManagerId, today);
  }

  // All Managers Scope (Admin)
  return getAllManagersPerformanceMetrics(today);
};

function targetSubjectIdToUse(id) {
  return id && id !== "null" && id !== "undefined" && id !== "all_managers" && id !== "";
}

/**
 * Aggregate performance analytics for a single specific manager.
 */
const getSingleManagerPerformanceMetrics = async (managerId, today) => {
  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    throw new CustomError("Invalid target manager ID format.", 400);
  }

  const managerObjId = new mongoose.Types.ObjectId(managerId);
  const managerUser = await User.findById(managerObjId)
    .select("_id name email employeeId role isActive department")
    .populate("department", "name code")
    .lean();

  if (!managerUser || (managerUser.role || "").toLowerCase() !== ROLES.MANAGER) {
    throw new CustomError("Specified target user does not exist or is not a Manager.", 400);
  }

  // 1. Projects created/managed by manager
  const projects = await Project.find({ createdBy: managerObjId })
    .select("_id name status isArchived createdAt")
    .lean();

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => !p.isArchived).length;
  const projectIds = projects.map((p) => p._id);

  // 2. Tasks assigned by this manager
  const [taskMetrics] = await Task.aggregate([
    {
      $match: {
        assignedBy: managerObjId,
        isArchived: { $ne: true },
      },
    },
    {
      $facet: {
        statusDistribution: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        overdue: [
          {
            $match: {
              dueDate: { $lt: today },
              status: {
                $in: [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS],
              },
            },
          },
          { $count: "count" },
        ],
        teamMembers: [
          { $match: { assignedTo: { $ne: null } } },
          { $group: { _id: "$assignedTo" } },
        ],
        delay: [
          {
            $match: {
              status: TASK_STATUS.CLOSED,
              completedAt: { $ne: null },
            },
          },
          {
            $match: {
              $expr: { $gt: ["$completedAt", "$dueDate"] },
            },
          },
          {
            $project: {
              delayDays: {
                $divide: [{ $subtract: ["$completedAt", "$dueDate"] }, 86400000],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgDelay: { $avg: "$delayDays" },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const statusMap = {};
  let totalTasks = 0;

  (taskMetrics.statusDistribution || []).forEach((item) => {
    statusMap[item._id] = item.count;
    totalTasks += item.count;
  });

  const activeTasks =
    (statusMap[TASK_STATUS.ASSIGNED] || 0) +
    (statusMap[TASK_STATUS.ACCEPTED] || 0) +
    (statusMap[TASK_STATUS.IN_PROGRESS] || 0);

  const completedTasks = statusMap[TASK_STATUS.CLOSED] || 0;
  const withdrawnTasks = statusMap[TASK_STATUS.WITHDRAWN] || 0;
  const rejectedTasks =
    (statusMap[TASK_STATUS.TASK_REJECTED] || 0) +
    (statusMap[TASK_STATUS.ASSIGNMENT_REJECTED] || 0);

  const overdueTasks = taskMetrics.overdue.length > 0 ? taskMetrics.overdue[0].count : 0;
  const teamSize = (taskMetrics.teamMembers || []).length;

  const averageTeamDelay =
    taskMetrics.delay.length > 0 ? Number(taskMetrics.delay[0].avgDelay.toFixed(2)) : null;
  const delayedTaskCount = taskMetrics.delay.length > 0 ? taskMetrics.delay[0].count : 0;

  const completionDenominator = totalTasks - withdrawnTasks;
  const completionRate =
    completionDenominator > 0
      ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
      : 0;

  const overdueDenominator = activeTasks + overdueTasks;
  const overdueRate =
    overdueDenominator > 0
      ? Number(((overdueTasks / overdueDenominator) * 100).toFixed(2))
      : 0;

  // 3. Submissions assigned by this manager
  const [submissionMetrics] = await Submission.aggregate([
    {
      $lookup: {
        from: "tasks",
        localField: "task",
        foreignField: "_id",
        as: "taskInfo",
      },
    },
    { $unwind: "$taskInfo" },
    { $match: { "taskInfo.assignedBy": managerObjId } },
    {
      $facet: {
        pending: [
          { $match: { status: SUBMISSION_STATUS.PENDING_REVIEW } },
          { $count: "count" },
        ],
        turnaround: [
          { $match: { reviewedAt: { $ne: null } } },
          {
            $project: {
              days: {
                $divide: [{ $subtract: ["$reviewedAt", "$createdAt"] }, 86400000],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: "$days" } } },
        ],
      },
    },
  ]);

  const pendingReviews =
    submissionMetrics.pending.length > 0 ? submissionMetrics.pending[0].count : 0;
  const averageReviewTime =
    submissionMetrics.turnaround.length > 0
      ? Number(submissionMetrics.turnaround[0].avg.toFixed(2))
      : null;

  // Workload level classification
  let workloadLevel = "Balanced";
  if (activeTasks > 15 || activeProjects >= 4 || pendingReviews > 5) {
    workloadLevel = "High / Heavy";
  } else if (activeTasks < 5 && activeProjects <= 1) {
    workloadLevel = "Light";
  }

  // Status Indicator
  let statusIndicator = "Stable";
  if (overdueRate > 15 || pendingReviews > 5 || rejectedTasks > 3) {
    statusIndicator = "Needs Attention";
  } else if (completionRate >= 80 && completedTasks > 0) {
    statusIndicator = "Strong";
  }

  // Project Summaries
  const projectSummaries = await Promise.all(
    projects.map(async (proj) => {
      const pTasks = await Task.find({ project: proj._id, isArchived: { $ne: true } })
        .select("status")
        .lean();
      const pTotal = pTasks.length;
      const pClosed = pTasks.filter((t) => t.status === TASK_STATUS.CLOSED).length;
      const pComp = pTotal > 0 ? Number(((pClosed / pTotal) * 100).toFixed(1)) : 0;
      return {
        id: proj._id,
        name: proj.name,
        isArchived: proj.isArchived,
        totalTasks: pTotal,
        completedTasks: pClosed,
        completionRate: pComp,
      };
    })
  );

  return {
    managerInfo: {
      id: managerUser._id,
      name: managerUser.name,
      email: managerUser.email,
      employeeId: managerUser.employeeId,
      department: managerUser.department ? managerUser.department.name : "N/A",
    },
    totalProjects,
    activeProjects,
    teamSize,
    totalTasks,
    activeTasks,
    completedTasks,
    overdueTasks,
    rejectedTasks,
    pendingReviews,
    completionRate,
    overdueRate,
    averageReviewTime,
    averageTeamDelay,
    delayedTaskCount,
    workloadLevel,
    statusIndicator,
    projectSummaries,
    historicalTrend: "Historical trend comparison unavailable for individual manager snapshots",
  };
};

/**
 * Aggregate performance analytics across ALL active managers for comparison.
 */
const getAllManagersPerformanceMetrics = async (today) => {
  const managers = await User.find({ role: ROLES.MANAGER, isActive: true })
    .select("_id name email employeeId department")
    .populate("department", "name code")
    .lean();

  if (!managers || managers.length === 0) {
    return {
      totalManagers: 0,
      summary: {},
      managerPerformanceList: [],
      departmentComparisons: [],
      topPerformers: {},
      attentionManagers: [],
    };
  }

  const managerMetricsList = await Promise.all(
    managers.map(async (mgr) => {
      const metrics = await getSingleManagerPerformanceMetrics(mgr._id.toString(), today);
      return metrics;
    })
  );

  // Compute organization-wide summary
  let totalActiveProjects = 0;
  let totalActiveTasks = 0;
  let totalCompletedTasks = 0;
  let totalOverdueTasks = 0;
  let totalPendingReviews = 0;
  let compRateSum = 0;
  let reviewTimeSum = 0;
  let reviewTimeCount = 0;

  managerMetricsList.forEach((m) => {
    totalActiveProjects += m.activeProjects;
    totalActiveTasks += m.activeTasks;
    totalCompletedTasks += m.completedTasks;
    totalOverdueTasks += m.overdueTasks;
    totalPendingReviews += m.pendingReviews;
    compRateSum += m.completionRate;
    if (m.averageReviewTime !== null) {
      reviewTimeSum += m.averageReviewTime;
      reviewTimeCount++;
    }
  });

  const totalManagers = managers.length;
  const avgCompletionRate = totalManagers > 0 ? Number((compRateSum / totalManagers).toFixed(2)) : 0;
  const avgReviewTime = reviewTimeCount > 0 ? Number((reviewTimeSum / reviewTimeCount).toFixed(2)) : null;

  // Group by Department
  const deptMap = {};
  managerMetricsList.forEach((m) => {
    const deptName = m.managerInfo.department || "Unassigned";
    if (!deptMap[deptName]) {
      deptMap[deptName] = {
        department: deptName,
        managerCount: 0,
        totalActiveProjects: 0,
        totalActiveTasks: 0,
        totalCompletedTasks: 0,
        totalOverdueTasks: 0,
        compRateSum: 0,
      };
    }
    deptMap[deptName].managerCount++;
    deptMap[deptName].totalActiveProjects += m.activeProjects;
    deptMap[deptName].totalActiveTasks += m.activeTasks;
    deptMap[deptName].totalCompletedTasks += m.completedTasks;
    deptMap[deptName].totalOverdueTasks += m.overdueTasks;
    deptMap[deptName].compRateSum += m.completionRate;
  });

  const departmentComparisons = Object.values(deptMap).map((d) => ({
    department: d.department,
    managerCount: d.managerCount,
    totalActiveProjects: d.totalActiveProjects,
    totalActiveTasks: d.totalActiveTasks,
    avgCompletionRate: Number((d.compRateSum / d.managerCount).toFixed(2)),
  }));

  // Top Performers
  const sortedByCompletion = [...managerMetricsList].sort((a, b) => b.completionRate - a.completionRate);
  const sortedByOverdue = [...managerMetricsList].sort((a, b) => a.overdueRate - b.overdueRate);

  const topPerformers = {
    highestCompletion: sortedByCompletion[0]
      ? { name: sortedByCompletion[0].managerInfo.name, rate: `${sortedByCompletion[0].completionRate}%` }
      : null,
    lowestOverdue: sortedByOverdue[0]
      ? { name: sortedByOverdue[0].managerInfo.name, rate: `${sortedByOverdue[0].overdueRate}%` }
      : null,
  };

  // Managers Requiring Attention
  const attentionManagers = managerMetricsList
    .filter((m) => m.statusIndicator === "Needs Attention")
    .map((m) => ({
      name: m.managerInfo.name,
      department: m.managerInfo.department,
      evidence: `${m.overdueTasks} overdue tasks, ${m.pendingReviews} pending reviews, ${m.rejectedTasks} rejections.`,
    }));

  return {
    totalManagers,
    summary: {
      totalManagers,
      totalActiveProjects,
      totalActiveTasks,
      totalCompletedTasks,
      totalOverdueTasks,
      totalPendingReviews,
      avgCompletionRate,
      avgReviewTime,
    },
    managerPerformanceList: managerMetricsList.map((m) => ({
      id: m.managerInfo.id,
      name: m.managerInfo.name,
      department: m.managerInfo.department,
      activeProjects: m.activeProjects,
      teamSize: m.teamSize,
      activeTasks: m.activeTasks,
      completedTasks: m.completedTasks,
      completionRate: m.completionRate,
      overdueTasks: m.overdueTasks,
      pendingReviews: m.pendingReviews,
      averageReviewTime: m.averageReviewTime,
      workloadLevel: m.workloadLevel,
      statusIndicator: m.statusIndicator,
    })),
    departmentComparisons,
    topPerformers,
    attentionManagers,
  };
};

module.exports = {
  getManagerPerformanceAnalytics,
};
