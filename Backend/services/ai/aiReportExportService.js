const { getReportConfig, REPORT_TYPES } = require("./aiReportConfig");
const { validateContextAccess } = require("./aiContextPolicy");
const { validateAgainstSchema } = require("./aiResponseValidator");
const { generateReportPdfBuffer } = require("./pdfReportGenerator");
const { generateReportDocxBuffer } = require("./docxReportGenerator");
const CustomError = require("../../errors/CustomError");

/**
 * AI Report Export & Document Generation Service (Phase 16).
 * Coordinates PDF and DOCX file generation for validated AI reports.
 * STRICTLY READ-ONLY: 0 Gemini LLM API calls, 0 MongoDB database mutations.
 */

/**
 * Export a validated AI report as PDF or DOCX binary buffer.
 * @param {Object} params
 * @param {Object} params.viewer Authenticated user object from req.user
 * @param {string} params.format Requested export format ("pdf" or "docx")
 * @param {Object} params.reportPayload Full validated report payload object
 * @returns {Promise<Object>} { buffer, fileName, contentType }
 */
const exportAiReportDocument = async ({ viewer, format, reportPayload }) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  if (!format || !["pdf", "docx"].includes(format.toLowerCase())) {
    throw new CustomError(`Unsupported export format "${format}". Must be "pdf" or "docx".`, 400);
  }

  if (!reportPayload || !reportPayload.report) {
    throw new CustomError("Invalid report payload provided for document export.", 400);
  }

  const reportData = reportPayload.report;
  const reportType = reportData.reportType;

  if (!reportType || !REPORT_TYPES[reportType]) {
    throw new CustomError(`Invalid or unsupported report type "${reportType}".`, 400);
  }

  // 1. Look up Report Configuration & Schema
  const config = getReportConfig(reportType);

  // 2. Re-verify Viewer Role Authorization
  const viewerRoleLower = viewer.role.toLowerCase();
  const isAuthorizedRole = config.allowedRoles.some(
    (r) => r.toLowerCase() === viewerRoleLower
  );
  if (!isAuthorizedRole) {
    throw new CustomError(
      `Forbidden: Role "${viewer.role}" is not authorized to export "${reportType}" reports.`,
      403
    );
  }

  // 3. Re-verify Target Subject Access Policy (IDOR Protection)
  const targetSubjectId = reportData.subject?.userId || reportData.subject?.employeeId || null;
  validateContextAccess(viewer, config.contextType, targetSubjectId);

  // 4. Re-validate AI Analysis Section against Backend Schema Specification
  if (reportData.aiAnalysis) {
    validateAgainstSchema(reportData.aiAnalysis, config.schema, config.schema.name);
  } else {
    throw new CustomError("Report payload is missing AI analysis content.", 400);
  }

  // 5. Build Sanitized Filename
  const fileName = buildSanitizedFileName(reportType, reportData.subject, format.toLowerCase());

  // 6. Generate Document Binary Buffer (0 Gemini API requests, 0 DB mutations)
  let buffer = null;
  let contentType = "";

  if (format.toLowerCase() === "pdf") {
    buffer = await generateReportPdfBuffer(reportPayload);
    contentType = "application/pdf";
  } else {
    buffer = await generateReportDocxBuffer(reportPayload);
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return {
    buffer,
    fileName,
    contentType,
  };
};

/**
 * Construct safe, human-readable file name for download headers.
 */
const buildSanitizedFileName = (reportType, subject = {}, extension) => {
  let baseName = "AI_Report";

  switch (reportType) {
    case REPORT_TYPES.EMPLOYEE_PERFORMANCE:
      baseName = subject.name
        ? `Employee_Performance_Report_${subject.name}`
        : "Employee_Performance_Report";
      break;
    case REPORT_TYPES.MANAGER_TEAM_PERFORMANCE:
      baseName = "Manager_Team_Performance_Report";
      break;
    case REPORT_TYPES.ADMIN_COMPANY_PERFORMANCE:
      baseName = "Admin_Company_Performance_Report";
      break;
    case REPORT_TYPES.PROJECT_PERFORMANCE:
      baseName = subject.projectName
        ? `Project_Performance_Report_${subject.projectName}`
        : "Project_Performance_Report";
      break;
  }

  // Sanitize non-alphanumeric, spaces, underscores, hyphens
  const cleanName = baseName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .replace(/_+/g, "_")
    .trim();

  return `${cleanName}.${extension}`;
};

module.exports = {
  exportAiReportDocument,
};
