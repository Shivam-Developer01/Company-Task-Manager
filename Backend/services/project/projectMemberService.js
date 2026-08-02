const Project = require("../../models/Project");
const Task = require("../../models/Task");
const User = require("../../models/User");

const CustomError = require("../../errors/CustomError");

const { ROLES, NOTIFICATION_TYPE } = require("../../constants/constants");

const { getProjectFilter } = require("../access/projectAccess");

const createNotification = require("../../utils/createNotification");
const getProjectNotificationRecipients = require("../../utils/getProjectNotificationRecipients");

const updateProjectMembers = async (req, res) => {
  const { id } = req.params;
  const { members } = req.body;

  const accessFilter = getProjectFilter(req.user);

  const project = await Project.findOne({
    _id: id,
    ...accessFilter,
  });

  if (!project) {
    throw new CustomError("Project not found", 404);
  }

  if (!Array.isArray(members)) {
    throw new CustomError("Members must be an array", 400);
  }

  // Remove duplicate ids
  const uniqueMembers = [...new Set(members)];

  if (uniqueMembers.length === 0) {
    project.members = [];
    project.updatedBy = req.user.userId;

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project members updated successfully",
      data: project,
    });
  }

  // Fetch active project members (Managers + Employees)
  const validMembers = await User.find({
    _id: { $in: uniqueMembers },
    role: {
      $in: [ROLES.MANAGER, ROLES.EMPLOYEE],
    },
    isActive: true,
  }).select("_id");

  if (validMembers.length !== uniqueMembers.length) {
    throw new CustomError(
      "One or more selected members are invalid, inactive, or not allowed in projects",
      400,
    );
  }

  // -------------------------------
  // Prevent removing employees who still have active tasks
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

  const oldMembers = project.members.map((id) => id.toString());

  const addedMembers = uniqueMembers.filter(
    (id) => !oldMembers.includes(id.toString()),
  );

  const removedMemberIds = oldMembers.filter(
    (id) => !uniqueMembers.includes(id.toString()),
  );

  // Save managers + selected employees
  project.members = uniqueMembers;
  project.updatedBy = req.user.userId;

  await project.save();

  const addedManagers = await User.find({
    _id: { $in: addedMembers },
    role: ROLES.MANAGER,
    isActive: true,
  }).select("_id");

  const removedManagers = await User.find({
    _id: { $in: removedMemberIds },
    role: ROLES.MANAGER,
  }).select("_id");

  for (const manager of addedManagers) {
    const recipients = await getProjectNotificationRecipients({
      type: NOTIFICATION_TYPE.PROJECT_MEMBER_ADDED,
      project,
      actor: req.user.userId,
      addedManager: manager._id,
    });

    for (const user of recipients) {
      await createNotification({
        user,
        title: "Added to Project",
        message: `You have been added to project "${project.name}".`,
        type: NOTIFICATION_TYPE.PROJECT_MEMBER_ADDED,
        project: project._id,
      });
    }
  }

  for (const manager of removedManagers) {
    const recipients = await getProjectNotificationRecipients({
      type: NOTIFICATION_TYPE.PROJECT_MEMBER_REMOVED,
      project,
      actor: req.user.userId,
      removedManager: manager._id,
    });

    for (const user of recipients) {
      await createNotification({
        user,
        title: "Removed from Project",
        message: `You have been removed from project "${project.name}".`,
        type: NOTIFICATION_TYPE.PROJECT_MEMBER_REMOVED,
        project: project._id,
      });
    }
  }

  const updatedProject = await Project.findById(project._id)
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
    })
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

  const accessFilter = getProjectFilter(req.user);

  const project = await Project.findOne({
    _id: id,
    ...accessFilter,
  }).populate({
    path: "members",
    select: "name email employeeId role isActive department designation",
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

  const accessFilter = getProjectFilter(req.user);

  const project = await Project.findOne({
    _id: id,
    ...accessFilter,
  }).select("members");

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
  updateProjectMembers,
  getProjectMembers,
  getAvailableEmployees,
};
