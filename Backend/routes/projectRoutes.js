const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateProject = require("../middleware/validateProject");
const validateUpdateProject = require("../middleware/validateUpdateProject");

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,
  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
} = require("../controllers/projectController");

router.post("/", auth, authorize("manager"), validateProject, createProject);

router.get("/", auth, authorize("manager"), getAllProjects);
router.get("/:id/members", auth, getProjectMembers);
router.get("/:id/employees", auth, getAvailableEmployees);
router.get("/:id", auth, authorize("manager"), getProjectById);

router.patch("/:id/members", auth, authorize("manager"), updateProjectMembers);

router.patch(
  "/:id",
  auth,
  authorize("manager"),
  validateUpdateProject,
  updateProject,
);

router.patch("/:id/status", auth, authorize("manager"), toggleProjectStatus);

module.exports = router;
