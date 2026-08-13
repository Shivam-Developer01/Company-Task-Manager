const { getReportConfig } = require("./aiReportConfig");
const { validateContextAccess } = require("./aiContextPolicy");
const { buildAiContext } = require("./aiContextBuilder");
const { generateStructuredAiResponse } = require("./aiResponseService");
const CustomError = require("../../errors/CustomError");

/**
 * AI Report Generation Service (Phase 14.1).
 * Common report generation pipeline reusing Phase 13 AI Data Layer infrastructure.
 * Separates authoritative source metrics from non-authoritative AI explanations.
 * NO MongoDB database access, NO database write operations.
 */

/**
 * Generate a role-authorized, structured AI report.
 * @param {Object} params
 * @param {Object} params.viewer Authenticated user object from req.user
 * @param {string} params.reportType Requested report type (e.g. EMPLOYEE_PERFORMANCE)
 * @param {string} [params.targetSubjectId] Optional target employee ID
 * @param {string} [params.projectId] Optional target project ID
 * @returns {Promise<Object>} Normalized report response payload
 */
const generateAiReport = async ({
  viewer,
  reportType,
  targetSubjectId = null,
  projectId = null,
}) => {
  if (!viewer || !viewer.role) {
    throw new CustomError("Unauthorized: Missing viewer credentials.", 401);
  }

  // 1. Look up Backend Report Configuration & Specification
  const config = getReportConfig(reportType);

  // 2. Validate Viewer Role Authorization for Report Type
  const viewerRoleLower = viewer.role.toLowerCase();
  const isAuthorizedRole = config.allowedRoles.some(
    (r) => r.toLowerCase() === viewerRoleLower
  );
  if (!isAuthorizedRole) {
    throw new CustomError(
      `Forbidden: Role "${viewer.role}" is not authorized to generate "${reportType}" reports.`,
      403,
    );
  }

  // 3. Validate Context & Subject Access Policy (Employees restricted to self)
  validateContextAccess(viewer, config.contextType, targetSubjectId);

  // 4. Build Pre-Authorized AI Context DTO (Phase 13.2 - 0 duplicate DB queries)
  const contextDto = await buildAiContext({
    viewer,
    contextType: config.contextType,
    targetSubjectId,
    projectId,
  });

  // 5. Execute Structured AI Execution & Output Validation (Phases 13.3 & 13.4)
  const aiResult = await generateStructuredAiResponse({
    contextDto,
    schema: config.schema,
    temperature: 0.2,
  });

  // 6. Return Normalized Application Report DTO
  // Explicitly separates Authoritative Source Metrics from Non-Authoritative AI Analysis
  return {
    success: true,
    report: {
      reportType: config.reportType,
      generatedAt: new Date().toISOString(),
      viewer: {
        userId: viewer.userId,
        role: viewer.role,
      },
      subject: contextDto.contextMetadata.subject,
      sourceMetrics: contextDto.sanitizedData,
      aiAnalysis: aiResult.data,
    },
    metadata: aiResult.metadata,
  };
};

module.exports = {
  generateAiReport,
};
