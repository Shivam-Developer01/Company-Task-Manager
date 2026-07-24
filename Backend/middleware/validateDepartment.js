const validator = require("validator");

const validateDepartment = (req, res, next) => {
  let { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: "Department name and code are required",
    });
  }

  name = validator.trim(name);
  code = validator.trim(code).toUpperCase();

  if (!validator.isLength(name, { min: 2, max: 50 })) {
    return res.status(400).json({
      success: false,
      message: "Department name must be between 2 and 50 characters",
    });
  }

  if (!validator.isLength(code, { min: 2, max: 10 })) {
    return res.status(400).json({
      success: false,
      message: "Department code must be between 2 and 10 characters",
    });
  }

  req.body.code = validator.escape(code);

  next();
};

module.exports = validateDepartment;
