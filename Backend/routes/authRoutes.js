const express = require("express");

const router = express.Router();

const {
  createUser,
  login,
  refreshAccessToken,
  logout,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  changePassword,
  getMyProfile,
  getUserOptions,
} = require("../controllers/authController");

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const validateLogin = require("../middleware/validateLogin");
const validateCreateEmployee = require("../middleware/validateCreateEmployee");
const validateUpdateEmployee = require("../middleware/validateUpdateEmployee");

/* ----------------------------- User Management ---------------------------- */

router.get("/users", auth, authorize("admin", "manager"), getAllUsers);

router.get(
  "/users/options",
  auth,
  authorize("admin", "manager"),
  getUserOptions,
);

router.get("/users/:id", auth, authorize("admin", "manager"), getUserById);

router.post(
  "/users",
  auth,
  authorize("admin", "manager"),
  validateCreateEmployee,
  createUser,
);

router.patch(
  "/users/:id",
  auth,
  authorize("admin", "manager"),
  validateUpdateEmployee,
  updateUser,
);

router.patch(
  "/users/:id/status",
  auth,
  authorize("admin", "manager"),
  toggleUserStatus,
);

router.patch(
  "/users/:id/reset-password",
  auth,
  authorize("admin", "manager"),
  resetUserPassword,
);

/* -------------------------------- Profile -------------------------------- */

router.get("/me", auth, getMyProfile);

router.patch("/change-password", auth, changePassword);

/* ----------------------------- Authentication ----------------------------- */

router.post("/login", validateLogin, login);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", auth, logout);

module.exports = router;
