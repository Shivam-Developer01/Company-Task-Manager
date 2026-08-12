const mongoose = require("mongoose");

const {
  getEmployeeMetrics,
} = require("../services/analytics/employeeAnalytics");

const {
  getManagerTeamMetrics,
} = require("../services/analytics/managerAnalytics");

const { getProjectMetrics } = require("../services/analytics/projectAnalytics");

const { getCompanyMetrics } = require("../services/analytics/companyAnalytics");

const { ROLES } = require("../constants/constants");
const { getAccessibleProjectIds } = require("../services/access/projectAccess");

const Task = require("../models/Task");
const User = require("../models/User");
const CustomError = require("../errors/CustomError");

/* ===========================================================
   GET /api/analytics/employee/me
   Employee gets their own metrics.
   =========================================================== */

const getMyEmployeeMetrics = async (req, res) => {
  const metrics = await getEmployeeMetrics(
    req.user.userId,
    req.query.project || null,
  );

  res.status(200).json({
    success: true,
    data: metrics,
  });
};

/* ===========================================================
   GET /api/analytics/employee/:id
   Admin & Manager: view Employee Perspective for any employee.
   =========================================================== */

const getEmployeeMetricsById = async (req, res) => {
  const { id } = req.params;

  // Validate that target user exists and is an employee
  const targetUser = await User.findById(id).select("role name employeeId").lean();

  if (!targetUser) {
    throw new CustomError("Employee not found", 404);
  }

  if (targetUser.role !== ROLES.EMPLOYEE) {
    throw new CustomError("User is not an employee", 400);
  }

  const metrics = await getEmployeeMetrics(id, req.query.project || null);

  res.status(200).json({
    success: true,
    data: {
      ...metrics,
      employeeDetails: {
        id: targetUser._id,
        name: targetUser.name,
        employeeId: targetUser.employeeId,
      },
    },
  });
};

/* ===========================================================
   GET /api/analytics/manager/team
   Manager or Admin gets team-level metrics.
   =========================================================== */

const getTeamMetrics = async (req, res) => {
  const metrics = await getManagerTeamMetrics(req.user);

  res.status(200).json({
    success: true,
    data: metrics,
  });
};

/* ===========================================================
   GET /api/analytics/project/:id
   Manager (with access) or Admin gets project metrics.
   Project access is verified inside getProjectMetrics.
   =========================================================== */

const getProjectMetricsById = async (req, res) => {
  const metrics = await getProjectMetrics(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: metrics,
  });
};

/* ===========================================================
   GET /api/analytics/company
   Admin only — company-wide metrics.
   =========================================================== */

const getCompanyAnalytics = async (req, res) => {
  const metrics = await getCompanyMetrics();

  res.status(200).json({
    success: true,
    data: metrics,
  });
};

module.exports = {
  getMyEmployeeMetrics,
  getEmployeeMetricsById,
  getTeamMetrics,
  getProjectMetricsById,
  getCompanyAnalytics,
};
