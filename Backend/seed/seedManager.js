const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../db/connect");
const User = require("../models/User");

const seedManager = async () => {
  try {
    await connectDB();

    const existingManager = await User.findOne({
      email: "manager1@example.com",
    });

    if (existingManager) {
      process.exit();
    }

    const password = await bcrypt.hash("Manager1@123", 10);

    await User.create({
      name: "Manager",
      email: "manager1@example.com",
      password,
      employeeId: "EMP000",
      department: "Management",
      designation: "Project Manager",
      role: "manager",
      mustChangePassword: false,
    });
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

seedManager();