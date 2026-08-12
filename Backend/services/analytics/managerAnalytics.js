const mongoose = require("mongoose");

const Task = require("../../models/Task");
const Submission = require("../../models/Submission");

const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
} = require("../../constants/constants");

const { getAccessibleProjectIds } = require("../access/projectAccess");

/* ===========================================================
   Manager / Team Analytics — Metric Definitions
   ===========================================================

   teamSize
     Count of unique employees who have non-archived tasks
     within the manager's accessible scope.

   teamTaskCompletion
     (Closed tasks / (Total tasks - Withdrawn tasks)) * 100
     across the manager's scope.

   teamWorkloadDistribution / employeePerformance
     Array of { employeeId, employeeName, employeeCode,
     totalTasks, activeTasks, completedTasks, overdueTasks,
     rejectedTasks, withdrawnTasks, pendingReviews, completionRate,
     overdueRate, onTimeCompletionRate, workShare, executionStatus }
     for each employee with tasks in scope.

   bottlenecksAndRisks
     Contains overdueTasksList, upcomingDeadlinesList, pendingReviewsList,
     and projectPhaseBottlenecks.

   employeeStrengths
     Deterministic breakdown of execution evidence by Priority Tiers
     without NLP, keyword guessing, or artificial category creation.

   assignmentIntelligence
     Transparent candidate evidence metrics for active tasks in scope.

   actionCenter
     Synthesized decision support signals (Needs Attention, Consider, Going Well).

   =========================================================== */

/**
 * Build the task scope filter for a manager or admin user.
 * Replicates the scoping logic used in managerDashboardService.js.
 *
 * @param {Object} user - { userId, role }
 * @returns {Object} MongoDB query filter for tasks
 */
const buildTaskScopeFilter = async (user) => {
  if (user.role === ROLES.ADMIN) {
    return {};
  }

  const projectIds = await getAccessibleProjectIds(user);

  return {
    $or: [
      { project: { $in: projectIds } },
      {
        project: null,
        assignedBy: new mongoose.Types.ObjectId(user.userId),
      },
      {
        assignedTo: new mongoose.Types.ObjectId(user.userId),
      },
    ],
  };
};

/**
 * Aggregate Bottlenecks & Deadline Risk intelligence for Manager Perspective.
 */
