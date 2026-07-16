const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateCreateTask = require("../middleware/validateCreateTask");
const validateUpdateTask = require("../middleware/validateUpdateTask");
const uploadReference = require("../middleware/uploadReference");

const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,

  withdrawTask,
  reassignTask,
  toggleTaskArchive,

  getMyTasks,
  acceptTask,
  rejectTask,
  startTask,
  updateChecklist,
  getTaskActivities,
} = require("../controllers/taskController");

/* ===========================================================
                    MANAGER ROUTES
=========================================================== */

// Create Task
router.post(
  "/",
  auth,
  authorize("manager"),
  uploadReference.array("referenceAttachments", 10),
  validateCreateTask,
  createTask,
);

// Get All Tasks
router.get("/", auth, authorize("manager"), getAllTasks);

// My Tasks for employee
router.get("/my", auth, authorize("employee"), getMyTasks);

// Get Task By ID
router.get("/:id", auth, authorize("manager", "employee"), getTaskById);

router.get(
  "/:id/activities",
  auth,
  authorize("manager", "employee"),
  getTaskActivities,
);

// Update Task
router.patch(
  "/:id",
  auth,
  authorize("manager"),
  uploadReference.array("referenceAttachments", 10),
  validateUpdateTask,
  updateTask,
);

// Withdraw Task
router.patch("/:id/withdraw", auth, authorize("manager"), withdrawTask);

// Reassign Task
router.patch("/:id/reassign", auth, authorize("manager"), reassignTask);

// Archive Task
router.patch("/:id/archive", auth, authorize("manager"), toggleTaskArchive);

/* ===========================================================
                    EMPLOYEE ROUTES
=========================================================== */

// Accept Task
router.patch("/:id/accept", auth, authorize("employee"), acceptTask);

// Reject Task
router.patch("/:id/reject", auth, authorize("employee"), rejectTask);

// Start Task
router.patch("/:id/start", auth, authorize("employee"), startTask);

// Update Checklist
router.patch(
  "/:taskId/checklist/:checklistId",
  auth,
  authorize("employee"),
  updateChecklist,
);

module.exports = router;
