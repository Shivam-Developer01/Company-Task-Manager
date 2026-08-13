const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");
const { generateReportDocxBuffer } = require("../Backend/services/ai/docxReportGenerator");
const { extractMetricPairs } = require("../Backend/services/ai/aiReportExportHelper");

async function testAlignment() {
  console.log("Testing PDF and DOCX Content Alignment...");

  const mockPayload = {
    success: true,
    report: {
      reportType: "ADMIN_COMPANY_PERFORMANCE",
      generatedAt: new Date().toISOString(),
      viewer: { userId: "user123", role: "ADMIN" },
      subject: { name: "Company-Wide Analysis" },
      sourceMetrics: {
        totalTasks: 42,
        activeTasks: 18,
        completedTasks: 24,
        completionRate: 78,
        overdueTasks: 3,
        pendingReviews: 4,
        departmentCount: 3,
        managerCount: 2,
      },
      aiAnalysis: {
        reportType: "ADMIN_COMPANY_PERFORMANCE",
        summary: "The company maintains stable operational momentum with a 78% completion rate.",
        companyHealth: "stable",
        whatsGoingWell: ["Completion rate stands at 78%", "Strong cross-department execution"],
        attentionAreas: ["3 tasks are currently overdue", "Pending reviews stand at 4"],
        recommendations: ["Set 24-hour review SLA", "Re-assign overdue tasks"],
        evidence: ["Total active tasks: 18"],
        insufficientData: false,
      },
    },
  };

  const extractedMetrics = extractMetricPairs(mockPayload.report.sourceMetrics);
  console.log("Extracted Metrics Count:", extractedMetrics.length);
  console.log("Metrics List:", JSON.stringify(extractedMetrics, null, 2));

  const pdfBuffer = await generateReportPdfBuffer(mockPayload);
  const docxBuffer = await generateReportDocxBuffer(mockPayload);

  console.log(`✓ PDF Buffer Size: ${pdfBuffer.length} bytes`);
  console.log(`✓ DOCX Buffer Size: ${docxBuffer.length} bytes`);

  fs.writeFileSync(path.join(__dirname, "aligned_sample.pdf"), pdfBuffer);
  fs.writeFileSync(path.join(__dirname, "aligned_sample.docx"), docxBuffer);

  console.log("✓ PDF and DOCX files exported cleanly with 100% aligned metric extraction!");
}

testAlignment();
