const path = require("path");
const fs = require("fs");

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

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const { GoogleGenAI } = require("@google/genai");
const { ADMIN_COMPANY_PERFORMANCE_REPORT_SCHEMA } = require("../Backend/services/ai/aiReportConfig");

async function testGeminiSchema() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an executive AI organizational strategy analyst.
Respond ONLY with valid JSON matching this schema:
${JSON.stringify(ADMIN_COMPANY_PERFORMANCE_REPORT_SCHEMA, null, 2)}`;

  const userPrompt = "Analyze company metrics. Active Employees: 5, Active Projects: 2, Completion Rate: 85%.";

  console.log("Testing generateContent with schema in systemInstruction...");
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    console.log("Raw Response Text:\n", res.text);
    const parsed = JSON.parse(res.text);
    console.log("\nParsed Keys:", Object.keys(parsed));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testGeminiSchema();
