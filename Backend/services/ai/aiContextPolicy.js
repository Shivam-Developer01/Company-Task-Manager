const { ROLES } = require("../../constants/constants");
const CustomError = require("../../errors/CustomError");

/**
 * AI Context Policy & Security Rules (Phase 13.2).
 * Governs role-based context authorization and sensitive data sanitization.
 */

const CONTEXT_TYPES = {
  EMPLOYEE_REPORT: "EMPLOYEE_REPORT",
  MANAGER_REPORT: "MANAGER_REPORT",
  MANAGER_PERFORMANCE_REPORT: "MANAGER_PERFORMANCE_REPORT",
  ADMIN_REPORT: "ADMIN_REPORT",
  PROJECT_REPORT: "PROJECT_REPORT",
  DEPARTMENT_REPORT: "DEPARTMENT_REPORT",
};

/**
 * Blacklist of sensitive fields that MUST NEVER be included in AI Context DTOs.
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "refreshToken",
  "jwt",
  "jwtSecret",
  "apiKey",
  "api_key",
  "token",
  "tokens",
  "secret",
  "secrets",
  "databaseUri",
  "mongoUri",
  "connectionString",
  "authorization",
  "cookie",
  "session",
  "privateKey",
  "encryptionKey",
  "authSource",
  "__v",
  "$isNew",
  "_bsontype",
];

/**
 * Explicit allowlist of permissible top-level and metric fields per context type (Phase 13.3 Data Minimization).
 */
const ALLOWED_FIELDS = {
  EMPLOYEE_REPORT: [
    "activeTaskCount",
    "completedTaskCount",
    "pendingTaskCount",
    "overdueTaskCount",
    "totalAssignedCount",
    "withdrawnCount",
    "completionRate",
    "averageCompletionTime",
    "averageAcceptanceTime",
    "rejectionRate",
    "totalSubmissions",
    "rejectedSubmissions",
    "actionCenter",
    "statusDistribution",
    "workloadProgress",
    "projectDistribution",
    "myPerformance",
    "myProjectsAndPhases",
    "myInsights",
    "mySummary",
    "employeeDetails",
    "totalEmployees",
    "summary",
    "performanceDistribution",
    "topPerformers",
    "attentionCandidates",
    "departmentBreakdown",
    "employeePerformanceList",
    "pagination",
    "historicalTrend",
  ],
  MANAGER_REPORT: [
    "summary",
    "teamSize",
    "teamTaskCompletion",
    "teamWorkloadDistribution",
    "employeePerformance",
    "bottlenecksAndRisks",
    "employeeStrengths",
    "assignmentIntelligence",
    "actionCenter",
    "accessibleProjectsCount",
  ],
  ADMIN_REPORT: [
    "summary",
    "totalEmployees",
    "totalManagers",
    "totalDepartments",
    "totalProjects",
    "totalTasks",
    "taskMetrics",
    "submissionMetrics",
    "workloadDistribution",
    "performanceOverview",
    "departmentOverview",
    "riskIndicators",
  ],
  PROJECT_REPORT: [
    "projectId",
    "projectName",
    "totalTasks",
    "activeTasks",
    "completedTasks",
    "pendingReviews",
    "overdueTasks",
    "completionRate",
    "phaseCount",
    "phases",
    "taskStatusDistribution",
    "memberWorkload",
    "projectInfo",
    "taskDistribution",
    "phaseProgress",
    "milestones",
    "teamMembers",
    "bottlenecks",
    "riskAssessment",
  ],
  DEPARTMENT_REPORT: [
    "scopeMode",
    "department",
    "departmentHealth",
    "workforce",
    "taskMetrics",
    "submissionMetrics",
    "managerOverview",
    "employeePerformanceSummary",
    "projectOverview",
    "whatsGoingWell",
    "attentionAreas",
    "bottlenecks",
    "trends",
    "historicalTrendsSupported",
    "limitations",
    "summary",
    "departmentComparison",
    "bestPerformingDepartments",
    "departmentsRequiringAttention",
  ],
};

/**
 * Verify whether a viewer role is authorized for the requested context type and target subject.
 * @param {Object} viewer User object from req.user
 * @param {string} contextType Requested context type
 * @param {string} [targetSubjectId] Optional target employee ID
 */
const validateContextAccess = (viewer, contextType, targetSubjectId = null) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  const role = viewer.role.toLowerCase();

  // 1. Validate Context Type by Role
  if (role === ROLES.EMPLOYEE) {
    const allowedTypes = [CONTEXT_TYPES.EMPLOYEE_REPORT];
    if (!allowedTypes.includes(contextType)) {
      throw new CustomError(
        `Forbidden: Employees are restricted to viewing their own performance report (${CONTEXT_TYPES.EMPLOYEE_REPORT}).`,
        403,
      );
    }

    // Employee CANNOT request another employee's context
    if (
      contextType === CONTEXT_TYPES.EMPLOYEE_REPORT &&
      targetSubjectId &&
      targetSubjectId.toString() !== viewer.userId.toString()
    ) {
      throw new CustomError(
        "Forbidden: Employees are only authorized to access their own AI context.",
        403,
      );
    }
  } else if (role === ROLES.MANAGER) {
    const allowedTypes = [
      CONTEXT_TYPES.EMPLOYEE_REPORT,
      CONTEXT_TYPES.MANAGER_REPORT,
      CONTEXT_TYPES.MANAGER_PERFORMANCE_REPORT,
      CONTEXT_TYPES.PROJECT_REPORT,
    ];
    if (!allowedTypes.includes(contextType)) {
      throw new CustomError(
        `Forbidden: Managers are not authorized for context type "${contextType}".`,
        403,
      );
    }

    // Manager CANNOT request another manager's context
    if (
      (contextType === CONTEXT_TYPES.MANAGER_REPORT || contextType === CONTEXT_TYPES.MANAGER_PERFORMANCE_REPORT) &&
      targetSubjectId &&
      targetSubjectId.toString() !== viewer.userId.toString()
    ) {
      throw new CustomError(
        "Forbidden: Managers are only authorized to access their own manager performance report.",
        403,
      );
    }
  } else if (role === ROLES.ADMIN) {
    // Admin is authorized for all context types
    if (!Object.values(CONTEXT_TYPES).includes(contextType)) {
      throw new CustomError(`Invalid context type "${contextType}".`, 400);
    }
  } else {
    throw new CustomError("Forbidden: Unrecognized role.", 403);
  }

  return true;
};

/**
 * Recursively sanitize an object by stripping blacklisted sensitive fields.
 * @param {*} data Input payload
 * @returns {*} Clean sanitized payload
 */
const sanitizePayload = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  if (typeof data === "object") {
    // Return primitive Date or ObjectId strings untouched
    if (data instanceof Date || data._bsontype) {
      return data;
    }

    const cleaned = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        continue; // Strip sensitive key
      }
      cleaned[key] = sanitizePayload(data[key]);
    }
    return cleaned;
  }

  return data;
};

module.exports = {
  CONTEXT_TYPES,
  SENSITIVE_FIELDS,
  ALLOWED_FIELDS,
  validateContextAccess,
  sanitizePayload,
};
