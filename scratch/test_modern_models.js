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

async function testModernModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const candidateModels = [
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
  ];

  for (const model of candidateModels) {
    try {
      console.log(`Testing model: "${model}"...`);
      const res = await ai.models.generateContent({
        model,
        contents: "Hello, respond with JSON: {\"status\": \"ok\"}",
        config: { responseMimeType: "application/json" },
      });
      console.log(`Model "${model}" SUCCESS:`, res.text ? res.text.trim() : "No text");
    } catch (err) {
      console.error(`Model "${model}" FAILED:`, err.message || err);
    }
  }
}

testModernModels();
