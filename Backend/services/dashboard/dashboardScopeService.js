const Project = require("../../models/Project");
const { ROLES } = require("../../constants/constants");

const getDashboardScope = async (user, projectId = null) => {
  let projectQuery = {};

  switch (user.role) {
    case ROLES.ADMIN:
      projectQuery = {};
      break;

    case ROLES.MANAGER:
      projectQuery = {
        $or: [{ createdBy: user.userId }, { members: user.userId }],
      };
      break;

    case ROLES.EMPLOYEE:
      projectQuery = {
        members: user.userId,
      };
      break;

    default:
      projectQuery = {
        _id: null,
      };
  }

  const projects = await Project.find(projectQuery).select("_id name");

  const allProjectIds = projects.map((project) => project._id);

  let projectIds = allProjectIds;

  let noProject = false;
  let allProjects = true;

  if (projectId === "NO_PROJECT") {
    noProject = true;
    allProjects = false;
    projectIds = [];
  } else if (projectId) {
    allProjects = false;

    const exists = projects.some(
      (project) => project._id.toString() === projectId,
    );

    projectIds = exists ? [projectId] : [];
  }

  return {
    projects,
    projectIds,
    noProject,
    allProjects,
  };
};

module.exports = {
  getDashboardScope,
};
