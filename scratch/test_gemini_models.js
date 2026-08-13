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

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing API Key starting with:", apiKey ? apiKey.substring(0, 10) + "..." : "NONE");

  const ai = new GoogleGenAI({ apiKey });

  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-flash",
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: "${model}"...`);
      const res = await ai.models.generateContent({
        model,
        contents: "Hello",
      });
      console.log(`Model "${model}" SUCCESS:`, res.text ? res.text.trim() : "No text output");
    } catch (err) {
      console.error(`Model "${model}" FAILED:`, err.message || err);
    }
  }
}

testGeminiModels();
