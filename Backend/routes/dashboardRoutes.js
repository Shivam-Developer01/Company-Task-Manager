const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  getManagerDashboard,
  getEmployeeDashboard,
} = require("../controllers/dashboardController");

router.get("/manager", auth, authorize("manager"), getManagerDashboard);

router.get("/employee", auth, authorize("employee"), getEmployeeDashboard);

module.exports = router;
