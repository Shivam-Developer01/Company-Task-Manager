const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const mongoose = require(path.join(__dirname, "../Backend/node_modules/mongoose"));

const envPath = path.join(__dirname, "../Backend/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const Task = require("../Backend/models/Task");
const Submission = require("../Backend/models/Submission");
const User = require("../Backend/models/User");
const { TASK_STATUS, SUBMISSION_STATUS } = require("../Backend/constants/constants");

async function checkOrphanedSubmissions() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    console.log("Checking DB for pending submissions with non-SUBMITTED tasks...");
    const pendingSubs = await Submission.find({ status: SUBMISSION_STATUS.PENDING_REVIEW }).populate("task submittedBy");
    
    console.log(`Found ${pendingSubs.length} pending review submissions.`);
    
    let mismatchedCount = 0;
    for (const sub of pendingSubs) {
      if (!sub.task) {
        console.log(`Submission ${sub._id} has missing task!`);
        continue;
      }
      
      const isEmployeeActive = sub.submittedBy ? sub.submittedBy.isActive : false;
      console.log(`Sub ID: ${sub._id}, Task ID: ${sub.task._id}, Task Status: "${sub.task.status}", SubmittedBy Active: ${isEmployeeActive}`);
      
      if (sub.task.status !== TASK_STATUS.SUBMITTED) {
        mismatchedCount++;
        console.error(`MISMATCH DETECTED: Task ${sub.task._id} has status "${sub.task.status}" but has pending submission ${sub._id}!`);
      }
    }
    
    console.log(`Total mismatches: ${mismatchedCount}`);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrphanedSubmissions();
