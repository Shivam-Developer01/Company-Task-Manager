const express = require("express");

const router = express.Router();

const {
  register,
  login,
} = require("../controllers/authController");

const validateRegister = require("../middleware/validateRegister");
const validateLogin = require("../middleware/validateLogin");

router.post("/register", validateRegister, register);

router.post("/login", validateLogin, login);

module.exports = router;