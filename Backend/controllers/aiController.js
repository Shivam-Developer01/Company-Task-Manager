const { generateText, checkHealth } = require("../services/ai/aiProvider");
const { buildAiContext, formatForLlm } = require("../services/ai/aiContextBuilder");
const { validateAndSanitizeForAi } = require("../services/ai/aiSecurityBoundary");
const { generateStructuredAiResponse } = require("../services/ai/aiResponseService");
const { TEST_RESPONSE_SCHEMA, validateAgainstSchema } = require("../services/ai/aiResponseValidator");
const { runAiSecurityAudit } = require("../services/ai/aiAuditService");
const { generateAiReport } = require("../services/ai/aiReportService");
const { generateAiRecommendation } = require("../services/ai/aiRecommendationService");
const { getCandidateEvidenceForTask } = require("../services/analytics/candidateAnalytics");
const CustomError = require("../errors/CustomError");

/**
 * AI Provider Health, Verification & Report Controller (Phase 13 & Phase 14.1).
 * Strictly isolated backend endpoints.
 * NO database mutations.
 */

/**
 * GET /api/ai/health
 * Checks AI provider configuration status.
 */
const getAiProviderHealth = async (req, res) => {
  const health = await checkHealth();
  res.status(200).json({
    success: true,
    data: health,
  });
};

/**
 * POST /api/ai/test
 * Sends a fixed, harmless test prompt to verify backend-to-Grok connection.
 * Admin-only protected endpoint.
 */
const testAiProvider = async (req, res) => {
  const systemInstruction = "You are a test AI provider verification service. Respond ONLY with valid JSON.";
  const userPrompt = "Return a successful provider health response containing status 'ok' and provider 'gemini'.";
  const responseFormat = { type: "json_object" };

  try {
    const aiResponse = await generateText({
      systemInstruction,
      userPrompt,
      responseFormat,
      temperature: 0.0,
    });

    let parsedContent = null;
    try {
      parsedContent = JSON.parse(aiResponse.text);
    } catch (e) {
      parsedContent = { rawText: aiResponse.text };
    }

    res.status(200).json({
      success: true,
      message: "AI Provider test successful.",
      data: {
        providerOutput: parsedContent,
        model: aiResponse.model,
        finishReason: aiResponse.finishReason,
        usage: aiResponse.usage,
        durationMs: aiResponse.durationMs,
      },
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 500).json({
        success: false,
        errorType: error.type || "AI_PROVIDER_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_PROVIDER_ERROR",
      message: error.message || "Failed to execute AI provider test.",
    });
  }
};

/**
 * GET /api/ai/context/preview
 * Preview sanitized AI Context DTO for development/testing.
 * Protected endpoint for Admin, Manager, and Employee (self only).
 */
const previewAiContext = async (req, res) => {
  const { contextType = "EMPLOYEE_REPORT", targetSubjectId, projectId, format } = req.query;

  const contextDto = await buildAiContext({
    viewer: req.user,
    contextType,
    targetSubjectId: targetSubjectId || null,
    projectId: projectId || null,
  });

  if (format === "llm") {
    const formattedPrompt = formatForLlm(contextDto);
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(formattedPrompt);
    return;
  }

  res.status(200).json({
    success: true,
    data: contextDto,
  });
};

/**
 * POST /api/ai/security/verify
 * Tests AI security boundary validation & sanitization on a context payload.
 * Protected endpoint for Admin & Manager.
 */
const verifyAiSecurityBoundary = async (req, res) => {
  const { contextType = "EMPLOYEE_REPORT", targetSubjectId, projectId, injectTestSecret } = req.body;

  try {
    // 1. Build authorized context
    const contextDto = await buildAiContext({
      viewer: req.user,
      contextType,
      targetSubjectId: targetSubjectId || null,
      projectId: projectId || null,
    });

    // Option to inject dummy secret for fail-closed security testing
    if (injectTestSecret) {
      contextDto.sanitizedData.testSecretKey = "Bearer eyJhbGciOiJIUzI1NiJ9.testSecretToken";
    }

    // 2. Pass context through AI Security Boundary
    const securityBundle = validateAndSanitizeForAi(contextDto);

    res.status(200).json({
      success: true,
      message: "AI Security Boundary validation PASSED.",
      data: {
        isApproved: securityBundle.isValid,
        securityMetadata: securityBundle.securityMetadata,
        systemInstruction: securityBundle.systemInstruction,
        userPromptPreview: securityBundle.userPrompt.slice(0, 300) + "...",
      },
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 403).json({
        success: false,
        errorType: error.type || "AI_CONTEXT_SECURITY_REJECTED",
        message: error.message,
        failClosed: true,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_CONTEXT_SECURITY_REJECTED",
      message: error.message || "Security validation failed.",
      failClosed: true,
    });
  }
};

/**
 * POST /api/ai/response/verify
 * Executes full structured response pipeline with validation and XSS sanitization.
 * Admin & Manager protected endpoint.
 */
const verifyStructuredAiResponse = async (req, res) => {
  const { contextType = "EMPLOYEE_REPORT", targetSubjectId, projectId, mockPayload } = req.body;

  try {
    // If mockPayload is passed in body, test validator directly without calling Grok
    if (mockPayload) {
      const validatedData = validateAgainstSchema(mockPayload, TEST_RESPONSE_SCHEMA, "TestResponseSchema");
      res.status(200).json({
        success: true,
        message: "Schema validation PASSED for mock payload.",
        data: validatedData,
      });
      return;
    }

    // Build context
    const contextDto = await buildAiContext({
      viewer: req.user,
      contextType,
      targetSubjectId: targetSubjectId || null,
      projectId: projectId || null,
    });

    // Execute end-to-end structured AI response call
    const result = await generateStructuredAiResponse({
      contextDto,
      schema: TEST_RESPONSE_SCHEMA,
      temperature: 0.0,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 502).json({
        success: false,
        errorType: error.type || "AI_RESPONSE_SCHEMA_FAILED",
        message: error.message,
        failClosed: true,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_RESPONSE_SCHEMA_FAILED",
      message: error.message || "Structured AI response validation failed.",
      failClosed: true,
    });
  }
};

/**
 * GET /api/ai/audit
 * Executes automated AI security audit suite (Admin only).
 */
const runAiSecurityAuditController = async (req, res) => {
  const auditReport = await runAiSecurityAudit();
  res.status(200).json({
    success: auditReport.status === "PASSED",
    data: auditReport,
  });
};

/**
 * POST /api/ai/report/generate
 * Generates structured AI report using pre-authorized analytics and security validation.
 * Protected endpoint for authenticated users (role-governed subject access).
 */
const generateAiReportController = async (req, res) => {
  const { reportType, targetSubjectId, projectId } = req.body;

  try {
    const reportPayload = await generateAiReport({
      viewer: req.user,
      reportType,
      targetSubjectId: targetSubjectId || null,
      projectId: projectId || null,
    });

    res.status(200).json(reportPayload);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 400).json({
        success: false,
        errorType: error.type || "AI_REPORT_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_REPORT_ERROR",
      message: error.message || "Failed to generate AI report.",
    });
  }
};

/**
 * POST /api/ai/recommendation/generate
 * Generates structured AI advisory recommendation (Phase 15.1).
 * Protected endpoint for authenticated users (role-governed recommendation types).
 * Strictly read-only advisory output. NO MongoDB mutations.
 */
const generateAiRecommendationController = async (req, res) => {
  const { recommendationType, targetType = "task", targetId } = req.body;

  try {
    const recommendationPayload = await generateAiRecommendation({
      viewer: req.user,
      recommendationType,
      targetType,
      targetId,
    });

    res.status(200).json(recommendationPayload);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 400).json({
        success: false,
        errorType: error.type || "AI_RECOMMENDATION_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_RECOMMENDATION_ERROR",
      message: error.message || "Failed to generate AI recommendation.",
    });
  }
};

/**
 * POST /api/ai/recommendation/candidate-evidence
 * Fetches deterministic candidate operational evidence for a target task (Phase 15.2).
 * Protected endpoint for Admin and Manager with project scope access.
 * Strictly read-only analysis. NO AI ranking, NO MongoDB mutations.
 */
const previewCandidateEvidenceController = async (req, res) => {
  const { taskId } = req.body;

  try {
    const evidencePayload = await getCandidateEvidenceForTask(taskId, req.user);
    res.status(200).json(evidencePayload);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 400).json({
        success: false,
        errorType: error.type || "CANDIDATE_EVIDENCE_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "CANDIDATE_EVIDENCE_ERROR",
      message: error.message || "Failed to retrieve candidate evidence.",
    });
  }
};

