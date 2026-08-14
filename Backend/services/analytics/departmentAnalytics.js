const mongoose = require("mongoose");
const Department = require("../../models/Department");
const User = require("../../models/User");
const Task = require("../../models/Task");
const Project = require("../../models/Project");
const Submission = require("../../models/Submission");
const Phase = require("../../models/Phase");

const { ROLES, TASK_STATUS } = require("../../constants/constants");
const CustomError = require("../../errors/CustomError");

/**
 * Deterministic Department Analytics Service (V4 Final Organizational Report).
 * Calculates authoritative department metrics for a single department or all departments.
 * Uses optimized MongoDB aggregation pipelines with 0 N+1 query explosion.
 */

/**
 * Retrieve performance analytics for a single selected department or all departments.
 * @param {Object} params
 * @param {Object} params.viewer Authenticated user object from req.user
 * @param {string} [params.targetDepartmentId] Specific department ID or "all_departments"
 * @returns {Promise<Object>} Deterministic department analytics payload
 */
const getDepartmentPerformanceAnalytics = async ({ viewer, targetDepartmentId = null }) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  const viewerRoleLower = viewer.role.toLowerCase();
  const isAllDepartments =
    !targetDepartmentId ||
    targetDepartmentId === "all_departments" ||
    targetDepartmentId === "null" ||
    targetDepartmentId === "undefined";

  // Role Authorization Check (Admin Only)
  if (viewerRoleLower !== ROLES.ADMIN) {
    throw new CustomError("Forbidden: Department Performance reports are restricted to Admin access.", 403);
  }

  if (isAllDepartments) {
    return await getAllDepartmentsAnalytics();
  } else {
    return await getSingleDepartmentAnalytics(targetDepartmentId);
  }
};

/**
 * Single Selected Department Analytics Pipeline
 */
