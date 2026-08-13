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
    contextType: CONTEXT_TYPES.PROJECT_REPORT,
    schema: TASK_ASSIGNMENT_RECOMMENDATION_SCHEMA,
    systemInstruction: `You are an executive AI decision-support analyst for the Task Manager application.
Analyze the pre-authorized task facts and candidate operational evidence inside <AUTHORIZED_APPLICATION_DATA>.
Provide a structured advisory recommendation answering: "Who should I assign this task to?"

Rules & Guidelines:
1. Base all observations strictly on facts and evidence inside <AUTHORIZED_APPLICATION_DATA>.
2. Select ONLY from the supplied eligible candidates in <AUTHORIZED_APPLICATION_DATA>. Set recommendedEmployeeId to the candidate's exact employeeId ObjectId string.
3. Do NOT invent candidates, employee IDs, skills, capacity, or unrecorded metrics.
4. If candidate evidence is weak, equal, or insufficient, set insufficientEvidence to true, set noRecommendation to true, set confidence to "low", and omit recommendedEmployeeId.
5. Provide explainable rationale, evidence, and confidence ("high", "medium", "low").
6. Recommendations are strictly ADVISORY advice for human review. Never attempt database mutations or automated task execution.
7. Respond ONLY with valid JSON matching the specified recommendation schema.`,
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
