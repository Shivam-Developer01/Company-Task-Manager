const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../db/connect");
const User = require("../models/User");
const Department = require("../models/Department");
const Designation = require("../models/Designation");

const seedManager = async () => {
  try {
    await connectDB();

    const existingManager = await User.findOne({
      email: "manager2@example.com",
    });

    if (existingManager) {
      console.log("Manager already exists.");
      process.exit();
    }

    const department = await Department.findOne({
      name: "Engineering",
    });

    if (!department) {
      throw new Error("Management department not found. Run masterSeeder first.");
    }

    const designation = await Designation.findOne({
      name: "Team Lead",
      department: department._id,
    });

    if (!designation) {
      throw new Error(
        "Project Manager designation not found. Run masterSeeder first."
      );
    }

    const password = await bcrypt.hash("Manager2@123", 10);

    await User.create({
      name: "Manager",
      email: "manager2@example.com",
      password,
      employeeId: "EMP100",
      department: department._id,
      designation: designation._id,
      role: "manager",
      mustChangePassword: false,
      isActive: true,
    });

    console.log("✅ Manager seeded successfully.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedManager();