const Activity = require("../models/Activity");
const Task = require("../models/Task");

const createActivity = async ({ task, action, performedBy, remarks = "" }) => {
  let taskDoc;

  if (typeof task === "object" && task.project) {
    taskDoc = task;
  } else {
    taskDoc = await Task.findById(task).select("project");

    if (!taskDoc) {
      throw new Error("Task not found while creating activity.");
    }
  }

  await Activity.create({
    project: taskDoc.project,
    task: taskDoc._id || task,
    action,
    performedBy,
    remarks,
  });
};

module.exports = createActivity;
