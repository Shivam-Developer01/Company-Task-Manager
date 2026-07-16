const validator = require("validator");

const priorities = ["Low", "Medium", "High", "Critical"];

const validateCreateTask = (req, res, next) => {
  let {
    title,
    description,
    assignedTo,
    priority,
    dueDate,
    project,
    checklist,
  } = req.body;

  if (!title || !description || !assignedTo || !priority || !dueDate) {
    return res.status(400).json({
      success: false,
      message:
        "Title, description, assigned employee, priority and due date are required",
    });
  }

  title = validator.trim(title);
  description = validator.trim(description);

  if (!validator.isLength(title, { min: 3, max: 100 })) {
    return res.status(400).json({
      success: false,
      message: "Title must be between 3 and 100 characters",
    });
  }

  if (!validator.isLength(description, { min: 5, max: 1000 })) {
    return res.status(400).json({
      success: false,
      message: "Description must be between 5 and 1000 characters",
    });
  }

  if (!validator.isMongoId(assignedTo)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee id",
    });
  }

  if (!priorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: "Invalid priority",
    });
  }

  if (!validator.isISO8601(dueDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid due date",
    });
  }

  if (project && !validator.isMongoId(project)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project id",
    });
  }

  if (req.body.checklist) {
    try {
      req.body.checklist = JSON.parse(req.body.checklist);
    } catch (error) {
      throw new CustomError("Invalid checklist format", 400);
    }
  }
  if (req.body.checklist && !Array.isArray(req.body.checklist)) {
    return res.status(400).json({
      success: false,
      message: "Checklist must be an array",
    });
  }

  req.body.title = validator.escape(title);
  req.body.description = validator.escape(description);

  next();
};

module.exports = validateCreateTask;
