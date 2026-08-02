const Project = require("../../models/Project");
const Task = require("../../models/Task");
const User = require("../../models/User");

const CustomError = require("../../errors/CustomError");

const {
  ROLES,
  TASK_STATUS,
  NOTIFICATION_TYPE,
} = require("../../constants/constants");

const { getProjectFilter } = require("../access/projectAccess");

const createNotification = require("../../utils/createNotification");
const getProjectNotificationRecipients = require("../../utils/getProjectNotificationRecipients");

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

  const recipients = await getProjectNotificationRecipients({
    type: NOTIFICATION_TYPE.PROJECT_CREATED,
    project,
    actor: req.user.userId,
  });

  for (const user of recipients) {
    await createNotification({
      user,
      title: "Project Created",
      message: `Project "${project.name}" has been created.`,
      type: NOTIFICATION_TYPE.PROJECT_CREATED,
      project: project._id,
    });
  }

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

  const accessFilter = getProjectFilter(req.user);

  const finalQuery = {
    ...query,
    ...accessFilter,
  };

  const projects = await Project.find(finalQuery)
    .populate("createdBy", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalProjects = await Project.countDocuments(finalQuery);

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
  const accessFilter = getProjectFilter(req.user);

  const exists = await Project.findById(req.params.id).select(
    "_id createdBy members",
  );

  const project = await Project.findOne({
    _id: req.params.id,
    ...accessFilter,
  })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .populate({
      path: "members",
      select: "name employeeId role isActive department designation",
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

  const accessFilter = getProjectFilter(req.user);

  const project = await Project.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

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

  project.updatedBy = req.user.userId;

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .populate({
      path: "members",
      select: "name employeeId email role department designation",
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
  const accessFilter = getProjectFilter(req.user);

  const project = await Project.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

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
  const recipients = await getProjectNotificationRecipients({
    type: project.isArchived
      ? NOTIFICATION_TYPE.PROJECT_ARCHIVED
      : NOTIFICATION_TYPE.PROJECT_RESTORED,
    project,
    actor: req.user.userId,
  });

  for (const user of recipients) {
    await createNotification({
      user,
      title: project.isArchived ? "Project Archived" : "Project Restored",
      message: `Project "${project.name}" has been ${
        project.isArchived ? "archived" : "restored"
      }.`,
      type: project.isArchived
        ? NOTIFICATION_TYPE.PROJECT_ARCHIVED
        : NOTIFICATION_TYPE.PROJECT_RESTORED,
      project: project._id,
    });
  }

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
