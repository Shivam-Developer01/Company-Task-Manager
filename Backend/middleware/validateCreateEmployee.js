const validator = require("validator");

const validateCreateEmployee = (req, res, next) => {
  let { name, email, employeeId, department, designation } = req.body;

  if (!name || !email || !employeeId || !department || !designation) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email, employee ID, department and designation are required",
    });
  }

  name = validator.trim(name);
  email = validator.trim(email);
  employeeId = validator.trim(employeeId);
  department = validator.trim(department);
  designation = validator.trim(designation);

  if (!validator.isLength(name, { min: 3, max: 50 })) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 3 and 50 characters",
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email address",
    });
  }

  if (!validator.isLength(employeeId, { min: 3, max: 20 })) {
    return res.status(400).json({
      success: false,
      message: "Employee ID must be between 3 and 20 characters",
    });
  }

  req.body.name = validator.escape(name);
  req.body.email = validator.normalizeEmail(email);
  req.body.employeeId = validator.escape(employeeId);

  next();
};

module.exports = validateCreateEmployee;