const getManagerBottlenecks = async (user, taskScopeFilter) => {
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const baseMatch = {
    ...taskScopeFilter,
    isArchived: { $ne: true },
  };

  // 1. Fetch Overdue Tasks in Manager Scope (Active & Past Due)
  const overdueTasksDocs = await Task.find({
    ...baseMatch,
    dueDate: { $lt: today },
    status: {
      $in: [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ],
    },
  })
    .select("_id title status priority dueDate assignedTo project phase updatedAt")
    .populate("assignedTo", "name employeeId")
    .populate("project", "name code")
    .populate("phase", "name")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  const overdueTasksList = overdueTasksDocs.map((t) => ({
    id: t._id,
    title: t.title,
    assigneeName: t.assignedTo ? t.assignedTo.name : "Unassigned",
    assigneeCode: t.assignedTo ? t.assignedTo.employeeId : "N/A",
    projectName: t.project ? t.project.name : "Independent",
    phaseName: t.phase ? t.phase.name : null,
    dueDate: t.dueDate,
    priority: t.priority || "Medium",
    status: t.status,
    daysOverdue: Math.max(
      1,
      Math.floor((today - new Date(t.dueDate)) / (1000 * 60 * 60 * 24))
    ),
  }));

  // 2. Fetch Upcoming Deadline Tasks (Due in Next 3 Days, Active)
  const upcomingDeadlineDocs = await Task.find({
    ...baseMatch,
    dueDate: { $gte: today, $lte: threeDaysLater },
    status: {
      $in: [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ],
    },
  })
    .select("_id title status priority dueDate assignedTo project phase")
    .populate("assignedTo", "name employeeId")
    .populate("project", "name code")
    .populate("phase", "name")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  const upcomingDeadlinesList = upcomingDeadlineDocs.map((t) => {
    const dueTime = new Date(t.dueDate);
    const isDueToday = dueTime.toDateString() === today.toDateString();
    return {
      id: t._id,
      title: t.title,
      assigneeName: t.assignedTo ? t.assignedTo.name : "Unassigned",
      assigneeCode: t.assignedTo ? t.assignedTo.employeeId : "N/A",
      projectName: t.project ? t.project.name : "Independent",
      phaseName: t.phase ? t.phase.name : null,
      dueDate: t.dueDate,
      priority: t.priority || "Medium",
      status: t.status,
      deadlineCategory: isDueToday ? "Due Today" : "Due Soon (1-3 Days)",
    };
  });

  // 3. Fetch Pending Review Submissions in Manager Scope
  const tasksInScope = await Task.find(baseMatch).select("_id").lean();
  const taskIdsInScope = tasksInScope.map((t) => t._id);

  let pendingReviewsList = [];
  if (taskIdsInScope.length > 0) {
    const pendingSubs = await Submission.find({
      task: { $in: taskIdsInScope },
      status: SUBMISSION_STATUS.PENDING_REVIEW,
    })
      .select("_id task submittedBy createdAt notes")
      .populate({
        path: "task",
        select: "_id title project phase assignedTo",
        populate: [
          { path: "project", select: "name code" },
          { path: "phase", select: "name" },
        ],
      })
      .populate("submittedBy", "name employeeId")
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    pendingReviewsList = pendingSubs.map((s) => ({
      id: s._id,
      taskTitle: s.task ? s.task.title : "Unknown Task",
      projectName:
        s.task && s.task.project ? s.task.project.name : "Independent",
      phaseName: s.task && s.task.phase ? s.task.phase.name : null,
      submittedByName: s.submittedBy ? s.submittedBy.name : "Employee",
      submittedByCode: s.submittedBy ? s.submittedBy.employeeId : "N/A",
      submittedAt: s.createdAt,
      waitingDays: Math.max(
        0,
        Math.floor((today - new Date(s.createdAt)) / (1000 * 60 * 60 * 24))
      ),
    }));
  }

  // 4. Project & Phase Bottleneck Aggregation
  const projBottlenecksAgg = await Task.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: { project: "$project", phase: "$phase" },
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
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
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
                  { $lt: ["$dueDate", today] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $match: {
        $or: [{ overdueTasks: { $gt: 0 } }, { activeTasks: { $gt: 5 } }],
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id.project",
        foreignField: "_id",
        as: "projDoc",
      },
    },
    {
      $lookup: {
        from: "phases",
        localField: "_id.phase",
        foreignField: "_id",
        as: "phaseDoc",
      },
    },
    {
      $project: {
        _id: 0,
        projectId: "$_id.project",
        projectName: {
          $ifNull: [{ $arrayElemAt: ["$projDoc.name", 0] }, "Independent Tasks"],
        },
        phaseId: "$_id.phase",
        phaseName: {
          $ifNull: [{ $arrayElemAt: ["$phaseDoc.name", 0] }, null],
        },
        totalTasks: 1,
        activeTasks: 1,
        overdueTasks: 1,
      },
    },
    { $sort: { overdueTasks: -1, activeTasks: -1 } },
    { $limit: 5 },
  ]);

  return {
    overdueTasksList,
    upcomingDeadlinesList,
    pendingReviewsList,
    projectPhaseBottlenecks: projBottlenecksAgg,
  };
};

/**
 * Aggregate Employee Strength & Work-Type Intelligence for Manager Perspective.
 * Uses structured priority tiers and project domain relationships (no fake categories/NLP).
 */
