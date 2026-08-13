const path = require("path");
const fs = require("fs");
const mongoose = require(path.join(__dirname, "../Backend/node_modules/mongoose"));

module.paths.push(path.join(__dirname, "../Backend/node_modules"));

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

const { exportAiReportDocument } = require("../Backend/services/ai/aiReportExportService");
const { generateAiReport } = require("../Backend/services/ai/aiReportService");
const { ROLES } = require("../Backend/constants/constants");
const geminiProvider = require("../Backend/services/ai/geminiProvider");

async function runPhase16ExportVerification() {
  console.log("========================================================================");
  console.log("    VERSION 4 — PHASE 16 (AI REPORT EXPORT PDF + DOCX) AUDIT SUITE      ");
  console.log("========================================================================\n");

  const results = [];
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected.");

  const adminViewer = { userId: "60d5ecb8b5c9c82b9c8b4567", role: ROLES.ADMIN };
  const employeeViewer = { userId: "60d5ecb8b5c9c82b9c8b9999", role: ROLES.EMPLOYEE };

  const reportTypes = [
    "ADMIN_COMPANY_PERFORMANCE",
    "EMPLOYEE_PERFORMANCE",
    "MANAGER_TEAM_PERFORMANCE",
  ];

  for (const reportType of reportTypes) {
    try {
      console.log(`\nGenerating reference report payload for "${reportType}"...`);
      const reportPayload = await generateAiReport({
        viewer: adminViewer,
        reportType,
      });

      // Track Gemini call count
      let geminiCalledDuringExport = false;
      const originalGenerateText = geminiProvider.generateText;
      geminiProvider.generateText = async (...args) => {
        geminiCalledDuringExport = true;
        return originalGenerateText.apply(geminiProvider, args);
      };

      // 1. PDF Export Test
      const pdfResult = await exportAiReportDocument({
        viewer: adminViewer,
        format: "pdf",
        reportPayload,
      });

      const isPdfHeaderValid = pdfResult.buffer.toString("utf8", 0, 5) === "%PDF-";
      if (!isPdfHeaderValid || pdfResult.buffer.length === 0) {
        throw new Error(`Invalid PDF header or 0 byte buffer for ${reportType}`);
      }

      results.push({
        test: `${reportType}_PDF_EXPORT`,
        status: "PASS",
        details: `PDF Size: ${pdfResult.buffer.length} bytes | File: ${pdfResult.fileName} | MIME: ${pdfResult.contentType}`,
      });

      // 2. DOCX Export Test
      const docxResult = await exportAiReportDocument({
        viewer: adminViewer,
        format: "docx",
        reportPayload,
      });

      // DOCX starts with PK\x03\x04 zip header
      const isDocxHeaderValid = docxResult.buffer[0] === 0x50 && docxResult.buffer[1] === 0x4b;
      if (!isDocxHeaderValid || docxResult.buffer.length === 0) {
        throw new Error(`Invalid DOCX header or 0 byte buffer for ${reportType}`);
      }

      results.push({
        test: `${reportType}_DOCX_EXPORT`,
        status: "PASS",
        details: `DOCX Size: ${docxResult.buffer.length} bytes | File: ${docxResult.fileName} | MIME: ${docxResult.contentType}`,
      });

      // 3. Assert ZERO Gemini LLM Calls during export
      if (geminiCalledDuringExport) {
        throw new Error(`Gemini LLM API was called during document export for ${reportType}!`);
      }

      results.push({
        test: `${reportType}_ZERO_GEMINI_CALLS`,
        status: "PASS",
        details: "0 Gemini LLM requests executed during PDF/DOCX generation.",
      });

      // Restore original geminiProvider function
      geminiProvider.generateText = originalGenerateText;

    } catch (err) {
      results.push({
        test: `${reportType}_EXPORT_TEST`,
        status: "FAIL",
        details: err.message,
      });
    }
  }

  // 4. Security & Authorization Test (Employee attempting Admin Report export)
  try {
    const adminReportPayload = await generateAiReport({
      viewer: adminViewer,
      reportType: "ADMIN_COMPANY_PERFORMANCE",
    });

    let unauthorizedCaught = false;
    try {
      await exportAiReportDocument({
        viewer: employeeViewer,
        format: "pdf",
        reportPayload: adminReportPayload,
      });
    } catch (err) {
      if (err.statusCode === 403) {
        unauthorizedCaught = true;
      }
    }

    if (!unauthorizedCaught) {
      throw new Error("Employee was able to export Admin report without 403 error!");
    }

    results.push({
      test: "UNAUTHORIZED_EXPORT_REJECTION",
      status: "PASS",
      details: "HTTP 403 Forbidden correctly returned when role lacks export authorization.",
    });
  } catch (err) {
    results.push({
      test: "UNAUTHORIZED_EXPORT_REJECTION",
      status: "FAIL",
      details: err.message,
    });
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");

  console.log("------------------------------------------------------------------------");
  console.log("  PHASE 16 AUDIT RESULTS SUMMARY ");
  console.log("------------------------------------------------------------------------");
  results.forEach((r) => {
    console.log(`${r.status === "PASS" ? "✓ [PASS]" : "✗ [FAIL]"} ${r.test}: ${r.details}`);
  });

  const allPassed = results.every((r) => r.status === "PASS");
  console.log("\n=== FINAL PHASE 16 EXPORT AUDIT RESULT:", allPassed ? "100% PASSED" : "FAILED", "===");
}

runPhase16ExportVerification();
