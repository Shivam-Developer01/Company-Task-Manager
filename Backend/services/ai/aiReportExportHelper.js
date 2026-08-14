const { sanitizeAiString } = require("./aiResponseValidator");

/**
 * Common Helper & Formatting Utilities for AI Report Document Exports (Phase 16 & V4 Specification).
 * Ensures exact report-specific metric extraction across Web UI, PDF, and DOCX exports.
 */

/**
 * Declarative Authoritative Source Metrics configuration for each report type.
 */
const REPORT_SOURCE_METRICS_CONFIG = {
  EMPLOYEE_PERFORMANCE: [
    { label: "Total Employees", path: "totalEmployees", fallbackPath: "summary.totalEmployees", format: "count" },
    { label: "Total Tasks", path: "totalAssignedCount", fallbackPath: "summary.totalAssignedCount", format: "count" },
    { label: "Active Tasks", path: "activeTaskCount", fallbackPath: "summary.totalActiveTasks", format: "count" },
    { label: "Completed Tasks", path: "completedTaskCount", fallbackPath: "summary.totalCompletedTasks", format: "count" },
    { label: "Pending Tasks", path: "pendingTaskCount", fallbackPath: "summary.totalPendingTasks", format: "count" },
    { label: "Overdue Tasks", path: "overdueTaskCount", fallbackPath: "summary.totalOverdueTasks", format: "count" },
    { label: "Completion Rate", path: "completionRate", fallbackPath: "summary.avgCompletionRate", format: "percentage" },
    { label: "On-Time Completion", path: "onTimeCompletionRate", fallbackPath: "summary.avgOnTimeCompletionRate", format: "percentage" },
    { label: "Avg. Completion Time", path: "averageCompletionTime", fallbackPath: "summary.avgCompletionTime", format: "days" },
    { label: "Submission Rejection Rate", path: "rejectionRate", fallbackPath: "summary.avgRejectionRate", format: "percentage" },
  ],

  MANAGER_TEAM_PERFORMANCE: [
    { label: "Team Size", path: "teamSize", format: "count" },
    { label: "Active Tasks", path: "totalActiveTasks", format: "count" },
    { label: "Overdue Tasks", path: "totalOverdueTasks", format: "count" },
    { label: "Pending Reviews", path: "pendingReviewCount", format: "count" },
    { label: "Team Completion Rate", path: "teamTaskCompletion", format: "percentage" },
    { label: "Avg. Team Delay", path: "averageTeamDelay", format: "days" },
    { label: "Delayed Tasks", path: "delayedTaskCount", format: "count" },
    { label: "Avg. Review Time", path: "averageReviewTime", format: "days" },
  ],

  MANAGER_PERFORMANCE: [
    { label: "Total Managers", path: "totalManagers", fallbackPath: "summary.totalManagers", format: "count" },
    { label: "Managed Projects", path: "activeProjects", fallbackPath: "summary.totalActiveProjects", format: "count" },
    { label: "Team Size", path: "teamSize", fallbackPath: "summary.teamSize", format: "count" },
    { label: "Active Tasks", path: "activeTasks", fallbackPath: "summary.totalActiveTasks", format: "count" },
    { label: "Completed Tasks", path: "completedTasks", fallbackPath: "summary.totalCompletedTasks", format: "count" },
    { label: "Completion Rate", path: "completionRate", fallbackPath: "summary.avgCompletionRate", format: "percentage" },
    { label: "Overdue Tasks", path: "overdueTasks", fallbackPath: "summary.totalOverdueTasks", format: "count" },
    { label: "Pending Reviews", path: "pendingReviews", fallbackPath: "summary.totalPendingReviews", format: "count" },
    { label: "Avg. Review Time", path: "averageReviewTime", fallbackPath: "summary.avgReviewTime", format: "days" },
    { label: "Avg. Team Delay", path: "averageTeamDelay", fallbackPath: "summary.avgTeamDelay", format: "days" },
  ],

  ADMIN_COMPANY_PERFORMANCE: [
    { label: "Total Employees", path: "users.totalEmployees", format: "count" },
    { label: "Total Managers", path: "users.totalManagers", format: "count" },
    { label: "Total Projects", path: "projects.totalProjects", format: "count" },
    { label: "Total Tasks", path: "tasks.totalTasks", format: "count" },
    { label: "Active Tasks", path: "tasks.activeTasks", format: "count" },
    { label: "Completed Tasks", path: "tasks.completedTasks", format: "count" },
    { label: "Task Completion Rate", path: "tasks.taskCompletionRate", format: "percentage" },
    { label: "Overdue Tasks", path: "tasks.overdueTasks", format: "count" },
    { label: "Pending Reviews", path: "tasks.pendingReviews", format: "count" },
    { label: "High-Priority Overdue", path: "tasks.highPriorityOverdue", format: "count" },
  ],

  PROJECT_PERFORMANCE: [
    { label: "Total Tasks", path: "totalTasks", format: "count" },
    { label: "Active Tasks", path: "activeTasks", format: "count" },
    { label: "Completed Tasks", path: "completedTasks", format: "count" },
    { label: "Pending Reviews", path: "pendingReviews", format: "count" },
    { label: "Overdue Tasks", path: "overdueTasks", format: "count" },
    { label: "Completion Rate", path: "completionRate", format: "percentage" },
    { label: "Phases", path: "phaseCount", format: "count" },
  ],

  DEPARTMENT_PERFORMANCE: [
    { label: "Total Employees", path: "workforce.totalEmployees", format: "count" },
    { label: "Total Managers", path: "workforce.managerCount", format: "count" },
    { label: "Active Projects", path: "projectOverview.activeProjectsCount", format: "count" },
    { label: "Total Tasks", path: "taskMetrics.totalTasks", format: "count" },
    { label: "Active Tasks", path: "taskMetrics.activeTasks", format: "count" },
    { label: "Completed Tasks", path: "taskMetrics.completedTasks", format: "count" },
    { label: "Overdue Tasks", path: "taskMetrics.overdueTasks", format: "count" },
    { label: "Pending Reviews", path: "submissionMetrics.pendingReviews", format: "count" },
    { label: "Completion Rate", path: "taskMetrics.completionRate", format: "percentage" },
    { label: "On-Time Completion", path: "taskMetrics.onTimeCompletionRate", format: "percentage" },
    { label: "Avg. Completion Time", path: "taskMetrics.averageCompletionTime", format: "days" },
    { label: "Rejection Rate", path: "submissionMetrics.rejectionRate", format: "percentage" },
  ],

  DEPARTMENT_PERFORMANCE_ALL: [
    { label: "Total Departments", path: "summary.totalDepartments", format: "count" },
    { label: "Total Employees", path: "summary.totalEmployees", format: "count" },
    { label: "Total Managers", path: "summary.totalManagers", format: "count" },
    { label: "Total Active Tasks", path: "summary.totalActiveTasks", format: "count" },
    { label: "Total Completed Tasks", path: "summary.totalCompletedTasks", format: "count" },
    { label: "Avg. Dept Completion Rate", path: "summary.avgDepartmentCompletionRate", format: "percentage" },
  ],
};

