const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { ROLES } = require("../constants/constants");

const {
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
} = require("../controllers/aiController");

/* ===========================================================
   AI Provider, Context, Security, Response, Audit, Report & Recommendation Routes (Phase 13, 14, 15 & 16)
   =========================================================== */

// GET /api/ai/health — Provider configuration check (Admin, Manager)
router.get(
  "/health",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getAiProviderHealth,
);

// POST /api/ai/test — Provider connectivity test with fixed prompt (Admin only)
router.post(
  "/test",
  auth,
  authorize(ROLES.ADMIN),
  testAiProvider,
);

// GET /api/ai/context/preview — Preview sanitized AI Context DTO (Authenticated users, role-authorized subject)
router.get(
  "/context/preview",
  auth,
  previewAiContext,
);

// POST /api/ai/security/verify — Test AI security boundary validation & fail-closed check (Admin, Manager)
router.post(
  "/security/verify",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  verifyAiSecurityBoundary,
);

// POST /api/ai/response/verify — Test end-to-end structured AI response validation (Admin, Manager)
router.post(
  "/response/verify",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  verifyStructuredAiResponse,
);

// GET /api/ai/audit — Execute automated AI security assertions (Admin only)
router.get(
  "/audit",
  auth,
  authorize(ROLES.ADMIN),
  runAiSecurityAuditController,
);

// POST /api/ai/report/generate — Generate structured AI report (Authenticated users, role-governed subject access)
router.post(
  "/report/generate",
  auth,
  generateAiReportController,
);

// POST /api/ai/report/export/pdf — Export validated AI report as PDF document (Authenticated users, role-governed subject access)
router.post(
  "/report/export/pdf",
  auth,
  exportAiReportPdfController,
);

// POST /api/ai/report/export/docx — Export validated AI report as DOCX document (Authenticated users, role-governed subject access)
router.post(
  "/report/export/docx",
  auth,
  exportAiReportDocxController,
);

// POST /api/ai/recommendation/generate — Generate structured AI recommendation (Authenticated users, role-governed recommendation access)
router.post(
  "/recommendation/generate",
  auth,
  generateAiRecommendationController,
);

// POST /api/ai/recommendation/candidate-evidence — Fetch deterministic candidate evidence for target task (Admin, Manager with task access)
router.post(
  "/recommendation/candidate-evidence",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  previewCandidateEvidenceController,
);

module.exports = router;
