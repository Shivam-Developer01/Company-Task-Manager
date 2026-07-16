const Project = require("../models/Project");
const Task = require("../models/Task");
const CustomError = require("../errors/CustomError");

// Create Project
const createProject = async (req, res) => {
  const { name, description } = req.body;

  const existingProject = await Project.findOne({ name });

  if (existingProject) {
    throw new CustomError("Project already exists", 409);
  }

  const project = await Project.create({
    name,
    description,
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
    .populate("updatedBy", "name email");

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  const [totalTasks, assignedTasks, inProgressTasks, completedTasks] =
    await Promise.all([
      Task.countDocuments({
        project: project._id,
        isArchived: false,
      }),

      Task.countDocuments({
        project: project._id,
        status: "Assigned",
        isArchived: false,
      }),

      Task.countDocuments({
        project: project._id,
        status: "In Progress",
        isArchived: false,
      }),

      Task.countDocuments({
        project: project._id,
        status: "Closed",
        isArchived: false,
      }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      ...project.toObject(),

      statistics: {
        totalTasks,
        assignedTasks,
        inProgressTasks,
        completedTasks,
      },
    },
  });
};

// Update Project
const updateProject = async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  if (name && name !== project.name) {
    const existingProject = await Project.findOne({ name });

    if (existingProject) {
      throw new CustomError("Project name already exists", 409);
    }

    project.name = name;
  }

  if (description !== undefined) {
    project.description = description;
  }

  project.updatedBy = req.user.userId;

  await project.save();

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
    data: project,
  });
};

// Archive Project
const toggleProjectStatus = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new CustomError("Project not found", 404);
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

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  toggleProjectStatus,
};
