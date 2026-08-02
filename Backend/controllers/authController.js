const {
  login,
  refreshAccessToken,
  logout,
  changePassword,
  getMyProfile,
  getUserOptions,
} = require("../services/user/authService");

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
} = require("../services/user/userManagementService");

module.exports = {
  createUser,

  login,
  refreshAccessToken,
  logout,

  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetUserPassword,

  changePassword,
  getMyProfile,
  getUserOptions,
};
