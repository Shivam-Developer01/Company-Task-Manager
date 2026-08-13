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

  // 2. Fetch target task and populate project/phase details
  const task = await Task.findById(taskObjectId)
    .populate("project", "name code members createdBy")
    .populate("phase", "name")
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
  };

  // 5. Find Eligible Active Candidates (Non-deactivated, non-archived employees)
  const candidateFilter = {
    role: ROLES.EMPLOYEE,
    isActive: { $ne: false },
    isArchived: { $ne: true },
  };

  const candidateUsers = await User.find(candidateFilter)
    .populate("department", "name")
    .populate("designation", "title")
    .select("name email employeeId department designation isActive")
    .lean();

  const today = new Date();

  // 6. Aggregate Factual Candidate Operational Evidence
  const candidatesEvidence = await Promise.all(
    candidateUsers.map(async (candidate) => {
      const candId = candidate._id;

      // Workload Metrics
      const candidateTasks = await Task.find({
        assignedTo: candId,
        isArchived: { $ne: true },
      })
        .select("status dueDate project phase")
        .lean();

      const activeTasks = candidateTasks.filter((t) =>
        [
          TASK_STATUS.ASSIGNED,
          TASK_STATUS.ACCEPTED,
          TASK_STATUS.IN_PROGRESS,
        ].includes(t.status)
      ).length;

      const pendingReviews = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.SUBMITTED
      ).length;

      const overdueTasks = candidateTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < today &&
          [
            TASK_STATUS.ASSIGNED,
            TASK_STATUS.ACCEPTED,
            TASK_STATUS.IN_PROGRESS,
          ].includes(t.status)
      ).length;

      // Performance Metrics
      const totalAssigned = candidateTasks.length;
      const completedTasks = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.CLOSED
      ).length;
      const withdrawnTasks = candidateTasks.filter(
        (t) => t.status === TASK_STATUS.WITHDRAWN
      ).length;

      const completionDenominator = totalAssigned - withdrawnTasks;
      const completionRate =
        completionDenominator > 0
          ? Number(((completedTasks / completionDenominator) * 100).toFixed(2))
          : 0;

      // Project & Phase History Metrics
      const projectTaskCount = task.project
        ? candidateTasks.filter(
            (t) => t.project && t.project.toString() === task.project._id.toString()
          ).length
        : 0;

      const phaseTaskCount = task.phase
        ? candidateTasks.filter(
            (t) => t.phase && t.phase.toString() === task.phase._id.toString()
          ).length
        : "unavailable";

      return {
        employeeId: candId.toString(),
        name: candidate.name,
        employeeCode: candidate.employeeId || "",
        department: candidate.department?.name || "Unassigned",
        designation: candidate.designation?.title || "Staff",
        workload: {
          activeTasks,
          pendingReviews,
          overdueTasks,
        },
        performance: {
          totalAssigned,
          completedTasks,
          completionRate,
          onTimeRate: "unavailable",
        },
        projectHistory: {
          projectTaskCount,
        },
        phaseHistory: {
          phaseTaskCount,
        },
      };
    })
  );

  // 7. Construct Final Candidate Evidence DTO Payload
  const rawPayload = {
    taskFacts,
    candidateCount: candidatesEvidence.length,
    candidates: candidatesEvidence,
  };

  // 8. Sanitize Payload (Recursively strip sensitive credentials/fields)
  const sanitizedData = sanitizePayload(rawPayload);

  return {
    success: true,
    data: sanitizedData,
  };
};

module.exports = {
  getCandidateEvidenceForTask,
};
