const Project = require("../../models/Project");
const { ROLES } = require("../../constants/constants");

const getProjectFilter = (user) => {
  if (user.role === ROLES.ADMIN) {
    return {};
  }

  if (user.role === ROLES.MANAGER) {
    return {
      $or: [{ createdBy: user.userId }, { members: user.userId }],
    };
  }

  return {
    _id: null,
  };
};

const getAccessibleProjectIds = async (user) => {
  const filter = getProjectFilter(user);

  const projects = await Project.find(filter).select("_id");

  return projects.map((project) => project._id);
};

module.exports = {
  getProjectFilter,
  getAccessibleProjectIds,
};
