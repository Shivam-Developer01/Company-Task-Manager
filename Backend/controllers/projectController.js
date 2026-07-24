const Project = require("../models/Project");
const Task = require("../models/Task");
const CustomError = require("../errors/CustomError");
const User = require("../models/User");
const { ROLES, TASK_STATUS } = require("../constants/constants");

// Create Project
const createProject = async (req, res) => {
  const { name, description, members = [] } = req.body;

  const existingProject = await Project.findOne({ name });

  if (existingProject) {
    throw new CustomError("Project already exists", 409);
  }

  const project = await Project.create({
    name,
    description,
    members,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: project,
  });
};

// Get All Projects
const getAllProjects = async (req, res) => {
  const {
    search,
    isArchived,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  if (search) {
    query.name = {
      $regex: search,
      $options: "i",
    };
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === "true";
  }

  const skip = (page - 1) * Number(limit);

  const projects = await Project.find(query)
    .populate("createdBy", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalProjects = await Project.countDocuments(query);

  res.status(200).json({
    success: true,
    totalProjects,
    currentPage: Number(page),
    totalPages: Math.ceil(totalProjects / Number(limit)),
    count: projects.length,
    data: projects,
  });
};

// Get Project By Id
const getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .populate({
      path: "members",
      select: "name employeeId isActive department designation",
      populate: [
        {
          path: "department",
          select: "name code",
        },
        {
          path: "designation",
          select: "name code",
        },
      ],
    });

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  const tasks = await Task.find({
    project: project._id,
    isArchived: false,
  })
    .populate("assignedTo", "name employeeId")
    .select("title status priority dueDate assignedTo createdAt updatedAt")
    .sort({ createdAt: -1 });

  const totalTasks = tasks.length;

  const assignedTasks = tasks.filter(
    (task) => task.status === TASK_STATUS.ASSIGNED,
  ).length;

  const acceptedTasks = tasks.filter(
    (task) => task.status === TASK_STATUS.ACCEPTED,
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === TASK_STATUS.IN_PROGRESS,
  ).length;

  const submittedTasks = tasks.filter(
    (task) => task.status === TASK_STATUS.SUBMITTED,
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === TASK_STATUS.CLOSED,
  ).length;

  const openTasks = totalTasks - completedTasks;

  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  res.status(200).json({
    success: true,
    data: {
      ...project.toObject(),

      membersCount: project.members.length,

      tasks,

      statistics: {
        totalTasks,
        assignedTasks,
        acceptedTasks,
        inProgressTasks,
        submittedTasks,
        completedTasks,
        openTasks,
        progress,
        members: project.members.length,
      },
    },
  });
};

// Update Project
const updateProject = async (req, res) => {
  const { name, description, members } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  if (name && name !== project.name) {
    const existingProject = await Project.findOne({
      name,
      _id: { $ne: project._id },
    });

    if (existingProject) {
      throw new CustomError("Project name already exists", 409);
    }

    project.name = name;
  }

  if (description !== undefined) {
    project.description = description;
  }

  if (members !== undefined) {
    if (!Array.isArray(members)) {
      throw new CustomError("Members must be an array", 400);
    }

    const uniqueMembers = [...new Set(members)];

    const employees = await User.find({
      _id: { $in: uniqueMembers },
      role: ROLES.EMPLOYEE,
      isActive: true,
    }).select("_id");

    if (employees.length !== uniqueMembers.length) {
      throw new CustomError(
        "One or more selected employees are invalid or inactive",
        400,
      );
    }

    project.members = uniqueMembers;
  }

  project.updatedBy = req.user.userId;

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .populate({
      path: "members",
      select: "name employeeId isActive department designation",
      populate: [
        {
          path: "department",
          select: "name code",
        },
        {
          path: "designation",
          select: "name code",
        },
      ],
    });

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
    data: updatedProject,
  });
};

const toggleProjectStatus = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  // Prevent archiving until every task is closed
  if (!project.isArchived) {
    const activeTasks = await Task.countDocuments({
      project: project._id,
      isArchived: false,
      status: {
        $ne: TASK_STATUS.CLOSED,
      },
    });

    if (activeTasks > 0) {
      throw new CustomError(
        `Project cannot be archived. ${activeTasks} task${
          activeTasks > 1 ? "s are" : " is"
        } still open.`,
        400,
      );
    }
  }

  project.isArchived = !project.isArchived;
  project.updatedBy = req.user.userId;

  await project.save();

  res.status(200).json({
    success: true,
    message: `Project ${
      project.isArchived ? "archived" : "restored"
    } successfully`,
    data: project,
  });
};

const updateProjectMembers = async (req, res) => {
  const { id } = req.params;
  const { members } = req.body;

  const project = await Project.findById(id);

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  if (!Array.isArray(members)) {
    throw new CustomError("Members must be an array", 400);
  }

  // Remove duplicate ids
  const uniqueMembers = [...new Set(members)];

  // Fetch active employees
  const employees = await User.find({
    _id: { $in: uniqueMembers },
    role: ROLES.EMPLOYEE,
    isActive: true,
  }).select("_id");

  if (employees.length !== uniqueMembers.length) {
    throw new CustomError(
      "One or more selected employees are invalid or inactive",
      400,
    );
  }

  // -------------------------------
  // Validate removed members
  // -------------------------------

  const removedMembers = project.members.filter(
    (memberId) =>
      !uniqueMembers.some((id) => id.toString() === memberId.toString()),
  );

  if (removedMembers.length > 0) {
    const activeTasks = await Task.aggregate([
      {
        $match: {
          project: project._id,
          assignedTo: { $in: removedMembers },
          status: { $ne: "Closed" },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
        },
      },
    ]);

    if (activeTasks.length > 0) {
      const employeeIds = activeTasks.map((task) => task._id);

      const employees = await User.find({
        _id: { $in: employeeIds },
      }).select("name");

      const employeeMap = Object.fromEntries(
        employees.map((employee) => [employee._id.toString(), employee.name]),
      );

      const message = activeTasks
        .map((task) => {
          const name = employeeMap[task._id.toString()] || "Employee";

          return `${name} (${task.count})`;
        })
        .join(", ");

      throw new CustomError(
        `Cannot remove project members. Active tasks found: ${message}. Complete or reassign these tasks first.`,
        400,
      );
    }
  }

  project.members = uniqueMembers;
  project.updatedBy = req.user.userId;

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate("members", "name employeeId email")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  res.status(200).json({
    success: true,
    message: "Project members updated successfully",
    data: updatedProject,
  });
};

const getProjectMembers = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id).populate({
    path: "members",
    select: "name email employeeId isActive department designation",
    populate: [
      {
        path: "department",
        select: "name code",
      },
      {
        path: "designation",
        select: "name code",
      },
    ],
  });

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  res.status(200).json({
    success: true,
    count: project.members.length,
    data: project.members,
  });
};

const getAvailableEmployees = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id).select("members");

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  const memberIds = project.members.map((member) => member.toString());

  const employees = await User.find({
    role: ROLES.EMPLOYEE,
    isActive: true,
  })
    .populate("department", "name code")
    .populate("designation", "name code")
    .select("name email employeeId department designation isActive")
    .sort({ name: 1 });

  const data = employees.map((employee) => ({
    _id: employee._id,
    name: employee.name,
    email: employee.email,
    employeeId: employee.employeeId,
    department: employee.department?.name,
    designation: employee.designation?.name,
    isActive: employee.isActive,
    isMember: memberIds.includes(employee._id.toString()),
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,
  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
};
