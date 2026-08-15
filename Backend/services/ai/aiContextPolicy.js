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
  TASK_ASSIGNMENT: "TASK_ASSIGNMENT",
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
  "_id",
  "storagePath",
  "filepath",
  "filePath",
  "path",
  "bucket",
  "backendUrl",
  "database",
  "dbDetails",
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
  MANAGER_PERFORMANCE_REPORT: [
    "summary",
    "totalManagers",
    "managerSummaries",
    "managerInfo",
    "activeProjects",
    "teamSize",
    "totalTasks",
    "activeTasks",
    "completedTasks",
    "overdueTasks",
    "rejectedTasks",
    "pendingReviews",
    "completionRate",
    "overdueRate",
    "averageReviewTime",
    "averageTeamDelay",
    "delayedTaskCount",
    "workloadLevel",
    "statusIndicator",
    "projectSummaries",
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
    "users",
    "projects",
    "tasks",
    "departments",
    "managers",
    "projectHealth",
    "attentionRequired",
    "whatsGoingWell",
    "trends",
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
    "historicalComparison",
    "limitations",
    "summary",
    "departmentComparison",
    "bestPerformingDepartments",
    "departmentsRequiringAttention",
  ],
  TASK_ASSIGNMENT: [
    "taskFacts",
    "candidateCount",
    "candidates",
    "scope",
    "task",
    "project",
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
      CONTEXT_TYPES.TASK_ASSIGNMENT,
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

const HUMAN_ID_KEYS = [
  "employeeId",
  "employeeCode",
  "assigneeCode",
  "managerCode",
  "projectCode",
  "deptCode",
  "departmentCode",
  "code",
  "title",
  "name",
  "assigneeName",
  "projectName",
  "phaseName",
  "label",
];

/**
 * Recursively sanitize an object by stripping blacklisted sensitive fields
 * and mapping MongoDB ObjectIds to existing human-readable business identifiers.
 * @param {*} data Input payload
 * @param {Map} [entityIdMap=new Map()] Map to record ObjectHex -> BusinessID mapping
 * @returns {*} Clean sanitized payload
 */
const sanitizePayload = (data, entityIdMap = new Map()) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, entityIdMap));
  }

  if (typeof data === "object") {
    if (data instanceof Date) {
      return data;
    }

    if (
      data._bsontype ||
      (data.constructor && data.constructor.name === "ObjectId") ||
      typeof data.toHexString === "function"
    ) {
      const rawHex = data.toString();
      if (entityIdMap.has(rawHex)) {
        return entityIdMap.get(rawHex);
      }
      const fallbackLabel = `REF-${rawHex.slice(-4).toUpperCase()}`;
      entityIdMap.set(rawHex, fallbackLabel);
      return fallbackLabel;
    }

    let humanId = null;
    for (const key of HUMAN_ID_KEYS) {
      const val = data[key];
      if (val && typeof val === "string" && val.trim().length > 0) {
        const trimmed = val.trim();
        if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
          humanId = trimmed;
          break;
        }
      }
    }

    // First pass: register _id mapping if present
    if (data._id && humanId) {
      const rawIdStr = data._id.toString();
      if (/^[0-9a-fA-F]{24}$/.test(rawIdStr)) {
        entityIdMap.set(rawIdStr, humanId);
      }
    }

    const cleaned = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        continue;
      }

      let targetKey = key;
      if (/^[0-9a-fA-F]{24}$/.test(key)) {
        if (entityIdMap.has(key)) {
          targetKey = entityIdMap.get(key);
        } else {
          targetKey = `REF-${key.slice(-4).toUpperCase()}`;
          entityIdMap.set(key, targetKey);
        }
      } else if (/[0-9a-fA-F]{24}/.test(key)) {
        targetKey = key.replace(/[0-9a-fA-F]{24}/g, (hex) => {
          if (entityIdMap.has(hex)) return entityIdMap.get(hex);
          const fb = `REF-${hex.slice(-4).toUpperCase()}`;
          entityIdMap.set(hex, fb);
          return fb;
        });
      }

      let val = data[key];
      const valStr = val && typeof val === "object" && val._bsontype ? val.toString() : val;

      if (typeof valStr === "string" && /^[0-9a-fA-F]{24}$/.test(valStr)) {
        if (entityIdMap.has(valStr)) {
          cleaned[targetKey] = entityIdMap.get(valStr);
          continue;
        }

        if (humanId) {
          entityIdMap.set(valStr, humanId);
          cleaned[targetKey] = humanId;
          continue;
        }

        // Generate clean business code fallback for unmapped hex ObjectIds
        const lowerKey = key.toLowerCase();
        const suffix = valStr.slice(-4).toUpperCase();
        let fallbackLabel = `REF-${suffix}`;
        if (lowerKey.includes("manager")) fallbackLabel = `MGR-${suffix}`;
        else if (lowerKey.includes("employee") || lowerKey.includes("user") || lowerKey.includes("assignee")) fallbackLabel = `EMP-${suffix}`;
        else if (lowerKey.includes("project")) fallbackLabel = `PRJ-${suffix}`;
        else if (lowerKey.includes("dept") || lowerKey.includes("department")) fallbackLabel = `DEPT-${suffix}`;
        else if (lowerKey.includes("task")) fallbackLabel = `TSK-${suffix}`;

        entityIdMap.set(valStr, fallbackLabel);
        cleaned[targetKey] = fallbackLabel;
        continue;
      }

      cleaned[targetKey] = sanitizePayload(val, entityIdMap);
    }
    return cleaned;
  }

  if (typeof data === "string") {
    if (/^[0-9a-fA-F]{24}$/.test(data)) {
      if (entityIdMap.has(data)) {
        return entityIdMap.get(data);
      }
      const fallbackLabel = `REF-${data.slice(-4).toUpperCase()}`;
      entityIdMap.set(data, fallbackLabel);
      return fallbackLabel;
    }

    if (/[0-9a-fA-F]{24}/.test(data)) {
      return data.replace(/[0-9a-fA-F]{24}/g, (hex) => {
        if (entityIdMap.has(hex)) return entityIdMap.get(hex);
        const fb = `REF-${hex.slice(-4).toUpperCase()}`;
        entityIdMap.set(hex, fb);
        return fb;
      });
    }
  }

  return data;
};

