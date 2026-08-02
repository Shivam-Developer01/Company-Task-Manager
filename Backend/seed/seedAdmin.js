const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../db/connect");
const User = require("../models/User");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const { ROLES } = require("../constants/constants");

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      role: ROLES.ADMIN,
    });

    if (existingAdmin) {
      console.log("Admin already exists.");
      process.exit();
    }

    const department = await Department.findOne({
      name: "Engineering",
    });

    if (!department) {
      throw new Error(
        "Engineering department not found. Run masterSeeder first.",
      );
    }

    const designation = await Designation.findOne({
      name: "Team Lead",
      department: department._id,
    });

    if (!designation) {
      throw new Error(
        "Team Lead designation not found. Run masterSeeder first.",
      );
    }

    const password = await bcrypt.hash("Admin@123", 10);

    await User.create({
      name: "Administrator",
      email: "admin@gmail.com",
      password,
      employeeId: "ADM001",
      department: department._id,
      designation: designation._id,
      role: ROLES.ADMIN,
      mustChangePassword: false,
      isActive: true,
    });

    console.log("✅ Admin seeded successfully.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();
