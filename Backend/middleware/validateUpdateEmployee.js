const validator = require("validator");

const validateUpdateEmployee = (req, res, next) => {
  const { name, email, employeeId, department, designation } = req.body;

  if (
    name === undefined &&
    email === undefined &&
    employeeId === undefined &&
    department === undefined &&
    designation === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update",
    });
  }

  if (name !== undefined) {
    const value = validator.trim(name);

    if (!validator.isLength(value, { min: 3, max: 50 })) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 3 and 50 characters",
      });
    }

    req.body.name = validator.escape(value);
  }

  if (email !== undefined) {
    const value = validator.trim(email);

    if (!validator.isEmail(value)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    req.body.email = validator.normalizeEmail(value);
  }

  if (employeeId !== undefined) {
    const value = validator.trim(employeeId);

    if (!validator.isLength(value, { min: 3, max: 20 })) {
      return res.status(400).json({
        success: false,
        message: "Employee ID must be between 3 and 20 characters",
      });
    }

    req.body.employeeId = validator.escape(value);
  }

  if (department !== undefined) {
    req.body.department = validator.trim(department);
  }

  if (designation !== undefined) {
    req.body.designation = validator.trim(designation);
  }

  next();
};

module.exports = validateUpdateEmployee;
