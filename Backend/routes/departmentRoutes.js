const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateDepartment = require("../middleware/validateDepartment");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
} = require("../controllers/departmentController");

router.get("/", auth, getDepartments);

router.get("/:id", auth, getDepartmentById);

router.post(
  "/",
  auth,
  authorize("manager", "admin"),
  validateDepartment,
  createDepartment,
);

router.patch(
  "/:id",
  auth,
  authorize("manager", "admin"),
  validateDepartment,
  updateDepartment,
);

router.patch("/:id/status", auth, authorize("manager", "admin"), toggleDepartmentStatus);

module.exports = router;
