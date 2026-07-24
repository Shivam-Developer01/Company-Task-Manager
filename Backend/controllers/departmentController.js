const Department = require("../models/Department");
const CustomError = require("../errors/CustomError");

const createDepartment = async (req, res) => {
  const { name, code } = req.body;

  const exists = await Department.findOne({
    $or: [{ name: new RegExp(`^${name}$`, "i") }, { code: code.toUpperCase() }],
  });

  if (exists) {
    throw new CustomError("Department name or code already exists", 409);
  }

  const department = await Department.create({
    name,
    code,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    data: department,
  });
};

const getDepartments = async (req, res) => {
  const {
    search,
    isActive,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (page - 1) * Number(limit);

  const departments = await Department.find(query)
    .sort({ [sort]: order === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(Number(limit));

  const totalDepartments = await Department.countDocuments(query);

  res.status(200).json({
    success: true,
    totalDepartments,
    currentPage: Number(page),
    totalPages: Math.ceil(totalDepartments / Number(limit)),
    count: departments.length,
    data: departments,
  });
};

const getDepartmentById = async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    throw new CustomError("Department not found", 404);
  }

  res.status(200).json({
    success: true,
    data: department,
  });
};

const updateDepartment = async (req, res) => {
  const { name, code } = req.body;

  const department = await Department.findById(req.params.id);

  if (!department) {
    throw new CustomError("Department not found", 404);
  }

  if (name && name !== department.name) {
    const exists = await Department.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (exists) {
      throw new CustomError("Department name already exists", 409);
    }

    department.name = name;
  }

  if (code && code !== department.code) {
    const exists = await Department.findOne({
      code: code.toUpperCase(),
    });

    if (exists) {
      throw new CustomError("Department code already exists", 409);
    }

    department.code = code.toUpperCase();
  }

  department.updatedBy = req.user.userId;

  await department.save();

  res.status(200).json({
    success: true,
    message: "Department updated successfully",
    data: department,
  });
};

const toggleDepartmentStatus = async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    throw new CustomError("Department not found", 404);
  }

  department.isActive = !department.isActive;
  department.updatedBy = req.user.userId;

  await department.save();

  res.status(200).json({
    success: true,
    message: `Department ${
      department.isActive ? "activated" : "deactivated"
    } successfully`,
    data: department,
  });
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
};