const getEmployeeStrengths = async (user, taskScopeFilter) => {
  const today = new Date();
  const baseMatch = {
    ...taskScopeFilter,
    isArchived: { $ne: true },
  };

  const strengthAgg = await Task.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: {
          assignedTo: "$assignedTo",
          priority: "$priority",
        },
        totalTasks: { $sum: 1 },
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
                  { $lt: ["$dueDate", today] },
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
    {
      $lookup: {
        from: "users",
        localField: "_id.assignedTo",
        foreignField: "_id",
        as: "employee",
      },
    },
    {
      $unwind: {
        path: "$employee",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        employeeId: { $ifNull: ["$employee._id", "$_id.assignedTo"] },
        employeeName: { $ifNull: ["$employee.name", "Unassigned Workload"] },
        employeeCode: { $ifNull: ["$employee.employeeId", "N/A"] },
        priorityTier: "$_id.priority",
        totalTasks: 1,
        completedTasks: 1,
        overdueTasks: 1,
        withdrawnTasks: 1,
      },
    },
  ]);

  const employeeMap = {};
  strengthAgg.forEach((item) => {
    if (!item.employeeId) return;
    const empIdStr = item.employeeId.toString();

    if (!employeeMap[empIdStr]) {
      employeeMap[empIdStr] = {
        employeeId: empIdStr,
        employeeName: item.employeeName,
        employeeCode: item.employeeCode,
        priorityBreakdown: [],
        strongExecutionAreas: [],
      };
    }

    const denominator = item.totalTasks - item.withdrawnTasks;
    const completionRate =
      denominator > 0
        ? Number(((item.completedTasks / denominator) * 100).toFixed(2))
        : 0;

    const overdueRate =
      item.totalTasks > 0
        ? Number(((item.overdueTasks / item.totalTasks) * 100).toFixed(2))
        : 0;

    let evidenceLevel = "Limited Evidence";
    if (item.totalTasks >= 3) {
      if (completionRate >= 80 && overdueRate <= 10) {
        evidenceLevel = "Strong Execution Indicator";
        employeeMap[empIdStr].strongExecutionAreas.push(
          `${item.priorityTier} Priority Tasks (${completionRate}% completion rate across ${item.totalTasks} tasks)`
        );
      } else {
        evidenceLevel = "Moderate Execution";
      }
    }

    employeeMap[empIdStr].priorityBreakdown.push({
      priorityTier: item.priorityTier,
      totalTasks: item.totalTasks,
      completedTasks: item.completedTasks,
      overdueTasks: item.overdueTasks,
      completionRate,
      overdueRate,
      evidenceLevel,
    });
  });

  return {
    dataAvailable: true,
    structuredFieldUsed: "Task Priority Tiers & Project Scope",
    limitationNotice:
      "Task categories/tags are not defined in the current database schema. Intelligence is derived deterministically from Priority execution tiers and Project domains without NLP or AI guessing.",
    employeeStrengthsList: Object.values(employeeMap),
  };
};

/**
 * Aggregate Assignment Intelligence for Manager Perspective.
 * Deterministic evidence-based candidate recommendations for tasks in scope.
 */
const getManagerAssignmentIntelligence = async (user, taskScopeFilter) => {
  const today = new Date();
  const baseMatch = {
    ...taskScopeFilter,
    isArchived: { $ne: true },
  };

  // 1. Fetch active tasks in manager scope for target selection
  const candidateTasksDocs = await Task.find({
    ...baseMatch,
    status: {
      $in: [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ],
    },
  })
    .select("_id title priority dueDate project phase assignedTo")
    .populate("project", "name code")
    .populate("phase", "name")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  const selectableTasks = candidateTasksDocs.map((t) => ({
    id: t._id.toString(),
    title: t.title,
    projectName: t.project ? t.project.name : "Independent",
    projectId: t.project ? t.project._id.toString() : null,
    phaseName: t.phase ? t.phase.name : null,
    priority: t.priority || "Medium",
    dueDate: t.dueDate,
    assignedToId: t.assignedTo ? t.assignedTo.toString() : null,
  }));

  // 2. Aggregate per-employee domain context (completed tasks per project & priority)
  const employeeDomainAgg = await Task.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: {
          assignedTo: "$assignedTo",
          project: "$project",
          priority: "$priority",
        },
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
          },
        },
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
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
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
                  { $lt: ["$dueDate", today] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.assignedTo",
        foreignField: "_id",
        as: "employee",
      },
    },
    {
      $unwind: {
        path: "$employee",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        employeeId: { $ifNull: ["$employee._id", "$_id.assignedTo"] },
        employeeName: { $ifNull: ["$employee.name", "Unassigned"] },
        employeeCode: { $ifNull: ["$employee.employeeId", "N/A"] },
        projectId: { $ifNull: ["$_id.project", null] },
        priorityTier: "$_id.priority",
        totalTasks: 1,
        completedTasks: 1,
        activeTasks: 1,
        overdueTasks: 1,
      },
    },
  ]);

  // Map candidate employees and their evidence
  const candidateMap = {};
  employeeDomainAgg.forEach((item) => {
    if (!item.employeeId) return;
    const empIdStr = item.employeeId.toString();

    if (!candidateMap[empIdStr]) {
      candidateMap[empIdStr] = {
        employeeId: empIdStr,
        employeeName: item.employeeName,
        employeeCode: item.employeeCode,
        totalActive: 0,
        totalOverdue: 0,
        totalCompleted: 0,
        projectExperience: {},
        priorityExperience: {},
      };
    }

    candidateMap[empIdStr].totalActive += item.activeTasks;
    candidateMap[empIdStr].totalOverdue += item.overdueTasks;
    candidateMap[empIdStr].totalCompleted += item.completedTasks;

    if (item.projectId) {
      const pIdStr = item.projectId.toString();
      candidateMap[empIdStr].projectExperience[pIdStr] =
        (candidateMap[empIdStr].projectExperience[pIdStr] || 0) + item.completedTasks;
    }

    if (item.priorityTier) {
      candidateMap[empIdStr].priorityExperience[item.priorityTier] =
        (candidateMap[empIdStr].priorityExperience[item.priorityTier] || 0) + item.completedTasks;
    }
  });

  const candidates = Object.values(candidateMap);

  return {
    selectableTasks,
    candidates,
    guidanceNotice:
      "Assignment recommendations are informational evidence signals based on current workload, completion history, and project domain experience. Final assignment decisions remain under full manager control.",
  };
};

