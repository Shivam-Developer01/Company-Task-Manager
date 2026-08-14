const { CONTEXT_TYPES } = require("./aiContextPolicy");
const { ROLES } = require("../../constants/constants");
const CustomError = require("../../errors/CustomError");

/**
 * AI Report Configuration Registry (Phase 14.1).
 * Centralizes backend-controlled report specifications, schemas, allowed roles, and AI instructions.
 * NO client-side prompt manipulation, NO direct database access.
 */

const REPORT_TYPES = {
  EMPLOYEE_PERFORMANCE: "EMPLOYEE_PERFORMANCE",
  MANAGER_TEAM_PERFORMANCE: "MANAGER_TEAM_PERFORMANCE",
  MANAGER_PERFORMANCE: "MANAGER_PERFORMANCE",
  ADMIN_COMPANY_PERFORMANCE: "ADMIN_COMPANY_PERFORMANCE",
  PROJECT_PERFORMANCE: "PROJECT_PERFORMANCE",
  DEPARTMENT_PERFORMANCE: "DEPARTMENT_PERFORMANCE",
};

/**
 * Common Base Report Schema Specification (Phase 14.1 Foundation).
 */
const BASE_REPORT_SCHEMA = {
  name: "BaseReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    positiveDevelopments: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
  },
};

/**
 * Employee Performance Report Schema Specification (Phase 14.2).
 */
const EMPLOYEE_PERFORMANCE_REPORT_SCHEMA = {
  name: "EmployeePerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    performanceTrends: {
      type: "string",
      required: true,
      enum: ["improving", "stable", "declining", "insufficient_data"],
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientData: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Manager Team Performance Report Schema Specification (Phase 14.3).
 */
const MANAGER_TEAM_PERFORMANCE_REPORT_SCHEMA = {
  name: "ManagerTeamPerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    workloadInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    bottlenecks: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    teamTrends: {
      type: "string",
      required: true,
      enum: ["improving", "stable", "declining", "insufficient_data"],
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientData: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Manager Performance & Effectiveness Report Schema Specification.
 */
const MANAGER_PERFORMANCE_REPORT_SCHEMA = {
  name: "ManagerPerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    managerComparisonInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    workloadInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    departmentInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    limitations: {
      type: "string",
      required: false,
    },
  },
};

/**
 * Admin Company Performance Report Schema Specification (Phase 14.4).
 */
