const Task = require("../../models/Task");
const CustomError = require("../../errors/CustomError");

const { ROLES } = require("../../constants/constants");

const { getAccessibleProjectIds } = require("../access/projectAccess");

const { getAccessibleTask } = require("../access/taskAccess");

const getAllTasks = async (req, res) => {
  const {
    search,
    status,
    priority,
    employee,
    project,
    overdue,
    isArchived,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (employee) {
    query.assignedTo = employee;
  }

  if (project) {
    query.project = project;
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === "true";
  } else {
    query.isArchived = false;
  }

  if (overdue === "true") {
    query.dueDate = {
      $lt: new Date(),
    };

    query.status = {
      $in: ["Assigned", "Accepted", "In Progress"],
    };
  }

  const skip = (page - 1) * limit;

  const accessibleProjects = await getAccessibleProjectIds(req.user);

  let accessCondition = {};

  if (req.user.role !== ROLES.ADMIN) {
    accessCondition = {
      $or: [
        {
          project: {
            $in: accessibleProjects,
          },
        },
        {
          project: null,
          assignedBy: req.user.userId,
        },
      ],
    };
  }

  const finalQuery = {
    ...query,
    ...accessCondition,
  };

  const tasks = await Task.find(finalQuery)
    .populate("assignedTo", "name employeeId")
    .populate("assignedBy", "name")
    .populate("project", "name")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalTasks = await Task.countDocuments(finalQuery);

  res.status(200).json({
    success: true,

    totalTasks,

    currentPage: Number(page),

    totalPages: Math.ceil(totalTasks / limit),

    count: tasks.length,

    data: tasks,
  });
};

const getTaskById = async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);

  if (!task) {
    throw new CustomError("Task not found", 404);
  }

  await task.populate(
    "assignedTo",
    "name employeeId department designation email",
  );
  await task.populate("assignedBy", "name");
  await task.populate("project", "name description");
  await task.populate("createdBy", "name");
  await task.populate("updatedBy", "name");

  res.status(200).json({
    success: true,
    data: task,
  });
};

module.exports = {
  getAllTasks,
  getTaskById,
};
