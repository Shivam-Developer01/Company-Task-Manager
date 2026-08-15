const mongoose = require("mongoose");
const Task = require("../../models/Task");
const User = require("../../models/User");
const Project = require("../../models/Project");
try { require("../../models/Department"); } catch (e) {}
try { require("../../models/Designation"); } catch (e) {}
const CustomError = require("../../errors/CustomError");
const { TASK_STATUS, ROLES } = require("../../constants/constants");
const { getProjectFilter } = require("../access/projectAccess");
const { sanitizePayload } = require("../ai/aiContextPolicy");
const { sanitizeAiString } = require("../ai/aiResponseValidator");

/**
 * Deterministic Candidate Evidence Aggregator (Phase 15.2).
 * Collects task facts and candidate operational evidence for AI recommendations.
 * STRICTLY READ-ONLY. NO AI ranking, NO AI employee selection, NO MongoDB mutations.
 */

/**
 * Get deterministic candidate evidence for a target task.
 * @param {string} taskId Task ObjectId string
 * @param {Object} viewer Authenticated user object from req.user
 * @returns {Promise<Object>} Normalized candidate evidence payload DTO
 */
const getCandidateEvidenceForTask = async (taskId, viewer) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  // 1. Employee role cannot request task candidate analysis
  const viewerRoleLower = viewer.role.toLowerCase();
  if (viewerRoleLower === ROLES.EMPLOYEE) {
    throw new CustomError(
      "Forbidden: Employees are not authorized to request task candidate evidence.",
      403
    );
  }

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    throw new CustomError("Valid Task ID is required for candidate analysis.", 400);
  }

  const taskObjectId = new mongoose.Types.ObjectId(taskId);

  // 2. Fetch target task and populate project/phase/assignedBy details
  const task = await Task.findById(taskObjectId)
    .populate("project", "name code members createdBy")
    .populate("phase", "name")
    .populate("assignedBy", "name employeeId")
    .lean();

  if (!task || task.isArchived) {
    throw new CustomError("Task not found or archived.", 404);
  }

  // 3. Verify Manager project scope authorization
  if (viewerRoleLower === ROLES.MANAGER) {
    const accessFilter = getProjectFilter(viewer);
    if (task.project) {
      const authorizedProject = await Project.findOne({
        _id: task.project._id,
        ...accessFilter,
      })
        .select("_id")
        .lean();

      if (!authorizedProject) {
        throw new CustomError(
          "Forbidden: Target task project is not within your authorized scope.",
          403
        );
      }
    }
  }

  // 4. Construct Task Facts (Factual, Sanitized metadata)
  const taskFacts = {
    taskId: task._id.toString(),
    title: task.title,
    description: sanitizeAiString(task.description || ""),
    priority: task.priority,
    dueDate: task.dueDate,
    currentStatus: task.status,
    project: task.project
      ? {
          _id: task.project._id.toString(),
          name: task.project.name,
          code: task.project.code || "",
        }
      : null,
    phase: task.phase
      ? {
          _id: task.phase._id.toString(),
          name: task.phase.name,
        }
      : null,
    assignedTo: task.assignedTo ? task.assignedTo.toString() : null,
    assignedBy: task.assignedBy
      ? {
          name: task.assignedBy.name,
          employeeCode: task.assignedBy.employeeId || "",
        }
      : null,
  };

  // 5. Find Eligible Active Candidates (Matching ReassignModal project member eligibility)
  const candidateFilter = {
    role: ROLES.EMPLOYEE,
    isActive: { $ne: false },
    isArchived: { $ne: true },
  };

  if (task.assignedTo) {
    candidateFilter._id = { $ne: task.assignedTo };
  }

  if (task.project && Array.isArray(task.project.members) && task.project.members.length > 0) {
    const projectMemberIds = task.project.members.map((m) =>
      typeof m === "object" && m._id ? m._id.toString() : m.toString()
    );
    const eligibleMemberIds = projectMemberIds.filter(
      (mId) => !task.assignedTo || mId !== task.assignedTo.toString()
    );
    if (candidateFilter._id) {
      candidateFilter._id = { $in: eligibleMemberIds, $ne: task.assignedTo };
    } else {
      candidateFilter._id = { $in: eligibleMemberIds };
    }
  }

  const candidateUsers = await User.find(candidateFilter)
    .populate("department", "name")
    .populate("designation", "title")
    .select("name email employeeId department designation isActive")
    .lean();

  if (candidateUsers.length === 0) {
    const rawPayload = {
      taskFacts,
      candidateCount: 0,
      candidates: [],
    };
    return {
      success: true,
      data: sanitizePayload(rawPayload),
    };
  }

  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const Submission = mongoose.models.Submission || require("../../models/Submission");

  // 6. Aggregate Factual Candidate Operational Evidence
  const candidatesRaw = await Promise.all(
    candidateUsers.map(async (candidate) => {
      const candId = candidate._id;

      // Workload Metrics
      const candidateTasks = await Task.find({
        assignedTo: candId,
        isArchived: { $ne: true },
      })
        .select("status dueDate project phase priority completedAt updatedAt createdAt")
        .lean();

      const activeTasksList = candidateTasks.filter((t) =>
        [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ].includes(t.status)
      );

      const activeTasks = activeTasksList.length;

      const pendingReviews = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.SUBMITTED
      ).length;

      const overdueTasks = activeTasksList.filter(
        (t) => t.dueDate && new Date(t.dueDate) < today
      ).length;

      const priorityBreakdown = {
        high: activeTasksList.filter((t) => t.priority === "High").length,
        medium: activeTasksList.filter((t) => t.priority === "Medium").length,
        low: activeTasksList.filter((t) => t.priority === "Low").length,
      };

      const dueWithin3Days = activeTasksList.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= threeDaysLater
      ).length;

      const dueWithin7Days = activeTasksList.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= sevenDaysLater
      ).length;

      const deadlinePressure = {
        dueWithin3Days,
        dueWithin7Days,
        overdue: overdueTasks,
      };

      // Performance Metrics & Submission Rejection Rate
      const totalAssigned = candidateTasks.length;
      const closedTasks = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.CLOSED
      );
      const completedTasks = closedTasks.length;
      const withdrawnTasks = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.WITHDRAWN
      ).length;

      const completionDenominator = totalAssigned - withdrawnTasks;
      const completionRate =
        completionDenominator > 0
          ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
          : 0;

      let onTimeClosedCount = 0;
      let totalClosedWithDueDate = 0;
      closedTasks.forEach((t) => {
        if (t.dueDate) {
          totalClosedWithDueDate++;
          const compDate = t.completedAt ? new Date(t.completedAt) : t.updatedAt ? new Date(t.updatedAt) : new Date();
          if (compDate <= new Date(t.dueDate)) {
            onTimeClosedCount++;
          }
        }
      });

      const onTimeRateNum =
        totalClosedWithDueDate > 0
          ? Number(((onTimeClosedCount / totalClosedWithDueDate) * 100).toFixed(1))
          : null;

      const candidateSubmissions = await Submission.find({
        submittedBy: candId,
      })
        .select("status")
        .lean();

      const totalSubmissions = candidateSubmissions.length;
      const rejectedSubmissions = candidateSubmissions.filter((s) => s.status === "Rejected").length;
      const rejectionRate =
        totalSubmissions > 0
          ? Number(((rejectedSubmissions / totalSubmissions) * 100).toFixed(1))
          : 0;

      // Project & Phase History Metrics
      const isProjectMember = task.project && Array.isArray(task.project.members)
        ? task.project.members.some((m) => (m._id || m).toString() === candId.toString())
        : true;

      const projectTaskCount = task.project
        ? candidateTasks.filter(
            (t) => t.project && t.project.toString() === task.project._id.toString()
          ).length
        : 0;

      const phaseTaskCount = task.phase
        ? candidateTasks.filter(
            (t) => t.phase && t.phase.toString() === task.phase._id.toString()
          ).length
        : 0;

      return {
        employeeId: candId.toString(),
        name: candidate.name,
        employeeCode: candidate.employeeId || "",
        department: candidate.department?.name || "Unassigned",
        designation: candidate.designation?.title || "Staff",
        isProjectMember,
        activeTasks,
        pendingReviews,
        overdueTasks,
        priorityBreakdown,
        deadlinePressure,
        totalAssigned,
        completedTasks,
        completionRate,
        onTimeRateNum,
        rejectionRate,
        projectTaskCount,
        phaseTaskCount,
      };
    })
  );

  const totalTeamActiveTasks = candidatesRaw.reduce((sum, c) => sum + c.activeTasks, 0);

  // 7. Calculate Deterministic Suitability Score & Factors for Each Candidate
  const candidatesEvidence = candidatesRaw.map((cand) => {
    const workloadShare =
      totalTeamActiveTasks > 0
        ? Number(((cand.activeTasks / totalTeamActiveTasks) * 100).toFixed(1))
        : 0;

    // Weighted Deterministic Suitability Score Formula (0 to 100)
    let score = 50;

    // Workload penalties
    score -= Math.min(30, cand.activeTasks * 5);
    score -= Math.min(30, cand.overdueTasks * 15);
    score -= Math.min(24, cand.priorityBreakdown.high * 8);
    score -= Math.min(15, cand.deadlinePressure.dueWithin3Days * 5);

    // Performance bonuses & penalties
    score += cand.completionRate * 0.25;
    score += cand.onTimeRateNum !== null ? cand.onTimeRateNum * 0.15 : 7.5;
    score -= cand.rejectionRate * 0.15;

    // Project/Phase experience bonuses
    score += cand.isProjectMember ? 10 : 0;
    score += Math.min(15, cand.projectTaskCount * 3);
    score += Math.min(12, cand.phaseTaskCount * 4);

    const deterministicScore = Math.min(100, Math.max(0, Number(score.toFixed(1))));

    // Human-readable suitability factors
    const suitabilityFactors = [];
    if (cand.activeTasks === 0) suitabilityFactors.push("Zero active task workload");
    else if (cand.activeTasks <= 2) suitabilityFactors.push(`Low active workload (${cand.activeTasks} active task${cand.activeTasks > 1 ? "s" : ""})`);
    else suitabilityFactors.push(`Carrying ${cand.activeTasks} active task(s) (${workloadShare}% work share)`);

    if (cand.overdueTasks === 0) suitabilityFactors.push("0 overdue tasks");
    else suitabilityFactors.push(`${cand.overdueTasks} task(s) overdue`);

    if (cand.completionRate >= 80) suitabilityFactors.push(`High completion rate (${cand.completionRate}%)`);
    if (cand.onTimeRateNum !== null && cand.onTimeRateNum >= 85) suitabilityFactors.push(`Strong on-time rate (${cand.onTimeRateNum}%)`);
    if (cand.isProjectMember) suitabilityFactors.push("Assigned project team member");
    if (cand.projectTaskCount > 0) suitabilityFactors.push(`Handled ${cand.projectTaskCount} task(s) in project`);
    if (cand.phaseTaskCount > 0) suitabilityFactors.push(`Handled ${cand.phaseTaskCount} task(s) in phase`);

    return {
      employeeId: cand.employeeId,
      name: cand.name,
      employeeCode: cand.employeeCode,
      department: cand.department,
      designation: cand.designation,
      isProjectMember: cand.isProjectMember,
      deterministicScore,
      suitabilityFactors,
      workload: {
        activeTasks: cand.activeTasks,
        pendingReviews: cand.pendingReviews,
        overdueTasks: cand.overdueTasks,
        workloadShare: `${workloadShare}%`,
        priorityBreakdown: cand.priorityBreakdown,
        deadlinePressure: cand.deadlinePressure,
      },
      performance: {
        totalAssigned: cand.totalAssigned,
        completedTasks: cand.completedTasks,
        completionRate: cand.completionRate,
        onTimeRate: cand.onTimeRateNum !== null ? `${cand.onTimeRateNum}%` : "N/A",
        rejectionRate: `${cand.rejectionRate}%`,
      },
      projectHistory: {
        projectTaskCount: cand.projectTaskCount,
      },
      phaseHistory: {
        phaseTaskCount: cand.phaseTaskCount,
      },
    };
  });

  // Sort candidates by deterministicScore descending
  candidatesEvidence.sort((a, b) => b.deterministicScore - a.deterministicScore);

  // 8. Construct Final Candidate Evidence DTO Payload
  const rawPayload = {
    taskFacts,
    candidateCount: candidatesEvidence.length,
    candidates: candidatesEvidence,
  };

  // 9. Sanitize Payload (Recursively strip sensitive credentials/fields)
  const sanitizedData = sanitizePayload(rawPayload);

  return {
    success: true,
    data: sanitizedData,
  };
};

module.exports = {
  getCandidateEvidenceForTask,
};
