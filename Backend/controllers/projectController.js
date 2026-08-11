const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,
  addProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
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
  addProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,

  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
};
