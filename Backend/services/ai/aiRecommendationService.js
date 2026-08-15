const {
  RECOMMENDATION_TYPES,
  getRecommendationConfig,
} = require("./aiRecommendationConfig");
const { validateContextAccess, sanitizeOutputPayload } = require("./aiContextPolicy");
const { buildAiContext } = require("./aiContextBuilder");
const { generateStructuredAiResponse } = require("./aiResponseService");
const { getCandidateEvidenceForTask } = require("../analytics/candidateAnalytics");
const CustomError = require("../../errors/CustomError");
const { TASK_STATUS } = require("../../constants/constants");

/**
 * AI Recommendation Engine Service Foundation (Phase 15.1 & 15.3).
 * Common recommendation generation pipeline reusing Phase 13 AI Data Layer, Phase 14 Reports & Phase 15.2 Candidate Analytics.
 * Separates authoritative deterministic evidence from non-authoritative AI advisory recommendations.
 * NO MongoDB database write access, NO automated task execution.
 */

/**
 * Generate a role-authorized, structured AI recommendation.
 * @param {Object} params
 * @param {Object} params.viewer Authenticated user object from req.user
 * @param {string} params.recommendationType Requested recommendation type (e.g. TASK_ASSIGNMENT)
 * @param {string} [params.targetType] Target entity type ("task", "project", "employee")
 * @param {string} [params.targetId] Target entity ObjectId string
 * @returns {Promise<Object>} Normalized recommendation response payload
 */
const generateAiRecommendation = async ({
  viewer,
  recommendationType,
  targetType = "task",
  targetId = null,
}) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  if (!recommendationType) {
    throw new CustomError("Recommendation type is required.", 400);
  }

  if (!targetId) {
    throw new CustomError("Target ID is required for recommendation.", 400);
  }

  // 1. Look up Backend Recommendation Configuration
  const config = getRecommendationConfig(recommendationType);

  // 2. Validate Viewer Role Authorization for Recommendation Type
  const viewerRoleLower = viewer.role.toLowerCase();
  const isAuthorizedRole = config.allowedRoles.some(
    (r) => r.toLowerCase() === viewerRoleLower
  );
  if (!isAuthorizedRole) {
    throw new CustomError(
      `Forbidden: Role "${viewer.role}" is not authorized for "${recommendationType}" recommendations.`,
      403
    );
  }

  let evidenceMetrics = null;
  let contextDto = null;
  let eligibleCandidateIds = [];

  // 3. Retrieve Context DTO & Deterministic Evidence (Phase 15.2 integration for TASK_ASSIGNMENT)
  if (recommendationType === RECOMMENDATION_TYPES.TASK_ASSIGNMENT) {
    if (targetType !== "task") {
      throw new CustomError("TASK_ASSIGNMENT recommendation requires targetType='task'.", 400);
    }

    // Fetch deterministic candidate evidence from Phase 15.2 candidate analytics
    const evidenceResult = await getCandidateEvidenceForTask(targetId, viewer);
    evidenceMetrics = evidenceResult.data;

    // Validate Task State (Closed or unassignable tasks cannot be recommended for assignment)
    const taskFacts = evidenceMetrics.taskFacts || {};
    const unassignableStatuses = [TASK_STATUS.CLOSED];
    if (unassignableStatuses.includes(taskFacts.currentStatus)) {
      throw new CustomError(
        `Task with status "${taskFacts.currentStatus}" cannot be assigned or reassigned.`,
        400
      );
    }

    // Extract list of eligible candidate IDs for mandatory backend post-validation
    const candidates = evidenceMetrics.candidates || [];
    eligibleCandidateIds = candidates.map((c) => c.employeeId.toString());

    contextDto = {
      contextMetadata: {
        contextType: config.contextType,
        recommendationType,
        generatedAt: new Date().toISOString(),
        viewer: {
          userId: viewer.userId,
          role: viewer.role,
        },
        target: {
          targetType: "task",
          targetId,
        },
      },
      sanitizedData: evidenceMetrics,
    };
    // Short-circuit LLM invocation if 0 candidates are eligible
    if (evidenceMetrics.candidateCount === 0 || !Array.isArray(evidenceMetrics.candidates) || evidenceMetrics.candidates.length === 0) {
      const emptyRecommendationPayload = {
        success: true,
        recommendation: {
          recommendationType: config.recommendationType,
          generatedAt: new Date().toISOString(),
          viewer: {
            userId: viewer.userId,
            role: viewer.role,
          },
          target: {
            targetType,
            targetId,
          },
          evidenceMetrics,
          aiRecommendation: {
            recommendationType: "TASK_ASSIGNMENT",
            targetType: "task",
            targetId,
            recommendedEmployeeId: null,
            recommendedEmployeeName: null,
            recommendation: "No eligible team candidates are currently available for this task.",
            rationale: "There are currently 0 active project members or team employees available for task reassignment under existing project membership rules.",
            evidence: ["0 eligible candidates in scope"],
            confidence: "low",
            limitations: ["No eligible active candidates available in scope"],
            insufficientEvidence: true,
            noRecommendation: true,
          },
        },
        metadata: {
          schemaName: config.schema.name,
          schemaVersion: config.schema.version,
          model: "deterministic_fallback",
          usage: null,
          durationMs: 0,
        },
      };
      return sanitizeOutputPayload(emptyRecommendationPayload, contextDto?.entityIdMap);
    }
  } else {
    // Fallback for general recommendation contexts
    contextDto = await buildAiContext({
      viewer,
      contextType: config.contextType,
      targetSubjectId: targetType === "employee" ? targetId : null,
      projectId: targetType === "project" ? targetId : null,
    });
    evidenceMetrics = contextDto.sanitizedData;
  }

  // 4. Execute Structured AI Response & Output Validation (Phases 13.3 & 13.4)
  const aiResult = await generateStructuredAiResponse({
    contextDto,
    schema: config.schema,
    temperature: 0.1,
  });

  const aiData = aiResult.data;

  // 5. Mandatory Backend Candidate ID Verification (Phase 15.3 Post-Validation)
  if (
    recommendationType === RECOMMENDATION_TYPES.TASK_ASSIGNMENT &&
    aiData.recommendedEmployeeId
  ) {
    const isValidCandidate = eligibleCandidateIds.includes(
      aiData.recommendedEmployeeId.toString()
    );

    if (!isValidCandidate) {
      // Reject/Revoke hallucinated or unauthorized candidate ID
      aiData.recommendedEmployeeId = null;
      aiData.recommendedEmployeeName = null;
      aiData.insufficientEvidence = true;
      aiData.noRecommendation = true;
      aiData.confidence = "low";
      if (!Array.isArray(aiData.limitations)) {
        aiData.limitations = [];
      }
      aiData.limitations.push(
        "AI returned an employee ID outside the backend-verified eligible candidate set. Recommendation revoked for safety."
      );
    }
  }

  // 6. Return Normalized Recommendation Payload (Output Sanitized)
  const recommendationPayload = {
    success: true,
    recommendation: {
      recommendationType: config.recommendationType,
      generatedAt: new Date().toISOString(),
      viewer: {
        userId: viewer.userId,
        role: viewer.role,
      },
      target: {
        targetType,
        targetId,
      },
      evidenceMetrics,
      aiRecommendation: aiData,
    },
    metadata: aiResult.metadata,
  };

  return sanitizeOutputPayload(recommendationPayload, contextDto?.entityIdMap);
};

module.exports = {
  generateAiRecommendation,
};
