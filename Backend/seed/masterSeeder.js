require("dotenv").config();

const mongoose = require("mongoose");

const Department = require("../models/Department");
const Designation = require("../models/Designation");

const departments = [
  { name: "Engineering", code: "ENG" },
  { name: "Development", code: "DEV" },
  { name: "Quality Assurance", code: "QA" },
  { name: "Human Resources", code: "HR" },
  { name: "Finance", code: "FIN" },
  { name: "Sales", code: "SAL" },
  { name: "Marketing", code: "MKT" },
];

const designations = {
  ENG: [{ name: "Team Lead", code: "TL" }],

  DEV: [
    { name: "Frontend Developer", code: "FE" },
    { name: "Backend Developer", code: "BE" },
    { name: "Full Stack Developer", code: "FSD" },
    { name: "UI/UX Designer", code: "UIUX" },
    { name: "Project Manager", code: "PM" },
  ],

  QA: [
    { name: "QA Engineer", code: "QAE" },
    { name: "Senior QA Engineer", code: "SQA" },
    { name: "Automation Tester", code: "AT" },
  ],

  HR: [
    { name: "HR Executive", code: "HRE" },
    { name: "HR Manager", code: "HRM" },
    { name: "Recruiter", code: "REC" },
  ],

  FIN: [
    { name: "Accountant", code: "ACC" },
    { name: "Finance Executive", code: "FEX" },
  ],

  SAL: [
    { name: "Sales Executive", code: "SE" },
    { name: "Sales Manager", code: "SM" },
  ],

  MKT: [
    { name: "Marketing Executive", code: "ME" },
    { name: "Digital Marketing Executive", code: "DME" },
  ],
};

const seedMasters = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    await Designation.deleteMany();
    await Department.deleteMany();

    const departmentMap = {};

    for (const dept of departments) {
      const created = await Department.create(dept);
      departmentMap[dept.code] = created._id;
    }

    const designationDocs = [];

    for (const departmentCode in designations) {
      for (const designation of designations[departmentCode]) {
        designationDocs.push({
          ...designation,
          department: departmentMap[departmentCode],
        });
      }
    }

    await Designation.insertMany(designationDocs);

    console.log("Masters seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedMasters();
