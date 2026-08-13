const PDFDocument = require("pdfkit");
const { sanitizeAiString } = require("./aiResponseValidator");
const {
  formatReportTitle,
  extractMetricPairs,
  collectInsights,
} = require("./aiReportExportHelper");

/**
 * Enhanced PDF Document Generator for AI Reports (Phase 16).
 * Renders well-spaced executive PDF documents with zero blank page waste.
 * NO database access, NO external AI requests.
 */

/**
 * Generate a PDF document Buffer from a validated AI report DTO.
 * @param {Object} reportPayload Validated report payload
 * @returns {Promise<Buffer>} PDF Binary Buffer
 */
const generateReportPdfBuffer = (reportPayload) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 30,
        bufferPages: true,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const reportData = reportPayload.report || {};
      const aiAnalysis = reportData.aiAnalysis || {};
      const sourceMetrics = reportData.sourceMetrics || {};
      const subject = reportData.subject || {};
      const reportType = reportData.reportType || "AI_REPORT";
      const generatedAt = reportData.generatedAt
        ? new Date(reportData.generatedAt).toLocaleString()
        : new Date().toLocaleString();

      // Theme Color Palette
      const colors = {
        primary: "#0F172A",
        secondary: "#334155",
        muted: "#64748B",
        indigo: "#4F46E5",
        indigoLight: "#EEF2FF",
        emerald: "#059669",
        emeraldLight: "#ECFDF5",
        amber: "#D97706",
        amberLight: "#FFFBEB",
        cardBg: "#F8FAFC",
        border: "#E2E8F0",
        white: "#FFFFFF",
      };

      const pageWidth = 535; // A4 (595.28) - 2*30
      const startX = 30;

      // ────────────────────────────────────────────────────────────────────────
      // 1. Header Banner
      // ────────────────────────────────────────────────────────────────────────
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(colors.indigo)
        .text("TASK MANAGER", startX, 26, { continued: true })
        .font("Helvetica")
        .fillColor(colors.muted)
        .text("  |  EXECUTIVE AI ADVISORY REPORT");

      doc.moveDown(0.3);

      const titleY = doc.y;
      doc.rect(startX, titleY, 4, 22).fill(colors.indigo);

      const titleText = formatReportTitle(reportType);
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor(colors.primary)
        .text(titleText, startX + 10, titleY + 1);

      doc.y = titleY + 28;

      const metaY = doc.y;
      doc.roundedRect(startX, metaY, pageWidth, 22, 5).fillAndStroke(colors.cardBg, colors.border);

      let subjectText = "";
      if (subject.name) subjectText = `  •  Subject: ${subject.name}`;
      else if (subject.projectName) subjectText = `  •  Project: ${subject.projectName}`;

      const metaString = `Generated: ${generatedAt}  •  Role: ${reportData.viewer?.role || "USER"}${subjectText}`;
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(colors.secondary)
        .text(metaString, startX + 10, metaY + 6, { width: pageWidth - 20 });

      doc.y = metaY + 34;

      // ────────────────────────────────────────────────────────────────────────
      // 2. Authoritative Source Metrics Section (3-column cards)
      // ────────────────────────────────────────────────────────────────────────
      ensureSpace(doc, 85);
      renderSectionHeader(doc, "1. Authoritative Source Metrics (Source of Truth)", colors, startX);

      const metricPairs = extractMetricPairs(sourceMetrics);
      if (metricPairs.length > 0) {
        renderMetricsCards(doc, metricPairs, startX, pageWidth, colors);
      } else {
        doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(colors.muted).text("No source metrics available.");
        doc.y += 14;
      }

      // ────────────────────────────────────────────────────────────────────────
      // 3. AI Executive Analysis Section
      // ────────────────────────────────────────────────────────────────────────
      ensureSpace(doc, 90);
      renderSectionHeader(doc, "2. AI Executive Analysis & Insights", colors, startX);

      // Executive Summary Callout Box
      const summaryText = aiAnalysis.summary || aiAnalysis.projectSummary || aiAnalysis.executiveSummary;
      if (summaryText) {
        ensureSpace(doc, 55);
        renderSubHeading(doc, "Executive Summary", colors.primary);
        const summaryY = doc.y;
        const cleanSummary = sanitizeAiString(summaryText);
        const textHeight = doc.heightOfString(cleanSummary, { width: pageWidth - 28, fontSize: 8.5, lineGap: 2.5 });
        const boxHeight = textHeight + 16;

        doc.roundedRect(startX, summaryY, pageWidth, boxHeight, 5).fillAndStroke(colors.indigoLight, colors.border);
        doc.rect(startX, summaryY, 4, boxHeight).fill(colors.indigo);
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(colors.primary)
          .text(cleanSummary, startX + 14, summaryY + 8, { width: pageWidth - 28, align: "left", lineGap: 2.5 });
        doc.y = summaryY + boxHeight + 14;
      }

      // Health / Trends pill
      const healthStatus = aiAnalysis.companyHealth || aiAnalysis.projectHealth;
      const trendStatus = aiAnalysis.performanceTrends || aiAnalysis.teamTrends || aiAnalysis.trends;
      if (healthStatus || trendStatus) {
        ensureSpace(doc, 30);
        let badgeLine = "";
        if (healthStatus) badgeLine += `OVERALL HEALTH: ${healthStatus.toUpperCase()}    `;
        if (trendStatus) badgeLine += `PERFORMANCE TREND: ${trendStatus.toUpperCase()}`;
        const badgeY = doc.y;
        doc.roundedRect(startX, badgeY, pageWidth, 22, 4).fillAndStroke(colors.cardBg, colors.border);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(colors.indigo).text(badgeLine, startX + 12, badgeY + 6);
        doc.y = badgeY + 22 + 14;
      }

      // Key Strengths
      const strengths = aiAnalysis.whatsGoingWell || aiAnalysis.positiveDevelopments || aiAnalysis.keyStrengths;
      if (Array.isArray(strengths) && strengths.length > 0) {
        ensureSpace(doc, 50);
        renderSubHeading(doc, "Key Strengths & Positive Developments", colors.primary);
        renderStyledListBox(doc, strengths, colors.emeraldLight, colors.emerald, colors.primary, startX, pageWidth);
        doc.y += 10;
      }

      // Priority Attention Areas
      const risks = aiAnalysis.attentionAreas || aiAnalysis.bottlenecks || aiAnalysis.majorRisks;
      if (Array.isArray(risks) && risks.length > 0) {
        ensureSpace(doc, 50);
        renderSubHeading(doc, "Priority Attention Areas & Identified Risks", colors.primary);
        renderStyledListBox(doc, risks, colors.amberLight, colors.amber, colors.primary, startX, pageWidth);
        doc.y += 10;
      }

      // Operational Insights
      const insightsList = collectInsights(aiAnalysis);
      if (insightsList.length > 0) {
        ensureSpace(doc, 50);
        renderSubHeading(doc, "Operational Insights & Breakdown", colors.primary);
        renderStyledListBox(doc, insightsList, colors.cardBg, colors.indigo, colors.primary, startX, pageWidth);
        doc.y += 10;
      }

      // AI Recommendations
      const recommendations = aiAnalysis.recommendations || aiAnalysis.managementRecommendations;
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        ensureSpace(doc, 50);
        renderSubHeading(doc, "AI Recommendations", colors.primary);
        renderStyledListBox(doc, recommendations, colors.indigoLight, colors.indigo, colors.primary, startX, pageWidth);
        doc.y += 10;
      }

      // Supporting Evidence
      if (Array.isArray(aiAnalysis.evidence) && aiAnalysis.evidence.length > 0) {
        ensureSpace(doc, 50);
        renderSubHeading(doc, "Supporting Analytical Evidence", colors.primary);
        renderStyledListBox(doc, aiAnalysis.evidence, colors.cardBg, colors.muted, colors.secondary, startX, pageWidth);
        doc.y += 10;
      }

      // Advisory Disclaimer Notice
      ensureSpace(doc, 35);
      doc.y += 6;
      doc
        .fontSize(7.5)
        .font("Helvetica-Oblique")
        .fillColor(colors.muted)
        .text(
          "Notice: This report is generated from pre-authorized application metric evidence for advisory decision support. AI analysis does not perform automated database mutations.",
          startX,
          doc.y,
          { align: "center", width: pageWidth, lineGap: 1.5 }
        );

      // ────────────────────────────────────────────────────────────────────────
      // 4. Page Footers — drawn AFTER all content, using absolute positioning.
      //    bufferPages:true means pages are held in memory; we switch to each
      //    page, set margins.bottom=0 so pdfkit CANNOT trigger addPage(), and
      //    draw footer text at an absolute Y well below the content area.
      // ────────────────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      const totalPageCount = range.count;

      for (let i = range.start; i < range.start + totalPageCount; i++) {
        doc.switchToPage(i);
        // Disable bottom-margin overflow guard so text() cannot addPage()
        doc.page.margins.bottom = 0;

        const fY = doc.page.height - 20;
        const fLineY = fY - 5;

        // Separator line
        doc
          .moveTo(startX, fLineY)
          .lineTo(startX + pageWidth, fLineY)
          .strokeColor(colors.border)
          .lineWidth(0.5)
          .stroke();

        // Left footer text – absolute Y, lineBreak:false prevents overflow
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(colors.muted)
          .text("Task Manager Executive AI Reports", startX, fY, {
            lineBreak: false,
            width: pageWidth / 2,
            align: "left",
          });

        // Right page number – absolute Y, lineBreak:false
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(colors.muted)
          .text(`Page ${i - range.start + 1} of ${totalPageCount}`, startX + pageWidth / 2, fY, {
            lineBreak: false,
            width: pageWidth / 2,
            align: "right",
          });
      }

      // Finalise the document — this triggers the 'end' event → resolve(buffer)
      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Rendering Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Add a new page if remaining space is less than requiredHeight */
