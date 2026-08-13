const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
const { generateReportPdfBuffer } = require("../Backend/services/ai/pdfReportGenerator");

async function testMultiPagePdf() {
  const largeMockPayload = {
    success: true,
    report: {
      reportType: "EMPLOYEE_PERFORMANCE",
      generatedAt: new Date().toISOString(),
      viewer: { userId: "user123", role: "EMPLOYEE" },
      subject: { name: "John Doe" },
      sourceMetrics: {
        totalTasks: 120,
        activeTasks: 45,
        completedTasks: 70,
        completionRate: 65,
        overdueTasks: 5,
        pendingReviews: 10,
        departmentCount: 4,
        managerCount: 3,
      },
      aiAnalysis: {
        reportType: "EMPLOYEE_PERFORMANCE",
        summary: "John Doe has demonstrated consistent performance across core project responsibilities. Operational velocity remains steady, though overdue items in backend tasks require attention to maintain overall team delivery timelines.",
        companyHealth: "good",
        performanceTrends: "improving",
        whatsGoingWell: [
          "Completed 70 high-priority tasks in the current evaluation cycle.",
          "Maintained an effective 65% completion rate across complex project assignments.",
          "Strong engagement with cross-functional team members on daily code reviews.",
          "Consistently high quality on code deliverables with minimal bug regressions."
        ],
        attentionAreas: [
          "5 tasks are currently past their scheduled target completion date.",
          "10 items awaiting managerial review and feedback approval.",
          "High workload concentration in backend infrastructure modules."
        ],
        recommendations: [
          "Prioritize immediate closure of the 5 overdue backend tasks.",
          "Schedule daily 15-minute sync with engineering manager to clear pending reviews.",
          "Rebalance complex infrastructure tasks across team members to reduce burnout risk.",
          "Implement automated reminder notifications 24 hours prior to deadline target dates."
        ],
        evidence: [
          "Total active task workload: 45 concurrent tasks.",
          "Average review turnaround time: 3.2 days.",
          "Task resolution velocity: 14 tasks per week."
        ],
      },
    },
  };

  const pdfBuffer = await generateReportPdfBuffer(largeMockPayload);
  fs.writeFileSync(path.join(__dirname, "multipage_sample.pdf"), pdfBuffer);
  console.log(`✓ Multi-page PDF generated successfully: ${pdfBuffer.length} bytes`);
}

testMultiPagePdf();
