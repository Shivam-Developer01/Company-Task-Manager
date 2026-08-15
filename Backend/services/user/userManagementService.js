const User = require("../../models/User");
const Department = require("../../models/Department");
const Designation = require("../../models/Designation");
const Task = require("../../models/Task");
const Submission = require("../../models/Submission");
const mongoose = require("mongoose");
const createActivity = require("../../utils/createActivity");
const createNotification = require("../../utils/createNotification");

const CustomError = require("../../errors/CustomError");

const bcrypt = require("bcryptjs");

const {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

const generateTempPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  let password = "";

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

// Create User
const createUser = async (req, res) => {
  const { name, email, employeeId, department, designation } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { employeeId }],
  });

  if (existingUser) {
    throw new CustomError("Email or Employee ID already exists", 409);
  }

  const departmentExists = await Department.findOne({
    _id: department,
    isActive: true,
  });

  if (!departmentExists) {
    throw new CustomError("Department not found", 404);
  }

  const designationExists = await Designation.findOne({
    _id: designation,
    department,
    isActive: true,
  });

  if (!designationExists) {
    throw new CustomError("Designation not found", 404);
  }

  let role = ROLES.EMPLOYEE;

  if (req.user.role === ROLES.ADMIN) {
    if (!req.body.role) {
      throw new CustomError("Role is required", 400);
    }

    if (![ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE].includes(req.body.role)) {
      throw new CustomError("Invalid role", 400);
    }

    role = req.body.role;
  }

  const tempPassword = generateTempPassword();

  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    employeeId,
    department,
    designation,
    role,
    mustChangePassword: true,
    isActive: true,
    createdBy: req.user.userId,
  });

  const populatedUser = await User.findById(user._id)
    .populate("department", "name code")
    .populate("designation", "name code");

  res.status(201).json({
    success: true,
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
    data: {
      id: populatedUser._id,
      name: populatedUser.name,
      email: populatedUser.email,
      employeeId: populatedUser.employeeId,
      department: populatedUser.department,
      designation: populatedUser.designation,
      role: populatedUser.role,
      temporaryPassword: tempPassword,
    },
  });
};

// Login

const getAllUsers = async (req, res) => {
  const {
    search,
    department,
    designation,
    role,
    isActive,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  // Manager can only see employees
  if (req.user.role === ROLES.MANAGER) {
    query.role = ROLES.EMPLOYEE;
  }

  // Admin can filter by role
  if (req.user.role === ROLES.ADMIN && role) {
    const roles = role.split(",").map((r) => r.trim());

    query.role = {
      $in: roles,
    };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  if (department) {
    query.department = department;
  }

  if (designation) {
    query.designation = designation;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (page - 1) * Number(limit);

  const users = await User.find(query)
    .populate("department", "name code")
    .populate("designation", "name code")
    .populate("createdBy", "name employeeId")
    .populate("updatedBy", "name employeeId")
    .select("-password -refreshToken")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const totalUsers = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    totalUsers,
    currentPage: Number(page),
    totalPages: Math.ceil(totalUsers / Number(limit)),
    count: users.length,
    data: users,
  });
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  let user;

  if (req.user.role === ROLES.ADMIN) {
    user = await User.findById(id)
      .populate("department", "name code")
      .populate("designation", "name code")
      .populate("createdBy", "name employeeId")
      .populate("updatedBy", "name employeeId")
      .select("-password -refreshToken")
      .lean();
  } else {
    user = await User.findOne({
      _id: id,
      role: ROLES.EMPLOYEE,
    })
      .populate("department", "name code")
      .populate("designation", "name code")
      .populate("createdBy", "name employeeId")
      .populate("updatedBy", "name employeeId")
      .select("-password -refreshToken")
      .lean();
  }

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, employeeId, department, designation } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  // Admin cannot edit another admin, but can edit their own profile
  if (
    user.role === ROLES.ADMIN &&
    req.user.role === ROLES.ADMIN &&
    user._id.toString() !== req.user.userId.toString()
  ) {
    throw new CustomError("Admin accounts cannot be modified", 403);
  }

  // Managers can edit employees only
  if (req.user.role === ROLES.MANAGER && user.role !== ROLES.EMPLOYEE) {
    throw new CustomError("Forbidden", 403);
  }

  // Duplicate Email
  if (email && email !== user.email) {
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      throw new CustomError("Email already exists", 409);
    }
  }

  // Duplicate Employee ID
  if (employeeId && employeeId !== user.employeeId) {
    const existingEmployeeId = await User.findOne({ employeeId });

    if (existingEmployeeId) {
      throw new CustomError("Employee ID already exists", 409);
    }
  }

  const newDepartment = department ?? user.department;
  const newDesignation = designation ?? user.designation;

  const departmentExists = await Department.findOne({
    _id: newDepartment,
    isActive: true,
  });

  if (!departmentExists) {
    throw new CustomError("Department not found", 404);
  }

  const designationExists = await Designation.findOne({
    _id: newDesignation,
    department: newDepartment,
    isActive: true,
  });

  if (!designationExists) {
    throw new CustomError("Designation not found", 404);
  }

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  user.employeeId = employeeId ?? user.employeeId;
  user.department = newDepartment;
  user.designation = newDesignation;
  user.updatedBy = req.user.userId;

  await user.save();

  const updatedUser = await User.findById(user._id)
    .populate("department", "name code")
    .populate("designation", "name code")
    .populate("createdBy", "name employeeId")
    .populate("updatedBy", "name employeeId")
    .select("-password -refreshToken");

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updatedUser,
  });
};

