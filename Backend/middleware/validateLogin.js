const validator = require("validator");

const validateLogin = (req, res, next) => {
  let { email, password } = req.body;

  // Required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and Password are required",
    });
  }

  // Trim
  email = validator.trim(email);
  password = validator.trim(password);

  // Email validation
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email address",
    });
  }

  // Password should not be empty
  if (validator.isEmpty(password)) {
    return res.status(400).json({
      success: false,
      message: "Password cannot be empty",
    });
  }

  // Sanitization
  req.body.email = validator.normalizeEmail(email);
  req.body.password = password;

  next();
};

module.exports = validateLogin;