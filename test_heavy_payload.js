const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "Backend/node_modules"));
const { generateReportPdfBuffer } = require("./Backend/services/ai/pdfReportGenerator");

async function testHeavyPayload() {
  console.log("Testing heavy multi-page payload (admin/manager reports)...\n");

  const payload = {
    success: true,
    report: {
      reportType: "ADMIN_COMPANY_PERFORMANCE",
      generatedAt: new Date().toISOString(),
      viewer: { userId: "admin1", role: "admin" },
      subject: { name: "Company Wide" },
      sourceMetrics: {
        totalTasks: 142,
        activeTasks: 38,
        completedTasks: 89,
        overdueTasks: 15,
        pendingReviewTasks: 12,
        completionRate: 62.7,
        departmentCount: 5,
        teamSize: 28,
      },
      aiAnalysis: {
        reportType: "ADMIN_COMPANY_PERFORMANCE",
        executiveSummary: "The company currently operates at a 62.7% overall task completion rate across 5 departments with 28 active team members. While the completion baseline is moderate, there are 15 overdue tasks and 12 items pending review, indicating pipeline bottlenecks requiring immediate managerial attention. The engineering and product teams show the strongest output, while the operations department has the highest overdue concentration.",
        companyHealth: "moderate",
        performanceTrends: "improving",
        keyStrengths: [
          "Engineering department achieved 85% on-time delivery rate this quarter.",
          "Product team completed all sprint deliverables within the allotted timeline.",
          "28 active contributors maintain consistent daily submission rates.",
          "Overall task volume increased 18% compared to the previous period without proportional increase in overdue counts.",
          "Cross-departmental collaboration improved, with 12 cross-team tasks completed successfully."
        ],
        majorRisks: [
          "Operations department has 9 out of 15 total overdue tasks concentrated in 2 project pipelines.",
          "12 tasks in pending review state indicate reviewer bottleneck — average review cycle is 4.2 days.",
          "3 high-priority tasks are past their escalation threshold without manager acknowledgment.",
          "Two departments have zero completed tasks in the last 7 days, suggesting potential resource allocation issues.",
          "Completion rate of 62.7% is below the organizational target of 75% for this quarter."
        ],
        attentionAreas: [
          "Escalate the 3 high-priority overdue tasks to department heads immediately.",
          "Assign additional reviewers or redistribute pending review queue.",
          "Conduct a capacity review for the two underperforming departments.",
          "Review task assignment distribution — some team members may be overloaded while others are underutilized."
        ],
        managementRecommendations: [
          "Implement a weekly overdue task triage process across all departments.",
          "Set a 48-hour review SLA and assign backup reviewers to prevent bottlenecks.",
          "Redistribute 5–7 tasks from Operations to teams with available capacity.",
          "Schedule a cross-departmental sync to address the blocked project pipelines.",
          "Increase completion rate target visibility — post weekly completion dashboards for managers.",
          "Consider sprint-based assignment cycles to improve predictability and reduce overdue accumulation."
        ],
        evidence: [
          "Total tasks: 142 with 89 completed (62.7% rate), 38 active, 15 overdue.",
          "Operations department accounts for 60% of all overdue tasks.",
          "Average review cycle duration: 4.2 days vs. 2-day organizational target.",
          "Engineering team completion rate: 85%, highest among all departments.",
          "3 tasks have exceeded their escalation SLA threshold without acknowledgment.",
          "Cross-team task success rate: 12 completed out of 14 assigned (85.7%)."
        ],
        insufficientData: false
      }
    }
  };

  const buffer = await generateReportPdfBuffer(payload);
  const pdfPath = path.join(__dirname, "scratch", "admin_heavy_test.pdf");
  fs.writeFileSync(pdfPath, buffer);

  const pdfContent = buffer.toString("binary");
  const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 0;

  console.log(`PDF Generated: ${buffer.length} bytes`);
  console.log(`Total Page Count: ${pageCount}`);
  console.log(`Saved to: ${pdfPath}`);

  // For a heavy payload, 2 pages is acceptable, but trailing blanks (>3) is not
  if (pageCount <= 2) {
    console.log(`\nSUCCESS: ${pageCount} page(s) — no wasteful blank pages.`);
  } else {
    console.error(`\nFAILURE: ${pageCount} pages — possible trailing blank pages!`);
  }
}

testHeavyPayload();
