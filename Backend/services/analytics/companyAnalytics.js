const mongoose = require("mongoose");
const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
const Submission = require("../../models/Submission");
const Department = require("../../models/Department");
const Phase = require("../../models/Phase");

const { ROLES, TASK_STATUS } = require("../../constants/constants");

/* ===========================================================
   Company Analytics, Department, Manager, Risk, Attention, Positive & Trend Intelligence (Admin Only)
   =========================================================== */

/**
 * Synthesizes evidence-based attention items across company, departments, managers, and projects.
 */
const getAttentionRequired = (companyTasks, departments, managers, projectHealth) => {
  const items = [];

  // 1. Company Level Signals
  if (companyTasks.overdueTasks > 5) {
    items.push({
      id: "company-overdue",
      category: "Company",
      title: "High Overdue Task Volume",
      severity: "High",
      evidence: `${companyTasks.overdueTasks} active tasks are currently past due across the organization.`,
      metric: `${companyTasks.overdueRate}% overdue rate`,
    });
  }

  if (companyTasks.pendingReviews > 5) {
    items.push({
      id: "company-pending-reviews",
      category: "Company",
      title: "Pending Review Submission Backlog",
      severity: "Medium",
      evidence: `${companyTasks.pendingReviews} task submissions are awaiting review and approval.`,
      metric: `${companyTasks.pendingReviews} pending reviews`,
    });
  }

  // 2. Department Level Signals
  departments.forEach((dept) => {
    if (dept.statusIndicator === "Needs Attention") {
      items.push({
        id: `dept-${dept.id}`,
        category: "Department",
        title: `Department ${dept.name} Requires Attention`,
        severity: dept.overdueRate > 20 ? "High" : "Medium",
        evidence: `${dept.name} department has ${dept.overdueTasks} overdue tasks and ${dept.pendingReviews} pending submission reviews.`,
        metric: `${dept.overdueRate}% overdue rate`,
      });
    }
  });

  // 3. Manager Level Signals
  managers.forEach((mgr) => {
    if (mgr.statusIndicator === "Needs Attention") {
      items.push({
        id: `mgr-${mgr.id}`,
        category: "Manager",
        title: `Manager ${mgr.name} Team Attention Required`,
        severity: mgr.overdueRate > 20 || mgr.rejectedTasks > 3 ? "High" : "Medium",
        evidence: `Team managed by ${mgr.name} has ${mgr.overdueTasks} overdue tasks, ${mgr.pendingReviews} pending reviews, and ${mgr.rejectedTasks} task rejections.`,
        metric: `${mgr.overdueRate}% team overdue rate`,
      });
    }
  });

  // 4. Project Level Signals
  projectHealth.forEach((proj) => {
    if (proj.statusIndicator === "At Risk" || proj.statusIndicator === "Needs Attention") {
      items.push({
        id: `proj-${proj.id}`,
        category: "Project",
        title: `Project ${proj.name} At Risk`,
        severity: proj.statusIndicator === "At Risk" ? "High" : "Medium",
        evidence: `Project ${proj.name} (Manager: ${proj.managerName}) has ${proj.overdueTasks} overdue tasks and ${proj.pendingReviews} pending reviews.`,
        metric: `${proj.completionRate}% completion rate`,
      });
    }
  });

  // Return top 5 prioritized attention items
  return items
    .sort((a, b) => (a.severity === "High" ? -1 : 1))
    .slice(0, 5);
};

/**
 * Synthesizes evidence-based positive operational insights across company, departments, managers, and projects.
 */
