const User = require("../../models/User");

const CustomError = require("../../errors/CustomError");
const { ROLES } = require("../../constants/constants");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/jwt");

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email })
    .populate("department", "name code")
    .populate("designation", "name code");

  if (!user) {
    throw new CustomError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new CustomError(
      "Your account has been deactivated. Contact your manager.",
      403,
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new CustomError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken(user);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);

  await user.save();

  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
      designation: user.designation,
      mustChangePassword: user.mustChangePassword,
    },
  });
};

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError("Refresh token is required", 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new CustomError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(decoded.userId);

  if (!user || !user.refreshToken) {
    throw new CustomError("Invalid refresh token", 401);
  }

  const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

  if (!isMatch) {
    throw new CustomError("Invalid refresh token", 401);
  }

  const accessToken = generateAccessToken(user);

  res.status(200).json({
    success: true,
    accessToken,
  });
};

const logout = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new CustomError(
      "Current password and new password are required",
      400,
    );
  }

  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new CustomError("Current password is incorrect", 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.mustChangePassword = false;
  user.updatedBy = req.user.userId;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

const getMyProfile = async (req, res) => {
  const user = await User.findById(req.user.userId)
    .populate("department", "name code")
    .populate("designation", "name code")
    .select("-password")
    .lean();

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
};

const getUserOptions = async (req, res) => {
  const { role } = req.query;

  const query = {
    isActive: true,
  };

  if (req.user.role === ROLES.MANAGER) {
    query.role = ROLES.EMPLOYEE;
  } else if (role) {
    const roles = role.split(",").map((r) => r.trim());
    query.role = { $in: roles };
  } else {
    query.role = {
      $in: [ROLES.MANAGER, ROLES.EMPLOYEE],
    };
  }

  const users = await User.find(query)
    .populate("department", "name")
    .populate("designation", "name")
    .select("name employeeId role department designation")
    .sort({ name: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: users,
  });
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  changePassword,
  getMyProfile,
  getUserOptions,
};
