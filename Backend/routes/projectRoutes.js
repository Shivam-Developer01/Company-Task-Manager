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

router.post("/", auth, authorize("manager", "admin"), validateProject, createProject);

router.get("/", auth, authorize("manager", "admin"), getAllProjects);
router.get("/:id/members", auth, authorize("manager", "admin"), getProjectMembers);
router.get("/:id/employees", auth, authorize("manager", "admin"), getAvailableEmployees);
router.get("/:id", auth, authorize("manager", "admin"), getProjectById);

router.patch("/:id/members", auth, authorize("manager", "admin"), updateProjectMembers);

router.patch(
  "/:id",
  auth,
  authorize("manager", "admin"),
  validateUpdateProject,
  updateProject,
);

router.patch("/:id/status", auth, authorize("manager", "admin"), toggleProjectStatus);

module.exports = router;
