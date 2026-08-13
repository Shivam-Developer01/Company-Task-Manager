import api from "../utils/axios";

/**
 * AI Service for report generation and AI provider interactions.
 * Connects frontend to backend AI endpoints.
 */
const aiService = {
  /**
   * Generate an AI report.
   * @param {Object} params
   * @param {string} params.reportType e.g. "EMPLOYEE_PERFORMANCE"
   * @param {string} [params.targetSubjectId] Target employee ID (for Admin/Manager)
   * @param {string} [params.projectId] Target project ID (optional)
   */
  generateReport: async ({ reportType, targetSubjectId, projectId }) => {
    const response = await api.post("/ai/report/generate", {
      reportType,
      targetSubjectId: targetSubjectId || null,
      projectId: projectId || null,
    });
    return response.data;
  },

  /**
   * Generate an AI recommendation (Phase 15.1).
   * @param {Object} params
   * @param {string} params.recommendationType e.g. "TASK_ASSIGNMENT"
   * @param {string} [params.targetType] "task" | "project" | "employee"
   * @param {string} params.targetId Target entity ID
   */
  generateRecommendation: async ({ recommendationType, targetType = "task", targetId }) => {
    const response = await api.post("/ai/recommendation/generate", {
      recommendationType,
      targetType,
      targetId,
    });
    return response.data;
  },

  /**
   * Get deterministic candidate operational evidence for a task (Phase 15.2).
   * @param {Object} params
   * @param {string} params.taskId Target task ID
   */
  getCandidateEvidence: async ({ taskId }) => {
    const response = await api.post("/ai/recommendation/candidate-evidence", {
      taskId,
    });
    return response.data;
  },

  /**
   * Export validated AI report as PDF document (Phase 16).
   * @param {Object} reportPayload Validated report object
   */
  exportReportPdf: async (reportPayload) => {
    const response = await api.post(
      "/ai/report/export/pdf",
      { reportPayload },
      { responseType: "blob" }
    );
    return response;
  },

  /**
   * Export validated AI report as DOCX document (Phase 16).
   * @param {Object} reportPayload Validated report object
   */
  exportReportDocx: async (reportPayload) => {
    const response = await api.post(
      "/ai/report/export/docx",
      { reportPayload },
      { responseType: "blob" }
    );
    return response;
  },
};

export default aiService;