const getWhatsGoingWell = (companyTasks, departments, managers, projectHealth, trends) => {
  const items = [];

  // 1. Company Level Positive Signals
  if (companyTasks.taskCompletionRate >= 80 && companyTasks.completedTasks > 0) {
    items.push({
      id: "company-completion-high",
      category: "Company",
      title: "Strong Organization Completion Rate",
      evidence: `Company-wide task completion rate stands at ${companyTasks.taskCompletionRate}% with ${companyTasks.completedTasks} closed tasks.`,
      metric: `${companyTasks.taskCompletionRate}% completion rate`,
    });
  }

  if (trends && trends.completedTasks && trends.completedTasks.isPositive && trends.completedTasks.previous > 0) {
    items.push({
      id: "company-trend-positive",
      category: "Company",
      title: "Task Completion Momentum",
      evidence: `Task completions increased by ${trends.completedTasks.changeText} compared with the previous month (${trends.completedTasks.current} vs ${trends.completedTasks.previous}).`,
      metric: `${trends.completedTasks.changeText} task growth`,
    });
  }

  // 2. Department Level Positive Signals
  departments.forEach((dept) => {
    if (dept.statusIndicator === "Strong" || (dept.completionRate >= 80 && dept.overdueRate <= 10 && dept.completedTasks > 0)) {
      items.push({
        id: `dept-well-${dept.id}`,
        category: "Department",
        title: `Department ${dept.name} Demonstrating Strong Execution`,
        evidence: `${dept.name} department achieved a ${dept.completionRate}% completion rate with low overdue exposure (${dept.overdueRate}% overdue rate).`,
        metric: `${dept.completionRate}% completion rate`,
      });
    }
  });

  // 3. Manager Level Positive Signals
  managers.forEach((mgr) => {
    if (mgr.statusIndicator === "Strong" || (mgr.completionRate >= 80 && mgr.overdueRate <= 10 && mgr.completedTasks > 0)) {
      items.push({
        id: `mgr-well-${mgr.id}`,
        category: "Manager",
        title: `Manager ${mgr.name} Team High Delivery Output`,
        evidence: `Team managed by ${mgr.name} has ${mgr.completedTasks} completed tasks with a ${mgr.completionRate}% completion rate and ${mgr.pendingReviews} pending reviews.`,
        metric: `${mgr.completionRate}% team completion`,
      });
    }
  });

  // 4. Project Level Positive Signals
  projectHealth.forEach((proj) => {
    if (proj.statusIndicator === "Healthy" && proj.completionRate >= 80 && proj.completedTasks > 0) {
      items.push({
        id: `proj-well-${proj.id}`,
        category: "Project",
        title: `Project ${proj.name} Progressing Smoothly`,
        evidence: `Project ${proj.name} (Manager: ${proj.managerName}) is at ${proj.completionRate}% completion with 0 high overdue risks.`,
        metric: `${proj.completionRate}% project progress`,
      });
    }
  });

  // Return top 5 prioritized positive signals
  return items.slice(0, 5);
};

/**
 * Calculate historical period comparison trends (Current Month vs Previous Month).
 */
