const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const validateTask = require("../middleware/validateTask");

const {
  createTask,
  getAllTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

router.route("/").post(auth, validateTask, createTask).get(auth, getAllTasks);

router
  .route("/:id")
  .get(auth, getTask)
  .patch(auth, updateTask)
  .delete(auth, deleteTask);

module.exports = router;