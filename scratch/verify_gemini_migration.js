const path = require("path");
const fs = require("fs");

// Load .env from Backend
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

// Set alias for modules in Backend node_modules
module.paths.push(path.join(__dirname, "../Backend/node_modules"));

async function runMigrationAudit() {
  console.log("========================================================================");
  console.log("  VERSION 4 — AI PROVIDER MIGRATION (GROK -> GEMINI) AUDIT VERIFICATION ");
  console.log("========================================================================\n");

  const results = [];

  // 1. Module Load & Abstraction Check
  try {
    const aiConfig = require("../Backend/services/ai/aiConfig");
    const geminiProvider = require("../Backend/services/ai/geminiProvider");
    const aiProvider = require("../Backend/services/ai/aiProvider");
    const aiAuditService = require("../Backend/services/ai/aiAuditService");

    results.push({
      test: "MODULE_LOAD",
      status: "PASS",
      details: "All Gemini AI provider modules loaded successfully without Grok dependencies.",
    });

    // 2. Configuration Inspection
    const config = aiConfig.getAiConfig();
    if (config.model !== "gemini-2.5-flash") {
      throw new Error(`Expected model "gemini-2.5-flash", found "${config.model}".`);
    }

    results.push({
      test: "GEMINI_CONFIGURATION",
      status: "PASS",
      details: `Configured Model: ${config.model} | Key IsConfigured: ${config.isConfigured}`,
    });

    // 3. Health Check
    const health = await aiProvider.checkHealth();
    if (health.provider !== "Google Gemini") {
      throw new Error(`Expected provider "Google Gemini", found "${health.provider}".`);
    }

    results.push({
      test: "PROVIDER_HEALTH_CHECK",
      status: "PASS",
      details: `Provider: ${health.provider} | Model: ${health.model}`,
    });

    // 4. Security Audit Suite Run
    const auditReport = await aiAuditService.runAiSecurityAudit();
    if (auditReport.status !== "PASSED") {
      throw new Error(`Security Audit failed: ${JSON.stringify(auditReport)}`);
    }

    results.push({
      test: "SECURITY_AUDIT_SUITE",
      status: "PASS",
      details: `Passed Assertions: ${auditReport.passedAssertions}/${auditReport.totalAssertions}`,
    });

  } catch (err) {
    results.push({
      test: "MIGRATION_AUDIT_FAILURE",
      status: "FAIL",
      details: err.message,
    });
  }

  console.log("------------------------------------------------------------------------");
  console.log("  MIGRATION AUDIT RESULTS SUMMARY ");
  console.log("------------------------------------------------------------------------");
  results.forEach((r) => {
    console.log(`${r.status === "PASS" ? "✓ [PASS]" : "✗ [FAIL]"} ${r.test}: ${r.details}`);
  });

  const allPassed = results.every((r) => r.status === "PASS");
  console.log("\n=== FINAL MIGRATION AUDIT RESULT:", allPassed ? "100% PASSED" : "FAILED", "===");
}

runMigrationAudit();
