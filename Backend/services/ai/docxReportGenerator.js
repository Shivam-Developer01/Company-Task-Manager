const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  AlignmentType,
} = require("docx");
const { sanitizeAiString } = require("./aiResponseValidator");
const {
  formatReportTitle,
  extractMetricPairs,
  collectInsights,
} = require("./aiReportExportHelper");

/**
 * DOCX Document Generator for AI Reports (Phase 16).
 * Formats validated AI report data into an editable Office Open XML Word document (.docx).
 * NO database access, NO external AI requests.
 */

/**
 * Generate a DOCX document Buffer from a validated AI report DTO.
 * @param {Object} reportPayload Validated report payload
 * @returns {Promise<Buffer>} DOCX Binary Buffer
 */
const generateReportDocxBuffer = async (reportPayload) => {
  const reportData = reportPayload.report || {};
  const aiAnalysis = reportData.aiAnalysis || {};
  const sourceMetrics = reportData.sourceMetrics || {};
  const subject = reportData.subject || {};
  const reportType = reportData.reportType || "AI_REPORT";
  const generatedAt = reportData.generatedAt
    ? new Date(reportData.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  const titleText = formatReportTitle(reportType);
  const children = [];

  // --------------------------------------------------------------------------
  // 1. Header & Title
  // --------------------------------------------------------------------------
  children.push(
    new Paragraph({
      text: "TASK MANAGER — EXECUTIVE AI ADVISORY REPORT",
      style: "Subtitle",
      spacing: { after: 120 },
    })
  );

  children.push(
    new Paragraph({
      text: titleText,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata Paragraph
  let metaLine = `Generated: ${generatedAt} | Role: ${reportData.viewer?.role || "USER"}`;
  if (subject.name) {
    metaLine += ` | Subject: ${subject.name}`;
  } else if (subject.projectName) {
    metaLine += ` | Project: ${subject.projectName}`;
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: metaLine, italic: true, color: "64748B", size: 18 })],
      spacing: { after: 300 },
    })
  );

  // --------------------------------------------------------------------------
  // 2. Authoritative Source Metrics Table (100% Complete)
  // --------------------------------------------------------------------------
  children.push(
    new Paragraph({
      text: "1. Authoritative Source Metrics (Source of Truth)",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
    })
  );

  const metricPairs = extractMetricPairs(sourceMetrics, reportData.reportType);
  if (metricPairs.length > 0) {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Metric Label", bold: true, color: "0F172A" })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "EEF2FF" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Source Value", bold: true, color: "0F172A" })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "EEF2FF" },
          }),
        ],
      }),
    ];

    metricPairs.forEach((pair) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: pair.label })],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: pair.value, bold: true })],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "No source metrics available.", italic: true })],
      })
    );
  }

  children.push(new Paragraph({ text: "", spacing: { after: 240 } }));

  // --------------------------------------------------------------------------
  // 3. AI Executive Analysis
  // --------------------------------------------------------------------------
  children.push(
    new Paragraph({
      text: "2. AI Executive Analysis & Insights",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
    })
  );

  // Executive Summary
  const summaryText = aiAnalysis.summary || aiAnalysis.projectSummary || aiAnalysis.executiveSummary;
  if (summaryText) {
    children.push(
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    children.push(
      new Paragraph({
        text: sanitizeAiString(summaryText),
        spacing: { after: 160 },
      })
    );
  }

  // Health / Trends
  const healthStatus = aiAnalysis.companyHealth || aiAnalysis.projectHealth;
  const trendStatus = aiAnalysis.performanceTrends || aiAnalysis.teamTrends || aiAnalysis.trends;

  if (healthStatus || trendStatus) {
    let statusText = "";
    if (healthStatus) statusText += `OVERALL HEALTH: ${healthStatus.toUpperCase()} `;
    if (trendStatus) statusText += `| PERFORMANCE TREND: ${trendStatus.toUpperCase()}`;

    children.push(
      new Paragraph({
        children: [new TextRun({ text: statusText, bold: true, color: "4F46E5" })],
        spacing: { after: 160 },
      })
    );
  }

  // What's Going Well
  const strengths = aiAnalysis.whatsGoingWell || aiAnalysis.positiveDevelopments || aiAnalysis.keyStrengths;
  if (Array.isArray(strengths) && strengths.length > 0) {
    children.push(
      new Paragraph({
        text: "Key Strengths & Positive Developments",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    strengths.forEach((item) => {
      children.push(
        new Paragraph({
          text: sanitizeAiString(String(item || "")),
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  // Priority Attention Areas
  const risks = aiAnalysis.attentionAreas || aiAnalysis.bottlenecks || aiAnalysis.majorRisks;
  if (Array.isArray(risks) && risks.length > 0) {
    children.push(
      new Paragraph({
        text: "Priority Attention Areas & Identified Risks",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    risks.forEach((item) => {
      children.push(
        new Paragraph({
          text: sanitizeAiString(String(item || "")),
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  // Insights
  const insightsList = collectInsights(aiAnalysis);
  if (insightsList.length > 0) {
    children.push(
      new Paragraph({
        text: "Operational Insights & Observations",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    insightsList.forEach((item) => {
      children.push(
        new Paragraph({
          text: sanitizeAiString(String(item || "")),
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  // AI Recommendations
  const recommendations = aiAnalysis.recommendations || aiAnalysis.managementRecommendations;
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    children.push(
      new Paragraph({
        text: "AI Recommendations",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    recommendations.forEach((item) => {
      children.push(
        new Paragraph({
          text: sanitizeAiString(String(item || "")),
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  // Evidence
  if (Array.isArray(aiAnalysis.evidence) && aiAnalysis.evidence.length > 0) {
    children.push(
      new Paragraph({
        text: "Supporting Analytical Evidence",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    aiAnalysis.evidence.forEach((item) => {
      children.push(
        new Paragraph({
          text: sanitizeAiString(String(item || "")),
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  // Disclaimer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Notice: This document is generated from pre-authorized application metric evidence for advisory decision support. AI analysis does not perform automated database actions or task mutations.",
          italic: true,
          color: "64748B",
          size: 16,
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  // Build Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

module.exports = {
  generateReportDocxBuffer,
};
