const User = require("../models/User");
const CustomError = require("../errors/CustomError");
const { ROLES } = require("../constants/constants");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

const generateTempPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  let password = "";

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

// Manager creates employee
const createEmployee = async (req, res) => {
  const { name, email, employeeId, department, designation } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { employeeId }],
  });

  if (existingUser) {
    throw new CustomError("Email or Employee ID already exists", 409);
  }

  const tempPassword = generateTempPassword();

  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const employee = await User.create({
    name,
    email,
    password: hashedPassword,
    employeeId,
    department,
    designation,
    role: "employee",
    mustChangePassword: true,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    message: "Employee created successfully",
    data: {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
      department: employee.department,
      designation: employee.designation,
      role: employee.role,
      temporaryPassword: tempPassword,
    },
  });
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

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

const getAllEmployees = async (req, res) => {
  const {
    search,
    department,
    designation,
    isActive,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {
    role: ROLES.EMPLOYEE,
  };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  if (department) query.department = department;

  if (designation) query.designation = designation;

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (page - 1) * Number(limit);

  const employees = await User.find(query)
    .select("-password")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalEmployees = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    totalEmployees,
    currentPage: Number(page),
    totalPages: Math.ceil(totalEmployees / Number(limit)),
    count: employees.length,
    data: employees,
  });
};

const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  const employee = await User.findOne({
    _id: id,
    role: "employee",
  }).select("-password");

  if (!employee) {
    throw new CustomError("Employee not found", 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, email, employeeId, department, designation } = req.body;

  const employee = await User.findOne({
    _id: id,
    role: ROLES.EMPLOYEE,
  }).select("-password");

  if (!employee) {
    throw new CustomError("Employee not found", 404);
  }

  // Check duplicate email
  if (email && email !== employee.email) {
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      throw new CustomError("Email already exists", 409);
    }
  }

  // Check duplicate employeeId
  if (employeeId && employeeId !== employee.employeeId) {
    const existingEmployeeId = await User.findOne({ employeeId });

    if (existingEmployeeId) {
      throw new CustomError("Employee ID already exists", 409);
    }
  }

  employee.name = name ?? employee.name;
  employee.email = email ?? employee.email;
  employee.employeeId = employeeId ?? employee.employeeId;
  employee.department = department ?? employee.department;
  employee.designation = designation ?? employee.designation;
  employee.updatedBy = req.user.userId;

  await employee.save();

  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    data: employee,
  });
};

const toggleEmployeeStatus = async (req, res) => {
  const { id } = req.params;

  const employee = await User.findOne({
    _id: id,
    role: ROLES.EMPLOYEE,
  }).select("-password");

  if (!employee) {
    throw new CustomError("Employee not found", 404);
  }

  employee.isActive = !employee.isActive;
  employee.updatedBy = req.user.userId;

  await employee.save();

  res.status(200).json({
    success: true,
    message: `Employee ${
      employee.isActive ? "activated" : "deactivated"
    } successfully`,
    data: employee,
  });
};

const resetEmployeePassword = async (req, res) => {
  const { id } = req.params;

  const employee = await User.findOne({
    _id: id,
    role: ROLES.EMPLOYEE,
  });

  if (!employee) {
    throw new CustomError("Employee not found", 404);
  }

  const tempPassword = generateTempPassword();

  employee.password = await bcrypt.hash(tempPassword, 10);

  employee.mustChangePassword = true;

  employee.updatedBy = req.user.userId;

  await employee.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
    data: {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
      temporaryPassword: tempPassword,
    },
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
  const user = await User.findById(req.user.userId).select("-password");

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
};

module.exports = {
  createEmployee,
  login,
  refreshAccessToken,
  logout,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
  changePassword,
  getMyProfile,
};
