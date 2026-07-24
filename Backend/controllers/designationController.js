const Designation = require("../models/Designation");
const Department = require("../models/Department");
const CustomError = require("../errors/CustomError");

// Create Designation
const createDesignation = async (req, res) => {
  const { name, code, department } = req.body;

  const departmentExists = await Department.findOne({
    _id: department,
    isActive: true,
  });

  if (!departmentExists) {
    throw new CustomError("Department not found", 404);
  }

  const exists = await Designation.findOne({
    department,
    $or: [{ name: new RegExp(`^${name}$`, "i") }, { code: code.toUpperCase() }],
  });

  if (exists) {
    throw new CustomError(
      "Designation name or code already exists in this department",
      409,
    );
  }

  const designation = await Designation.create({
    name,
    code: code.toUpperCase(),
    department,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    message: "Designation created successfully",
    data: designation,
  });
};

// Get All Designations
const getDesignations = async (req, res) => {
  const {
    search,
    department,
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

  if (department) {
    query.department = department;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (page - 1) * Number(limit);

  const designations = await Designation.find(query)
    .populate("department", "name code")
    .sort({
      [sort]: order === "asc" ? 1 : -1,
    })
    .skip(skip)
    .limit(Number(limit));

  const totalDesignations = await Designation.countDocuments(query);

  res.status(200).json({
    success: true,
    totalDesignations,
    currentPage: Number(page),
    totalPages: Math.ceil(totalDesignations / Number(limit)),
    count: designations.length,
    data: designations,
  });
};

// Get Designation By Id
const getDesignationById = async (req, res) => {
  const designation = await Designation.findById(req.params.id).populate(
    "department",
    "name code",
  );

  if (!designation) {
    throw new CustomError("Designation not found", 404);
  }

  res.status(200).json({
    success: true,
    data: designation,
  });
};

// Update Designation
const updateDesignation = async (req, res) => {
  const { name, code, department } = req.body;

  const designation = await Designation.findById(req.params.id);

  if (!designation) {
    throw new CustomError("Designation not found", 404);
  }

  if (department) {
    const departmentExists = await Department.findOne({
      _id: department,
      isActive: true,
    });

    if (!departmentExists) {
      throw new CustomError("Department not found", 404);
    }

    designation.department = department;
  }

  if (name && name !== designation.name) {
    const exists = await Designation.findOne({
      _id: { $ne: designation._id },
      department: designation.department,
      name: new RegExp(`^${name}$`, "i"),
    });

    if (exists) {
      throw new CustomError(
        "Designation name already exists in this department",
        409,
      );
    }

    designation.name = name;
  }

  if (code && code.toUpperCase() !== designation.code) {
    const exists = await Designation.findOne({
      _id: { $ne: designation._id },
      department: designation.department,
      code: code.toUpperCase(),
    });

    if (exists) {
      throw new CustomError(
        "Designation code already exists in this department",
        409,
      );
    }

    designation.code = code.toUpperCase();
  }

  designation.updatedBy = req.user.userId;

  await designation.save();

  res.status(200).json({
    success: true,
    message: "Designation updated successfully",
    data: designation,
  });
};

// Toggle Status
const toggleDesignationStatus = async (req, res) => {
  const designation = await Designation.findById(req.params.id);

  if (!designation) {
    throw new CustomError("Designation not found", 404);
  }

  designation.isActive = !designation.isActive;
  designation.updatedBy = req.user.userId;

  await designation.save();

  res.status(200).json({
    success: true,
    message: `Designation ${
      designation.isActive ? "activated" : "deactivated"
    } successfully`,
    data: designation,
  });
};

module.exports = {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  toggleDesignationStatus,
};
