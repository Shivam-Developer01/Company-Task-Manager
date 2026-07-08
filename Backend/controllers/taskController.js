const Task = require("../models/Task");

const createTask = async (req, res) => {
  const task = await Task.create({
    ...req.body,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
};

const getAllTasks = async (req, res) => {
  const tasks = await Task.find({
    createdBy: req.user.userId,
  });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
};

const getTask = async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    createdBy: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  res.status(200).json(task);
};

const CustomError = require("../errors/CustomError");

const updateTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      createdBy: req.user.userId,
    },
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    data: task,
  });
};

const deleteTask = async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.user.userId,
  });

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
};

module.exports = {
  createTask,
  getAllTasks,
  getTask,
  updateTask,
  deleteTask,
};
