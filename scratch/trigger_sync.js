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

require("../Backend/models/User");
require("../Backend/models/Project");
require("../Backend/models/Phase");
require("../Backend/models/Task");
require("../Backend/models/Submission");

const User = require("../Backend/models/User");
const { ROLES } = require("../Backend/constants/constants");
const { getAllSubmissions } = require("../Backend/services/submission/submissionQueryService");

async function triggerSync() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager";
  await mongoose.connect(uri);

  try {
    const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });
    const req = {
      query: {},
      user: { userId: admin._id.toString(), role: ROLES.ADMIN },
    };
    const res = { status: () => res, json: (data) => data };
    await getAllSubmissions(req, res);
    console.log("Triggered getAllSubmissions sync successfully.");
  } catch (err) {
    console.error("Sync error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

triggerSync();
