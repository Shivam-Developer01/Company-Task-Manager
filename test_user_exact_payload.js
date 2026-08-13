const path = require("path");
const fs = require("fs");

module.paths.push(path.join(__dirname, "Backend/node_modules"));
const { generateReportPdfBuffer } = require("./Backend/services/ai/pdfReportGenerator");

async function testUserExactPayload() {
  console.log("Testing exact user payload from screenshot...");

  const payload = {
    success: true,
    report: {
      reportType: "EMPLOYEE_PERFORMANCE",
      generatedAt: new Date().toISOString(),
      viewer: { userId: "emp123", role: "employee" },
      subject: { name: "Rahul Sharma" },
      sourceMetrics: {
        activeTaskCount: 1,
        completedTaskCount: 3,
        pendingTaskCount: 0,
        overdueTaskCount: 1,
        totalAssignedCount: 4,
        completionRate: 75,
        rejectionRate: 25,
        withdrawnCount: 0,
      },
      aiAnalysis: {
        reportType: "EMPLOYEE_PERFORMANCE",
        summary: "The employee has a 75% overall completion rate with 3 completed tasks and 1 active task. Performance highlights key areas requiring attention including 1 overdue active task, 1 task awaiting acceptance, 1 rejected submission requiring revision, and a 0% on-time completion rate across closed tasks with due dates.",
        performanceTrends: "stable",
        whatsGoingWell: [
          "Successfully completed 3 tasks achieving a 75% overall task completion rate.",
          "Maintained an 80% submission approval rate across reviewed items."
        ],
        attentionAreas: [
          "1 active task is currently overdue.",
          "1 submission was rejected by the reviewer and requires revision.",
          "1 newly assigned task is awaiting acceptance.",
          "On-time completion rate is at 0% for closed tasks with due dates."
        ],
        recommendations: [
          "Review and accept the newly assigned task awaiting acceptance.",
          "Address the feedback on the rejected submission and resubmit the revised work.",
          "Prioritize and complete the active overdue task to improve punctuality metrics.",
          "Implement better timeline tracking to increase the on-time delivery rate."
        ],
        evidence: [
          "Completion rate stands at 75% with 3 completed out of 4 assigned tasks.",
          "Overdue metrics show 1 active task past its scheduled due date.",
          "Submission performance indicates 1 rejected submission out of 5 total submissions.",
          "On-time delivery rate is 0% across 3 closed tasks with due dates."
        ],
        insufficientData: false
      }
    }
  };

  const buffer = await generateReportPdfBuffer(payload);
  const pdfPath = path.join(__dirname, "scratch", "user_screenshot_test.pdf");
  fs.writeFileSync(pdfPath, buffer);

  const pdfContent = buffer.toString("binary");
  const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 0;

  console.log(`PDF Generated: ${buffer.length} bytes`);
  console.log(`Total Page Count: ${pageCount}`);
  console.log(`Saved to: ${pdfPath}`);

  if (pageCount === 1) {
    console.log("SUCCESS: 1 page, 0 wasted blank pages.");
  } else {
    console.error(`FAILURE: ${pageCount} pages produced instead of 1.`);
  }
}

testUserExactPayload();
