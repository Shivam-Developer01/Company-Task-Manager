const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,
} = require("../services/project/projectManagementService");

const {
  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
} = require("../services/project/projectMemberService");

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,

  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
};