/**
 * Synthesize Manager Action Center operational signals for Manager Perspective.
 * Consumes existing Phase 11.1–11.5 metrics to provide prioritized decision support.
 */
const getManagerActionCenter = (
  workloadList,
  totalActiveTasks,
  pendingReviewCount,
  bottlenecksAndRisks,
  employeeStrengths
) => {
  const needsAttention = [];
  const consider = [];
  const goingWell = [];

  // 1. NEEDS ATTENTION
  if (
    bottlenecksAndRisks &&
    bottlenecksAndRisks.overdueTasksList &&
    bottlenecksAndRisks.overdueTasksList.length > 0
  ) {
    const overdueCount = bottlenecksAndRisks.overdueTasksList.length;
    needsAttention.push({
      id: "na-overdue",
      category: "Overdue Workload",
      severity: "High",
      title: `${overdueCount} Active Task${overdueCount > 1 ? "s" : ""} Overdue`,
      evidence: `${overdueCount} active task(s) past scheduled due date requiring manager review.`,
      metric: `${overdueCount} overdue tasks`,
    });
  }

  if (pendingReviewCount > 0) {
    needsAttention.push({
      id: "na-reviews",
      category: "Approval Backlog",
      severity: pendingReviewCount > 3 ? "High" : "Medium",
      title: `${pendingReviewCount} Submission${pendingReviewCount > 1 ? "s" : ""} Pending Review`,
      evidence: `${pendingReviewCount} team submission(s) awaiting manager verification.`,
      metric: `${pendingReviewCount} pending reviews`,
    });
  }

  workloadList.forEach((emp) => {
    if (emp.overdueRate > 15 && emp.activeTasks > 0) {
      needsAttention.push({
        id: `na-emp-overdue-${emp.employeeId}`,
        category: "Employee Overdue Rate",
        severity: "High",
        title: `${emp.employeeName} Has ${emp.overdueRate}% Overdue Rate`,
        evidence: `${emp.overdueTasks} out of ${emp.activeTasks + emp.overdueTasks} active tasks are overdue.`,
        metric: `${emp.overdueRate}% overdue rate`,
      });
    }
  });

  if (
    bottlenecksAndRisks &&
    bottlenecksAndRisks.projectPhaseBottlenecks &&
    bottlenecksAndRisks.projectPhaseBottlenecks.length > 0
  ) {
    const topRiskProj = bottlenecksAndRisks.projectPhaseBottlenecks[0];
    needsAttention.push({
      id: "na-proj-bottleneck",
      category: "Project Bottleneck",
      severity: "High",
      title: `Concentrated Risk in ${topRiskProj.projectName}`,
      evidence: `${topRiskProj.overdueTasks} overdue tasks concentrated in ${topRiskProj.projectName}${topRiskProj.phaseName ? ` (${topRiskProj.phaseName})` : ""}.`,
      metric: `${topRiskProj.overdueTasks} overdue tasks`,
    });
  }

  // 2. CONSIDER
  workloadList.forEach((emp) => {
    if (emp.workShare >= 35 && workloadList.length > 1) {
      consider.push({
        id: `c-workshare-${emp.employeeId}`,
        category: "Workload Distribution",
        severity: "Medium",
        title: `${emp.employeeName} Carrying ${emp.workShare}% Team Workload`,
        evidence: `Assigned ${emp.activeTasks} out of ${totalActiveTasks} active team tasks.`,
        metric: `${emp.workShare}% work share`,
      });
    }
  });

  if (
    employeeStrengths &&
    employeeStrengths.employeeStrengthsList
  ) {
    const limitedEvEmps = employeeStrengths.employeeStrengthsList.filter(
      (e) => e.priorityBreakdown.some((p) => p.evidenceLevel === "Limited Evidence")
    );
    if (limitedEvEmps.length > 0) {
      consider.push({
        id: "c-limited-evidence",
        category: "Evidence Evaluation",
        severity: "Medium",
        title: `Limited Performance Evidence for ${limitedEvEmps.length} Employee(s)`,
        evidence: `Fewer than 3 tasks executed in current priority tiers; evaluation requires more work history.`,
        metric: `${limitedEvEmps.length} employees with limited data`,
      });
    }
  }

  // 3. GOING WELL
  workloadList.forEach((emp) => {
    if (emp.completionRate >= 80 && emp.overdueRate <= 10 && emp.completedTasks > 0) {
      goingWell.push({
        id: `gw-emp-${emp.employeeId}`,
        category: "Strong Execution",
        severity: "Low",
        title: `${emp.employeeName} Strong Execution (${emp.completionRate}%)`,
        evidence: `Completed ${emp.completedTasks} tasks with ${emp.overdueRate}% overdue rate.`,
        metric: `${emp.completionRate}% completion rate`,
      });
    }
  });

  if (bottlenecksAndRisks && (!bottlenecksAndRisks.overdueTasksList || bottlenecksAndRisks.overdueTasksList.length === 0)) {
    goingWell.push({
      id: "gw-no-overdue",
      category: "Schedule Adherence",
      severity: "Low",
      title: "Zero Active Overdue Tasks across Team",
      evidence: "All active team assignments are currently progressing on schedule.",
      metric: "0 overdue tasks",
    });
  }

  if (pendingReviewCount === 0) {
    goingWell.push({
      id: "gw-no-reviews",
      category: "Review Backlog Clear",
      severity: "Low",
      title: "Submission Review Backlog Completely Clear",
      evidence: "No pending team submissions awaiting manager approval.",
      metric: "0 pending reviews",
    });
  }

  return {
    needsAttention: needsAttention.slice(0, 5),
    consider: consider.slice(0, 5),
    goingWell: goingWell.slice(0, 5),
  };
};