const ensureSpace = (doc, requiredHeight) => {
  if (doc.y + requiredHeight > doc.page.height - 45) {
    doc.addPage();
    doc.y = 35;
  }
};

/** Render a bold indigo-accented section header with generous spacing */
const renderSectionHeader = (doc, title, colors, startX = 30) => {
  const y = doc.y;
  doc.rect(startX, y, 4, 14).fill(colors.indigo);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(title, startX + 12, y + 1);
  doc.y = y + 24;
};

/** Render a bold sub-heading with comfortable spacing below */
const renderSubHeading = (doc, title, color) => {
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(color)
    .text(title);
  doc.y += 7;
};

/** Render metric data as a 3-column card grid */
const renderMetricsCards = (doc, metricPairs, startX, pageWidth, colors) => {
  const cardWidth = (pageWidth - 20) / 3;
  const cardHeight = 44;  // taller cards for more breathing room
  const gap = 10;         // gap between columns AND between rows

  let currentX = startX;
  let currentY = doc.y;
  let count = 0;

  metricPairs.forEach((pair) => {
    if (count > 0 && count % 3 === 0) {
      currentX = startX;
      currentY += cardHeight + gap;
      ensureSpace(doc, cardHeight + gap);
    }

    doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 6).fillAndStroke(colors.cardBg, colors.border);

    const valStr = String(pair.value || "");
    const valFontSize = valStr.length > 15 ? 8.5 : valStr.length > 8 ? 10 : 13;

    // Value (large number / text, strictly single line with ellipsis)
    doc
      .fontSize(valFontSize)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text(valStr, currentX + 8, currentY + 7, {
        width: cardWidth - 16,
        height: 18,
        ellipsis: true,
        lineBreak: false,
      });

    // Label (small caps below value, strictly single line with ellipsis)
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(colors.muted)
      .text(String(pair.label || "").toUpperCase(), currentX + 8, currentY + 27, {
        width: cardWidth - 16,
        height: 14,
        ellipsis: true,
        lineBreak: false,
      });

    currentX += cardWidth + gap;
    count++;
  });

  doc.y = currentY + cardHeight + 16;
};

/** Render a bullet list with coloured pill boxes */
const renderStyledListBox = (doc, items, bgColor, bulletColor, textColor, startX, pageWidth) => {
  items.forEach((item) => {
    const cleanText = sanitizeAiString(String(item || ""));
    if (!cleanText) return;

    ensureSpace(doc, 24);
    const itemY = doc.y;
    const textHeight = doc.heightOfString(cleanText, { width: pageWidth - 34, fontSize: 8.5, lineGap: 2.5 });
    const boxHeight = textHeight + 12;

    doc.roundedRect(startX, itemY, pageWidth, boxHeight, 4).fillAndStroke(bgColor, "#E2E8F0");
    doc.circle(startX + 12, itemY + boxHeight / 2, 2.5).fill(bulletColor);
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(textColor)
      .text(cleanText, startX + 22, itemY + 6, { width: pageWidth - 34, lineGap: 2.5 });

    doc.y = itemY + boxHeight + 5;
  });
};

module.exports = {
  generateReportPdfBuffer,
};
