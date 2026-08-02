const Notification = require("../models/Notification");

const createNotification = async ({
  user,
  title,
  message,
  type,
  task = null,
  project = null,
  submission = null,
}) => {
  await Notification.create({
    user,
    title,
    message,
    type,
    task,
    project,
    submission,
  });
};

module.exports = createNotification;
