const validator = require("validator");

const validateRegister = (req, res, next) => {
  let { name, email, password } = req.body;

  // Required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Trim
  name = validator.trim(name);
  email = validator.trim(email);
  password = validator.trim(password);

  // Name validation
  if (validator.isEmpty(name)) {
    return res.status(400).json({
      success: false,
      message: "Name cannot be empty",
    });
  }

  if (!validator.isLength(name, { min: 3, max: 50 })) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 3 and 50 characters",
    });
  }

  // Email validation
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email address",
    });
  }

  // Password validation
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character",
    });
  }

  // Sanitization
  req.body.name = validator.escape(name);
  req.body.email = validator.normalizeEmail(email);
  req.body.password = password;

  next();
};

module.exports = validateRegister;