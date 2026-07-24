const validator = require("validator");

const validateDesignation = (req, res, next) => {
  let { name, code, department } = req.body;

  if (!name || !code || !department) {
    return res.status(400).json({
      success: false,
      message: "Name, code and department are required",
    });
  }

  name = validator.trim(name);
  code = validator.trim(code).toUpperCase();

  if (!validator.isMongoId(department)) {
    return res.status(400).json({
      success: false,
      message: "Invalid department",
    });
  }

  if (!validator.isLength(name, { min: 2, max: 50 })) {
    return res.status(400).json({
      success: false,
      message: "Designation name must be between 2 and 50 characters",
    });
  }

  if (!validator.isLength(code, { min: 2, max: 10 })) {
    return res.status(400).json({
      success: false,
      message: "Designation code must be between 2 and 10 characters",
    });
  }

  req.body.code = validator.escape(code);
  req.body.department = department;

  next();
};

module.exports = validateDesignation;
