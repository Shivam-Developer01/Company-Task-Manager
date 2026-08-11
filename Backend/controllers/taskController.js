const {
  createTask,
  updateTask,
} = require("../services/task/taskManagementService");

const {
  getAllTasks,
  getTaskById,
} = require("../services/task/taskQueryService");

const {
  withdrawTask,
  reassignTask,
  closeTask,
  toggleTaskArchive,
} = require("../services/task/taskWorkflowService");

const {
  getMyTasks,
  acceptTask,
  rejectTask,
  startTask,
  updateChecklist,
  getTaskActivities,
} = require("../services/task/employeeTaskService");

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,

  withdrawTask,
  reassignTask,
  closeTask,
  toggleTaskArchive,

  getMyTasks,
  acceptTask,
  rejectTask,
  startTask,
  updateChecklist,
  getTaskActivities,
};