const { exportAiReportDocument } = require("../services/ai/aiReportExportService");

/**
 * POST /api/ai/report/export/pdf
 * Export a validated AI report as PDF binary document.
 * 0 Gemini API requests, 0 DB mutations.
 */
const exportAiReportPdfController = async (req, res) => {
  const { reportPayload } = req.body;

  try {
    const exportResult = await exportAiReportDocument({
      viewer: req.user,
      format: "pdf",
      reportPayload,
    });

    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportResult.fileName}"`);
    res.status(200).send(exportResult.buffer);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 400).json({
        success: false,
        errorType: error.type || "AI_REPORT_EXPORT_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_REPORT_EXPORT_ERROR",
      message: error.message || "Failed to export AI report PDF document.",
    });
  }
};

/**
 * POST /api/ai/report/export/docx
 * Export a validated AI report as DOCX binary document.
 * 0 Gemini API requests, 0 DB mutations.
 */
const exportAiReportDocxController = async (req, res) => {
  const { reportPayload } = req.body;

  try {
    const exportResult = await exportAiReportDocument({
      viewer: req.user,
      format: "docx",
      reportPayload,
    });

    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportResult.fileName}"`);
    res.status(200).send(exportResult.buffer);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode || 400).json({
        success: false,
        errorType: error.type || "AI_REPORT_EXPORT_ERROR",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      errorType: "AI_REPORT_EXPORT_ERROR",
      message: error.message || "Failed to export AI report DOCX document.",
    });
  }
};

module.exports = {
  getAiProviderHealth,
  testAiProvider,
  previewAiContext,
  verifyAiSecurityBoundary,
  verifyStructuredAiResponse,
  runAiSecurityAuditController,
  generateAiReportController,
  generateAiRecommendationController,
  previewCandidateEvidenceController,
  exportAiReportPdfController,
  exportAiReportDocxController,
};
