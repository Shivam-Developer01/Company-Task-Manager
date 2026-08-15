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
const { TASK_STATUS, SUBMISSION_STATUS } = require("../Backend/constants/constants");

async function repairDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const pendingSubs = await Submission.find({ status: SUBMISSION_STATUS.PENDING_REVIEW });
    console.log(`Checking ${pendingSubs.length} pending review submissions...`);

    let repairedCount = 0;
    for (const sub of pendingSubs) {
      const task = await Task.findById(sub.task);
      if (task && task.status !== TASK_STATUS.SUBMITTED) {
        console.log(`Repairing Task ${task._id} (old status: "${task.status}") -> setting to "${TASK_STATUS.SUBMITTED}"`);
        task.status = TASK_STATUS.SUBMITTED;
        await task.save();
        repairedCount++;
      }
    }
    console.log(`Successfully repaired ${repairedCount} tasks.`);
  } catch (err) {
    console.error("Repair error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

repairDB();
