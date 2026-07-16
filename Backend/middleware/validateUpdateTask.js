const validator = require("validator");

const priorities = ["Low", "Medium", "High", "Critical"];

const validateUpdateTask = (req, res, next) => {
  const { title, description, priority, dueDate, project, checklist } =
    req.body;

  if (
    title === undefined &&
    description === undefined &&
    priority === undefined &&
    dueDate === undefined &&
    project === undefined &&
    checklist === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update",
    });
  }

  if (req.body.checklist) {
    try {
      req.body.checklist = JSON.parse(req.body.checklist);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid checklist format",
      });
    }
  }
  if (req.body.checklist !== undefined && !Array.isArray(req.body.checklist)) {
    return res.status(400).json({
      success: false,
      message: "Checklist must be an array",
    });
  }

  if (title !== undefined) {
    const value = validator.trim(title);

    if (!validator.isLength(value, { min: 3, max: 100 })) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 3 and 100 characters",
      });
    }

    req.body.title = validator.escape(value);
  }

  if (description !== undefined) {
    const value = validator.trim(description);

    if (!validator.isLength(value, { min: 5, max: 1000 })) {
      return res.status(400).json({
        success: false,
        message: "Description must be between 5 and 1000 characters",
      });
    }

    req.body.description = validator.escape(value);
  }

  if (priority !== undefined && !priorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: "Invalid priority",
    });
  }

  if (dueDate !== undefined && !validator.isISO8601(dueDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid due date",
    });
  }

  if (
    project !== undefined &&
    project !== null &&
    !validator.isMongoId(project)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid project id",
    });
  }

  next();
};

module.exports = validateUpdateTask;
