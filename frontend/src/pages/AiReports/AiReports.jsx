import { useState, useEffect } from "react";
import { FiCpu, FiFileText, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import aiService from "../../services/aiService";
import userService from "../../services/userService";
import projectService from "../../services/projectService";
import Loader from "../../components/Loader/Loader";
import "./AiReports.css";

/**
 * Dedicated AI Reports Page Component (V4 Refinement).
 * First-class application page mounted at /ai-reports (and /employee/ai-reports).
 * Provides role-authorized AI report generation and displays structured advisory reports.
 */
function AiReports() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role?.toLowerCase() || "employee";

  // Role-based allowed report options
  const getReportOptions = () => {
    if (userRole === "admin") {
      return [
        { id: "ADMIN_COMPANY_PERFORMANCE", label: "Admin Company Performance Report" },
        { id: "MANAGER_TEAM_PERFORMANCE", label: "Manager Team Performance Report" },
        { id: "EMPLOYEE_PERFORMANCE", label: "Employee Performance Report" },
        { id: "PROJECT_PERFORMANCE", label: "Project & Phase Performance Report" },
      ];
    }
    if (userRole === "manager") {
      return [
        { id: "MANAGER_TEAM_PERFORMANCE", label: "Manager Team Performance Report" },
        { id: "EMPLOYEE_PERFORMANCE", label: "Employee Performance Report" },
        { id: "PROJECT_PERFORMANCE", label: "Project & Phase Performance Report" },
      ];
    }
    // Employee (Restricted exclusively to their own performance report)
    return [
      { id: "EMPLOYEE_PERFORMANCE", label: "My Performance Report" },
    ];
  };

  const reportOptions = getReportOptions();

  const [selectedReportType, setSelectedReportType] = useState(
    reportOptions[0]?.id || "EMPLOYEE_PERFORMANCE"
  );

  // Target Selections
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectOptions, setProjectOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Report Execution & Results State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Export State
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Fetch employees for Employee Performance Report (Manager/Admin view)
  useEffect(() => {
    if (userRole === "employee") return;

    let isMounted = true;
    setLoadingEmployees(true);

    userService
      .getUsers()
      .then((res) => {
        if (!isMounted) return;
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          const empList = list.filter((u) => u.role === "employee");
          setEmployeeOptions(empList);
          if (empList.length > 0 && !selectedEmployeeId) {
            setSelectedEmployeeId(empList[0]._id || empList[0].id);
          }
        }
        setLoadingEmployees(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch employees:", err);
          setLoadingEmployees(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userRole]);

  // Fetch projects for Project Performance Report
  useEffect(() => {
    let isMounted = true;
    setLoadingProjects(true);

    projectService
      .getProjects()
      .then((res) => {
        if (!isMounted) return;
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setProjectOptions(list);
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0]._id || list[0].id);
          }
        }
        setLoadingProjects(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch projects:", err);
          setLoadingProjects(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Reset report output state when selections change to prevent stale data display
  useEffect(() => {
    setReportData(null);
    setErrorMsg("");
  }, [selectedReportType, selectedEmployeeId, selectedProjectId]);

  // Handle explicit AI report generation request
  const handleGenerateReport = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const payload = {
        reportType: selectedReportType,
        targetSubjectId:
          selectedReportType === "EMPLOYEE_PERFORMANCE" && userRole !== "employee"
            ? selectedEmployeeId
            : null,
        projectId:
          selectedReportType === "PROJECT_PERFORMANCE" ? selectedProjectId : null,
      };

      const res = await aiService.generateReport(payload);

      if (res && res.success && res.report) {
        setReportData(res.report);
      } else {
        throw new Error(res?.message || "Failed to generate AI report.");
      }
    } catch (err) {
      console.error("AI Report Execution Error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to generate AI report. Please try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle PDF Export (0 Gemini Requests, Uses active validated report data)
  const handleDownloadPdf = async () => {
    if (!reportData || exportingPdf || exportingDocx) return;

    try {
      setExportingPdf(true);
      setErrorMsg("");
      const fullPayload = { success: true, report: reportData };
      const response = await aiService.exportReportPdf(fullPayload);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const downloadUrl = window.URL.createObjectURL(blob);

      let fileName = "AI_Performance_Report.pdf";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        fileName = disposition.split("filename=")[1].replace(/["']/g, "").trim();
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("PDF Export Error:", err);
      setErrorMsg("Unable to generate PDF document. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Handle DOCX Export (0 Gemini Requests, Uses active validated report data)
  const handleDownloadDocx = async () => {
    if (!reportData || exportingPdf || exportingDocx) return;

    try {
      setExportingDocx(true);
      setErrorMsg("");
      const fullPayload = { success: true, report: reportData };
      const response = await aiService.exportReportDocx(fullPayload);

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const downloadUrl = window.URL.createObjectURL(blob);

      let fileName = "AI_Performance_Report.docx";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        fileName = disposition.split("filename=")[1].replace(/["']/g, "").trim();
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("DOCX Export Error:", err);
      setErrorMsg("Unable to generate DOCX document. Please try again.");
    } finally {
      setExportingDocx(false);
    }
  };

  const aiAnalysis = reportData?.aiAnalysis || {};
  const sourceMetrics = reportData?.sourceMetrics || {};
  const generatedAt = reportData?.generatedAt;

  return (
    <div className="ai-reports-page">
      {/* Page Header */}
      <div className="ai-reports-header">
        <h1>
          <FiCpu style={{ color: "#6366f1" }} /> AI Reports
        </h1>
        <p>
          Evidence-based AI analysis and advisory insights based on pre-authorized application data.
        </p>
      </div>

      {/* Controls & Configuration Card */}
      <div className="ai-reports-controls-card">
        <div className="ai-reports-controls-grid">
          {/* Report Type Selector */}
          <div className="ai-control-group">
            <label>Select Report Type</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
            >
              {reportOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Target Selector: Employee Selector */}
          {selectedReportType === "EMPLOYEE_PERFORMANCE" && userRole !== "employee" && (
            <div className="ai-control-group">
              <label>Select Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={loadingEmployees || employeeOptions.length === 0}
              >
                {employeeOptions.map((emp) => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name} ({emp.employeeId || "Staff"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Target Selector: Project Selector */}
          {selectedReportType === "PROJECT_PERFORMANCE" && (
            <div className="ai-control-group">
              <label>Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={loadingProjects || projectOptions.length === 0}
              >
                {projectOptions.map((proj) => (
                  <option key={proj._id || proj.id} value={proj._id || proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Explicit Trigger Action */}
          <div>
            <button
              type="button"
              className="ai-generate-btn"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? "Analyzing Authorized Data..." : "✨ Generate AI Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay State */}
      {loading && (
        <div style={{ margin: "40px 0" }}>
          <Loader />
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="ai-reports-controls-card" style={{ borderLeft: "4px solid #ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#991b1b" }}>
            <FiAlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Generated Report Display Card */}
      {!loading && reportData && (
        <div className="ai-report-output-card">
          <div className="ai-report-header-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span className="ai-report-type-badge">
                <FiFileText /> {selectedReportType.replace(/_/g, " ")}
              </span>
              {generatedAt && (
                <span className="ai-report-meta">
                  Generated {new Date(generatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Executive Summary / Health Overview */}
          {(aiAnalysis.executiveSummary || aiAnalysis.summary || aiAnalysis.projectSummary) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Executive Summary</div>
              <div className="ai-summary-text">
                {aiAnalysis.executiveSummary || aiAnalysis.summary || aiAnalysis.projectSummary}
              </div>
            </div>
          )}

          {/* Authoritative Source Metrics (Source of Truth) */}
          {sourceMetrics && (
            <div className="ai-section-block">
              <div className="ai-section-title">Factual Metrics (Source of Truth)</div>
              <div className="ai-metrics-grid">
                {sourceMetrics.totalTasks !== undefined && (
                  <div className="ai-metric-item">
                    <div className="ai-metric-val">{sourceMetrics.totalTasks}</div>
                    <div className="ai-metric-lbl">Total Tasks</div>
                  </div>
                )}
                {sourceMetrics.activeTasks !== undefined && (
                  <div className="ai-metric-item">
                    <div className="ai-metric-val">{sourceMetrics.activeTasks}</div>
                    <div className="ai-metric-lbl">Active Tasks</div>
                  </div>
                )}
                {sourceMetrics.completedTasks !== undefined && (
                  <div className="ai-metric-item">
                    <div className="ai-metric-val">{sourceMetrics.completedTasks}</div>
                    <div className="ai-metric-lbl">Completed Tasks</div>
                  </div>
                )}
                {sourceMetrics.completionRate !== undefined && (
                  <div className="ai-metric-item">
                    <div className="ai-metric-val">{sourceMetrics.completionRate}%</div>
                    <div className="ai-metric-lbl">Completion Rate</div>
                  </div>
                )}
                {sourceMetrics.overdueTasks !== undefined && (
                  <div className="ai-metric-item">
                    <div className="ai-metric-val">{sourceMetrics.overdueTasks}</div>
                    <div className="ai-metric-lbl">Overdue Tasks</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Positive Developments / Strengths */}
          {(aiAnalysis.positiveDevelopments || aiAnalysis.whatsGoingWell || aiAnalysis.keyStrengths) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Positive Developments & Strengths</div>
              <div className="ai-list-box">
                <ul>
                  {(
                    aiAnalysis.positiveDevelopments ||
                    aiAnalysis.whatsGoingWell ||
                    aiAnalysis.keyStrengths ||
                    []
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Attention Areas / Bottlenecks */}
          {(aiAnalysis.attentionAreas || aiAnalysis.bottlenecks || aiAnalysis.majorRisks) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Attention Areas & Risks</div>
              <div className="ai-list-box" style={{ borderLeft: "3px solid #f59e0b" }}>
                <ul>
                  {(
                    aiAnalysis.attentionAreas ||
                    aiAnalysis.bottlenecks ||
                    aiAnalysis.majorRisks ||
                    []
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(aiAnalysis.recommendations || aiAnalysis.managementRecommendations) && (
            <div className="ai-section-block">
              <div className="ai-section-title">AI Recommendations</div>
              <div className="ai-list-box" style={{ borderLeft: "3px solid #10b981" }}>
                <ul>
                  {(
                    aiAnalysis.recommendations ||
                    aiAnalysis.managementRecommendations ||
                    []
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Bottom Export Action Bar */}
          <div className="ai-report-footer-actions">
            <span>Export this report:</span>
            <button
              type="button"
              className="ai-export-btn pdf"
              onClick={handleDownloadPdf}
              disabled={exportingPdf || exportingDocx}
            >
              {exportingPdf ? "Downloading PDF..." : "↓ Download PDF"}
            </button>
            <button
              type="button"
              className="ai-export-btn docx"
              onClick={handleDownloadDocx}
              disabled={exportingPdf || exportingDocx}
            >
              {exportingDocx ? "Downloading DOCX..." : "↓ Download DOCX"}
            </button>
          </div>
        </div>
      )}

      {/* Empty State Placeholder */}
      {!loading && !reportData && !errorMsg && (
        <div className="ai-empty-placeholder">
          <FiCpu size={42} style={{ color: "#818cf8" }} />
          <h3>Select a Report Type and Target</h3>
          <p>
            Click <strong>"✨ Generate AI Report"</strong> to generate a structured AI analysis.
          </p>
        </div>
      )}
    </div>
  );
}

export default AiReports;
