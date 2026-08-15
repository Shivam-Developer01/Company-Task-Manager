import { useState, useEffect } from "react";
import { FiCpu, FiFileText, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import aiService from "../../services/aiService";
import userService from "../../services/userService";
import projectService from "../../services/projectService";
import departmentService from "../../services/departmentService";
import Loader from "../../components/Loader/Loader";
import "./AiReports.css";

/**
 * Authoritative Source Metrics Configuration (V4 Specification)
 */
const REPORT_SOURCE_METRICS_CONFIG = {
  EMPLOYEE_PERFORMANCE: [
    { label: "Total Employees", path: "totalEmployees", fallbackPath: "summary.totalEmployees", format: "count" },
    { label: "Total Tasks", path: "totalAssignedCount", fallbackPath: "summary.totalAssignedCount", format: "count" },
    { label: "Active Tasks", path: "activeTaskCount", fallbackPath: "summary.totalActiveTasks", format: "count" },
    { label: "Completed Tasks", path: "completedTaskCount", fallbackPath: "summary.totalCompletedTasks", format: "count" },
    { label: "Pending Tasks", path: "pendingTaskCount", fallbackPath: "summary.totalPendingTasks", format: "count" },
    { label: "Overdue Tasks", path: "overdueTaskCount", fallbackPath: "summary.totalOverdueTasks", format: "count" },
    { label: "Completion Rate", path: "completionRate", fallbackPath: "summary.avgCompletionRate", format: "percentage" },
    { label: "On-Time Completion", path: "onTimeCompletionRate", fallbackPath: "summary.avgOnTimeCompletionRate", format: "percentage" },
    { label: "Avg. Completion Time", path: "averageCompletionTime", fallbackPath: "summary.avgCompletionTime", format: "days" },
    { label: "Submission Rejection Rate", path: "rejectionRate", fallbackPath: "summary.avgRejectionRate", format: "percentage" },
  ],

  MANAGER_TEAM_PERFORMANCE: [
    { label: "Team Size", path: "teamSize", format: "count" },
    { label: "Active Tasks", path: "totalActiveTasks", format: "count" },
    { label: "Overdue Tasks", path: "totalOverdueTasks", format: "count" },
    { label: "Pending Reviews", path: "pendingReviewCount", format: "count" },
    { label: "Team Completion Rate", path: "teamTaskCompletion", format: "percentage" },
    { label: "Avg. Team Delay", path: "averageTeamDelay", format: "days" },
    { label: "Delayed Tasks", path: "delayedTaskCount", format: "count" },
    { label: "Avg. Review Time", path: "averageReviewTime", format: "days" },
  ],

  ADMIN_COMPANY_PERFORMANCE: [
    { label: "Total Employees", path: "users.totalEmployees", format: "count" },
    { label: "Total Managers", path: "users.totalManagers", format: "count" },
    { label: "Total Projects", path: "projects.totalProjects", format: "count" },
    { label: "Total Tasks", path: "tasks.totalTasks", format: "count" },
    { label: "Active Tasks", path: "tasks.activeTasks", format: "count" },
    { label: "Completed Tasks", path: "tasks.completedTasks", format: "count" },
    { label: "Task Completion Rate", path: "tasks.taskCompletionRate", format: "percentage" },
    { label: "Overdue Tasks", path: "tasks.overdueTasks", format: "count" },
    { label: "Pending Reviews", path: "tasks.pendingReviews", format: "count" },
    { label: "High-Priority Overdue", path: "tasks.highPriorityOverdue", format: "count" },
    { label: "Avg. Review Turnaround", path: "tasks.averageReviewTurnaroundDays", format: "days" },
  ],

  PROJECT_PERFORMANCE: [
    { label: "Total Tasks", path: "totalTasks", format: "count" },
    { label: "Active Tasks", path: "activeTasks", format: "count" },
    { label: "Completed Tasks", path: "completedTasks", format: "count" },
    { label: "Pending Reviews", path: "pendingReviews", format: "count" },
    { label: "Overdue Tasks", path: "overdueTasks", format: "count" },
    { label: "Completion Rate", path: "completionRate", format: "percentage" },
    { label: "Phases", path: "phaseCount", format: "count" },
  ],

  DEPARTMENT_PERFORMANCE: [
    { label: "Total Employees", path: "workforce.totalEmployees", format: "count" },
    { label: "Total Managers", path: "workforce.managerCount", format: "count" },
    { label: "Active Projects", path: "projectOverview.activeProjectsCount", format: "count" },
    { label: "Total Tasks", path: "taskMetrics.totalTasks", format: "count" },
    { label: "Active Tasks", path: "taskMetrics.activeTasks", format: "count" },
    { label: "Completed Tasks", path: "taskMetrics.completedTasks", format: "count" },
    { label: "Overdue Tasks", path: "taskMetrics.overdueTasks", format: "count" },
    { label: "Pending Reviews", path: "submissionMetrics.pendingReviews", format: "count" },
    { label: "Completion Rate", path: "taskMetrics.completionRate", format: "percentage" },
    { label: "On-Time Completion", path: "taskMetrics.onTimeCompletionRate", format: "percentage" },
    { label: "Avg. Completion Time", path: "taskMetrics.averageCompletionTime", format: "days" },
    { label: "Rejection Rate", path: "submissionMetrics.rejectionRate", format: "percentage" },
  ],

  DEPARTMENT_PERFORMANCE_ALL: [
    { label: "Total Departments", path: "summary.totalDepartments", format: "count" },
    { label: "Total Employees", path: "summary.totalEmployees", format: "count" },
    { label: "Total Managers", path: "summary.totalManagers", format: "count" },
    { label: "Total Active Tasks", path: "summary.totalActiveTasks", format: "count" },
    { label: "Total Completed Tasks", path: "summary.totalCompletedTasks", format: "count" },
    { label: "Avg. Dept Completion Rate", path: "summary.avgDepartmentCompletionRate", format: "percentage" },
  ],
};

const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
};

