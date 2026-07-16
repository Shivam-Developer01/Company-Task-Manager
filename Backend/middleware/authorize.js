const CustomError = require("../errors/CustomError");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new CustomError("Forbidden", 403);
    }

    next();
  };
};

module.exports = authorize;
