const { ROLES } = require("../../constants/constants");
const { CONTEXT_TYPES } = require("./aiContextPolicy");
const CustomError = require("../../errors/CustomError");

/**
 * AI Recommendation Engine Types Registry & Configurations (Phase 15.1).
 * Establishes centralized recommendation types, response schemas, and system prompts.
 * Strictly Read-Only Advisory Recommendations for Human Decision-Makers.
 * NO MongoDB access, NO automated database write actions.
 */

const RECOMMENDATION_TYPES = {
  TASK_ASSIGNMENT: "TASK_ASSIGNMENT",
};

/**
 * Base Recommendation Response Schema Specification.
 */
const BASE_RECOMMENDATION_SCHEMA = {
  name: "BaseRecommendationSchema",
  version: "1.0",
  type: "object",
  properties: {
    recommendationType: {
      type: "string",
      required: true,
    },
    recommendation: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    rationale: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    confidence: {
      type: "string",
      required: true,
      enum: ["high", "medium", "low"],
    },
    limitations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientEvidence: {
      type: "boolean",
      required: false,
    },
    noRecommendation: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Task Assignment Recommendation Schema Specification (Phase 15.1).
 */
const TASK_ASSIGNMENT_RECOMMENDATION_SCHEMA = {
  name: "TaskAssignmentRecommendationSchema",
  version: "1.0",
  type: "object",
  properties: {
    recommendationType: {
      type: "string",
      required: true,
    },
    targetType: {
      type: "string",
      required: true,
    },
    targetId: {
      type: "string",
      required: true,
    },
    recommendedEmployeeId: {
      type: "string",
      required: false,
    },
    recommendedEmployeeName: {
      type: "string",
      required: false,
    },
    recommendation: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    rationale: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    confidence: {
      type: "string",
      required: true,
      enum: ["high", "medium", "low"],
    },
    limitations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientEvidence: {
      type: "boolean",
      required: false,
    },
    noRecommendation: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Centralized Mapping of Recommendation Configurations.
 */
const RECOMMENDATION_CONFIGS = {
  [RECOMMENDATION_TYPES.TASK_ASSIGNMENT]: {
    recommendationType: RECOMMENDATION_TYPES.TASK_ASSIGNMENT,
    allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
    contextType: CONTEXT_TYPES.TASK_ASSIGNMENT,
    schema: TASK_ASSIGNMENT_RECOMMENDATION_SCHEMA,
    systemInstruction: `You are an executive AI decision-support analyst for the Task Manager application.
Analyze the pre-authorized task facts, eligible candidates, workload metrics, performance metrics, and pre-calculated deterministic suitability scores inside <AUTHORIZED_APPLICATION_DATA>.
Answer: "Who is the best eligible person to take this task RIGHT NOW, and WHY?"

Rules & Guidelines:
1. Base all observations strictly on facts, metrics, and evidence inside <AUTHORIZED_APPLICATION_DATA>.
2. Select ONLY from the supplied eligible candidates in <AUTHORIZED_APPLICATION_DATA>. Set recommendedEmployeeId to the recommended candidate's exact employeeId string and recommendedEmployeeName to their exact name.
3. Use candidate workload (active tasks, overdue tasks, priority breakdown, deadline pressure), performance (completion rate, on-time rate, rejection rate), project membership (isProjectMember), phase/project experience, and deterministic suitability score (deterministicScore) to pick the strongest candidate.
4. Do NOT respond with "No Clear Recommendation" if eligible candidates exist with valid workload and performance metrics inside <AUTHORIZED_APPLICATION_DATA>. Recommend the candidate with the highest overall suitability evidence.
5. Handle both Independent Tasks (where taskFacts.project is null) and Project Tasks (where taskFacts.project is present). For Independent Tasks, evaluate all eligible active candidates based on workload and performance without requiring project membership. For Project Tasks, prioritize active project members.
6. If a specific metric for a candidate is marked as unavailable or N/A (e.g. onTimeRate: "N/A"), do NOT discard the candidate; evaluate the candidate using their available metrics.
7. In rationale, cite exact numerical metrics (e.g. active tasks, completion rate, overdue count, phase experience, deterministic score) comparing the selected candidate against alternatives. Explain important trade-offs if applicable.
8. Do NOT invent candidates, employee codes, skills, estimated hours, or unrecorded metrics outside <AUTHORIZED_APPLICATION_DATA>.
9. Recommendations are strictly ADVISORY advice for human decision-makers. Never attempt database mutations or automated task execution.
10. Respond ONLY with valid JSON matching the specified recommendation schema.`,
  },
};

/**
 * Get backend configuration for a requested recommendation type.
 * @param {string} recommendationType Requested recommendation type
 * @returns {Object} Recommendation configuration object
 */
const getRecommendationConfig = (recommendationType) => {
  if (!recommendationType || !RECOMMENDATION_CONFIGS[recommendationType]) {
    throw new CustomError(
      `Unsupported recommendation type "${recommendationType}".`,
      400
    );
  }
  return RECOMMENDATION_CONFIGS[recommendationType];
};

module.exports = {
  RECOMMENDATION_TYPES,
  BASE_RECOMMENDATION_SCHEMA,
  TASK_ASSIGNMENT_RECOMMENDATION_SCHEMA,
  RECOMMENDATION_CONFIGS,
  getRecommendationConfig,
};
