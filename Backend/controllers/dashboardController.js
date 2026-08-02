const {
  getManagerDashboard,
} = require("../services/dashboard/managerDashboardService");

const {
  getEmployeeDashboard,
} = require("../services/dashboard/employeeDashboardService");

const {
  getProjectDashboard,
  getProjectAnalytics,
} = require("../services/dashboard/projectDashboardService");

module.exports = {
  getManagerDashboard,
  getEmployeeDashboard,
  getProjectDashboard,
  getProjectAnalytics,
};
