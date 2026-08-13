const { sanitizeAiString } = require("./aiResponseValidator");

/**
 * Common Helper & Formatting Utilities for AI Report Document Exports (Phase 16).
 * Ensures concise, high-priority metric extraction across PDF and DOCX exports.
 */

/**
 * Format report type string into official title.
 */
const formatReportTitle = (reportType) => {
  switch (reportType) {
    case "EMPLOYEE_PERFORMANCE":
      return "Employee Performance Report";
    case "MANAGER_TEAM_PERFORMANCE":
      return "Manager Team Performance Report";
    case "ADMIN_COMPANY_PERFORMANCE":
      return "Admin Company Performance Report";
    case "PROJECT_PERFORMANCE":
      return "Project Performance Report";
    default:
      return "AI Performance Report";
  }
};

/**
 * Extract normalized metric label-value pairs from sourceMetrics object.
 * Recursively traverses nested metric objects and extracts 5-8 essential operational metrics.
 */
const extractMetricPairs = (metricsObj) => {
  const pairs = [];

  if (!metricsObj || typeof metricsObj !== "object") {
    return pairs;
  }

  const seenLabels = new Set();

  const traverse = (obj, prefix = "") => {
    if (!obj || typeof obj !== "object") return;

    for (const [key, val] of Object.entries(obj)) {
      // Ignore database IDs, internal timestamps, functions, and non-metric metadata fields
      if (
        key === "_id" ||
        key === "__v" ||
        key === "userId" ||
        key === "projectId" ||
        key === "employeeId" ||
        /id$|date|time|at$|notice|limitation|disclaimer|description|note|message|fieldused/i.test(key) ||
        typeof val === "function"
      ) {
        continue;
      }

      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        traverse(val, key);
      } else if (Array.isArray(val)) {
        if (val.length > 0 && typeof val[0] !== "object") {
          const label = formatMetricKey(prefix ? `${prefix} ${key}` : key);
          if (!seenLabels.has(label)) {
            seenLabels.add(label);
            pairs.push({ label, value: `${val.length} items` });
          }
        }
      } else if (val !== undefined && val !== null) {
        const strVal = String(val).trim();
        // Ignore long narrative sentences/explanations that are not compact metrics
        if (strVal.length > 30 || strVal.includes("\n")) {
          continue;
        }

        const label = formatMetricKey(key);
        if (!seenLabels.has(label)) {
          seenLabels.add(label);
          let displayVal = strVal;
          if (/completionrate|rate|percentage|share/i.test(key) && typeof val === "number") {
            displayVal = `${val}%`;
          }
          pairs.push({ label, value: displayVal });
        }
      }
    }
  };

  traverse(metricsObj);

  // Return top 6-8 core metrics
  return pairs.slice(0, 8);
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
  ["workloadInsights", "departmentInsights", "managerInsights", "projectInsights", "phaseInsights"].forEach(
    (key) => {
      if (Array.isArray(aiAnalysis[key])) {
        list.push(...aiAnalysis[key]);
      }
    }
  );
  return list;
};

module.exports = {
  formatReportTitle,
  extractMetricPairs,
  formatMetricKey,
  collectInsights,
};
