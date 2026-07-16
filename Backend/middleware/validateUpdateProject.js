const validator = require("validator");

const validateUpdateProject = (req, res, next) => {
  const { name, description } = req.body;

  if (name === undefined && description === undefined) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update",
    });
  }

  if (name !== undefined) {
    const value = validator.trim(name);

    if (!validator.isLength(value, { min: 3, max: 100 })) {
      return res.status(400).json({
        success: false,
        message: "Project name must be between 3 and 100 characters",
      });
    }

    req.body.name = validator.escape(value);
  }

  if (description !== undefined) {
    req.body.description = validator.trim(description);
  }

  next();
};

module.exports = validateUpdateProject;
