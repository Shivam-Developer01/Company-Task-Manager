const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  getManagerDashboard,
  getEmployeeDashboard,
  getProjectDashboard,
  getProjectAnalytics,
} = require("../controllers/dashboardController");

router.get("/manager", auth, authorize("manager"), getManagerDashboard);

router.get("/employee", auth, authorize("employee"), getEmployeeDashboard);

router.get("/project/:id/analytics", auth, getProjectAnalytics);

router.get("/project/:id", auth, getProjectDashboard);

module.exports = router;
