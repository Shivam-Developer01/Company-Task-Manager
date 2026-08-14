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

const User = require("../Backend/models/User");
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { ROLES } = require("../Backend/constants/constants");

async function inspectAiOutput() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminUser = await User.findOne({ role: ROLES.ADMIN }).lean();
  const adminViewer = { userId: adminUser._id.toString(), role: ROLES.ADMIN };

  const res = await generateAiReport({
    viewer: adminViewer,
    reportType: "EMPLOYEE_PERFORMANCE",
    targetSubjectId: "all_employees",
  });

  console.log("--- AI ANALYSIS KEYS ---");
  console.log(Object.keys(res.report.aiAnalysis));
  console.log("\n--- positiveDevelopments ---");
  console.log(JSON.stringify(res.report.aiAnalysis.positiveDevelopments, null, 2));
  console.log("\n--- whatsGoingWell ---");
  console.log(JSON.stringify(res.report.aiAnalysis.whatsGoingWell, null, 2));
  console.log("\n--- keyStrengths ---");
  console.log(JSON.stringify(res.report.aiAnalysis.keyStrengths, null, 2));

  await mongoose.disconnect();
}

inspectAiOutput();
