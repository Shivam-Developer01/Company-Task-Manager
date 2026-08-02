const Task = require("../../models/Task");
const { ROLES } = require("../../constants/constants");
const { getAccessibleProjectIds } = require("./projectAccess");

const getAccessibleTask = async (taskId, user) => {
  // Admin can access every task
  if (user.role === ROLES.ADMIN) {
    return await Task.findById(taskId);
  }

  // Employee can only access assigned tasks
  if (user.role === ROLES.EMPLOYEE) {
    return await Task.findOne({
      _id: taskId,
      assignedTo: user.userId,
    });
  }

  // Manager
  if (user.role === ROLES.MANAGER) {
    const accessibleProjects = await getAccessibleProjectIds(user);

    return await Task.findOne({
      _id: taskId,
      $or: [
        {
          project: {
            $in: accessibleProjects,
          },
        },
        {
          project: null,
          createdBy: user.userId,
        },
      ],
    });
  }

  return null;
};

const getAccessibleTaskIds = async (user) => {
  switch (user.role) {
    case ROLES.ADMIN: {
      const tasks = await Task.find().select("_id");
      return tasks.map((task) => task._id);
    }

    case ROLES.EMPLOYEE: {
      const tasks = await Task.find({
        assignedTo: user.userId,
      }).select("_id");

      return tasks.map((task) => task._id);
    }

    case ROLES.MANAGER: {
      const projectIds = await getAccessibleProjectIds(user);

      const tasks = await Task.find({
        $or: [
          {
            project: {
              $in: projectIds,
            },
          },
          {
            project: null,
            createdBy: user.userId,
          },
        ],
      }).select("_id");

      return tasks.map((task) => task._id);
    }

    default:
      return [];
  }
};

module.exports = {
  getAccessibleTask,
  getAccessibleTaskIds,
};
