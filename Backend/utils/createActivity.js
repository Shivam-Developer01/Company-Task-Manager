const Activity = require("../models/Activity");

const createActivity = async ({ task, action, performedBy, remarks = "" }) => {
  await Activity.create({
    task,
    action,
    performedBy,
    remarks,
  });
};

module.exports = createActivity;
