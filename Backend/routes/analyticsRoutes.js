const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  getMyEmployeeMetrics,
  getEmployeeMetricsById,
  getTeamMetrics,
  getProjectMetricsById,
  getCompanyAnalytics,
} = require("../controllers/analyticsController");

const { ROLES } = require("../constants/constants");

/* ===========================================================
   Analytics Routes
   =========================================================== */

// GET /api/analytics/employee/me — Current employee's own metrics
router.get("/employee/me", auth, getMyEmployeeMetrics);

// GET /api/analytics/employee/:id — Employee metrics (Admin, Manager with access)
router.get(
  "/employee/:id",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getEmployeeMetricsById,
);

// GET /api/analytics/manager/team — Manager team metrics (Manager, Admin)
router.get(
  "/manager/team",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getTeamMetrics,
);

// GET /api/analytics/project/:id — Project metrics (Admin, Manager with access)
router.get(
  "/project/:id",
  auth,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getProjectMetricsById,
);

// GET /api/analytics/company — Company-wide metrics (Admin only)
router.get("/company", auth, authorize(ROLES.ADMIN), getCompanyAnalytics);

// POST /api/analytics/department-snapshot — Trigger department snapshot generation (Admin only)
const { triggerDepartmentSnapshot } = require("../controllers/analyticsController");
router.post("/department-snapshot", auth, authorize(ROLES.ADMIN), triggerDepartmentSnapshot);

module.exports = router;
