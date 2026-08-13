const fs = require("fs");
const path = require("path");

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

async function testModels() {
  const apiKey = process.env.XAI_API_KEY;
  const baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

  const candidateModels = [
    "grok-3",
    "grok-3-latest",
    "grok-3-mini",
    "grok-3-fast",
    "grok-2",
    "grok-2-latest",
    "grok-2-1212",
    "grok-2-20241212",
    "grok-beta",
    "grok-vision-beta",
    "grok-code-fast",
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        }),
      });
      const body = await res.json();
      console.log(`Model "${model.padEnd(20)}" -> HTTP ${res.status}: ${JSON.stringify(body)}`);
    } catch (err) {
      console.error(`Model "${model}" -> Error:`, err.message);
    }
  }
}

testModels();
