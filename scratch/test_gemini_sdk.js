const path = require("path");
const { GoogleGenAI } = require(path.join(__dirname, "../Backend/node_modules/@google/genai"));

console.log("GoogleGenAI class:", typeof GoogleGenAI);
try {
  const ai = new GoogleGenAI({ apiKey: "test_dummy_key" });
  console.log("ai instance created successfully.");
  console.log("ai.models:", typeof ai.models);
  console.log("ai.models.generateContent:", typeof ai.models?.generateContent);
} catch (err) {
  console.error("Initialization error:", err);
}
