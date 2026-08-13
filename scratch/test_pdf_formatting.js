const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");

async function testPdfFormatting() {
  console.log("Testing PDF Formatting Engine with Mock Payload...");

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
      },
      aiAnalysis: {
        reportType: "ADMIN_COMPANY_PERFORMANCE",
        summary: "The company maintains stable operational momentum with a 78% completion rate across active project streams. Key bottlenecks remain around pending review queues in engineering.",
        companyHealth: "stable",
        whatsGoingWell: [
          "Completion rate stands at a healthy 78% across 42 total tasks",
          "Strong cross-department collaboration on major deliverables"
        ],
        attentionAreas: [
          "3 tasks are currently overdue and require immediate manager re-assignment",
          "Pending review queue has grown to 4 tasks, creating a review bottleneck"
        ],
        departmentInsights: [
          "Engineering department shows highest task throughput but active review backlogs."
        ],
        managerInsights: [
          "Leadership should focus on streamlining approval workflows to clear bottlenecks."
        ],
        recommendations: [
          "Re-allocate unassigned tasks from overloaded staff to available team members",
          "Set 24-hour review SLA for pending submissions to unblock project progress"
        ],
        evidence: [
          "Total active tasks: 18",
          "Overdue rate: 7.1%"
        ],
        insufficientData: false
      }
    }
  };

  const buffer = await generateReportPdfBuffer(mockPayload);
  const pdfPath = path.join(__dirname, "sample_formatted_report.pdf");
  fs.writeFileSync(pdfPath, buffer);

  console.log(`✓ PDF Generated Successfully! Size: ${buffer.length} bytes`);
  console.log(`✓ Saved to: ${pdfPath}`);
}

testPdfFormatting();