/**
 * Format report type string into official title.
 */
const formatReportTitle = (reportType) => {
  switch (reportType) {
    case "EMPLOYEE_PERFORMANCE":
      return "Employee Performance Report";
    case "MANAGER_TEAM_PERFORMANCE":
      return "Manager Team Performance Report";
    case "MANAGER_PERFORMANCE":
      return "Manager Performance & Effectiveness Report";
    case "ADMIN_COMPANY_PERFORMANCE":
      return "Admin Company Performance Report";
    case "PROJECT_PERFORMANCE":
      return "Project Performance Report";
    case "DEPARTMENT_PERFORMANCE":
      return "Department Performance Report";
    default:
      return "AI Performance Report";
  }
};

/**
 * Safely resolve nested property value from an object path (e.g. "users.totalEmployees").
 */
const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
};

/**
 * Format metric value according to unit specifier ("count", "percentage", "days").
 * Null / undefined values produce "—". Real zero values produce "0", "0%", or "0 days".
 */
const formatMetricValue = (val, format) => {
  if (val === null || val === undefined) {
    return "—";
  }
  if (typeof val === "number") {
    if (format === "percentage") {
      return `${val}%`;
    }
    if (format === "days") {
      return `${val} days`;
    }
    return String(val);
  }
  return String(val);
};