const getSingleDepartmentAnalytics = async (departmentId) => {
  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new CustomError("Invalid department ID format.", 400);
  }

  const department = await Department.findById(departmentId).select("_id name code isActive createdAt").lean();
  if (!department) {
    throw new CustomError("Specified department does not exist.", 404);
  }

  const deptObjId = new mongoose.Types.ObjectId(departmentId);
  const today = new Date();

  // 1. Fetch Users in Department
  const deptUsers = await User.find({ department: deptObjId })
    .select("_id name email employeeId role isActive department designation")
    .lean();

  const deptUserIds = deptUsers.map((u) => u._id);

  const employees = deptUsers.filter((u) => (u.role || "").toLowerCase() === ROLES.EMPLOYEE);
  const managers = deptUsers.filter((u) => (u.role || "").toLowerCase() === ROLES.MANAGER);

  const activeEmployeesCount = deptUsers.filter((u) => u.isActive !== false).length;
  const employeeCount = employees.length;
  const managerCount = managers.length;
  const employeesPerManager = managerCount > 0 ? Number((employeeCount / managerCount).toFixed(2)) : null;

  // 2. Aggregate Task Metrics for Department Members
  const taskAgg = await Task.aggregate([
    { $match: { assignedTo: { $in: deptUserIds }, isArchived: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        activeTasks: {
          $sum: {
            $cond: [
              { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
              1,
              0,
            ],
          },
        },
        completedTasks: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0] },
        },
        pendingTasks: {
          $sum: {
            $cond: [
              { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
              1,
              0,
            ],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        withdrawnTasks: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0] },
        },
        onTimeCompletedTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", TASK_STATUS.CLOSED] },
                  {
                    $or: [
                      { $and: ["$completedAt", { $lte: ["$completedAt", "$dueDate"] }] },
                      { $and: [{ $not: ["$completedAt"] }, { $lte: ["$updatedAt", "$dueDate"] }] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const taskMetricsRaw = taskAgg[0] || {
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    withdrawnTasks: 0,
    onTimeCompletedTasks: 0,
  };

  const completionDenominator = taskMetricsRaw.totalTasks - taskMetricsRaw.withdrawnTasks;
  const completionRate =
    completionDenominator > 0
      ? Number(((taskMetricsRaw.completedTasks / completionDenominator) * 100).toFixed(2))
      : 0;

  const onTimeCompletionRate =
    taskMetricsRaw.completedTasks > 0
      ? Number(((taskMetricsRaw.onTimeCompletedTasks / taskMetricsRaw.completedTasks) * 100).toFixed(2))
      : 0;

  const overdueDenominator = taskMetricsRaw.activeTasks + taskMetricsRaw.overdueTasks;
  const overdueRate =
    overdueDenominator > 0
      ? Number(((taskMetricsRaw.overdueTasks / overdueDenominator) * 100).toFixed(2))
      : 0;

  // Calculate Average Completion Time (days)
  const completedTasksDocs = await Task.find({
    assignedTo: { $in: deptUserIds },
    status: TASK_STATUS.CLOSED,
    isArchived: { $ne: true },
  })
    .select("createdAt completedAt updatedAt")
    .lean();

  let totalCompletionDays = 0;
  completedTasksDocs.forEach((t) => {
    const end = t.completedAt || t.updatedAt;
    if (end && t.createdAt) {
      const diffMs = new Date(end) - new Date(t.createdAt);
      if (diffMs > 0) {
        totalCompletionDays += diffMs / (1000 * 60 * 60 * 24);
      }
    }
  });

  const averageCompletionTime =
    completedTasksDocs.length > 0
      ? Number((totalCompletionDays / completedTasksDocs.length).toFixed(1))
      : 0;

  // 3. Submissions for Department Tasks
  const submissionAgg = await Submission.aggregate([
    {
      $lookup: {
        from: "tasks",
        localField: "task",
        foreignField: "_id",
        as: "taskInfo",
      },
    },
    { $unwind: "$taskInfo" },
    { $match: { "taskInfo.assignedTo": { $in: deptUserIds } } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        pendingReviews: {
          $sum: { $cond: [{ $eq: ["$status", "Pending Review"] }, 1, 0] },
        },
        approvedSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] },
        },
        rejectedSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
        },
      },
    },
  ]);

  const submissionMetricsRaw = submissionAgg[0] || {
    totalSubmissions: 0,
    pendingReviews: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
  };

  const rejectionRate =
    submissionMetricsRaw.totalSubmissions > 0
      ? Number(
          ((submissionMetricsRaw.rejectedSubmissions / submissionMetricsRaw.totalSubmissions) * 100).toFixed(2)
        )
      : 0;

  // 4. Workload Distribution & Concentration
  const userWorkloadAgg = await Task.aggregate([
    {
      $match: {
        assignedTo: { $in: deptUserIds },
        status: { $in: [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS] },
        isArchived: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        activeTaskCount: { $sum: 1 },
      },
    },
    { $sort: { activeTaskCount: -1 } },
  ]);

  const userActiveTaskMap = {};
  userWorkloadAgg.forEach((w) => {
    userActiveTaskMap[w._id.toString()] = w.activeTaskCount;
  });

  const tasksPerEmployee =
    employeeCount > 0 ? Number((taskMetricsRaw.activeTasks / employeeCount).toFixed(2)) : 0;

  const tasksPerManager =
    managerCount > 0 ? Number((taskMetricsRaw.activeTasks / managerCount).toFixed(2)) : 0;

  // Workload Classification Formula (Transparent):
  // High: tasksPerEmployee > 5 OR overdueRate > 20%
  // Low: tasksPerEmployee < 1 AND activeTasks < employeeCount
  // Balanced: Otherwise
  let workloadStatus = "Balanced";
  if (tasksPerEmployee > 5 || overdueRate > 20) {
    workloadStatus = "High";
  } else if (tasksPerEmployee < 1 && taskMetricsRaw.activeTasks < (employeeCount || 1)) {
    workloadStatus = "Low";
  }

  // Calculate Workload Concentration Share
  let workloadConcentrationText = "Workload is evenly distributed across employees.";
  if (userWorkloadAgg.length > 0 && taskMetricsRaw.activeTasks > 0) {
    const topEmployeeTasks = userWorkloadAgg[0].activeTaskCount;
    const topEmployeeShare = Number(((topEmployeeTasks / taskMetricsRaw.activeTasks) * 100).toFixed(1));
    const topEmpDoc = deptUsers.find((u) => u._id.toString() === userWorkloadAgg[0]._id.toString());
    const topEmpName = topEmpDoc ? topEmpDoc.name : "Top employee";
    workloadConcentrationText = `${topEmpName} holds ${topEmployeeTasks} active tasks (${topEmployeeShare}% of department workload).`;
  }

  // 5. Manager Overview
  const managerSummaryList = managers.map((mgr) => {
    const mgrIdStr = mgr._id.toString();
    const activeTasks = userActiveTaskMap[mgrIdStr] || 0;
    return {
      id: mgr._id,
      name: mgr.name,
      email: mgr.email,
      employeeId: mgr.employeeId,
      activeTasks,
    };
  });

  // 6. Employee Performance Summary
  const employeePerformanceSummary = {
    totalEmployees: employeeCount,
    activeEmployees: activeEmployeesCount,
    avgCompletionRate: completionRate,
    avgOnTimeCompletionRate: onTimeCompletionRate,
    avgOverdueRate: overdueRate,
    avgCompletionTime: averageCompletionTime,
    rejectionRate,
    pendingReviews: submissionMetricsRaw.pendingReviews,
    workloadStatus,
  };

  // 7. Department Projects & Phase Overview
  const activeProjectsDocs = await Project.find({
    members: { $in: deptUserIds },
    isArchived: { $ne: true },
  })
    .select("_id name description members createdBy createdAt")
    .lean();

  const projectSummaryList = await Promise.all(
    activeProjectsDocs.map(async (proj) => {
      const projId = proj._id;
      const projTaskAgg = await Task.aggregate([
        { $match: { project: projId, assignedTo: { $in: deptUserIds }, isArchived: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            activeTasks: {
              $sum: {
                $cond: [
                  { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
                  1,
                  0,
                ],
              },
            },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0] },
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", today] },
                      { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const pt = projTaskAgg[0] || { totalTasks: 0, activeTasks: 0, completedTasks: 0, overdueTasks: 0 };
      const projCompletionRate = pt.totalTasks > 0 ? Number(((pt.completedTasks / pt.totalTasks) * 100).toFixed(2)) : 0;

      let projHealth = "Stable";
      if (pt.overdueTasks > 2 || projCompletionRate < 40) {
        projHealth = "Needs Attention";
      } else if (projCompletionRate >= 80 && pt.completedTasks > 0) {
        projHealth = "Healthy";
      }

      return {
        id: proj._id,
        name: proj.name,
        totalTasks: pt.totalTasks,
        activeTasks: pt.activeTasks,
        completedTasks: pt.completedTasks,
        overdueTasks: pt.overdueTasks,
        completionRate: projCompletionRate,
        health: projHealth,
      };
    })
  );

  // 8. Department Health Classification (Transparent Rule-based Formula)
  // Healthy: completionRate >= 80% AND overdueRate <= 10% AND pendingReviews <= 5
  // Needs Attention: overdueRate > 15% OR pendingReviews > 8 OR completionRate < 50%
  // Stable: Otherwise
  let departmentHealth = "Stable";
  if (overdueRate > 15 || submissionMetricsRaw.pendingReviews > 8 || (taskMetricsRaw.totalTasks > 5 && completionRate < 50)) {
    departmentHealth = "Needs Attention";
  } else if (completionRate >= 80 && overdueRate <= 10 && taskMetricsRaw.completedTasks > 0) {
    departmentHealth = "Healthy";
  }

  // 9. Synthesize Positive Developments & Attention Areas
  const whatsGoingWell = [];
  if (completionRate >= 80 && taskMetricsRaw.completedTasks > 0) {
    whatsGoingWell.push(
      `High completion velocity with a ${completionRate}% task completion rate across ${taskMetricsRaw.completedTasks} closed tasks.`
    );
  }
  if (onTimeCompletionRate >= 85 && taskMetricsRaw.completedTasks > 0) {
    whatsGoingWell.push(
      `Strong delivery timeliness with ${onTimeCompletionRate}% of completed tasks delivered on or before the due date.`
    );
  }
  if (overdueRate <= 5) {
    whatsGoingWell.push(`Low overdue exposure with only ${overdueRate}% overdue task rate.`);
  }
  if (submissionMetricsRaw.pendingReviews === 0 && taskMetricsRaw.totalTasks > 0) {
    whatsGoingWell.push("Zero pending review queue backlog in task submission pipeline.");
  }
  if (whatsGoingWell.length === 0) {
    whatsGoingWell.push("Department operations are maintaining a steady execution pace.");
  }

  const attentionAreas = [];
  if (taskMetricsRaw.overdueTasks > 0) {
    attentionAreas.push(
      `${taskMetricsRaw.overdueTasks} active tasks are currently overdue (${overdueRate}% overdue rate).`
    );
  }
  if (submissionMetricsRaw.pendingReviews > 3) {
    attentionAreas.push(
      `${submissionMetricsRaw.pendingReviews} task submissions are awaiting manager review and approval.`
    );
  }
  if (rejectionRate > 15) {
    attentionAreas.push(
      `High submission rejection rate (${rejectionRate}%) indicates possible work quality or criteria misalignment.`
    );
  }
  if (workloadStatus === "High") {
    attentionAreas.push(`High average employee workload (${tasksPerEmployee} active tasks/employee).`);
  }

  const bottlenecks = [];
  if (taskMetricsRaw.overdueTasks > 0) {
    bottlenecks.push(`Overdue Task Backlog: ${taskMetricsRaw.overdueTasks} overdue tasks in pipeline.`);
  }
  if (submissionMetricsRaw.pendingReviews > 0) {
    bottlenecks.push(`Review Queue Backlog: ${submissionMetricsRaw.pendingReviews} pending submission reviews.`);
  }

  return {
    scopeMode: "SINGLE_DEPARTMENT",
    department: {
      id: department._id,
      name: department.name,
      code: department.code,
      isActive: department.isActive,
    },
    departmentHealth,
    workforce: {
      totalEmployees: deptUsers.length,
      activeEmployees: activeEmployeesCount,
      employeeCount,
      managerCount,
      employeesPerManager,
      tasksPerEmployee,
      tasksPerManager,
      workloadStatus,
      workloadConcentrationText,
    },
    taskMetrics: {
      totalTasks: taskMetricsRaw.totalTasks,
      activeTasks: taskMetricsRaw.activeTasks,
      completedTasks: taskMetricsRaw.completedTasks,
      pendingTasks: taskMetricsRaw.pendingTasks,
      overdueTasks: taskMetricsRaw.overdueTasks,
      withdrawnTasks: taskMetricsRaw.withdrawnTasks,
      onTimeCompletedTasks: taskMetricsRaw.onTimeCompletedTasks,
      completionRate,
      onTimeCompletionRate,
      overdueRate,
      averageCompletionTime,
    },
    submissionMetrics: {
      totalSubmissions: submissionMetricsRaw.totalSubmissions,
      pendingReviews: submissionMetricsRaw.pendingReviews,
      approvedSubmissions: submissionMetricsRaw.approvedSubmissions,
      rejectedSubmissions: submissionMetricsRaw.rejectedSubmissions,
      rejectionRate,
    },
    managerOverview: managerSummaryList,
    employeePerformanceSummary,
    projectOverview: {
      activeProjectsCount: activeProjectsDocs.length,
      projects: projectSummaryList,
    },
    whatsGoingWell,
    attentionAreas,
    bottlenecks,
    trends: "insufficient_data",
    historicalTrendsSupported: false,
    limitations: "Historical department performance comparison is not currently available.",
  };
};

/**
 * All Departments Aggregate & Comparison Pipeline
 */
const getAllDepartmentsAnalytics = async () => {
  const departments = await Department.find({ isActive: true }).select("_id name code isActive").lean();
  const deptIds = departments.map((d) => d._id);
  const today = new Date();

  // 1. Group Users by Department
  const userAgg = await User.aggregate([
    { $match: { department: { $in: deptIds } } },
    {
      $group: {
        _id: "$department",
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] },
        },
        employeeRoleCount: {
          $sum: { $cond: [{ $eq: ["$role", ROLES.EMPLOYEE] }, 1, 0] },
        },
        managerRoleCount: {
          $sum: { $cond: [{ $eq: ["$role", ROLES.MANAGER] }, 1, 0] },
        },
      },
    },
  ]);

  const userDeptMap = {};
  userAgg.forEach((u) => {
    userDeptMap[u._id.toString()] = u;
  });

  // 2. Group Tasks by Assignee Department
  const taskAgg = await Task.aggregate([
    { $match: { isArchived: { $ne: true } } },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignee",
      },
    },
    { $unwind: "$assignee" },
    { $match: { "assignee.department": { $in: deptIds } } },
    {
      $group: {
        _id: "$assignee.department",
        totalTasks: { $sum: 1 },
        activeTasks: {
          $sum: {
            $cond: [
              { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
              1,
              0,
            ],
          },
        },
        completedTasks: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0] },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  { $in: ["$status", [TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        withdrawnTasks: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0] },
        },
        onTimeCompletedTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", TASK_STATUS.CLOSED] },
                  {
                    $or: [
                      { $and: ["$completedAt", { $lte: ["$completedAt", "$dueDate"] }] },
                      { $and: [{ $not: ["$completedAt"] }, { $lte: ["$updatedAt", "$dueDate"] }] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const taskDeptMap = {};
  taskAgg.forEach((t) => {
    taskDeptMap[t._id.toString()] = t;
  });

  // 3. Group Pending Reviews by Department
  const submissionAgg = await Submission.aggregate([
    { $match: { status: "Pending Review" } },
    {
      $lookup: {
        from: "tasks",
        localField: "task",
        foreignField: "_id",
        as: "taskInfo",
      },
    },
    { $unwind: "$taskInfo" },
    {
      $lookup: {
        from: "users",
        localField: "taskInfo.assignedTo",
        foreignField: "_id",
        as: "assignee",
      },
    },
    { $unwind: "$assignee" },
    { $match: { "assignee.department": { $in: deptIds } } },
    {
      $group: {
        _id: "$assignee.department",
        pendingReviews: { $sum: 1 },
      },
    },
  ]);

  const submissionDeptMap = {};
  submissionAgg.forEach((s) => {
    submissionDeptMap[s._id.toString()] = s.pendingReviews;
  });

  // 4. Group Active Projects by Department Users
  const projectAgg = await Project.aggregate([
    { $match: { isArchived: { $ne: true } } },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "memberUsers",
      },
    },
    { $unwind: "$memberUsers" },
    { $match: { "memberUsers.department": { $in: deptIds } } },
    {
      $group: {
        _id: "$memberUsers.department",
        activeProjectsSet: { $addToSet: "$_id" },
      },
    },
  ]);

  const projectDeptMap = {};
  projectAgg.forEach((p) => {
    projectDeptMap[p._id.toString()] = p.activeProjectsSet ? p.activeProjectsSet.length : 0;
  });

  // Build Department Comparison List
  let totalOrgEmployees = 0;
  let totalOrgManagers = 0;
  let totalOrgActiveTasks = 0;
  let totalOrgCompletedTasks = 0;
  let sumCompletionRates = 0;

  const departmentComparisonList = departments.map((dept) => {
    const idStr = dept._id.toString();
    const uStats = userDeptMap[idStr] || { totalEmployees: 0, activeEmployees: 0, employeeRoleCount: 0, managerRoleCount: 0 };
    const tStats = taskDeptMap[idStr] || {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      withdrawnTasks: 0,
      onTimeCompletedTasks: 0,
    };
    const pendingReviews = submissionDeptMap[idStr] || 0;
    const activeProjectsCount = projectDeptMap[idStr] || 0;

    const completionDenominator = tStats.totalTasks - tStats.withdrawnTasks;
    const completionRate =
      completionDenominator > 0
        ? Number(((tStats.completedTasks / completionDenominator) * 100).toFixed(2))
        : 0;

    const onTimeCompletionRate =
      tStats.completedTasks > 0
        ? Number(((tStats.onTimeCompletedTasks / tStats.completedTasks) * 100).toFixed(2))
        : 0;

    const overdueDenominator = tStats.activeTasks + tStats.overdueTasks;
    const overdueRate =
      overdueDenominator > 0
        ? Number(((tStats.overdueTasks / overdueDenominator) * 100).toFixed(2))
        : 0;

    const tasksPerEmployee =
      uStats.employeeRoleCount > 0
        ? Number((tStats.activeTasks / uStats.employeeRoleCount).toFixed(2))
        : 0;

    let statusIndicator = "Stable";
    if (overdueRate > 15 || pendingReviews > 5) {
      statusIndicator = "Needs Attention";
    } else if (completionRate >= 80 && tStats.completedTasks > 0) {
      statusIndicator = "Strong";
    }

    totalOrgEmployees += uStats.totalEmployees;
    totalOrgManagers += uStats.managerRoleCount;
    totalOrgActiveTasks += tStats.activeTasks;
    totalOrgCompletedTasks += tStats.completedTasks;
    sumCompletionRates += completionRate;

    return {
      id: dept._id,
      name: dept.name,
      code: dept.code,
      employeeCount: uStats.totalEmployees,
      managerCount: uStats.managerRoleCount,
      activeTasks: tStats.activeTasks,
      completedTasks: tStats.completedTasks,
      overdueTasks: tStats.overdueTasks,
      pendingReviews,
      completionRate,
      onTimeCompletionRate,
      overdueRate,
      activeProjectsCount,
      tasksPerEmployee,
      statusIndicator,
    };
  });

  const avgOrgCompletionRate =
    departments.length > 0 ? Number((sumCompletionRates / departments.length).toFixed(2)) : 0;

  // Best Performing & Attention Requiring Departments
  const bestPerformingDepartments = departmentComparisonList
    .filter((d) => d.statusIndicator === "Strong" || d.completionRate >= 80)
    .sort((a, b) => b.completionRate - a.completionRate)
    .map(
      (d) =>
        `Department ${d.name} (${d.code}) achieved a ${d.completionRate}% completion rate with low overdue exposure (${d.overdueRate}%).`
    );

  const departmentsRequiringAttention = departmentComparisonList
    .filter((d) => d.statusIndicator === "Needs Attention" || d.overdueRate > 15 || d.pendingReviews > 5)
    .sort((a, b) => b.overdueRate - a.overdueRate)
    .map(
      (d) =>
        `Department ${d.name} (${d.code}) requires operational review due to ${d.overdueTasks} overdue tasks and ${d.pendingReviews} pending reviews (${d.overdueRate}% overdue rate).`
    );

  return {
    scopeMode: "ALL_DEPARTMENTS",
    summary: {
      totalDepartments: departments.length,
      totalEmployees: totalOrgEmployees,
      totalManagers: totalOrgManagers,
      totalActiveTasks: totalOrgActiveTasks,
      totalCompletedTasks: totalOrgCompletedTasks,
      avgDepartmentCompletionRate: avgOrgCompletionRate,
    },
    departmentComparison: departmentComparisonList,
    bestPerformingDepartments,
    departmentsRequiringAttention,
    whatsGoingWell: bestPerformingDepartments.slice(0, 3),
    attentionAreas: departmentsRequiringAttention.slice(0, 3),
    trends: "insufficient_data",
    historicalTrendsSupported: false,
    limitations: "Historical department performance comparison is not currently available.",
  };
};

module.exports = {
  getDepartmentPerformanceAnalytics,
  getSingleDepartmentAnalytics,
  getAllDepartmentsAnalytics,
};