const getCompanyTrends = async () => {
  const now = new Date();

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 1. Closed Tasks in Current Month vs Previous Month
  const [currentClosed, previousClosed] = await Promise.all([
    Task.countDocuments({
      isArchived: { $ne: true },
      status: TASK_STATUS.CLOSED,
      updatedAt: { $gte: currentMonthStart },
    }),
    Task.countDocuments({
      isArchived: { $ne: true },
      status: TASK_STATUS.CLOSED,
      updatedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    }),
  ]);

  // 2. Created Tasks in Current Month vs Previous Month
  const [currentCreated, previousCreated] = await Promise.all([
    Task.countDocuments({
      isArchived: { $ne: true },
      createdAt: { $gte: currentMonthStart },
    }),
    Task.countDocuments({
      isArchived: { $ne: true },
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    }),
  ]);

  // 3. Submissions Reviewed in Current Month vs Previous Month
  const [currentSubmissions, previousSubmissions] = await Promise.all([
    Submission.countDocuments({
      reviewedAt: { $gte: currentMonthStart },
    }),
    Submission.countDocuments({
      reviewedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    }),
  ]);

  const calcChange = (curr, prev) => {
    if (prev === 0) {
      return curr > 0 ? "+100%" : "0%";
    }
    const diff = ((curr - prev) / prev) * 100;
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}%`;
  };

  return {
    periodLabel: "Current Month vs Last Month",
    completedTasks: {
      current: currentClosed,
      previous: previousClosed,
      changeText: calcChange(currentClosed, previousClosed),
      isPositive: currentClosed >= previousClosed,
    },
    createdTasks: {
      current: currentCreated,
      previous: previousCreated,
      changeText: calcChange(currentCreated, previousCreated),
      isPositive: true,
    },
    reviewedSubmissions: {
      current: currentSubmissions,
      previous: previousSubmissions,
      changeText: calcChange(currentSubmissions, previousSubmissions),
      isPositive: currentSubmissions >= previousSubmissions,
    },
  };
};

/**
 * Aggregate Department Performance Intelligence metrics for all active departments.
 */
const getDepartmentPerformanceMetrics = async () => {
  const today = new Date();

  // 1. Fetch active departments
  const departments = await Department.find({ isActive: true })
    .select("_id name code")
    .lean();

  if (!departments || departments.length === 0) {
    return [];
  }

  const deptIds = departments.map((d) => d._id);

  // 2. Aggregate employees per department
  const userAgg = await User.aggregate([
    {
      $match: {
        role: ROLES.EMPLOYEE,
        department: { $in: deptIds },
      },
    },
    {
      $group: {
        _id: "$department",
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
      },
    },
  ]);

  const userDeptMap = {};
  userAgg.forEach((u) => {
    userDeptMap[u._id.toString()] = u;
  });

  // 3. Aggregate tasks per department via assignedTo user relationship
  const taskAgg = await Task.aggregate([
    {
      $match: {
        isArchived: { $ne: true },
        assignedTo: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignee",
      },
    },
    { $unwind: "$assignee" },
    {
      $match: {
        "assignee.department": { $in: deptIds },
      },
    },
    {
      $group: {
        _id: "$assignee.department",
        totalTasks: { $sum: 1 },
        activeTasks: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  [
                    TASK_STATUS.ASSIGNED,
                    TASK_STATUS.ACCEPTED,
                    TASK_STATUS.IN_PROGRESS,
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  {
                    $in: [
                      "$status",
                      [
                        TASK_STATUS.ASSIGNED,
                        TASK_STATUS.ACCEPTED,
                        TASK_STATUS.IN_PROGRESS,
                      ],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        withdrawnTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0],
          },
        },
      },
    },
  ]);

  const taskDeptMap = {};
  taskAgg.forEach((t) => {
    taskDeptMap[t._id.toString()] = t;
  });

  // 4. Aggregate pending submission reviews per department
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
    {
      $match: {
        "assignee.department": { $in: deptIds },
      },
    },
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

  // 5. Build department metrics array
  return departments.map((dept) => {
    const idStr = dept._id.toString();
    const uStats = userDeptMap[idStr] || { totalEmployees: 0, activeEmployees: 0 };
    const tStats = taskDeptMap[idStr] || {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      withdrawnTasks: 0,
    };
    const pendingReviews = submissionDeptMap[idStr] || 0;

    const completionDenominator = tStats.totalTasks - tStats.withdrawnTasks;
    const completionRate =
      completionDenominator > 0
        ? Number(((tStats.completedTasks / completionDenominator) * 100).toFixed(2))
        : 0;

    const overdueDenominator = tStats.activeTasks + tStats.overdueTasks;
    const overdueRate =
      overdueDenominator > 0
        ? Number(((tStats.overdueTasks / overdueDenominator) * 100).toFixed(2))
        : 0;

    // Explicit transparent performance status indicator rule
    let statusIndicator = "Stable";
    if (overdueRate > 15 || pendingReviews > 5) {
      statusIndicator = "Needs Attention";
    } else if (completionRate >= 80 && tStats.completedTasks > 0) {
      statusIndicator = "Strong";
    }

    return {
      id: dept._id,
      name: dept.name,
      code: dept.code,
      totalEmployees: uStats.totalEmployees,
      activeEmployees: uStats.activeEmployees,
      activeTasks: tStats.activeTasks,
      completedTasks: tStats.completedTasks,
      overdueTasks: tStats.overdueTasks,
      pendingReviews,
      completionRate,
      overdueRate,
      statusIndicator,
    };
  });
};

/**
 * Aggregate Manager Performance Intelligence metrics for Admin Perspective.
 */
const getManagerPerformanceMetrics = async () => {
  const today = new Date();

  // 1. Fetch active managers
  const managers = await User.find({ role: ROLES.MANAGER, isActive: true })
    .select("_id name email employeeId department")
    .populate("department", "name code")
    .lean();

  if (!managers || managers.length === 0) {
    return [];
  }

  const managerIds = managers.map((m) => m._id);

  // 2. Aggregate projects per manager
  const projectAgg = await Project.aggregate([
    { $match: { createdBy: { $in: managerIds } } },
    {
      $group: {
        _id: "$createdBy",
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: { $cond: [{ $eq: ["$isArchived", false] }, 1, 0] },
        },
      },
    },
  ]);

  const projMap = {};
  projectAgg.forEach((p) => {
    projMap[p._id.toString()] = p;
  });

  // 3. Aggregate tasks managed per manager (assignedBy)
  const taskAgg = await Task.aggregate([
    {
      $match: {
        isArchived: { $ne: true },
        assignedBy: { $in: managerIds },
      },
    },
    {
      $group: {
        _id: "$assignedBy",
        totalTasks: { $sum: 1 },
        activeTasks: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  [
                    TASK_STATUS.ASSIGNED,
                    TASK_STATUS.ACCEPTED,
                    TASK_STATUS.IN_PROGRESS,
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  {
                    $in: [
                      "$status",
                      [
                        TASK_STATUS.ASSIGNED,
                        TASK_STATUS.ACCEPTED,
                        TASK_STATUS.IN_PROGRESS,
                      ],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        withdrawnTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0],
          },
        },
        rejectedTasks: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  [TASK_STATUS.TASK_REJECTED, TASK_STATUS.ASSIGNMENT_REJECTED],
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

  const taskMap = {};
  taskAgg.forEach((t) => {
    taskMap[t._id.toString()] = t;
  });

  // 4. Aggregate pending submission reviews per manager
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
      $match: {
        "taskInfo.assignedBy": { $in: managerIds },
      },
    },
    {
      $group: {
        _id: "$taskInfo.assignedBy",
        pendingReviews: { $sum: 1 },
      },
    },
  ]);

  const subMap = {};
  submissionAgg.forEach((s) => {
    subMap[s._id.toString()] = s.pendingReviews;
  });

  // 5. Build manager metrics array
  return managers.map((mgr) => {
    const idStr = mgr._id.toString();
    const pStats = projMap[idStr] || { totalProjects: 0, activeProjects: 0 };
    const tStats = taskMap[idStr] || {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      withdrawnTasks: 0,
      rejectedTasks: 0,
    };
    const pendingReviews = subMap[idStr] || 0;

    const completionDenominator = tStats.totalTasks - tStats.withdrawnTasks;
    const completionRate =
      completionDenominator > 0
        ? Number(((tStats.completedTasks / completionDenominator) * 100).toFixed(2))
        : 0;

    const overdueDenominator = tStats.activeTasks + tStats.overdueTasks;
    const overdueRate =
      overdueDenominator > 0
        ? Number(((tStats.overdueTasks / overdueDenominator) * 100).toFixed(2))
        : 0;

    // Explicit transparent attention indicator rule
    let statusIndicator = "Stable";
    if (overdueRate > 15 || pendingReviews > 5 || tStats.rejectedTasks > 3) {
      statusIndicator = "Needs Attention";
    } else if (completionRate >= 80 && tStats.completedTasks > 0) {
      statusIndicator = "Strong";
    }

    return {
      id: mgr._id,
      name: mgr.name,
      email: mgr.email,
      employeeId: mgr.employeeId,
      department: mgr.department ? mgr.department.name : "N/A",
      activeProjects: pStats.activeProjects,
      totalProjects: pStats.totalProjects,
      activeTasks: tStats.activeTasks,
      completedTasks: tStats.completedTasks,
      overdueTasks: tStats.overdueTasks,
      rejectedTasks: tStats.rejectedTasks,
      pendingReviews,
      completionRate,
      overdueRate,
      statusIndicator,
    };
  });
};

/**
 * Aggregate Project Health & Organizational Risk Intelligence for Admin Perspective.
 * Handles projects with or without phases, filtering active/archived data correctly.
 */
const getProjectHealthMetrics = async () => {
  const today = new Date();

  // 1. Fetch active non-archived projects
  const projects = await Project.find({ isArchived: false })
    .select("_id name code status createdBy members startDate endDate")
    .populate("createdBy", "name email employeeId")
    .lean();

  if (!projects || projects.length === 0) {
    return [];
  }

  const projIds = projects.map((p) => p._id);

  // 2. Aggregate tasks per project
  const taskAgg = await Task.aggregate([
    {
      $match: {
        project: { $in: projIds },
        isArchived: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$project",
        totalTasks: { $sum: 1 },
        activeTasks: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  [
                    TASK_STATUS.ASSIGNED,
                    TASK_STATUS.ACCEPTED,
                    TASK_STATUS.IN_PROGRESS,
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  {
                    $in: [
                      "$status",
                      [
                        TASK_STATUS.ASSIGNED,
                        TASK_STATUS.ACCEPTED,
                        TASK_STATUS.IN_PROGRESS,
                      ],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        withdrawnTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0],
          },
        },
      },
    },
  ]);

  const taskProjMap = {};
  taskAgg.forEach((t) => {
    taskProjMap[t._id.toString()] = t;
  });

  // 3. Aggregate pending submission reviews per project
  const subAgg = await Submission.aggregate([
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
      $match: {
        "taskInfo.project": { $in: projIds },
        "taskInfo.isArchived": { $ne: true },
      },
    },
    {
      $group: {
        _id: "$taskInfo.project",
        pendingReviews: { $sum: 1 },
      },
    },
  ]);

  const subProjMap = {};
  subAgg.forEach((s) => {
    subProjMap[s._id.toString()] = s.pendingReviews;
  });

  // 4. Aggregate phases per project (if any)
  const phases = await Phase.find({ project: { $in: projIds } })
    .select("_id name project status startDate endDate")
    .lean();

  const phaseProjMap = {};
  phases.forEach((p) => {
    const pId = p.project.toString();
    if (!phaseProjMap[pId]) phaseProjMap[pId] = [];
    phaseProjMap[pId].push(p);
  });

  // 5. Build project health metrics array
  return projects.map((proj) => {
    const idStr = proj._id.toString();
    const tStats = taskProjMap[idStr] || {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      withdrawnTasks: 0,
    };
    const pendingReviews = subProjMap[idStr] || 0;
    const projPhases = phaseProjMap[idStr] || [];

    const completionDenominator = tStats.totalTasks - tStats.withdrawnTasks;
    const completionRate =
      completionDenominator > 0
        ? Number(((tStats.completedTasks / completionDenominator) * 100).toFixed(2))
        : 0;

    const overdueDenominator = tStats.activeTasks + tStats.overdueTasks;
    const overdueRate =
      overdueDenominator > 0
        ? Number(((tStats.overdueTasks / overdueDenominator) * 100).toFixed(2))
        : 0;

    // Transparent risk classification rule
    let statusIndicator = "Healthy";
    if (overdueRate > 15 || pendingReviews > 5 || tStats.overdueTasks > 3) {
      statusIndicator = "At Risk";
    } else if (overdueRate > 0 || pendingReviews > 0) {
      statusIndicator = "Needs Attention";
    } else if (completionRate >= 80 && tStats.completedTasks > 0) {
      statusIndicator = "Healthy";
    }

    return {
      id: proj._id,
      name: proj.name,
      code: proj.code,
      status: proj.status || "Active",
      managerName: proj.createdBy ? proj.createdBy.name : "N/A",
      memberCount: proj.members ? proj.members.length : 0,
      phaseCount: projPhases.length,
      totalTasks: tStats.totalTasks,
      activeTasks: tStats.activeTasks,
      completedTasks: tStats.completedTasks,
      overdueTasks: tStats.overdueTasks,
      pendingReviews,
      completionRate,
      overdueRate,
      statusIndicator,
    };
  });
};

/**
 * Calculate company-wide analytics metrics, department performance, manager performance, project health, attention items, positive insights, and trends.
 * Admin-only — authorization enforced at route level.
 */
const getCompanyMetrics = async (projectFilter = {}) => {
  const today = new Date();

  const formattedFilter = { ...projectFilter };
  if (
    formattedFilter.project &&
    typeof formattedFilter.project === "string" &&
    mongoose.Types.ObjectId.isValid(formattedFilter.project)
  ) {
    formattedFilter.project = new mongoose.Types.ObjectId(
      formattedFilter.project,
    );
  }

  const taskMatch = { ...formattedFilter, isArchived: { $ne: true } };

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    totalManagers,

    totalProjects,
    activeProjects,
    archivedProjects,

    taskStatusAgg,

    overdueTaskCount,
    highPriorityOverdueCount,
    rejectedTaskCount,
    pendingReviewCount,
    departmentMetrics,
    managerMetrics,
    projectHealthMetrics,
    trendsMetrics,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.EMPLOYEE }),
    User.countDocuments({ role: ROLES.EMPLOYEE, isActive: true }),
    User.countDocuments({ role: ROLES.EMPLOYEE, isActive: false }),
    User.countDocuments({ role: ROLES.MANAGER }),

    Project.countDocuments(),
    Project.countDocuments({ isArchived: false }),
    Project.countDocuments({ isArchived: true }),

    Task.aggregate([
      { $match: taskMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Task.countDocuments({
      ...taskMatch,
      dueDate: { $lt: today },
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    Task.countDocuments({
      ...taskMatch,
      dueDate: { $lt: today },
      priority: "High",
      status: {
        $in: [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ],
      },
    }),

    Task.countDocuments({
      ...taskMatch,
      status: {
        $in: [TASK_STATUS.TASK_REJECTED, TASK_STATUS.ASSIGNMENT_REJECTED],
      },
    }),

    Submission.countDocuments({ status: "Pending Review" }),

    getDepartmentPerformanceMetrics(),
    getManagerPerformanceMetrics(),
    getProjectHealthMetrics(),
    getCompanyTrends(),
  ]);

  const taskStatusDistribution = {};
  let totalTasks = 0;

  taskStatusAgg.forEach((item) => {
    taskStatusDistribution[item._id] = item.count;
    totalTasks += item.count;
  });

  const completedTasks = taskStatusDistribution[TASK_STATUS.CLOSED] || 0;
  const submittedTasks = taskStatusDistribution[TASK_STATUS.SUBMITTED] || 0;

  const activeTasks =
    (taskStatusDistribution[TASK_STATUS.ASSIGNED] || 0) +
    (taskStatusDistribution[TASK_STATUS.ACCEPTED] || 0) +
    (taskStatusDistribution[TASK_STATUS.IN_PROGRESS] || 0);

  const withdrawnTasks = taskStatusDistribution[TASK_STATUS.WITHDRAWN] || 0;

  const completionDenominator = totalTasks - withdrawnTasks;
  const taskCompletionRate =
    completionDenominator > 0
      ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
      : 0;

  const overdueDenominator = activeTasks + overdueTaskCount;
  const overdueRate =
    overdueDenominator > 0
      ? Number(((overdueTaskCount / overdueDenominator) * 100).toFixed(2))
      : 0;

  const companyTaskMetrics = {
    totalTasks,
    activeTasks,
    submittedTasks,
    completedTasks,
    pendingReviews: pendingReviewCount,
    overdueTasks: overdueTaskCount,
    highPriorityOverdue: highPriorityOverdueCount,
    rejectedTasks: rejectedTaskCount,
    taskCompletionRate,
    overdueRate,
    taskStatusDistribution,
  };

  // Synthesize decision support attention items
  const attentionRequiredItems = getAttentionRequired(
    companyTaskMetrics,
    departmentMetrics,
    managerMetrics,
    projectHealthMetrics
  );

  // Synthesize evidence-based positive insights
  const whatsGoingWellItems = getWhatsGoingWell(
    companyTaskMetrics,
    departmentMetrics,
    managerMetrics,
    projectHealthMetrics,
    trendsMetrics
  );

  return {
    users: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalManagers,
    },
    projects: {
      totalProjects,
      activeProjects,
      archivedProjects,
    },
    tasks: companyTaskMetrics,
    departments: departmentMetrics,
    managers: managerMetrics,
    projectHealth: projectHealthMetrics,
    attentionRequired: attentionRequiredItems,
    whatsGoingWell: whatsGoingWellItems,
    trends: trendsMetrics,
  };
};

module.exports = {
  getCompanyMetrics,
};
