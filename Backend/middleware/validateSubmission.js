const validator = require("validator");

const validateSubmission = (req, res, next) => {
  let { message } = req.body;

  if (message) {
    message = validator.trim(message);

    if (!validator.isLength(message, { max: 1000 })) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 1000 characters",
      });
    }

    req.body.message = validator.escape(message);
  }

  next();
};

module.exports = validateSubmission;
