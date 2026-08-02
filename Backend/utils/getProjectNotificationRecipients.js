const User = require("../models/User");
const { ROLES, NOTIFICATION_TYPE } = require("../constants/constants");

const getProjectNotificationRecipients = async ({
  type,
  project,
  actor,
  addedManager = null,
  removedManager = null,
}) => {
  const recipients = new Set();

  // ===========================================
  // Project Created
  // Admins + creator (if manager)
  // ===========================================

  if (type === NOTIFICATION_TYPE.PROJECT_CREATED) {
    const admins = await User.find({
      role: ROLES.ADMIN,
      isActive: true,
    }).select("_id");

    admins.forEach((admin) => recipients.add(admin._id.toString()));

    const creator = await User.findById(project.createdBy).select("role");

    if (creator?.role === ROLES.MANAGER) {
      recipients.add(project.createdBy.toString());
    }
  }

  // ===========================================
  // Manager Added
  // ===========================================
  else if (type === NOTIFICATION_TYPE.PROJECT_MEMBER_ADDED) {
    if (addedManager) {
      recipients.add(addedManager.toString());
    }
  }

  // ===========================================
  // Manager Removed
  // ===========================================
  else if (type === NOTIFICATION_TYPE.PROJECT_MEMBER_REMOVED) {
    if (removedManager) {
      recipients.add(removedManager.toString());
    }
  }

  // ===========================================
  // Archive / Restore / Update
  // ===========================================
  else if (
    [
      NOTIFICATION_TYPE.PROJECT_UPDATED,
      NOTIFICATION_TYPE.PROJECT_ARCHIVED,
      NOTIFICATION_TYPE.PROJECT_RESTORED,
    ].includes(type)
  ) {
    const admins = await User.find({
      role: ROLES.ADMIN,
      isActive: true,
    }).select("_id");

    admins.forEach((admin) => recipients.add(admin._id.toString()));

    const populatedProject = await project.populate([
      {
        path: "createdBy",
        select: "role",
      },
      {
        path: "members",
        select: "role",
      },
    ]);

    if (populatedProject.createdBy?.role === ROLES.MANAGER) {
      recipients.add(populatedProject.createdBy._id.toString());
    }

    populatedProject.members.forEach((member) => {
      if (member.role === ROLES.MANAGER) {
        recipients.add(member._id.toString());
      }
    });
  }

  // Don't notify the actor
  recipients.delete(actor.toString());

  return [...recipients];
};

module.exports = getProjectNotificationRecipients;