const ADMIN_COMPANY_PERFORMANCE_REPORT_SCHEMA = {
  name: "AdminCompanyPerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    companyHealth: {
      type: "string",
      required: true,
      enum: ["healthy", "stable", "needs_attention"],
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    departmentInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    managerInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    projectInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    bottlenecks: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    trends: {
      type: "string",
      required: true,
      enum: ["improving", "stable", "declining", "insufficient_data"],
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientData: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Project & Phase Performance Report Schema Specification (Phase 14.5).
 */
const PROJECT_PERFORMANCE_REPORT_SCHEMA = {
  name: "ProjectPerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    projectSummary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    projectHealth: {
      type: "string",
      required: true,
      enum: ["healthy", "stable", "needs_attention"],
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    phaseInsights: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    bottlenecks: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    upcomingDeadlines: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    trends: {
      type: "string",
      required: true,
      enum: ["improving", "stable", "declining", "insufficient_data"],
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    insufficientData: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Department Performance Report Schema Specification (V4 Specification).
 */
const DEPARTMENT_PERFORMANCE_REPORT_SCHEMA = {
  name: "DepartmentPerformanceReportSchema",
  version: "1.0",
  type: "object",
  properties: {
    reportType: {
      type: "string",
      required: true,
    },
    executiveSummary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 2500,
    },
    departmentHealth: {
      type: "string",
      required: false,
      enum: ["healthy", "stable", "needs_attention"],
    },
    whatsGoingWell: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    attentionAreas: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    workforceInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    taskDeliveryInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    workloadInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    managerInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    employeeInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    projectInsights: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    departmentComparisons: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    bestPerformingDepartments: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    departmentsRequiringAttention: {
      type: "array",
      required: false,
      items: { type: "string" },
    },
    bottlenecks: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    trends: {
      type: "string",
      required: true,
      enum: ["improving", "stable", "declining", "insufficient_data"],
    },
    evidence: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      required: true,
      items: { type: "string" },
    },
    limitations: {
      type: "string",
      required: false,
    },
    insufficientData: {
      type: "boolean",
      required: false,
    },
  },
};

/**
 * Centralized Mapping of Report Configurations.
 */
const REPORT_CONFIGS = {
  [REPORT_TYPES.EMPLOYEE_PERFORMANCE]: {
    reportType: REPORT_TYPES.EMPLOYEE_PERFORMANCE,
    allowedRoles: [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN],
    contextType: CONTEXT_TYPES.EMPLOYEE_REPORT,
    schema: EMPLOYEE_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive AI performance analyst for the Task Manager application.
Analyze the pre-authorized employee execution metrics inside <AUTHORIZED_APPLICATION_DATA>.
Generate a structured performance report explaining active workload, completion trends, and priority attention areas.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, employee names, or fake historical data.
3. Keep whatsGoingWell and attentionAreas focused on clear evidence-based observations.
4. Set performanceTrends to "improving", "stable", "declining", or "insufficient_data".
5. If the employee has 0 active/completed tasks or insufficient history, set insufficientData to true and state that in the summary.
6. Do NOT compare this employee with co-workers or team members.
7. Recommendations must be purely informational advice (e.g., "Prioritize overdue tasks"). Never attempt database actions or task mutations.
8. Respond ONLY with valid JSON matching the specified report schema.`,
  },
  [REPORT_TYPES.MANAGER_TEAM_PERFORMANCE]: {
    reportType: REPORT_TYPES.MANAGER_TEAM_PERFORMANCE,
    allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
    contextType: CONTEXT_TYPES.MANAGER_REPORT,
    schema: MANAGER_TEAM_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive AI team operational analyst for the Task Manager application.
Analyze the pre-authorized team workload and execution metrics inside <AUTHORIZED_APPLICATION_DATA>.
Generate a structured team operational report explaining team completion velocity, workload distribution, pending review bottlenecks, and key focus areas.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, team members, or unassigned tasks.
3. Analyze workloadInsights (e.g., workload share concentration) using neutral, objective language. Never use harsh or judgmental terms (e.g., "lazy" or "poor performer").
4. Identify workflow bottlenecks (e.g., pending reviews accumulating in active projects).
5. Set teamTrends to "improving", "stable", "declining", or "insufficient_data".
6. If the team has 0 active tasks or insufficient history, set insufficientData to true and state that in the summary.
7. Recommendations must be purely informational advice (e.g., "Clear pending review queue"). Never attempt database actions or task mutations.
8. Respond ONLY with valid JSON matching the specified report schema.`,
  },
  [REPORT_TYPES.MANAGER_PERFORMANCE]: {
    reportType: REPORT_TYPES.MANAGER_PERFORMANCE,
    allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
    contextType: CONTEXT_TYPES.MANAGER_PERFORMANCE_REPORT,
    schema: MANAGER_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive operational analyst performing a dedicated Manager Performance & Effectiveness Report for the Task Manager application.
Analyze the pre-authorized manager metrics, manager workload burden, review turnaround, department comparisons, and factual delivery indicators provided inside <AUTHORIZED_APPLICATION_DATA>.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, manager rankings, fake performance scores, or unassigned tasks.
3. Focus specifically on manager effectiveness, manager-level performance comparisons, workload distribution, department insights, and evidence-backed positive/attention signals.
4. Do NOT invent fake performance scores, leadership traits, or unsupported historical trends.
5. Provide evidence-based managerComparisonInsights, workloadInsights, and departmentInsights.
6. Recommendations must be purely informational management advisory advice.
7. Respond ONLY with valid JSON matching the specified report schema.`,
  },
  [REPORT_TYPES.ADMIN_COMPANY_PERFORMANCE]: {
    reportType: REPORT_TYPES.ADMIN_COMPANY_PERFORMANCE,
    allowedRoles: [ROLES.ADMIN],
    contextType: CONTEXT_TYPES.ADMIN_REPORT,
    schema: ADMIN_COMPANY_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive AI organizational strategy analyst for the Task Manager application.
Analyze the pre-authorized company-wide operational metrics inside <AUTHORIZED_APPLICATION_DATA>.
Generate a structured executive report explaining company-wide completion velocity, department breakdown, manager execution trends, project health risks, and key focus areas.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, departments, projects, employees, or fake historical data.
3. Set companyHealth to "healthy", "stable", or "needs_attention" based on overdue task rates, pending reviews, and project risk indicators.
4. Provide evidence-based departmentInsights, managerInsights, and projectInsights.
5. Set trends to "improving", "stable", "declining", or "insufficient_data".
6. If the organization has 0 active tasks/projects or insufficient history, set insufficientData to true and state that in the summary.
7. Recommendations must be purely informational executive advice (e.g., "Review resource allocation for delayed projects"). Never attempt database actions or task mutations.
8. Respond ONLY with valid JSON matching the specified report schema.`,
  },
  [REPORT_TYPES.PROJECT_PERFORMANCE]: {
    reportType: REPORT_TYPES.PROJECT_PERFORMANCE,
    allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
    contextType: CONTEXT_TYPES.PROJECT_REPORT,
    schema: PROJECT_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive AI project performance analyst for the Task Manager application.
Analyze the pre-authorized project and phase execution metrics inside <AUTHORIZED_APPLICATION_DATA>.
Generate a structured project report explaining overall project completion velocity, phase progress, pending review bottlenecks, upcoming deadlines, and key focus areas.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, phases, tasks, deadlines, employees, or fake historical data.
3. Set projectHealth to "healthy", "stable", or "needs_attention" based on overdue task rates, pending reviews, and phase risk indicators.
4. If the project contains phases (phaseCount > 0), analyze phaseInsights for each active phase. If the project has 0 phases, analyze project direct tasks normally without inventing fake phases.
5. Set trends to "improving", "stable", "declining", or "insufficient_data".
6. If the project has 0 active tasks or insufficient history, set insufficientData to true and state that in the projectSummary.
7. Recommendations must be purely informational project advice (e.g., "Clear pending review queue in Phase 2"). Never attempt database actions or task mutations.
8. Respond ONLY with valid JSON matching the specified report schema.`,
  },
  [REPORT_TYPES.DEPARTMENT_PERFORMANCE]: {
    reportType: REPORT_TYPES.DEPARTMENT_PERFORMANCE,
    allowedRoles: [ROLES.ADMIN],
    contextType: CONTEXT_TYPES.DEPARTMENT_REPORT,
    schema: DEPARTMENT_PERFORMANCE_REPORT_SCHEMA,
    systemInstruction: `You are an executive AI organizational department analyst performing a dedicated Department Performance Report for the Task Manager application.
Analyze the pre-authorized department metrics, workforce distribution, manager oversight, task delivery velocity, workload concentration, project health, and evidence-backed operational indicators inside <AUTHORIZED_APPLICATION_DATA>.

Rules & Guidelines:
1. Base all analysis strictly on facts and numbers inside <AUTHORIZED_APPLICATION_DATA>.
2. Do NOT invent metrics, fake department scores, employee morale, leadership quality, or fake historical data.
3. The report subject MUST remain the DEPARTMENT as a whole. Do NOT turn this into an individual employee, manager, or project report.
4. If scopeMode is "SINGLE_DEPARTMENT", analyze department workforce, task execution, manager workload, project impacts, evidence-backed positives, and attention areas for that specific department.
5. If scopeMode is "ALL_DEPARTMENTS", compare performance across authorized departments, identify best-performing departments and departments requiring attention.
6. Provide evidence-based workforceInsights, taskDeliveryInsights, workloadInsights, managerInsights, and projectInsights.
7. Recommendations must be purely informational management/departmental advisory advice.
8. Respond ONLY with valid JSON matching the specified report schema.`,
  },
};

/**
 * Get backend configuration for a requested report type.
 * @param {string} reportType Requested report type
 * @returns {Object} Report configuration object
 */
const getReportConfig = (reportType) => {
  if (!reportType || !REPORT_CONFIGS[reportType]) {
    throw new CustomError(`Unsupported report type "${reportType}".`, 400);
  }
  return REPORT_CONFIGS[reportType];
};

module.exports = {
  REPORT_TYPES,
  BASE_REPORT_SCHEMA,
  EMPLOYEE_PERFORMANCE_REPORT_SCHEMA,
  MANAGER_TEAM_PERFORMANCE_REPORT_SCHEMA,
  MANAGER_PERFORMANCE_REPORT_SCHEMA,
  ADMIN_COMPANY_PERFORMANCE_REPORT_SCHEMA,
  PROJECT_PERFORMANCE_REPORT_SCHEMA,
  DEPARTMENT_PERFORMANCE_REPORT_SCHEMA,
  REPORT_CONFIGS,
  getReportConfig,
};
