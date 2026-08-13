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

const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { ROLES } = require("../Backend/constants/constants");

async function testAllReports() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected. Testing AI Report Generation with Gemini provider...");

  const adminViewer = { userId: "60d5ecb8b5c9c82b9c8b4567", role: ROLES.ADMIN };

  const reportTypes = [
    "ADMIN_COMPANY_PERFORMANCE",
    "EMPLOYEE_PERFORMANCE",
    "MANAGER_TEAM_PERFORMANCE",
  ];

  for (const reportType of reportTypes) {
    console.log(`\nGenerating report: "${reportType}"...`);
    try {
      const result = await generateAiReport({
        viewer: adminViewer,
        reportType,
      });
      console.log(`Report "${reportType}" SUCCESS!`);
      console.log("Metadata:", JSON.stringify(result.metadata, null, 2));
      console.log("Keys in aiAnalysis:", Object.keys(result.report.aiAnalysis || {}));
      console.log("reportType in aiAnalysis:", result.report.aiAnalysis.reportType);
    } catch (err) {
      console.error(`Report "${reportType}" FAILED:`, err.message || err);
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

testAllReports();
