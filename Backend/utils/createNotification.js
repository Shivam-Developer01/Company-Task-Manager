const Notification = require("../models/Notification");

const createNotification = async ({
  user,
  title,
  message,
  type,
  task = null,
  submission = null,
}) => {
  await Notification.create({
    user,
    title,
    message,
    type,
    task,
    submission,
  });
};

module.exports = createNotification;