const formatMetricValue = (val, format) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (format === "percentage") return `${val}%`;
    if (format === "days") return `${val} days`;
    return String(val);
  }
  return String(val);
};

const getReportMetricPairs = (reportType, sourceMetrics) => {
  if (!sourceMetrics || typeof sourceMetrics !== "object") return [];
  
  let key = reportType;
  if (reportType === "DEPARTMENT_PERFORMANCE" && sourceMetrics.scopeMode === "ALL_DEPARTMENTS") {
    key = "DEPARTMENT_PERFORMANCE_ALL";
  }

  const configList = REPORT_SOURCE_METRICS_CONFIG[key];
  if (!configList) return [];

  return configList.map((item) => {
    let val = getNestedValue(sourceMetrics, item.path);
    if (val === undefined && item.fallbackPath) {
      val = getNestedValue(sourceMetrics, item.fallbackPath);
    }
    return {
      label: item.label,
      value: formatMetricValue(val, item.format),
    };
  });
};

/**
 * Dedicated AI Reports Page Component (V4 Specification Refinement).
 * Mounted at /ai-reports (and /employee/ai-reports).
 */
function AiReports() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role?.toLowerCase() || "employee";
  const userDeptId = user?.department?._id || user?.department || "";

  // Role-based allowed report options
  const getReportOptions = () => {
    if (userRole === "admin") {
      return [
        { id: "DEPARTMENT_PERFORMANCE", label: "Department Performance Report" },
        { id: "ADMIN_COMPANY_PERFORMANCE", label: "Admin Company Performance Report" },
        { id: "MANAGER_PERFORMANCE", label: "Manager Performance & Effectiveness Report" },
        { id: "MANAGER_TEAM_PERFORMANCE", label: "Manager Team Performance Report" },
        { id: "EMPLOYEE_PERFORMANCE", label: "Employee Performance Report" },
        { id: "PROJECT_PERFORMANCE", label: "Project & Phase Performance Report" },
      ];
    }
    if (userRole === "manager") {
      return [
        { id: "MANAGER_PERFORMANCE", label: "My Performance Report" },
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
    reportOptions[0]?.id || "DEPARTMENT_PERFORMANCE"
  );

  // Target Selections
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all_employees");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managerOptions, setManagerOptions] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectOptions, setProjectOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    userRole === "admin" ? "all_departments" : userDeptId
  );
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Report Execution & Results State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Export State
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Fetch departments for Admin view
  useEffect(() => {
    if (userRole !== "admin") return;

    let isMounted = true;
    setLoadingDepartments(true);

    departmentService
      .getDepartments({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setDepartmentOptions(list);
        }
        setLoadingDepartments(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch departments:", err);
          setLoadingDepartments(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userRole]);

  // Fetch employees and managers for Manager/Admin views
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
          const mgrList = list.filter((u) => u.role === "manager" && u.isActive !== false);
          setEmployeeOptions(empList);
          setManagerOptions(mgrList);
        }
        setLoadingEmployees(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch users:", err);
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
  }, [selectedReportType, selectedEmployeeId, selectedProjectId, selectedManagerId, selectedDepartmentId]);

  // Handle explicit AI report generation request
  const handleGenerateReport = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const payload = {
        reportType: selectedReportType,
        targetSubjectId:
          selectedReportType === "DEPARTMENT_PERFORMANCE"
            ? selectedDepartmentId
            : selectedReportType === "EMPLOYEE_PERFORMANCE"
            ? userRole === "employee"
              ? user?._id || user?.id || null
              : selectedEmployeeId
            : (selectedReportType === "MANAGER_TEAM_PERFORMANCE" ||
                selectedReportType === "MANAGER_PERFORMANCE") &&
              userRole === "admin"
            ? selectedManagerId || null
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
  const reportSubjectName = reportData?.subject?.name;

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

          {/* Dynamic Target Selector: Department Selector */}
          {selectedReportType === "DEPARTMENT_PERFORMANCE" && (
            <div className="ai-control-group">
              <label>Select Department Scope</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                disabled={loadingDepartments}
              >
                {userRole === "admin" && <option value="all_departments">All Departments</option>}
                {departmentOptions.map((dept) => (
                  <option key={dept._id || dept.id} value={dept._id || dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Target Selector: Manager Selector (Admin only for Manager Performance & Manager Team Performance) */}
          {(selectedReportType === "MANAGER_TEAM_PERFORMANCE" || selectedReportType === "MANAGER_PERFORMANCE") && userRole === "admin" && (
            <div className="ai-control-group">
              <label>Select Manager</label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                disabled={loadingEmployees}
              >
                <option value="">All Managers</option>
                {managerOptions.map((mgr) => (
                  <option key={mgr._id || mgr.id} value={mgr._id || mgr.id}>
                    {mgr.name} ({mgr.employeeId || "Manager"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Target Selector: Employee Selector */}
          {selectedReportType === "EMPLOYEE_PERFORMANCE" && userRole !== "employee" && (
            <div className="ai-control-group">
              <label>Select Employee Scope</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={loadingEmployees}
              >
                <option value="all_employees">All Employees</option>
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
              {reportSubjectName && (
                <span className="ai-report-meta" style={{ fontWeight: 600, color: "#4f46e5" }}>
                  • Scope: {reportSubjectName}
                </span>
              )}
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
                {getReportMetricPairs(selectedReportType, sourceMetrics).map((pair, idx) => (
                  <div key={idx} className="ai-metric-item">
                    <div className="ai-metric-val">{pair.value}</div>
                    <div className="ai-metric-lbl">{pair.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Comparison Table (All Departments Mode) */}
          {sourceMetrics.scopeMode === "ALL_DEPARTMENTS" && Array.isArray(sourceMetrics.departmentComparison) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Department Comparison Breakdown</div>
              <div style={{ overflowX: "auto" }}>
                <table className="ai-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Code</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Department Name</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Employees</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Managers</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Active Tasks</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Completed</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Completion Rate</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Overdue Rate</th>
                      <th style={{ padding: "10px", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceMetrics.departmentComparison.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px", fontWeight: 600 }}>{d.code}</td>
                        <td style={{ padding: "10px" }}>{d.name}</td>
                        <td style={{ padding: "10px" }}>{d.employeeCount}</td>
                        <td style={{ padding: "10px" }}>{d.managerCount}</td>
                        <td style={{ padding: "10px" }}>{d.activeTasks}</td>
                        <td style={{ padding: "10px" }}>{d.completedTasks}</td>
                        <td style={{ padding: "10px", fontWeight: 600, color: d.completionRate >= 80 ? "#059669" : "#334155" }}>{d.completionRate}%</td>
                        <td style={{ padding: "10px", color: d.overdueRate > 15 ? "#dc2626" : "#334155" }}>{d.overdueRate}%</td>
                        <td style={{ padding: "10px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: d.statusIndicator === "Strong" ? "#dcfce7" : d.statusIndicator === "Needs Attention" ? "#fee2e2" : "#f1f5f9",
                            color: d.statusIndicator === "Strong" ? "#15803d" : d.statusIndicator === "Needs Attention" ? "#b91c1c" : "#475569"
                          }}>
                            {d.statusIndicator}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Month-over-Month Historical Performance Comparison */}
          {(sourceMetrics?.historicalComparison || aiAnalysis?.historicalComparison) && (() => {
            const hc = sourceMetrics?.historicalComparison || aiAnalysis?.historicalComparison;
            const m = hc?.metrics;
            if (!m) return null;

            const renderTrendBadge = (direction, deltaStr) => {
              const dirLower = (direction || "").toLowerCase();
              let badgeClass = "ai-trend-badge stable";
              let icon = "↔";

              if (dirLower === "improving") {
                badgeClass = "ai-trend-badge improving";
                icon = "↑";
              } else if (dirLower === "declining") {
                badgeClass = "ai-trend-badge declining";
                icon = "↓";
              }

              return (
                <span className={badgeClass}>
                  <span>{icon}</span> {deltaStr} {direction ? `(${direction})` : ""}
                </span>
              );
            };

            return (
              <div className="ai-section-block">
                <div className="ai-section-title" style={{ textAlign: "left" }}>
                  Month-over-Month Historical Comparison (vs. {hc.previousPeriod})
                </div>
                <div className="ai-metrics-grid">
                  {m.completionRate && (
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">Completion Rate</div>
                      <div className="ai-metric-value">{m.completionRate.current}%</div>
                      <div className="ai-metric-subtext">
                        <span>Prev: {m.completionRate.previous}%</span>
                        {renderTrendBadge(
                          m.completionRate.direction,
                          `Delta: ${m.completionRate.deltaPercentagePoints > 0 ? `+${m.completionRate.deltaPercentagePoints}` : m.completionRate.deltaPercentagePoints}%`
                        )}
                      </div>
                    </div>
                  )}
                  {m.overdueRate && (
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">Overdue Rate</div>
                      <div className="ai-metric-value">{m.overdueRate.current}%</div>
                      <div className="ai-metric-subtext">
                        <span>Prev: {m.overdueRate.previous}%</span>
                        {renderTrendBadge(
                          m.overdueRate.direction,
                          `Delta: ${m.overdueRate.deltaPercentagePoints > 0 ? `+${m.overdueRate.deltaPercentagePoints}` : m.overdueRate.deltaPercentagePoints}%`
                        )}
                      </div>
                    </div>
                  )}
                  {m.activeTasks && (
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">Active Tasks</div>
                      <div className="ai-metric-value">{m.activeTasks.current}</div>
                      <div className="ai-metric-subtext">
                        <span>Prev: {m.activeTasks.previous}</span>
                        <span className="ai-trend-badge stable">
                          Delta: {m.activeTasks.delta > 0 ? `+${m.activeTasks.delta}` : m.activeTasks.delta}
                        </span>
                      </div>
                    </div>
                  )}
                  {m.rejectionRate && (
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">Rejection Rate</div>
                      <div className="ai-metric-value">{m.rejectionRate.current}%</div>
                      <div className="ai-metric-subtext">
                        <span>Prev: {m.rejectionRate.previous}%</span>
                        {renderTrendBadge(
                          m.rejectionRate.direction,
                          `Delta: ${m.rejectionRate.deltaPercentagePoints > 0 ? `+${m.rejectionRate.deltaPercentagePoints}` : m.rejectionRate.deltaPercentagePoints}%`
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Operational Insights & Breakdown (Department, Manager, Project) */}
          {(Array.isArray(aiAnalysis.departmentInsights) || Array.isArray(aiAnalysis.managerInsights) || Array.isArray(aiAnalysis.projectInsights)) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Operational Insights & Breakdown</div>
              <div className="ai-list-box" style={{ borderLeft: "3px solid #6366f1" }}>
                <ul>
                  {[
                    ...(aiAnalysis.departmentInsights || []),
                    ...(aiAnalysis.managerInsights || []),
                    ...(aiAnalysis.projectInsights || []),
                  ].map((item, idx) => (
                    <li key={idx}>
                      {typeof item === "string" ? item.replace(/[\r\n]+/g, " ").trim() : item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Positive Developments / Strengths / Best Performing */}
          {(aiAnalysis.positiveDevelopments || aiAnalysis.whatsGoingWell || aiAnalysis.keyStrengths || sourceMetrics.bestPerformingDepartments) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Positive Developments & Strengths</div>
              <div className="ai-list-box">
                <ul>
                  {(
                    aiAnalysis.positiveDevelopments ||
                    aiAnalysis.whatsGoingWell ||
                    aiAnalysis.keyStrengths ||
                    sourceMetrics.bestPerformingDepartments ||
                    []
                  ).map((item, idx) => (
                    <li key={idx}>
                      {typeof item === "string" ? item.replace(/[\r\n]+/g, " ").trim() : item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Attention Areas / Bottlenecks / Departments Requiring Attention */}
          {(aiAnalysis.attentionAreas || aiAnalysis.bottlenecks || aiAnalysis.majorRisks || sourceMetrics.departmentsRequiringAttention) && (
            <div className="ai-section-block">
              <div className="ai-section-title">Attention Areas & Risks</div>
              <div className="ai-list-box" style={{ borderLeft: "3px solid #f59e0b" }}>
                <ul>
                  {(
                    aiAnalysis.attentionAreas ||
                    aiAnalysis.bottlenecks ||
                    aiAnalysis.majorRisks ||
                    sourceMetrics.departmentsRequiringAttention ||
                    []
                  ).map((item, idx) => (
                    <li key={idx}>
                      {typeof item === "string" ? item.replace(/[\r\n]+/g, " ").trim() : item}
                    </li>
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
                    <li key={idx}>
                      {typeof item === "string" ? item.replace(/[\r\n]+/g, " ").trim() : item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Limitations Notice */}
          {(aiAnalysis.limitations || sourceMetrics.limitations) && (
            <div className="ai-section-block" style={{ opacity: 0.85 }}>
              <div className="ai-section-title" style={{ fontSize: "13px", color: "#64748b" }}>Limitations & Scope Notice</div>
              <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                {aiAnalysis.limitations || sourceMetrics.limitations}
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
