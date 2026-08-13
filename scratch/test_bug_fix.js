const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");

async function testBugFix() {
  console.log("Testing PDF layout bug fix with manager analytics payload...");

  const mockBugPayload = {
    success: true,
    report: {
      reportType: "MANAGER_TEAM_PERFORMANCE",
      generatedAt: new Date().toISOString(),
      viewer: { userId: "manager123", role: "MANAGER" },
      subject: { name: "Engineering Team" },
      sourceMetrics: {
        teamSize: 3,
        totalActiveTasks: 3,
        totalOverdueTasks: 1,
        pendingReviewCount: 3,
        teamTaskCompletion: 50,
        dataAvailable: true,
        structuredFieldUsed: "Task Priority Tiers & Project Scope",
        limitationNotice:
          "Task categories/tags are not defined in the current database schema. Intelligence is derived deterministically from Priority execution tiers and Project domains without NLP or AI guessing.",
      },
      aiAnalysis: {
        reportType: "MANAGER_TEAM_PERFORMANCE",
        summary:
          "The team currently has a task completion rate of 50% across 3 members. There are immediate concerns regarding overdue tasks and a backlog of pending reviews waiting for manager verification. Workload distribution is uneven, with Aditi Singh carrying 66.67% of the active team workload.",
        companyHealth: "stable",
        whatsGoingWell: ["Team size is active with 3 members"],
        attentionAreas: ["1 task is overdue"],
        recommendations: ["Clear pending reviews"],
        evidence: ["Active tasks count: 3"],
      },
    },
  };

  const pdfBuffer = await generateReportPdfBuffer(mockBugPayload);
  fs.writeFileSync(path.join(__dirname, "bug_fix_sample.pdf"), pdfBuffer);
  console.log(`✓ PDF generated successfully: ${pdfBuffer.length} bytes`);
}

testBugFix();
