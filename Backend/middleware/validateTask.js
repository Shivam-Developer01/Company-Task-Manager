const validator = require("validator");

const validateTask = (req, res, next) => {
  let { title, description, dueDate } = req.body;

  // Required fields
  if (!title || !description || !dueDate) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Trim whitespace
  title = validator.trim(title);
  description = validator.trim(description);

  // Empty check
  if (validator.isEmpty(title)) {
    return res.status(400).json({
      success: false,
      message: "Title cannot be empty",
    });
  }

  if (validator.isEmpty(description)) {
    return res.status(400).json({
      success: false,
      message: "Description cannot be empty",
    });
  }

  // Length validation
  if (!validator.isLength(title, { min: 3, max: 100 })) {
    return res.status(400).json({
      success: false,
      message: "Title must be between 3 and 100 characters",
    });
  }

  if (!validator.isLength(description, { min: 5, max: 500 })) {
    return res.status(400).json({
      success: false,
      message: "Description must be between 5 and 500 characters",
    });
  }

  // Date validation
  if (!validator.isISO8601(dueDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid due date",
    });
  }

  if (req.body.status && !["Pending", "Completed"].includes(req.body.status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid task status",
    });
  }

  // Sanitization
  req.body.title = validator.escape(title);
  req.body.description = validator.escape(description);

  next();
};

module.exports = validateTask;
