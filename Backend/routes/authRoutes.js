const express = require("express");

const router = express.Router();

const {
  createEmployee,
  login,
  refreshAccessToken,
  logout,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
  changePassword,
  getMyProfile,
  getEmployeeOptions,
} = require("../controllers/authController");

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateLogin = require("../middleware/validateLogin");

const validateCreateEmployee = require("../middleware/validateCreateEmployee");
const validateUpdateEmployee = require("../middleware/validateUpdateEmployee");

router.get("/employees", auth, authorize("manager"), getAllEmployees);

router.get(
  "/employees/options",
  auth,
  authorize("manager"),
  getEmployeeOptions,
);

router.get("/employees/:id", auth, authorize("manager"), getEmployeeById);

router.get("/me", auth, getMyProfile);

router.patch(
  "/employees/:id",
  auth,
  authorize("manager"),
  validateUpdateEmployee,
  updateEmployee,
);

router.patch(
  "/employees/:id/status",
  auth,
  authorize("manager"),
  toggleEmployeeStatus,
);

router.patch(
  "/employees/:id/reset-password",
  auth,
  authorize("manager"),
  resetEmployeePassword,
);

router.patch("/change-password", auth, changePassword);

// Manager creates employee
router.post(
  "/employees",
  auth,
  authorize("manager"),
  validateCreateEmployee,
  createEmployee,
);

// Login
router.post("/login", validateLogin, login);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", auth, logout);

module.exports = router;