/**
 * Calculate team-level analytics, employee performance, bottlenecks, strengths, assignment intelligence, and action center for a manager (or admin).
 *
 * @param {Object} user - { userId, role } from req.user
 * @param {Object|null} customProjectFilter - Filter for project scope (e.g. { project: null } or { project: id })
 * @returns {Object} Manager team analytics object
 */
const getManagerTeamMetrics = async (user, customProjectFilter = null) => {
  const today = new Date();
  const taskScopeFilter = await buildTaskScopeFilter(user);

  const formattedCustomFilter = customProjectFilter
    ? { ...customProjectFilter }
    : {};
  if (
    formattedCustomFilter.project &&
    typeof formattedCustomFilter.project === "string" &&
    mongoose.Types.ObjectId.isValid(formattedCustomFilter.project)
  ) {
    formattedCustomFilter.project = new mongoose.Types.ObjectId(
      formattedCustomFilter.project,
    );
  }

  const baseMatch = {
    ...taskScopeFilter,
    ...formattedCustomFilter,
    isArchived: { $ne: true },
  };

  /* -------------------------------------------------------
     Single task aggregation with $facet
     ------------------------------------------------------- */

  const [
    taskMetrics,
    bottlenecksAndRisks,
    employeeStrengths,
    assignmentIntelligence,
  ] = await Promise.all([
    Task.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          // --- Workload & Performance per employee ---
          workloadDistribution: [
            {
              $group: {
                _id: "$assignedTo",
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
                          { $lt: ["$dueDate", today] },
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
                          [
                            TASK_STATUS.TASK_REJECTED,
                            TASK_STATUS.ASSIGNMENT_REJECTED,
                          ],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                onTimeCompletedTasks: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", TASK_STATUS.CLOSED] },
                          { $ne: ["$completedAt", null] },
                          { $lte: ["$completedAt", "$dueDate"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                employeeId: { $ifNull: ["$employee._id", "$_id"] },
                employeeName: { $ifNull: ["$employee.name", "Unassigned Workload"] },
                employeeCode: { $ifNull: ["$employee.employeeId", "N/A"] },
                totalTasks: 1,
                activeTasks: 1,
                completedTasks: 1,
                overdueTasks: 1,
                withdrawnTasks: 1,
                rejectedTasks: 1,
                onTimeCompletedTasks: 1,
              },
            },
            { $sort: { activeTasks: -1 } },
          ],

          // --- Status distribution ---
          statusDistribution: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],

          // --- Totals for completion rate ---
          taskTotals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ["$status", TASK_STATUS.CLOSED] }, 1, 0],
                  },
                },
                withdrawn: {
                  $sum: {
                    $cond: [{ $eq: ["$status", TASK_STATUS.WITHDRAWN] }, 1, 0],
                  },
                },
              },
            },
          ],

          // --- Average delay for overdue completed tasks ---
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
                  $divide: [
                    { $subtract: ["$completedAt", "$dueDate"] },
                    86400000,
                  ],
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

          // --- Collect task IDs for submission queries ---
          taskIds: [{ $project: { _id: 1 } }],
        },
      },
    ]),
    getManagerBottlenecks(user, taskScopeFilter),
    getEmployeeStrengths(user, taskScopeFilter),
    getManagerAssignmentIntelligence(user, taskScopeFilter),
  ]);

  /* -------------------------------------------------------
     Parse task metrics
     ------------------------------------------------------- */

  const workloadList = (taskMetrics[0]?.workloadDistribution || []).filter(
    (item) => item.employeeId !== null
  );

  const teamSize = workloadList.length;

  let teamTaskCompletion = 0;

  if (
    taskMetrics[0] &&
    taskMetrics[0].taskTotals &&
    taskMetrics[0].taskTotals.length > 0
  ) {
    const { total, completed, withdrawn } = taskMetrics[0].taskTotals[0];
    const denominator = total - withdrawn;

    teamTaskCompletion =
      denominator > 0
        ? Number(((completed / denominator) * 100).toFixed(2))
        : 0;
  }

  const taskStatusDistribution = {};

  if (taskMetrics[0] && taskMetrics[0].statusDistribution) {
    taskMetrics[0].statusDistribution.forEach((item) => {
      taskStatusDistribution[item._id] = item.count;
    });
  }

  const averageTeamDelay =
    taskMetrics[0] && taskMetrics[0].delay && taskMetrics[0].delay.length > 0
      ? Number(taskMetrics[0].delay[0].avgDelay.toFixed(2))
      : null;

  const delayedTaskCount =
    taskMetrics[0] && taskMetrics[0].delay && taskMetrics[0].delay.length > 0
      ? taskMetrics[0].delay[0].count
      : 0;

  /* -------------------------------------------------------
     Submission metrics (pending reviews + review time)
     ------------------------------------------------------- */

  const taskIdsInScope = (taskMetrics[0]?.taskIds || []).map((t) => t._id);

  let pendingReviewCount = 0;
  let averageReviewTime = null;
  const pendingReviewsMap = {};

  if (taskIdsInScope.length > 0) {
    const [submissionMetrics, pendingReviewsPerUserAgg] = await Promise.all([
      Submission.aggregate([
        { $match: { task: { $in: taskIdsInScope } } },
        {
          $facet: {
            pending: [
              { $match: { status: SUBMISSION_STATUS.PENDING_REVIEW } },
              { $count: "count" },
            ],
            reviewTime: [
              { $match: { reviewedAt: { $ne: null } } },
              {
                $project: {
                  days: {
                    $divide: [
                      { $subtract: ["$reviewedAt", "$createdAt"] },
                      86400000,
                    ],
                  },
                },
              },
              { $group: { _id: null, avg: { $avg: "$days" } } },
            ],
          },
        },
      ]),
      Submission.aggregate([
        {
          $match: {
            status: SUBMISSION_STATUS.PENDING_REVIEW,
            task: { $in: taskIdsInScope },
          },
        },
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
          $group: {
            _id: "$taskInfo.assignedTo",
            pendingReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (submissionMetrics && submissionMetrics.length > 0) {
      pendingReviewCount =
        submissionMetrics[0].pending.length > 0
          ? submissionMetrics[0].pending[0].count
          : 0;

      averageReviewTime =
        submissionMetrics[0].reviewTime.length > 0
          ? Number(submissionMetrics[0].reviewTime[0].avg.toFixed(2))
          : null;
    }

    if (pendingReviewsPerUserAgg) {
      pendingReviewsPerUserAgg.forEach((pr) => {
        if (pr._id) {
          pendingReviewsMap[pr._id.toString()] = pr.pendingReviews;
        }
      });
    }
  }

  let totalActiveTasks = 0;
  let totalOverdueTasks = 0;

  workloadList.forEach((emp) => {
    totalActiveTasks += emp.activeTasks || 0;
    totalOverdueTasks += emp.overdueTasks || 0;
  });

  const formattedWorkloadDistribution = workloadList.map((emp) => {
    const empIdStr = emp.employeeId ? emp.employeeId.toString() : "unassigned";
    const pendingReviews = pendingReviewsMap[empIdStr] || 0;

    const completionDenominator = emp.totalTasks - (emp.withdrawnTasks || 0);
    const completionRate =
      completionDenominator > 0
        ? Number(((emp.completedTasks / completionDenominator) * 100).toFixed(2))
        : 0;

    const overdueDenominator = emp.activeTasks + emp.overdueTasks;
    const overdueRate =
      overdueDenominator > 0
        ? Number(((emp.overdueTasks / overdueDenominator) * 100).toFixed(2))
        : 0;

    const workShare =
      totalActiveTasks > 0
        ? Number(((emp.activeTasks / totalActiveTasks) * 100).toFixed(2))
        : 0;

    const onTimeCompletionRate =
      emp.completedTasks > 0
        ? Number(((emp.onTimeCompletedTasks / emp.completedTasks) * 100).toFixed(2))
        : null;

    let executionStatus = "Stable";
    if (overdueRate > 15 || pendingReviews > 3 || (emp.rejectedTasks || 0) > 2) {
      executionStatus = "Needs Attention";
    } else if (completionRate >= 80 && overdueRate <= 10 && emp.completedTasks > 0) {
      executionStatus = "Strong Execution";
    }

    return {
      ...emp,
      employeeId: empIdStr,
      pendingReviews,
      completionRate,
      overdueRate,
      onTimeCompletionRate,
      workShare,
      executionStatus,
    };
  });

  const actionCenter = getManagerActionCenter(
    formattedWorkloadDistribution,
    totalActiveTasks,
    pendingReviewCount,
    bottlenecksAndRisks,
    employeeStrengths
  );

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    teamSize,
    totalActiveTasks,
    totalOverdueTasks,
    pendingReviewCount,
    teamTaskCompletion,
    teamWorkloadDistribution: formattedWorkloadDistribution,
    employeePerformance: formattedWorkloadDistribution,
    bottlenecksAndRisks,
    employeeStrengths,
    assignmentIntelligence,
    actionCenter,
    taskStatusDistribution,
    averageTeamDelay,
    delayedTaskCount,
    averageReviewTime,
  };
};

module.exports = {
  getManagerTeamMetrics,
};
