const User = require("../models/User");
const Project = require("../models/Project");
const { ROLES, NOTIFICATION_TYPE } = require("../constants/constants");

const EMPLOYEE_ONLY_TYPES = [
  NOTIFICATION_TYPE.TASK_ASSIGNED,
  NOTIFICATION_TYPE.TASK_REASSIGNED,
  NOTIFICATION_TYPE.TASK_WITHDRAWN,
];

const getNotificationRecipients = async ({ type, task, actor }) => {
  const recipients = new Set();

  // ===========================================================
  // Employee-only notifications
  // ===========================================================

  if (EMPLOYEE_ONLY_TYPES.includes(type)) {
    if (task.assignedTo && task.assignedTo.toString() !== actor.toString()) {
      recipients.add(task.assignedTo.toString());
    }

    return [...recipients];
  }

  // ===========================================================
  // Personal notification to task creator
  // ===========================================================

  if (task.createdBy && task.createdBy.toString() !== actor.toString()) {
    recipients.add(task.createdBy.toString());
  }

  // ===========================================================
  // Project managers
  // ===========================================================

  if (task.project) {
    const project = await Project.findById(task.project)
      .populate("members", "role")
      .populate("createdBy", "role");

    if (project) {
      // Project creator
      if (
        project.createdBy &&
        project.createdBy.role === ROLES.MANAGER &&
        project.createdBy._id.toString() !== actor.toString()
      ) {
        recipients.add(project.createdBy._id.toString());
      }

      // Manager members only
      project.members.forEach((member) => {
        if (
          member.role === ROLES.MANAGER &&
          member._id.toString() !== actor.toString()
        ) {
          recipients.add(member._id.toString());
        }
      });
    }
  }

  // ===========================================================
  // Admins
  // ===========================================================

  const admins = await User.find(
    {
      role: ROLES.ADMIN,
      isActive: true,
    },
    "_id",
  );

  admins.forEach((admin) => {
    if (admin._id.toString() !== actor.toString()) {
      recipients.add(admin._id.toString());
    }
  });

  return [...recipients];
};

module.exports = getNotificationRecipients;
