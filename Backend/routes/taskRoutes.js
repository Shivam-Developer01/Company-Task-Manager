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
  closeTask,
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
  authorize("manager", "admin"),
  uploadReference.array("referenceAttachments", 10),
  validateCreateTask,
  createTask,
);

// Get All Tasks
router.get("/", auth, authorize("manager", "admin"), getAllTasks);

// My Tasks for employee
router.get("/my", auth, authorize("employee"), getMyTasks);

// Get Task By ID
router.get("/:id", auth, authorize("manager", "admin", "employee"), getTaskById);

router.get(
  "/:id/activities",
  auth,
  authorize("manager", "employee", "admin"),
  getTaskActivities,
);

// Update Task
router.patch(
  "/:id",
  auth,
  authorize("manager", "admin"),
  uploadReference.array("referenceAttachments", 10),
  validateUpdateTask,
  updateTask,
);

// Withdraw Task
router.patch("/:id/withdraw", auth, authorize("manager", "admin"), withdrawTask);

// Reassign Task
router.patch("/:id/reassign", auth, authorize("manager", "admin"), reassignTask);

// Close Task
router.patch("/:id/close", auth, authorize("manager", "admin"), closeTask);

// Archive Task
router.patch("/:id/archive", auth, authorize("manager", "admin"), toggleTaskArchive);

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