/**
 * Recursively sanitize AI output payload before rendering or document export.
 * Replaces any remaining internal MongoDB ObjectIds with human-readable identifiers
 * and removes internal backend implementation details.
 */
const sanitizeOutputPayload = (data, entityIdMap = new Map()) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    let cleaned = data;

    if (entityIdMap && entityIdMap.size > 0) {
      for (const [rawId, humanId] of entityIdMap.entries()) {
        if (typeof rawId === "string" && rawId.length === 24 && humanId) {
          cleaned = cleaned.replaceAll(rawId, humanId);
        }
      }
    }

    cleaned = cleaned.replace(/\((?:ID|id):\s*[0-9a-fA-F]{24}\)/g, "");
    cleaned = cleaned.replace(/(?:ID|id):\s*([0-9a-fA-F]{24})/gi, (match, hexId) => {
      return `ID: REF-${hexId.slice(-4).toUpperCase()}`;
    });
    cleaned = cleaned.replace(/\b[0-9a-fA-F]{24}\b/g, (hexId) => {
      if (entityIdMap && entityIdMap.has(hexId)) {
        return entityIdMap.get(hexId);
      }
      return `REF-${hexId.slice(-4).toUpperCase()}`;
    });
    cleaned = cleaned.replace(/(?:[A-Za-z]:\\|file:\/\/\/|\/tmp\/)[^\s"'>]+/gi, "[Sanitized Path]");
    cleaned = cleaned.replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, "[Sanitized Token]");

    return cleaned;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeOutputPayload(item, entityIdMap));
  }

  if (typeof data === "object") {
    if (data instanceof Date || data._bsontype) {
      return data;
    }

    const cleaned = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        continue;
      }
      cleaned[key] = sanitizeOutputPayload(data[key], entityIdMap);
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
  sanitizeOutputPayload,
};
