const mongoose = require("mongoose");

const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const Activity = require("../../models/Activity");

const {
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

/* ===========================================================
   Employee Analytics — Metric Definitions
   ===========================================================

   activeTaskCount
     Non-archived tasks assigned to employee with status
     in [Assigned, Accepted, In Progress].

   completedTaskCount
     Non-archived tasks assigned to employee with status Closed.

   pendingTaskCount
     Non-archived tasks assigned to employee with status Submitted.

   overdueTaskCount
     Non-archived tasks assigned to employee where
     dueDate < now AND status in [Assigned, Accepted, In Progress].

   totalAssignedCount
     Total non-archived tasks assigned to employee (all statuses).

   completionRate
     completedTaskCount / (totalAssignedCount - withdrawnCount) * 100.
     0 if denominator is 0.

   averageCompletionTime
     Average (completedAt - createdAt) in days for Closed tasks
     with non-null completedAt. null if no completed tasks.

   averageAcceptanceTime
     Average time from task creation to employee acceptance in days.
     Derived from Activity records with action "Assignment Accepted".
     null if no acceptance records exist.

   rejectionRate
     (Rejected submissions / total submissions) * 100.
     0 if no submissions.

   =========================================================== */

/**
 * Calculate analytics metrics for a specific employee.
 *
 * @param {string} employeeId - The employee's user ObjectId (string)
 * @param {string|null} projectScope - Project filter:
 *   null/undefined = all tasks
 *   "NO_PROJECT"   = independent tasks only (project: null)
 *   "<objectId>"   = specific project
 * @returns {Object} Employee metrics object
 */
const getEmployeeMetrics = async (employeeId, projectScope = null) => {
  const today = new Date();
  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

  /* -------------------------------------------------------
     Build base match filter for Task queries
     ------------------------------------------------------- */

  const taskMatch = {
    assignedTo: employeeObjectId,
    isArchived: { $ne: true },
  };

  if (projectScope === "NO_PROJECT") {
    taskMatch.project = null;
  } else if (projectScope) {
    taskMatch.project = new mongoose.Types.ObjectId(projectScope);
  }

  /* -------------------------------------------------------
     Build project-scope match for $lookup pipelines
     (applied on the joined "taskDoc" field)
     ------------------------------------------------------- */

  const taskDocProjectMatch = { "taskDoc.isArchived": { $ne: true } };

  if (projectScope === "NO_PROJECT") {
    taskDocProjectMatch["taskDoc.project"] = null;
  } else if (projectScope) {
    taskDocProjectMatch["taskDoc.project"] = new mongoose.Types.ObjectId(
      projectScope,
    );
  }

  /* -------------------------------------------------------
     Run all independent aggregations in parallel
     ------------------------------------------------------- */

  const [
    taskResults,
    submissionResults,
    acceptanceResults,
    projectAggRes,
  ] = await Promise.all([
    // ===================== TASK METRICS =====================
    Task.aggregate([
      { $match: taskMatch },
      {
        $facet: {
          // Status counts
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],

          // Overdue count
          overdue: [
            {
              $match: {
                dueDate: { $lt: today },
                status: {
                  $in: [
                    TASK_STATUS.ASSIGNED,
                    TASK_STATUS.ACCEPTED,
                    TASK_STATUS.IN_PROGRESS,
                  ],
                },
              },
            },
            { $count: "count" },
          ],

          // Average completion time
          completionTime: [
            {
              $match: {
                status: TASK_STATUS.CLOSED,
                completedAt: { $ne: null },
              },
            },
            {
              $project: {
                days: {
                  $divide: [
                    { $subtract: ["$completedAt", "$createdAt"] },
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

    // =================== SUBMISSION METRICS ===================
    Submission.aggregate([
      { $match: { submittedBy: employeeObjectId } },
      {
        $lookup: {
          from: "tasks",
          localField: "task",
          foreignField: "_id",
          as: "taskDoc",
        },
      },
      { $unwind: "$taskDoc" },
      { $match: taskDocProjectMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          rejected: {
            $sum: {
              $cond: [
                { $eq: ["$status", SUBMISSION_STATUS.REJECTED] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // ================== ACCEPTANCE TIME ====================
    Activity.aggregate([
      {
        $match: {
          performedBy: employeeObjectId,
          action: NOTIFICATION_TYPE.ASSIGNMENT_ACCEPTED,
        },
      },
      {
        $lookup: {
          from: "tasks",
          localField: "task",
          foreignField: "_id",
          as: "taskDoc",
        },
      },
      { $unwind: "$taskDoc" },
      { $match: taskDocProjectMatch },
      {
        $project: {
          days: {
            $divide: [
              { $subtract: ["$createdAt", "$taskDoc.createdAt"] },
              86400000,
            ],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: "$days" } } },
    ]),

    // ============= PROJECT & PHASE DISTRIBUTION =============
    Task.aggregate([
      { $match: taskMatch },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDoc",
        },
      },
      {
        $lookup: {
          from: "phases",
          localField: "phase",
          foreignField: "_id",
          as: "phaseDoc",
        },
      },
      {
        $project: {
          project: 1,
          phase: 1,
          status: 1,
          projectName: {
            $ifNull: [
              { $arrayElemAt: ["$projectDoc.name", 0] },
              "Independent Tasks",
            ],
          },
          phaseName: { $arrayElemAt: ["$phaseDoc.name", 0] },
        },
      },
      {
        $group: {
          _id: {
            projectId: { $ifNull: ["$project", "NO_PROJECT"] },
            phaseId: { $ifNull: ["$phase", "NO_PHASE"] },
          },
          projectName: { $first: "$projectName" },
          phaseName: { $first: "$phaseName" },
          taskCount: { $sum: 1 },
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
        },
      },
    ]),
  ]);

  /* -------------------------------------------------------
     Parse task results
     ------------------------------------------------------- */

  const taskAgg = taskResults[0];

  const statusCounts = {};
  let totalAssignedCount = 0;

  taskAgg.statusCounts.forEach((item) => {
    statusCounts[item._id] = item.count;
    totalAssignedCount += item.count;
  });

  const activeTaskCount =
    (statusCounts[TASK_STATUS.ASSIGNED] || 0) +
    (statusCounts[TASK_STATUS.ACCEPTED] || 0) +
    (statusCounts[TASK_STATUS.IN_PROGRESS] || 0);

  const completedTaskCount = statusCounts[TASK_STATUS.CLOSED] || 0;
  const pendingTaskCount = statusCounts[TASK_STATUS.SUBMITTED] || 0;
  const withdrawnCount = statusCounts[TASK_STATUS.WITHDRAWN] || 0;

  const overdueTaskCount =
    taskAgg.overdue.length > 0 ? taskAgg.overdue[0].count : 0;

  const completionDenominator = totalAssignedCount - withdrawnCount;
  const completionRate =
    completionDenominator > 0
      ? Number(((completedTaskCount / completionDenominator) * 100).toFixed(2))
      : 0;

  const averageCompletionTime =
    taskAgg.completionTime.length > 0
      ? Number(taskAgg.completionTime[0].avg.toFixed(2))
      : null;

  /* -------------------------------------------------------
     Parse submission results
     ------------------------------------------------------- */

  let totalSubmissions = 0;
  let rejectedSubmissions = 0;
  let rejectionRate = 0;

  if (submissionResults.length > 0) {
    totalSubmissions = submissionResults[0].total;
    rejectedSubmissions = submissionResults[0].rejected;
    rejectionRate =
      totalSubmissions > 0
        ? Number(((rejectedSubmissions / totalSubmissions) * 100).toFixed(2))
        : 0;
  }

  /* -------------------------------------------------------
     Parse acceptance time results
     ------------------------------------------------------- */

  const averageAcceptanceTime =
    acceptanceResults.length > 0
      ? Number(acceptanceResults[0].avg.toFixed(2))
      : null;

  /* -------------------------------------------------------
     Parse Project & Phase Distribution
     ------------------------------------------------------- */

  const projectMap = {};

  projectAggRes.forEach((item) => {
    const pId = item._id.projectId.toString();
    if (!projectMap[pId]) {
      projectMap[pId] = {
        projectId: pId,
        projectName: item.projectName,
        taskCount: 0,
        activeTasks: 0,
        completedTasks: 0,
        phases: [],
      };
    }

    projectMap[pId].taskCount += item.taskCount;
    projectMap[pId].activeTasks += item.activeTasks;
    projectMap[pId].completedTasks += item.completedTasks;

    if (item.phaseName) {
      projectMap[pId].phases.push({
        phaseId: item._id.phaseId.toString(),
        phaseName: item.phaseName,
        taskCount: item.taskCount,
        activeTasks: item.activeTasks,
        completedTasks: item.completedTasks,
      });
    }
  });

  const projectDistribution = Object.values(projectMap);

  /* -------------------------------------------------------
     Status Distribution & Workload Progress
     ------------------------------------------------------- */

  const statusDistribution = {
    [TASK_STATUS.ASSIGNED]: statusCounts[TASK_STATUS.ASSIGNED] || 0,
    [TASK_STATUS.ACCEPTED]: statusCounts[TASK_STATUS.ACCEPTED] || 0,
    [TASK_STATUS.IN_PROGRESS]: statusCounts[TASK_STATUS.IN_PROGRESS] || 0,
    [TASK_STATUS.SUBMITTED]: statusCounts[TASK_STATUS.SUBMITTED] || 0,
    [TASK_STATUS.CLOSED]: statusCounts[TASK_STATUS.CLOSED] || 0,
    [TASK_STATUS.WITHDRAWN]: statusCounts[TASK_STATUS.WITHDRAWN] || 0,
    [TASK_STATUS.TASK_REJECTED]: statusCounts[TASK_STATUS.TASK_REJECTED] || 0,
  };

  const workloadProgress = {
    totalTasks: totalAssignedCount,
    activeTasks: activeTaskCount,
    completedTasks: completedTaskCount,
    pendingReview: pendingTaskCount,
    overdueTasks: overdueTaskCount,
    withdrawnTasks: withdrawnCount,
    applicableTasks: completionDenominator,
    progressRate: completionRate,
  };

  /* -------------------------------------------------------
     Calculate My Performance Intelligence (Phase 12.3)
     ------------------------------------------------------- */

  const closedTasks = await Task.find({
    ...taskMatch,
    status: TASK_STATUS.CLOSED,
  })
    .select("dueDate completedAt createdAt")
    .lean();

  let onTimeClosedCount = 0;
  let totalClosedWithDueDate = 0;

  closedTasks.forEach((taskDoc) => {
    if (taskDoc.dueDate) {
      totalClosedWithDueDate++;
      const compDate = taskDoc.completedAt ? new Date(taskDoc.completedAt) : new Date();
      const dueDate = new Date(taskDoc.dueDate);
      if (compDate <= dueDate) {
        onTimeClosedCount++;
      }
    }
  });

  const onTimeCompletionRate =
    totalClosedWithDueDate > 0
      ? Number(((onTimeClosedCount / totalClosedWithDueDate) * 100).toFixed(1))
      : null;

  const employeeSubmissions = await Submission.find({
    submittedBy: employeeObjectId,
  })
    .select("status createdAt reviewedAt")
    .lean();

  let subApproved = 0;
  let subRejected = 0;
  let subPending = 0;

  employeeSubmissions.forEach((sub) => {
    if (sub.status === SUBMISSION_STATUS.APPROVED) subApproved++;
    else if (sub.status === SUBMISSION_STATUS.REJECTED) subRejected++;
    else if (sub.status === SUBMISSION_STATUS.PENDING_REVIEW) subPending++;
  });

  const subReviewed = subApproved + subRejected;
  const submissionApprovalRate =
    subReviewed > 0 ? Number(((subApproved / subReviewed) * 100).toFixed(1)) : null;

  const submissionPerformance = {
    totalSubmissions: employeeSubmissions.length,
    approvedCount: subApproved,
    rejectedCount: subRejected,
    pendingCount: subPending,
    reviewedCount: subReviewed,
    approvalRate: submissionApprovalRate,
  };

  const monthlyTrendMap = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    monthlyTrendMap[key] = { month: key, completed: 0, onTime: 0 };
  }

  closedTasks.forEach((taskDoc) => {
    if (taskDoc.completedAt) {
      const d = new Date(taskDoc.completedAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].completed++;
        if (taskDoc.dueDate && new Date(taskDoc.completedAt) <= new Date(taskDoc.dueDate)) {
          monthlyTrendMap[key].onTime++;
        }
      }
    }
  });

  const monthlyTrend = Object.values(monthlyTrendMap);
  const overdueRate =
    activeTaskCount > 0
      ? Number(((overdueTaskCount / activeTaskCount) * 100).toFixed(1))
      : 0;

  const myPerformance = {
    completionRate,
    onTimeMetrics: {
      onTimeClosedCount,
      totalClosedWithDueDate,
      onTimeRate: onTimeCompletionRate,
    },
    overdueMetrics: {
      overdueCount: overdueTaskCount,
      overdueRate,
    },
    submissionPerformance,
    monthlyTrend,
    sampleSize: {
      totalAssigned: totalAssignedCount,
      completedTasks: completedTaskCount,
      totalSubmissions: employeeSubmissions.length,
    },
  };

  /* -------------------------------------------------------
     Fetch Employee Action Center priorities & My Projects
     ------------------------------------------------------- */

  const actionCenter = await getEmployeeActionCenter(employeeId, projectScope);
  const myProjectsAndPhases = await getEmployeeProjectsAndPhases(
    employeeId,
    projectScope,
  );

  /* -------------------------------------------------------
     Synthesize My Insights (Phase 12.5)
     ------------------------------------------------------- */

  const myInsights = getEmployeeInsights(
    workloadProgress,
    myPerformance,
    actionCenter,
    myProjectsAndPhases,
  );

  /* -------------------------------------------------------
     Synthesize My Summary (Phase 12.6)
     ------------------------------------------------------- */

  const mySummary = getEmployeeSummary(
    actionCenter,
    workloadProgress,
    myPerformance,
    myProjectsAndPhases,
    myInsights,
  );

  /* -------------------------------------------------------
     Return metrics
     ------------------------------------------------------- */

  return {
    activeTaskCount,
    completedTaskCount,
    pendingTaskCount,
    overdueTaskCount,
    totalAssignedCount,
    withdrawnCount,
    completionRate,
    averageCompletionTime,
    averageAcceptanceTime,
    rejectionRate,
    totalSubmissions,
    rejectedSubmissions,
    actionCenter,
    statusDistribution,
    workloadProgress,
    projectDistribution,
    myPerformance,
    myProjectsAndPhases,
    myInsights,
    mySummary,
  };
};

/**
 * Synthesize My Summary for Employee Perspective (Phase 12.6).
 * 100% metric reuse from Phases 12.1-12.5 with 0 additional database queries.
 */
const getEmployeeSummary = (
  actionCenter,
  workloadProgress,
  myPerformance,
  myProjectsAndPhases,
  myInsights,
) => {
  const activeProjectsCount =
    myProjectsAndPhases && myProjectsAndPhases.myProjects
      ? myProjectsAndPhases.myProjects.filter((p) => !p.isIndependent).length
      : 0;

  const topAttentionItem =
    actionCenter &&
    actionCenter.needsAttention &&
    actionCenter.needsAttention.length > 0
      ? actionCenter.needsAttention[0]
      : null;

  const topUpcomingDeadline =
    myProjectsAndPhases &&
    myProjectsAndPhases.upcomingDeadlines &&
    myProjectsAndPhases.upcomingDeadlines.length > 0
      ? myProjectsAndPhases.upcomingDeadlines[0]
      : null;

  const topPositiveInsight =
    myInsights &&
    myInsights.whatsGoingWell &&
    myInsights.whatsGoingWell.length > 0
      ? myInsights.whatsGoingWell[0]
      : null;

  const topAttentionInsight =
    myInsights &&
    myInsights.areasRequiringAttention &&
    myInsights.areasRequiringAttention.length > 0
      ? myInsights.areasRequiringAttention[0]
      : null;

  return {
    kpis: {
      activeTasks: workloadProgress ? workloadProgress.activeTasks : 0,
      completedTasks: workloadProgress ? workloadProgress.completedTasks : 0,
      pendingReviews: workloadProgress ? workloadProgress.pendingReview : 0,
      overdueTasks: workloadProgress ? workloadProgress.overdueTasks : 0,
      completionRate: workloadProgress ? workloadProgress.progressRate : 0,
      onTimeRate:
        myPerformance && myPerformance.onTimeMetrics
          ? myPerformance.onTimeMetrics.onTimeRate
          : null,
      activeProjectsCount,
    },
    topAttentionItem,
    topUpcomingDeadline,
    topPositiveInsight,
    topAttentionInsight,
  };
};

/**
 * Synthesize My Insights for Employee Perspective (Phase 12.5).
 * 100% deterministic evidence-based rules derived from Workload, Performance, and Projects analytics.
 */
const getEmployeeInsights = (
  workloadProgress,
  myPerformance,
  actionCenter,
  myProjectsAndPhases,
) => {
  const whatsGoingWell = [];
  const areasRequiringAttention = [];

  // --- Areas Requiring Attention (Max 5) ---

  // 1. Active Overdue Tasks
  if (workloadProgress && workloadProgress.overdueTasks > 0) {
    areasRequiringAttention.push({
      id: "att-overdue",
      category: "Deadlines",
      title: "Active Overdue Tasks",
      evidence: `${workloadProgress.overdueTasks} active task(s) in your queue are past their scheduled due date.`,
      severity: "High",
    });
  }

  // 2. Rejected Submissions
  if (
    myPerformance &&
    myPerformance.submissionPerformance &&
    myPerformance.submissionPerformance.rejectedCount > 0
  ) {
    areasRequiringAttention.push({
      id: "att-rejected",
      category: "Submissions",
      title: "Submissions Requiring Revision",
      evidence: `${myPerformance.submissionPerformance.rejectedCount} submission(s) were returned by reviewer for revision.`,
      severity: "High",
    });
  }

  // 3. Pending Task Acceptance
  if (actionCenter && actionCenter.needsAttention) {
    const awaitingAcceptance = actionCenter.needsAttention.filter(
      (item) => item.type === "awaiting_acceptance",
    );
    if (awaitingAcceptance.length > 0) {
      areasRequiringAttention.push({
        id: "att-acceptance",
        category: "Assignments",
        title: "Tasks Awaiting Acceptance",
        evidence: `${awaitingAcceptance.length} newly assigned task(s) are waiting for your acceptance.`,
        severity: "Medium",
      });
    }
  }

  // 4. Pending Review Queue
  if (
    myPerformance &&
    myPerformance.submissionPerformance &&
    myPerformance.submissionPerformance.pendingCount >= 3
  ) {
    areasRequiringAttention.push({
      id: "att-pending-queue",
      category: "Reviews",
      title: "Large Pending Review Queue",
      evidence: `${myPerformance.submissionPerformance.pendingCount} task submissions are currently awaiting manager review.`,
      severity: "Medium",
    });
  }

  // 5. Low On-Time Delivery Rate
  if (
    myPerformance &&
    myPerformance.onTimeMetrics &&
    myPerformance.onTimeMetrics.totalClosedWithDueDate >= 3 &&
    myPerformance.onTimeMetrics.onTimeRate !== null &&
    myPerformance.onTimeMetrics.onTimeRate < 75
  ) {
    areasRequiringAttention.push({
      id: "att-ontime-low",
      category: "Punctuality",
      title: "On-Time Completion Rate Below Target",
      evidence: `Your on-time delivery rate is ${myPerformance.onTimeMetrics.onTimeRate}% across ${myPerformance.onTimeMetrics.totalClosedWithDueDate} closed tasks with due dates.`,
      severity: "Medium",
    });
  }

  // --- What's Going Well (Max 5) ---

  // 1. High Completion Rate
  if (
    workloadProgress &&
    workloadProgress.applicableTasks >= 3 &&
    workloadProgress.progressRate >= 80
  ) {
    whatsGoingWell.push({
      id: "well-completion",
      category: "Completion",
      title: "High Task Completion Rate",
      evidence: `Achieved an overall completion rate of ${workloadProgress.progressRate}% across ${workloadProgress.applicableTasks} assigned tasks.`,
    });
  }

  // 2. Strong On-Time Delivery
  if (
    myPerformance &&
    myPerformance.onTimeMetrics &&
    myPerformance.onTimeMetrics.totalClosedWithDueDate >= 3 &&
    myPerformance.onTimeMetrics.onTimeRate !== null &&
    myPerformance.onTimeMetrics.onTimeRate >= 85
  ) {
    whatsGoingWell.push({
      id: "well-ontime",
      category: "Punctuality",
      title: "Strong On-Time Delivery Record",
      evidence: `${myPerformance.onTimeMetrics.onTimeRate}% on-time completion across ${myPerformance.onTimeMetrics.totalClosedWithDueDate} closed tasks with due dates.`,
    });
  }

  // 3. Zero Overdue Workload
  if (
    workloadProgress &&
    workloadProgress.activeTasks > 0 &&
    workloadProgress.overdueTasks === 0
  ) {
    whatsGoingWell.push({
      id: "well-zero-overdue",
      category: "Schedule Control",
      title: "Zero Overdue Queue",
      evidence: "All active assignments in your queue are currently within scheduled due dates.",
    });
  }

  // 4. High Submission Approval Rate
  if (
    myPerformance &&
    myPerformance.submissionPerformance &&
    myPerformance.submissionPerformance.reviewedCount >= 3 &&
    myPerformance.submissionPerformance.approvalRate !== null &&
    myPerformance.submissionPerformance.approvalRate >= 85
  ) {
    whatsGoingWell.push({
      id: "well-approval",
      category: "Quality",
      title: "High Submission Approval Rate",
      evidence: `${myPerformance.submissionPerformance.approvalRate}% of reviewed submissions were approved by reviewers.`,
    });
  }

  // 5. Consistent Monthly Trend
  if (myPerformance && myPerformance.monthlyTrend) {
    const activeMonths = myPerformance.monthlyTrend.filter(
      (m) => m.completed > 0,
    );
    if (activeMonths.length >= 2) {
      whatsGoingWell.push({
        id: "well-trend",
        category: "Consistency",
        title: "Consistent Monthly Execution",
        evidence: `Demonstrated continuous task completion activity across ${activeMonths.length} recent monthly periods.`,
      });
    }
  }

  return {
    whatsGoingWell: whatsGoingWell.slice(0, 5),
    areasRequiringAttention: areasRequiringAttention.slice(0, 5),
  };
};

/**
 * Synthesize My Projects & Phases Intelligence for Employee Perspective (Phase 12.4).
 * Strictly scoped to authenticated employee's tasks, submissions, projects, and phases.
 *
 * @param {string} employeeId - Authenticated employee's user ObjectId
 * @param {string|null} projectScope - Optional project scope filter
 * @returns {Object} myProjects array and upcomingDeadlines array
 */
const getEmployeeProjectsAndPhases = async (employeeId, projectScope = null) => {
  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
  const now = new Date();

  const taskMatch = {
    assignedTo: employeeObjectId,
    isArchived: { $ne: true },
  };

  if (projectScope === "NO_PROJECT") {
    taskMatch.project = null;
  } else if (projectScope) {
    taskMatch.project = new mongoose.Types.ObjectId(projectScope);
  }

  // Fetch employee tasks populated with project and phase
  const tasks = await Task.find(taskMatch)
    .populate("project", "name description")
    .populate("phase", "name description")
    .sort({ dueDate: 1 })
    .lean();

  // Fetch pending review submissions to flag tasks awaiting review
  const pendingSubmissions = await Submission.find({
    submittedBy: employeeObjectId,
    status: SUBMISSION_STATUS.PENDING_REVIEW,
  })
    .select("task")
    .lean();

  const pendingTaskIds = new Set(
    pendingSubmissions.map((s) => (s.task ? s.task.toString() : "")),
  );

  const projectsMap = {};
  const upcomingDeadlines = [];

  tasks.forEach((taskDoc) => {
    const isOverdue =
      taskDoc.dueDate &&
      new Date(taskDoc.dueDate) < now &&
      [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ].includes(taskDoc.status);

    const isPendingReview = pendingTaskIds.has(taskDoc._id.toString());

    const isUpcoming =
      taskDoc.dueDate &&
      new Date(taskDoc.dueDate) >= now &&
      [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ].includes(taskDoc.status);

    const pId = taskDoc.project ? taskDoc.project._id.toString() : "INDEPENDENT";
    const pName = taskDoc.project ? taskDoc.project.name : "Independent Tasks";
    const phaseId = taskDoc.phase ? taskDoc.phase._id.toString() : "NO_PHASE";
    const phaseName = taskDoc.phase ? taskDoc.phase.name : null;

    if (!projectsMap[pId]) {
      projectsMap[pId] = {
        projectId: pId,
        projectName: pName,
        isIndependent: !taskDoc.project,
        taskCount: 0,
        activeTasks: 0,
        completedTasks: 0,
        pendingReviews: 0,
        overdueTasks: 0,
        withdrawnTasks: 0,
        hasPhases: false,
        phasesMap: {},
        directTasks: [],
      };
    }

    const proj = projectsMap[pId];
    proj.taskCount++;

    if (
      [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ].includes(taskDoc.status)
    ) {
      proj.activeTasks++;
    } else if (taskDoc.status === TASK_STATUS.CLOSED) {
      proj.completedTasks++;
    } else if (taskDoc.status === TASK_STATUS.WITHDRAWN) {
      proj.withdrawnTasks++;
    }

    if (isPendingReview) {
      proj.pendingReviews++;
    }

    if (isOverdue) {
      proj.overdueTasks++;
    }

    const taskItem = {
      taskId: taskDoc._id,
      title: taskDoc.title,
      status: taskDoc.status,
      priority: taskDoc.priority || "Medium",
      dueDate: taskDoc.dueDate,
      isOverdue,
      isPendingReview,
    };

    if (phaseName) {
      proj.hasPhases = true;
      if (!proj.phasesMap[phaseId]) {
        proj.phasesMap[phaseId] = {
          phaseId,
          phaseName,
          taskCount: 0,
          activeTasks: 0,
          completedTasks: 0,
          pendingReviews: 0,
          overdueTasks: 0,
          tasks: [],
        };
      }
      const ph = proj.phasesMap[phaseId];
      ph.taskCount++;
      if (
        [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ].includes(taskDoc.status)
      ) {
        ph.activeTasks++;
      } else if (taskDoc.status === TASK_STATUS.CLOSED) {
        ph.completedTasks++;
      }
      if (isPendingReview) ph.pendingReviews++;
      if (isOverdue) ph.overdueTasks++;
      ph.tasks.push(taskItem);
    } else {
      proj.directTasks.push(taskItem);
    }

    if (isUpcoming && upcomingDeadlines.length < 5) {
      upcomingDeadlines.push({
        taskId: taskDoc._id,
        title: taskDoc.title,
        projectName: pName,
        phaseName: phaseName,
        dueDate: taskDoc.dueDate,
        priority: taskDoc.priority || "Medium",
        status: taskDoc.status,
      });
    }
  });

  const myProjects = Object.values(projectsMap).map((proj) => {
    const applicable = proj.taskCount - proj.withdrawnTasks;
    const progressRate =
      applicable > 0
        ? Number(((proj.completedTasks / applicable) * 100).toFixed(1))
        : 0;

    const phases = Object.values(proj.phasesMap);

    return {
      projectId: proj.projectId,
      projectName: proj.projectName,
      isIndependent: proj.isIndependent,
      taskCount: proj.taskCount,
      activeTasks: proj.activeTasks,
      completedTasks: proj.completedTasks,
      pendingReviews: proj.pendingReviews,
      overdueTasks: proj.overdueTasks,
      progressRate,
      hasPhases: proj.hasPhases,
      phases,
      directTasks: proj.directTasks,
    };
  });

  return {
    myProjects,
    upcomingDeadlines,
  };
};

/**
 * Synthesize Employee Action Center operational signals for Employee Perspective.
 * Strictly scoped to authenticated employee's tasks and submissions.
 *
 * @param {string} employeeId - Authenticated employee's user ObjectId
 * @param {string|null} projectScope - Optional project scope filter
 * @returns {Object} Action Center categories (needsAttention, upcoming, statusUpdates)
 */
const getEmployeeActionCenter = async (employeeId, projectScope = null) => {
  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const taskMatch = {
    assignedTo: employeeObjectId,
    isArchived: { $ne: true },
  };

  if (projectScope === "NO_PROJECT") {
    taskMatch.project = null;
  } else if (projectScope) {
    taskMatch.project = new mongoose.Types.ObjectId(projectScope);
  }

  // 1. Fetch employee tasks with populated project and phase context
  const tasks = await Task.find(taskMatch)
    .populate("project", "name")
    .populate("phase", "name")
    .sort({ dueDate: 1 })
    .lean();

  // 2. Fetch employee submissions
  const submissions = await Submission.find({ submittedBy: employeeObjectId })
    .populate({
      path: "task",
      populate: [
        { path: "project", select: "name" },
        { path: "phase", select: "name" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  const needsAttention = [];
  const upcoming = [];
  const statusUpdates = [];

  const getContextInfo = (taskDoc) => {
    const projName = taskDoc && taskDoc.project ? taskDoc.project.name : "Independent Task";
    const phaseName = taskDoc && taskDoc.phase ? taskDoc.phase.name : null;
    return { projName, phaseName };
  };

  // --- Category 1: Needs Attention (Max 5) ---

  // 1. Rejected Submissions requiring employee action
  const rejectedSubmissions = submissions.filter(
    (sub) => sub.status === SUBMISSION_STATUS.REJECTED && sub.task
  );

  const processedTaskIds = new Set();
  rejectedSubmissions.forEach((sub) => {
    if (needsAttention.length >= 5) return;
    const taskDoc = sub.task;
    if (taskDoc && !processedTaskIds.has(taskDoc._id.toString())) {
      processedTaskIds.add(taskDoc._id.toString());
      const { projName, phaseName } = getContextInfo(taskDoc);
      needsAttention.push({
        id: `na-rejected-${sub._id}`,
        taskId: taskDoc._id,
        submissionId: sub._id,
        category: "Submission Feedback",
        severity: "High",
        title: taskDoc.title,
        evidence: sub.managerFeedback
          ? `Submission rejected by reviewer. Feedback: "${sub.managerFeedback}"`
          : "Your submission was rejected and requires further work.",
        status: taskDoc.status || TASK_STATUS.IN_PROGRESS,
        priority: taskDoc.priority || "Medium",
        dueDate: taskDoc.dueDate,
        projectName: projName,
        phaseName: phaseName,
        actionRequired: "Revision & Resubmission Required",
        type: "rejected_submission",
      });
    }
  });

  // 2. Tasks Awaiting Acceptance (TASK_STATUS.ASSIGNED)
  tasks.forEach((taskDoc) => {
    if (needsAttention.length >= 5) return;
    if (taskDoc.status === TASK_STATUS.ASSIGNED) {
      if (!processedTaskIds.has(taskDoc._id.toString())) {
        processedTaskIds.add(taskDoc._id.toString());
        const { projName, phaseName } = getContextInfo(taskDoc);
        needsAttention.push({
          id: `na-assigned-${taskDoc._id}`,
          taskId: taskDoc._id,
          category: "Pending Acceptance",
          severity: "High",
          title: taskDoc.title,
          evidence: "New task assigned to you, awaiting your acceptance.",
          status: taskDoc.status,
          priority: taskDoc.priority || "Medium",
          dueDate: taskDoc.dueDate,
          projectName: projName,
          phaseName: phaseName,
          actionRequired: "Acceptance Required",
          type: "awaiting_acceptance",
        });
      }
    }
  });

  // 3. Overdue Active Tasks (dueDate < now AND status in [ASSIGNED, ACCEPTED, IN_PROGRESS])
  tasks.forEach((taskDoc) => {
    if (needsAttention.length >= 5) return;
    const isOverdue =
      taskDoc.dueDate &&
      new Date(taskDoc.dueDate) < now &&
      [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ].includes(taskDoc.status);

    if (isOverdue) {
      if (!processedTaskIds.has(taskDoc._id.toString())) {
        processedTaskIds.add(taskDoc._id.toString());
        const { projName, phaseName } = getContextInfo(taskDoc);
        const daysOverdue = Math.max(
          1,
          Math.ceil((now - new Date(taskDoc.dueDate)) / 86400000)
        );
        needsAttention.push({
          id: `na-overdue-${taskDoc._id}`,
          taskId: taskDoc._id,
          category: "Overdue Deadline",
          severity: "High",
          title: taskDoc.title,
          evidence: `Task is past due date by ${daysOverdue} day(s). Immediate action recommended.`,
          status: taskDoc.status,
          priority: taskDoc.priority || "Medium",
          dueDate: taskDoc.dueDate,
          projectName: projName,
          phaseName: phaseName,
          actionRequired: "Overdue Work",
          type: "overdue_task",
        });
      }
    }
  });

  // --- Category 2: Upcoming (Max 5) ---
  const activePendingTasks = tasks
    .filter((taskDoc) => {
      if (!taskDoc.dueDate) return false;
      const taskDueDate = new Date(taskDoc.dueDate);
      const isPendingStatus = [
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.ACCEPTED,
        TASK_STATUS.IN_PROGRESS,
      ].includes(taskDoc.status);
      return isPendingStatus && taskDueDate >= now;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  activePendingTasks.forEach((taskDoc) => {
    if (upcoming.length >= 5) return;
    const { projName, phaseName } = getContextInfo(taskDoc);
    const taskDueDate = new Date(taskDoc.dueDate);
    const timeDiff = taskDueDate.getTime() - todayStart.getTime();
    const daysDiff = Math.floor(timeDiff / 86400000);

    let dueLabel = `Due in ${daysDiff} days`;
    if (daysDiff === 0) {
      dueLabel = "Due Today";
    } else if (daysDiff === 1) {
      dueLabel = "Due Tomorrow";
    }

    upcoming.push({
      id: `up-task-${taskDoc._id}`,
      taskId: taskDoc._id,
      category: "Upcoming Deadline",
      title: taskDoc.title,
      evidence: `Scheduled due date: ${dueLabel}.`,
      status: taskDoc.status,
      priority: taskDoc.priority || "Medium",
      dueDate: taskDoc.dueDate,
      dueLabel: dueLabel,
      projectName: projName,
      phaseName: phaseName,
      type: "upcoming_task",
    });
  });

  // --- Category 3: Status Updates (Max 5) ---

  // 1. Submissions Pending Review
  const pendingSubmissions = submissions.filter(
    (sub) => sub.status === SUBMISSION_STATUS.PENDING_REVIEW && sub.task
  );

  pendingSubmissions.forEach((sub) => {
    if (statusUpdates.length >= 5) return;
    const taskDoc = sub.task;
    const { projName, phaseName } = getContextInfo(taskDoc);
    statusUpdates.push({
      id: `su-pending-${sub._id}`,
      taskId: taskDoc._id,
      submissionId: sub._id,
      category: "Awaiting Review",
      title: taskDoc.title,
      evidence: `Submitted work (Submission #${sub.submissionNumber}) is currently under review.`,
      status: "Submitted",
      priority: taskDoc.priority || "Medium",
      dueDate: taskDoc.dueDate,
      projectName: projName,
      phaseName: phaseName,
      type: "pending_review",
    });
  });

  // 2. Approved Submissions
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === SUBMISSION_STATUS.APPROVED && sub.task
  );

  approvedSubmissions.slice(0, 3).forEach((sub) => {
    if (statusUpdates.length >= 5) return;
    const taskDoc = sub.task;
    const { projName, phaseName } = getContextInfo(taskDoc);
    statusUpdates.push({
      id: `su-approved-${sub._id}`,
      taskId: taskDoc._id,
      submissionId: sub._id,
      category: "Submission Approved",
      title: taskDoc.title,
      evidence: sub.managerFeedback
        ? `Submission approved! Feedback: "${sub.managerFeedback}"`
        : "Submission approved by reviewer. Task closed.",
      status: "Closed",
      priority: taskDoc.priority || "Medium",
      dueDate: taskDoc.dueDate,
      projectName: projName,
      phaseName: phaseName,
      type: "approved_submission",
    });
  });

  // 3. Assignment Rejected or Task Withdrawn
  tasks.forEach((taskDoc) => {
    if (statusUpdates.length >= 5) return;
    if (taskDoc.status === TASK_STATUS.TASK_REJECTED) {
      const { projName, phaseName } = getContextInfo(taskDoc);
      statusUpdates.push({
        id: `su-rejected-${taskDoc._id}`,
        taskId: taskDoc._id,
        category: "Assignment Rejected",
        title: taskDoc.title,
        evidence: taskDoc.rejectionReason
          ? `Assignment was rejected. Reason: "${taskDoc.rejectionReason}"`
          : "Assignment was rejected.",
        status: taskDoc.status,
        priority: taskDoc.priority || "Medium",
        dueDate: taskDoc.dueDate,
        projectName: projName,
        phaseName: phaseName,
        type: "assignment_rejected",
      });
    } else if (taskDoc.status === TASK_STATUS.WITHDRAWN) {
      const { projName, phaseName } = getContextInfo(taskDoc);
      statusUpdates.push({
        id: `su-withdrawn-${taskDoc._id}`,
        taskId: taskDoc._id,
        category: "Task Withdrawn",
        title: taskDoc.title,
        evidence: "Task was withdrawn by manager.",
        status: taskDoc.status,
        priority: taskDoc.priority || "Medium",
        dueDate: taskDoc.dueDate,
        projectName: projName,
        phaseName: phaseName,
        type: "task_withdrawn",
      });
    }
  });

  return {
    needsAttention: needsAttention.slice(0, 5),
    upcoming: upcoming.slice(0, 5),
    statusUpdates: statusUpdates.slice(0, 5),
  };
};

module.exports = {
  getEmployeeMetrics,
  getEmployeeActionCenter,
  getEmployeeProjectsAndPhases,
  getEmployeeInsights,
  getEmployeeSummary,
};