/**
 * Extract normalized metric label-value pairs from sourceMetrics object based on report type.
 */
const extractMetricPairs = (metricsObj, reportType = null) => {
  if (!metricsObj || typeof metricsObj !== "object") {
    return [];
  }

  let resolvedReportType = reportType;

  // Auto-detect report type if not explicitly supplied
  if (!resolvedReportType) {
    if (metricsObj.scopeMode === "ALL_DEPARTMENTS") {
      resolvedReportType = "DEPARTMENT_PERFORMANCE_ALL";
    } else if (metricsObj.scopeMode === "SINGLE_DEPARTMENT" || metricsObj.departmentHealth !== undefined) {
      resolvedReportType = "DEPARTMENT_PERFORMANCE";
    } else if (metricsObj.users && metricsObj.projects && metricsObj.tasks) {
      resolvedReportType = "ADMIN_COMPANY_PERFORMANCE";
    } else if (metricsObj.teamSize !== undefined || metricsObj.teamTaskCompletion !== undefined) {
      resolvedReportType = "MANAGER_TEAM_PERFORMANCE";
    } else if (metricsObj.totalAssignedCount !== undefined || metricsObj.averageAcceptanceTime !== undefined) {
      resolvedReportType = "EMPLOYEE_PERFORMANCE";
    } else if (metricsObj.phaseCount !== undefined || metricsObj.phases !== undefined) {
      resolvedReportType = "PROJECT_PERFORMANCE";
    }
  }

  if (resolvedReportType === "DEPARTMENT_PERFORMANCE" && metricsObj.scopeMode === "ALL_DEPARTMENTS") {
    resolvedReportType = "DEPARTMENT_PERFORMANCE_ALL";
  }

  const configList = resolvedReportType ? REPORT_SOURCE_METRICS_CONFIG[resolvedReportType] : null;

  if (configList && Array.isArray(configList)) {
    return configList.map((item) => {
      let val = getNestedValue(metricsObj, item.path);
      if (val === undefined && item.fallbackPath) {
        val = getNestedValue(metricsObj, item.fallbackPath);
      }
      return {
        label: item.label,
        value: formatMetricValue(val, item.format),
        rawValue: val,
      };
    });
  }

  return [];
};

/**
 * Format key string to human-readable title case.
 */
const formatMetricKey = (key) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
};

/**
 * Collect all operational insight list arrays into a single unified array.
 */
const collectInsights = (aiAnalysis = {}) => {
  const list = [];
  [
    "workforceInsights",
    "taskDeliveryInsights",
    "workloadInsights",
    "managerInsights",
    "employeeInsights",
    "projectInsights",
    "departmentInsights",
    "phaseInsights",
    "departmentComparisons",
    "bestPerformingDepartments",
    "departmentsRequiringAttention",
  ].forEach((key) => {
    if (Array.isArray(aiAnalysis[key])) {
      list.push(...aiAnalysis[key]);
    }
  });
  return list;
};

module.exports = {
  REPORT_SOURCE_METRICS_CONFIG,
  formatReportTitle,
  getNestedValue,
  formatMetricValue,
  extractMetricPairs,
  formatMetricKey,
  collectInsights,
};

