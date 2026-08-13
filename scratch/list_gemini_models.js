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

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Listing available models for key...");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("HTTP status:", res.status);
    if (data.models) {
      console.log("Found models:");
      data.models.forEach((m) => {
        if (m.supportedGenerationMethods?.includes("generateContent")) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log("Response data:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("ListModels failed:", err);
  }
}

listModels();