const getUserActiveTasksCount = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  const activeStatuses = [
    TASK_STATUS.ASSIGNED,
    TASK_STATUS.ACCEPTED,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.TASK_REJECTED,
  ];

  const count = await Task.countDocuments({
    assignedTo: id,
    status: { $in: activeStatuses },
    isArchived: { $ne: true },
  });

  res.status(200).json({
    success: true,
    count,
  });
};

const toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password -refreshToken");

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  // Admin accounts cannot be deactivated
  if (user.role === ROLES.ADMIN) {
    throw new CustomError("Admin accounts cannot be deactivated", 403);
  }

  // Managers can only manage employees
  if (req.user.role === ROLES.MANAGER && user.role !== ROLES.EMPLOYEE) {
    throw new CustomError("Forbidden", 403);
  }

  const willDeactivate = user.isActive;
  let withdrawnTasksCount = 0;

  if (willDeactivate) {
    const pendingSubTaskIds = await Submission.distinct("task", {
      submittedBy: user._id,
      status: SUBMISSION_STATUS.PENDING_REVIEW,
    });

    const activeStatuses = [
      TASK_STATUS.ASSIGNED,
      TASK_STATUS.ACCEPTED,
      TASK_STATUS.IN_PROGRESS,
      TASK_STATUS.TASK_REJECTED,
    ];

    const activeTasks = await Task.find({
      assignedTo: user._id,
      _id: { $nin: pendingSubTaskIds },
      status: { $in: activeStatuses },
      isArchived: { $ne: true },
    });

    withdrawnTasksCount = activeTasks.length;

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      for (const task of activeTasks) {
        task.status = TASK_STATUS.WITHDRAWN;
        task.updatedBy = req.user.userId;

        await task.save(session ? { session } : {});

        await createActivity({
          task: task._id,
          action: NOTIFICATION_TYPE.TASK_WITHDRAWN,
          performedBy: req.user.userId,
          details: "Task automatically withdrawn due to employee deactivation.",
        });

        await createNotification({
          user: task.assignedTo,
          title: "Task Withdrawn",
          message: `Task "${task.title}" has been automatically withdrawn due to account deactivation.`,
          type: NOTIFICATION_TYPE.TASK_WITHDRAWN,
          task: task._id,
        });
      }

      user.isActive = false;
      user.updatedBy = req.user.userId;

      await user.save(session ? { session } : {});

      if (session) {
        await session.commitTransaction();
      }
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } else {
    // Reactivation
    user.isActive = true;
    user.updatedBy = req.user.userId;
    await user.save();
  }

  let message = `User ${user.isActive ? "activated" : "deactivated"} successfully.`;
  if (!user.isActive && withdrawnTasksCount > 0) {
    message = `Employee deactivated successfully. ${withdrawnTasksCount} active task${withdrawnTasksCount === 1 ? "" : "s"} ${withdrawnTasksCount === 1 ? "was" : "were"} withdrawn.`;
  } else if (!user.isActive) {
    message = "Employee deactivated successfully.";
  }

  res.status(200).json({
    success: true,
    message,
    data: user,
    withdrawnTasksCount,
  });
};

const resetUserPassword = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  // Admin accounts cannot be reset
  if (user.role === ROLES.ADMIN) {
    throw new CustomError("Admin passwords cannot be reset", 403);
  }

  // Managers can reset only employees
  if (req.user.role === ROLES.MANAGER && user.role !== ROLES.EMPLOYEE) {
    throw new CustomError("Forbidden", 403);
  }

  const tempPassword = generateTempPassword();

  user.password = await bcrypt.hash(tempPassword, 10);
  user.mustChangePassword = true;
  user.updatedBy = req.user.userId;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      temporaryPassword: tempPassword,
    },
  });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  getUserActiveTasksCount,
};
