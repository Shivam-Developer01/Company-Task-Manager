const validator = require("validator");

const validateProject = (req, res, next) => {
  let { name, description } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Project name is required",
    });
  }

  name = validator.trim(name);

  if (!validator.isLength(name, { min: 3, max: 100 })) {
    return res.status(400).json({
      success: false,
      message: "Project name must be between 3 and 100 characters",
    });
  }

  req.body.name = validator.escape(name);

  if (description) {
    req.body.description = validator.escape(validator.trim(description));
  }

  next();
};

module.exports = validateProject;
