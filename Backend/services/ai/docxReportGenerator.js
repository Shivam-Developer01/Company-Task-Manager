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

  // Department Month-over-Month Historical Comparison
  if (reportType === "DEPARTMENT_PERFORMANCE") {
    renderDocxHistoricalComparison(children, reportData);
  }

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

/** Render Month-over-Month Historical Comparison Section in DOCX */
const renderDocxHistoricalComparison = (children, reportData) => {
  const aiAnalysis = reportData.aiAnalysis || {};
  const sourceMetrics = reportData.sourceMetrics || {};
  const hc = sourceMetrics.historicalComparison || aiAnalysis.historicalComparison;

  const sectionTitle = hc?.previousPeriod
    ? `Month-over-Month Historical Comparison (vs. ${hc.previousPeriod})`
    : "Month-over-Month Historical Comparison";

  children.push(
    new Paragraph({
      text: sectionTitle,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.LEFT,
      spacing: { before: 160, after: 100 },
    })
  );

  if (!hc || !hc.metrics) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Historical department performance comparison is not currently available.",
            italic: true,
            color: "64748B",
          }),
        ],
        spacing: { after: 160 },
      })
    );
    return;
  }

  const m = hc.metrics;
  const rowsData = [];

  if (m.completionRate) {
    const deltaStr = m.completionRate.deltaPercentagePoints > 0
      ? `+${m.completionRate.deltaPercentagePoints} pp`
      : `${m.completionRate.deltaPercentagePoints} pp`;
    rowsData.push({
      metric: "Completion Rate",
      current: `${m.completionRate.current}%`,
      previous: `${m.completionRate.previous}%`,
      delta: deltaStr,
      trend: m.completionRate.direction ? m.completionRate.direction.toUpperCase() : "STABLE",
    });
  }

  if (m.overdueRate) {
    const deltaStr = m.overdueRate.deltaPercentagePoints > 0
      ? `+${m.overdueRate.deltaPercentagePoints} pp`
      : `${m.overdueRate.deltaPercentagePoints} pp`;
    rowsData.push({
      metric: "Overdue Rate",
      current: `${m.overdueRate.current}%`,
      previous: `${m.overdueRate.previous}%`,
      delta: deltaStr,
      trend: m.overdueRate.direction ? m.overdueRate.direction.toUpperCase() : "STABLE",
    });
  }

  if (m.activeTasks) {
    const deltaStr = m.activeTasks.delta > 0 ? `+${m.activeTasks.delta}` : `${m.activeTasks.delta}`;
    rowsData.push({
      metric: "Active Tasks",
      current: String(m.activeTasks.current),
      previous: String(m.activeTasks.previous),
      delta: deltaStr,
      trend: "-",
    });
  }

  if (m.rejectionRate) {
    const deltaStr = m.rejectionRate.deltaPercentagePoints > 0
      ? `+${m.rejectionRate.deltaPercentagePoints} pp`
      : `${m.rejectionRate.deltaPercentagePoints} pp`;
    rowsData.push({
      metric: "Rejection Rate",
      current: `${m.rejectionRate.current}%`,
      previous: `${m.rejectionRate.previous}%`,
      delta: deltaStr,
      trend: m.rejectionRate.direction ? m.rejectionRate.direction.toUpperCase() : "STABLE",
    });
  }

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })], width: { size: 28, type: WidthType.PERCENTAGE }, shading: { fill: "EEF2FF" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Current", bold: true })] })], width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: "EEF2FF" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Previous", bold: true })] })], width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: "EEF2FF" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Delta", bold: true })] })], width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: "EEF2FF" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Trend", bold: true })] })], width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: "EEF2FF" } }),
      ],
    }),
  ];

  rowsData.forEach((r) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: r.metric })], width: { size: 28, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: r.current, bold: true })], width: { size: 18, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: r.previous })], width: { size: 18, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: r.delta, bold: true })], width: { size: 18, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: r.trend })], width: { size: 18, type: WidthType.PERCENTAGE } }),
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

  children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
};

module.exports = {
  generateReportDocxBuffer,
};
