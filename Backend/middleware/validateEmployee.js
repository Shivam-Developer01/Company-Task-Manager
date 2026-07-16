const validator = require("validator");

const validateEmployee = (req, res, next) => {
  let { name, email, employeeId, department, designation, role } = req.body;

  // Required fields
  if (!name || !email || !employeeId || !department || !designation) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email, employee ID, department and designation are required",
    });
  }

  // Trim
  name = validator.trim(name);
  email = validator.trim(email);
  employeeId = validator.trim(employeeId);
  department = validator.trim(department);
  designation = validator.trim(designation);

  // Name
  if (!validator.isLength(name, { min: 3, max: 50 })) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 3 and 50 characters",
    });
  }

  // Email
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email address",
    });
  }

  // Employee ID
  if (!validator.isLength(employeeId, { min: 3, max: 20 })) {
    return res.status(400).json({
      success: false,
      message: "Employee ID must be between 3 and 20 characters",
    });
  }


  // Sanitization
  req.body.name = validator.escape(name);
  req.body.email = validator.normalizeEmail(email);
  req.body.employeeId = validator.escape(employeeId);
  req.body.department = validator.escape(department);
  req.body.designation = validator.escape(designation);

  next();
};

module.exports = validateEmployee;
