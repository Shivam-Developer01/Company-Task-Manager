import { useState, useEffect } from "react";
import {
  FiEye,
  FiActivity,
  FiLayers,
  FiShield,
  FiSliders,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiCheckCircle,
  FiAlertTriangle,
  FiFileText,
  FiPercent,
  FiBriefcase,
  FiUserCheck,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiClock,
  FiInfo,
  FiUser,
  FiCalendar,
} from "react-icons/fi";
import analyticsService from "../../services/analyticsService";
import userService from "../../services/userService";
import projectService from "../../services/projectService";
import Loader from "../../components/Loader/Loader";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import "./RoleInsights.css";

const ALLOWED_PERSPECTIVES = {
  admin: ["admin", "manager", "employee"],
  manager: ["manager", "employee"],
  employee: ["employee"],
};

function RoleInsights() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role?.toLowerCase() || "employee";
  const allowedPerspectives = ALLOWED_PERSPECTIVES[userRole] || ["employee"];

  // LOCAL PAGE STATE ONLY — Strictly scoped to RoleInsights component
  const [selectedPerspective, setSelectedPerspective] = useState(() => {
    return allowedPerspectives.includes(userRole) ? userRole : allowedPerspectives[0];
  });

  const [selectedTargetTaskId, setSelectedTargetTaskId] = useState("");

  const [adminMetrics, setAdminMetrics] = useState(null);
  const [loadingAdminMetrics, setLoadingAdminMetrics] = useState(false);
  const [adminMetricsError, setAdminMetricsError] = useState(null);

  const [managerMetrics, setManagerMetrics] = useState(null);
  const [loadingManagerMetrics, setLoadingManagerMetrics] = useState(false);
  const [managerMetricsError, setManagerMetricsError] = useState(null);

  const [employeeMetrics, setEmployeeMetrics] = useState(null);
  const [loadingEmployeeMetrics, setLoadingEmployeeMetrics] = useState(false);
  const [employeeMetricsError, setEmployeeMetricsError] = useState(null);

  // Subject Selection State for Employee Perspective
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployeeOptions, setLoadingEmployeeOptions] = useState(false);

  // Employee Strength Table Filter State (Manager Perspective)
  const [selectedStrengthEmployeeId, setSelectedStrengthEmployeeId] = useState("ALL");

  // Safe switching handler with automatic role authorization fallback
  const handlePerspectiveChange = (newPerspective) => {
    if (allowedPerspectives.includes(newPerspective)) {
      setSelectedPerspective(newPerspective);
    } else {
      console.warn(
        `Perspective "${newPerspective}" is not permitted for role "${userRole}". Resetting to default.`
      );
      setSelectedPerspective(allowedPerspectives[0] || "employee");
    }
  };

  // Ensure current state remains valid for role
  const activePerspective = allowedPerspectives.includes(selectedPerspective)
    ? selectedPerspective
    : allowedPerspectives[0];

  // Fetch Admin Perspective Metrics when active (Admin user only)
  useEffect(() => {
    let isMounted = true;
    if (activePerspective === "admin" && userRole === "admin") {
      setLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      analyticsService
        .getCompanyAnalytics()
        .then((res) => {
          if (isMounted) {
            if (res?.success) {
              setAdminMetrics(res.data);
            } else {
              setAdminMetricsError("Unable to load company intelligence analytics.");
            }
            setLoadingAdminMetrics(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to load admin company analytics:", err);
            setAdminMetricsError(
              err.response?.data?.message || "Failed to load company intelligence analytics."
            );
            setLoadingAdminMetrics(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activePerspective, userRole]);

  // Fetch Manager Team Workload, Employee Performance, Bottlenecks, Strengths, Assignment & Action Center Metrics when active (Manager or Admin)
  useEffect(() => {
    let isMounted = true;
    if (activePerspective === "manager" && (userRole === "manager" || userRole === "admin")) {
      setLoadingManagerMetrics(true);
      setManagerMetricsError(null);
      analyticsService
        .getManagerTeamAnalytics()
        .then((res) => {
          if (isMounted) {
            if (res?.success) {
              setManagerMetrics(res.data);
            } else {
              setManagerMetricsError("Unable to load team analytics.");
            }
            setLoadingManagerMetrics(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to load manager team analytics:", err);
            setManagerMetricsError(
              err.response?.data?.message || "Failed to load team analytics."
            );
            setLoadingManagerMetrics(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activePerspective, userRole]);

  // Fetch Employee Options for Admin & Manager Subject Selector
  useEffect(() => {
    let isMounted = true;
    if (
      (userRole === "admin" || userRole === "manager") &&
      activePerspective === "employee"
    ) {
      setLoadingEmployeeOptions(true);
      userService
        .getUsers({ role: "employee", limit: 100 })
        .then((res) => {
          if (isMounted) {
            const list = res?.data || (Array.isArray(res) ? res : []);
            setEmployeeOptions(list);
            setLoadingEmployeeOptions(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to load employee options:", err);
            setLoadingEmployeeOptions(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activePerspective, userRole]);

  // Fetch Employee Perspective Metrics when active (Admin, Manager, or Employee)
  useEffect(() => {
    let isMounted = true;
    if (activePerspective === "employee") {
      if (userRole === "employee") {
        // Authenticated Employee auto-fetches self metrics
        setLoadingEmployeeMetrics(true);
        setEmployeeMetricsError(null);
        analyticsService
          .getMyEmployeeAnalytics()
          .then((res) => {
            if (isMounted) {
              if (res?.success) {
                setEmployeeMetrics(res.data);
              } else {
                setEmployeeMetricsError("Unable to load workload analytics.");
              }
              setLoadingEmployeeMetrics(false);
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.error("Failed to load employee analytics:", err);
              setEmployeeMetricsError(
                err.response?.data?.message || "Failed to load workload analytics."
              );
              setLoadingEmployeeMetrics(false);
            }
          });
      } else if (selectedEmployeeId) {
        // Admin or Manager fetches metrics for selected target employee
        setLoadingEmployeeMetrics(true);
        setEmployeeMetricsError(null);
        analyticsService
          .getEmployeeAnalyticsById(selectedEmployeeId)
          .then((res) => {
            if (isMounted) {
              if (res?.success) {
                setEmployeeMetrics(res.data);
              } else {
                setEmployeeMetricsError("Unable to load selected employee analytics.");
              }
              setLoadingEmployeeMetrics(false);
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.error("Failed to load selected employee analytics:", err);
              setEmployeeMetricsError(
                err.response?.data?.message || "Failed to load selected employee analytics."
              );
              setLoadingEmployeeMetrics(false);
            }
          });
      } else {
        // No employee selected by Admin or Manager
        setEmployeeMetrics(null);
        setLoadingEmployeeMetrics(false);
        setEmployeeMetricsError(null);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [activePerspective, userRole, selectedEmployeeId]);

  const selectedEmployeeObj =
    employeeOptions.find((emp) => emp._id === selectedEmployeeId) ||
    employeeMetrics?.employeeDetails ||
    null;

  return (
    <div className="role-insights-page">
      <div className="role-insights-header">
        <div className="header-info">
          <h2>
            <FiEye className="page-icon" /> Role Insights & Analytical Perspective
          </h2>
          <p className="subtitle">
            View dedicated organizational analytics through role-specific lenses without altering your authorization.
          </p>
        </div>

        <div className="perspective-selector-card">
          <label htmlFor="perspective-select">
            <FiSliders /> View Lens:
          </label>
          {allowedPerspectives.length > 1 ? (
            <select
              id="perspective-select"
              className="perspective-dropdown"
              value={activePerspective}
              onChange={(e) => handlePerspectiveChange(e.target.value)}
              aria-label="Select Role Insights View Perspective"
            >
              {allowedPerspectives.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)} Perspective
                </option>
              ))}
            </select>
          ) : (
            <span className="perspective-static-badge">
              {activePerspective.charAt(0).toUpperCase() + activePerspective.slice(1)} Perspective
            </span>
          )}
        </div>
      </div>

      {/* Perspective Lens Notice */}
      <div className="perspective-banner">
        <div className="banner-icon">
          <FiShield />
        </div>
        <div className="banner-text">
          <h4>
            Viewing Lens: <strong>{activePerspective.toUpperCase()} PERSPECTIVE</strong>
          </h4>
          <p>
            You are logged in as <strong>{userRole.toUpperCase()}</strong>. Switching perspective lens alters only the layout and analytics focus on this page. Your data access and security permissions remain governed by your <strong>{userRole.toUpperCase()}</strong> credentials.
          </p>
        </div>
      </div>

      {/* Perspective Content Area */}
      <div className="insights-grid">
        {/* ================= ADMIN PERSPECTIVE ================= */}
        {activePerspective === "admin" && (
          <>
            {/* 1. Organizational Attention Required */}
            {adminMetrics && !loadingAdminMetrics && (
              <div className="insight-section">
                <div className="section-title">
                  <h3><FiAlertCircle style={{ color: "#ef4444" }} /> Attention Required</h3>
                  <span className="badge-perspective admin">Decision Support</span>
                </div>

                {adminMetrics.attentionRequired && adminMetrics.attentionRequired.length > 0 ? (
                  <div className="cards-container">
                    {adminMetrics.attentionRequired.map((item) => (
                      <div
                        className="metric-card attention-card"
                        key={item.id}
                        style={{ borderLeft: `4px solid ${item.severity === "High" ? "#ef4444" : "#f59e0b"}` }}
                      >
                        <div className="metric-card-header">
                          <span className={`status-chip-indicator ${item.severity === "High" ? "danger" : "neutral"}`}>
                            {item.category} • {item.severity} Priority
                          </span>
                        </div>
                        <h4 className="attention-card-title">{item.title}</h4>
                        <p className="attention-card-text">{item.evidence}</p>
                        <div className="metric-subtitle attention-card-signal">
                          Signal: {item.metric}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>Operational Status Clear</h4>
                    <p>No critical attention items detected across active data.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. What's Going Well */}
            {adminMetrics && !loadingAdminMetrics && (
              <div className="insight-section" style={{ marginTop: "8px" }}>
                <div className="section-title">
                  <h3><FiCheckCircle style={{ color: "#10b981" }} /> What's Going Well</h3>
                  <span className="badge-perspective admin">Positive Intelligence</span>
                </div>

                {adminMetrics.whatsGoingWell && adminMetrics.whatsGoingWell.length > 0 ? (
                  <div className="cards-container">
                    {adminMetrics.whatsGoingWell.map((item) => (
                      <div
                        className="metric-card positive-card"
                        key={item.id}
                        style={{ borderLeft: "4px solid #10b981" }}
                      >
                        <div className="metric-card-header">
                          <span className="status-chip-indicator success">
                            {item.category} • Strong Performance
                          </span>
                        </div>
                        <h4 className="attention-card-title">{item.title}</h4>
                        <p className="attention-card-text">{item.evidence}</p>
                        <div className="metric-subtitle attention-card-signal" style={{ color: "#047857" }}>
                          Signal: {item.metric}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>Operational Baseline</h4>
                    <p>No significant positive operational signals detected yet based on current data.</p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Trend Intelligence */}
            {adminMetrics && !loadingAdminMetrics && adminMetrics.trends && (
              <div className="insight-section" style={{ marginTop: "8px" }}>
                <div className="section-title">
                  <h3><FiTrendingUp style={{ color: "#10b981" }} /> Trend Intelligence</h3>
                  <span className="badge-perspective admin">{adminMetrics.trends.periodLabel}</span>
                </div>

                <div className="cards-container">
                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Tasks Completed</h4>
                      {adminMetrics.trends.completedTasks.isPositive ? (
                        <FiTrendingUp className="metric-icon" style={{ color: "#10b981" }} />
                      ) : (
                        <FiTrendingDown className="metric-icon" style={{ color: "#ef4444" }} />
                      )}
                    </div>
                    <div className="metric-value">{adminMetrics.trends.completedTasks.current}</div>
                    <div className="metric-subtitle">
                      vs {adminMetrics.trends.completedTasks.previous} last month ({adminMetrics.trends.completedTasks.changeText})
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Tasks Created</h4>
                      <FiTrendingUp className="metric-icon" style={{ color: "#3b82f6" }} />
                    </div>
                    <div className="metric-value">{adminMetrics.trends.createdTasks.current}</div>
                    <div className="metric-subtitle">
                      vs {adminMetrics.trends.createdTasks.previous} last month ({adminMetrics.trends.createdTasks.changeText})
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Submissions Reviewed</h4>
                      {adminMetrics.trends.reviewedSubmissions.isPositive ? (
                        <FiTrendingUp className="metric-icon" style={{ color: "#10b981" }} />
                      ) : (
                        <FiTrendingDown className="metric-icon" style={{ color: "#ef4444" }} />
                      )}
                    </div>
                    <div className="metric-value">{adminMetrics.trends.reviewedSubmissions.current}</div>
                    <div className="metric-subtitle">
                      vs {adminMetrics.trends.reviewedSubmissions.previous} last month ({adminMetrics.trends.reviewedSubmissions.changeText})
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Company Intelligence Overview */}
            <div className="insight-section" style={{ marginTop: "8px" }}>
              <div className="section-title">
                <h3><FiActivity /> Company Intelligence Overview</h3>
                <span className="badge-perspective admin">Admin Lens</span>
              </div>

              {loadingAdminMetrics ? (
                <div className="insights-loading">
                  <Loader />
                  <p>Loading company intelligence analytics...</p>
                </div>
              ) : adminMetricsError ? (
                <div className="insights-error">
                  <p>{adminMetricsError}</p>
                </div>
              ) : adminMetrics ? (
                <div className="cards-container">
                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Active Employees</h4>
                      <FiUsers className="metric-icon" />
                    </div>
                    <div className="metric-value">{adminMetrics.users.activeEmployees}</div>
                    <div className="metric-subtitle">
                      out of {adminMetrics.users.totalEmployees} total registered employees
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Active Projects</h4>
                      <FiFolder className="metric-icon" />
                    </div>
                    <div className="metric-value">{adminMetrics.projects.activeProjects}</div>
                    <div className="metric-subtitle">
                      out of {adminMetrics.projects.totalProjects} total company projects
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Active Tasks</h4>
                      <FiCheckSquare className="metric-icon" />
                    </div>
                    <div className="metric-value">{adminMetrics.tasks.activeTasks}</div>
                    <div className="metric-subtitle">
                      tasks currently in progress or assigned
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Completed Tasks</h4>
                      <FiCheckCircle className="metric-icon" />
                    </div>
                    <div className="metric-value">{adminMetrics.tasks.completedTasks}</div>
                    <div className="metric-subtitle">
                      closed and verified tasks
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Overdue Tasks</h4>
                      <FiAlertTriangle className="metric-icon" style={{ color: "#ef4444" }} />
                    </div>
                    <div className="metric-value" style={{ color: adminMetrics.tasks.overdueTasks > 0 ? "#ef4444" : "#0f172a" }}>
                      {adminMetrics.tasks.overdueTasks}
                    </div>
                    <div className="metric-subtitle">
                      active tasks past due date
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Pending Reviews</h4>
                      <FiFileText className="metric-icon" style={{ color: "#f59e0b" }} />
                    </div>
                    <div className="metric-value" style={{ color: adminMetrics.tasks.pendingReviews > 0 ? "#f59e0b" : "#0f172a" }}>
                      {adminMetrics.tasks.pendingReviews}
                    </div>
                    <div className="metric-subtitle">
                      task submissions awaiting review
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Completion Rate</h4>
                      <FiPercent className="metric-icon" style={{ color: "#10b981" }} />
                    </div>
                    <div className="metric-value" style={{ color: "#10b981" }}>
                      {adminMetrics.tasks.taskCompletionRate}%
                    </div>
                    <div className="metric-subtitle">
                      ratio of closed tasks over non-withdrawn tasks
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Overdue Rate</h4>
                      <FiPercent className="metric-icon" style={{ color: "#ef4444" }} />
                    </div>
                    <div className="metric-value" style={{ color: adminMetrics.tasks.overdueRate > 0 ? "#ef4444" : "#0f172a" }}>
                      {adminMetrics.tasks.overdueRate}%
                    </div>
                    <div className="metric-subtitle">
                      ratio of overdue tasks over active workload
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 5. Department Performance Intelligence */}
            {adminMetrics && !loadingAdminMetrics && (
              <div className="insight-section" style={{ marginTop: "8px" }}>
                <div className="section-title">
                  <h3><FiBriefcase /> Department Performance Intelligence</h3>
                  <span className="badge-perspective admin">Comparative Analytics</span>
                </div>

                {adminMetrics.departments && adminMetrics.departments.length > 0 ? (
                  <div className="table-responsive-container">
                    <table className="dept-performance-table dept-table">
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th>Active Employees</th>
                          <th>Active Tasks</th>
                          <th>Completed</th>
                          <th>Overdue</th>
                          <th>Pending Reviews</th>
                          <th>Completion Rate</th>
                          <th>Overdue Rate</th>
                          <th>Status Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminMetrics.departments.map((dept) => (
                          <tr key={dept.id}>
                            <td>
                              <div className="dept-name-cell">
                                <strong>{dept.name}</strong>
                                <span className="dept-code-pill">{dept.code}</span>
                              </div>
                            </td>
                            <td>{dept.activeEmployees} / {dept.totalEmployees}</td>
                            <td>{dept.activeTasks}</td>
                            <td>{dept.completedTasks}</td>
                            <td style={{ color: dept.overdueTasks > 0 ? "#ef4444" : "inherit" }}>
                              {dept.overdueTasks}
                            </td>
                            <td style={{ color: dept.pendingReviews > 0 ? "#f59e0b" : "inherit" }}>
                              {dept.pendingReviews}
                            </td>
                            <td style={{ fontWeight: "700", color: "#10b981" }}>
                              {dept.completionRate}%
                            </td>
                            <td style={{ fontWeight: "700", color: dept.overdueRate > 15 ? "#ef4444" : "#475569" }}>
                              {dept.overdueRate}%
                            </td>
                            <td>
                              <span
                                className={`status-chip-indicator ${
                                  dept.statusIndicator === "Needs Attention"
                                    ? "danger"
                                    : dept.statusIndicator === "Strong"
                                    ? "success"
                                    : "neutral"
                                }`}
                              >
                                {dept.statusIndicator}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>Department Performance</h4>
                    <p>No active departments currently found for comparison.</p>
                  </div>
                )}
              </div>
            )}

            {/* 6. Manager Performance Intelligence */}
            {adminMetrics && !loadingAdminMetrics && (
              <div className="insight-section" style={{ marginTop: "8px" }}>
                <div className="section-title">
                  <h3><FiUserCheck /> Manager Performance Intelligence</h3>
                  <span className="badge-perspective admin">Manager Overview</span>
                </div>

                {adminMetrics.managers && adminMetrics.managers.length > 0 ? (
                  <div className="table-responsive-container">
                    <table className="dept-performance-table manager-table">
                      <thead>
                        <tr>
                          <th>Manager</th>
                          <th>Department</th>
                          <th>Active Projects</th>
                          <th>Active Tasks</th>
                          <th>Completed</th>
                          <th>Overdue</th>
                          <th>Pending Reviews</th>
                          <th>Rejections</th>
                          <th>Completion Rate</th>
                          <th>Overdue Rate</th>
                          <th>Status Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminMetrics.managers.map((mgr) => (
                          <tr key={mgr.id}>
                            <td>
                              <div className="dept-name-cell">
                                <strong>{mgr.name}</strong>
                                <span className="dept-code-pill">{mgr.employeeId}</span>
                              </div>
                            </td>
                            <td>{mgr.department}</td>
                            <td>{mgr.activeProjects} / {mgr.totalProjects}</td>
                            <td>{mgr.activeTasks}</td>
                            <td>{mgr.completedTasks}</td>
                            <td style={{ color: mgr.overdueTasks > 0 ? "#ef4444" : "inherit" }}>
                              {mgr.overdueTasks}
                            </td>
                            <td style={{ color: mgr.pendingReviews > 0 ? "#f59e0b" : "inherit" }}>
                              {mgr.pendingReviews}
                            </td>
                            <td style={{ color: mgr.rejectedTasks > 0 ? "#ef4444" : "inherit" }}>
                              {mgr.rejectedTasks}
                            </td>
                            <td style={{ fontWeight: "700", color: "#10b981" }}>
                              {mgr.completionRate}%
                            </td>
                            <td style={{ fontWeight: "700", color: mgr.overdueRate > 15 ? "#ef4444" : "#475569" }}>
                              {mgr.overdueRate}%
                            </td>
                            <td>
                              <span
                                className={`status-chip-indicator ${
                                  mgr.statusIndicator === "Needs Attention"
                                    ? "danger"
                                    : mgr.statusIndicator === "Strong"
                                    ? "success"
                                    : "neutral"
                                }`}
                              >
                                {mgr.statusIndicator}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>Manager Performance</h4>
                    <p>No active managers currently found for evaluation.</p>
                  </div>
                )}
              </div>
            )}

            {/* 7. Project Health & Organizational Risk Intelligence */}
            {adminMetrics && !loadingAdminMetrics && (
              <div className="insight-section" style={{ marginTop: "8px" }}>
                <div className="section-title">
                  <h3><FiFolder /> Project Health & Organizational Risk</h3>
                  <span className="badge-perspective admin">Risk Intelligence</span>
                </div>

                {adminMetrics.projectHealth && adminMetrics.projectHealth.length > 0 ? (
                  <div className="table-responsive-container">
                    <table className="dept-performance-table project-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Manager</th>
                          <th>Members</th>
                          <th>Phases</th>
                          <th>Active Tasks</th>
                          <th>Completed</th>
                          <th>Overdue</th>
                          <th>Pending Reviews</th>
                          <th>Completion Rate</th>
                          <th>Overdue Rate</th>
                          <th>Risk Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminMetrics.projectHealth.map((proj) => (
                          <tr key={proj.id}>
                            <td>
                              <div className="dept-name-cell">
                                <strong>{proj.name}</strong>
                                <span className="dept-code-pill">{proj.code}</span>
                              </div>
                            </td>
                            <td>{proj.managerName}</td>
                            <td>{proj.memberCount} members</td>
                            <td>{proj.phaseCount > 0 ? `${proj.phaseCount} phases` : "Direct Tasks"}</td>
                            <td>{proj.activeTasks}</td>
                            <td>{proj.completedTasks}</td>
                            <td style={{ color: proj.overdueTasks > 0 ? "#ef4444" : "inherit" }}>
                              {proj.overdueTasks}
                            </td>
                            <td style={{ color: proj.pendingReviews > 0 ? "#f59e0b" : "inherit" }}>
                              {proj.pendingReviews}
                            </td>
                            <td style={{ fontWeight: "700", color: "#10b981" }}>
                              {proj.completionRate}%
                            </td>
                            <td style={{ fontWeight: "700", color: proj.overdueRate > 15 ? "#ef4444" : "#475569" }}>
                              {proj.overdueRate}%
                            </td>
                            <td>
                              <span
                                className={`status-chip-indicator ${
                                  proj.statusIndicator === "At Risk"
                                    ? "danger"
                                    : proj.statusIndicator === "Needs Attention"
                                    ? "danger"
                                    : "success"
                                }`}
                              >
                                {proj.statusIndicator}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>Project Health & Risk</h4>
                    <p>No active projects currently found for organizational risk analysis.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= MANAGER PERSPECTIVE ================= */}
        {activePerspective === "manager" && (
          <>
            {/* 1. Manager Action Center — PLACED AT VERY TOP OF MANAGER PERSPECTIVE */}
            {managerMetrics && !loadingManagerMetrics && managerMetrics.actionCenter && (
              <div className="insight-section" style={{ marginBottom: "20px" }}>
                <div className="section-title">
                  <h3><FiAlertCircle style={{ color: "#ef4444" }} /> Manager Action Center</h3>
                  <span className="badge-perspective manager">Priority Decision Hub</span>
                </div>

                <div className="action-center-container">
                  {/* 🔴 Needs Attention */}
                  {managerMetrics.actionCenter.needsAttention &&
                  managerMetrics.actionCenter.needsAttention.length > 0 ? (
                    <div className="action-category-block">
                      <h4 style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FiAlertTriangle /> Needs Attention ({managerMetrics.actionCenter.needsAttention.length})
                      </h4>
                      <div className="cards-container">
                        {managerMetrics.actionCenter.needsAttention.map((item) => (
                          <div
                            className="metric-card attention-card"
                            key={item.id}
                            style={{ borderLeft: "4px solid #ef4444" }}
                          >
                            <div className="metric-card-header">
                              <span className="status-chip-indicator danger">
                                {item.category} • High Priority
                              </span>
                            </div>
                            <h4 className="attention-card-title">{item.title}</h4>
                            <p className="attention-card-text">{item.evidence}</p>
                            <div className="metric-subtitle attention-card-signal">
                              Signal: {item.metric}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* 🟡 Consider */}
                  {managerMetrics.actionCenter.consider &&
                  managerMetrics.actionCenter.consider.length > 0 ? (
                    <div className="action-category-block" style={{ marginTop: "12px" }}>
                      <h4 style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FiAlertCircle /> Consider ({managerMetrics.actionCenter.consider.length})
                      </h4>
                      <div className="cards-container">
                        {managerMetrics.actionCenter.consider.map((item) => (
                          <div
                            className="metric-card attention-card"
                            key={item.id}
                            style={{ borderLeft: "4px solid #f59e0b" }}
                          >
                            <div className="metric-card-header">
                              <span className="status-chip-indicator neutral">
                                {item.category} • Review Suggested
                              </span>
                            </div>
                            <h4 className="attention-card-title">{item.title}</h4>
                            <p className="attention-card-text">{item.evidence}</p>
                            <div className="metric-subtitle attention-card-signal" style={{ color: "#d97706" }}>
                              Signal: {item.metric}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* 🟢 Going Well */}
                  {managerMetrics.actionCenter.goingWell &&
                  managerMetrics.actionCenter.goingWell.length > 0 ? (
                    <div className="action-category-block" style={{ marginTop: "12px" }}>
                      <h4 style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FiCheckCircle /> Going Well ({managerMetrics.actionCenter.goingWell.length})
                      </h4>
                      <div className="cards-container">
                        {managerMetrics.actionCenter.goingWell.map((item) => (
                          <div
                            className="metric-card positive-card"
                            key={item.id}
                            style={{ borderLeft: "4px solid #10b981" }}
                          >
                            <div className="metric-card-header">
                              <span className="status-chip-indicator success">
                                {item.category} • Strong Operational Status
                              </span>
                            </div>
                            <h4 className="attention-card-title">{item.title}</h4>
                            <p className="attention-card-text">{item.evidence}</p>
                            <div className="metric-subtitle attention-card-signal" style={{ color: "#047857" }}>
                              Signal: {item.metric}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Empty State */}
                  {managerMetrics.actionCenter.needsAttention.length === 0 &&
                    managerMetrics.actionCenter.consider.length === 0 &&
                    managerMetrics.actionCenter.goingWell.length === 0 && (
                      <div className="foundation-card">
                        <h4>No Action Center Signals</h4>
                        <p>No immediate operational action signals currently detected for your team scope.</p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* 2. Team Workload Intelligence */}
            <div className="insight-section">
              <div className="section-title">
                <h3><FiActivity /> Team Workload Intelligence</h3>
                <span className="badge-perspective manager">Manager Lens</span>
              </div>

              {loadingManagerMetrics ? (
                <div className="insights-loading">
                  <Loader />
                  <p>Loading team workload analytics...</p>
                </div>
              ) : managerMetricsError ? (
                <div className="insights-error">
                  <p>{managerMetricsError}</p>
                </div>
              ) : managerMetrics ? (
                <>
                  {/* Team Summary Overview Cards */}
                  <div className="cards-container">
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Team Members</h4>
                        <FiUsers className="metric-icon" />
                      </div>
                      <div className="metric-value">{managerMetrics.teamSize}</div>
                      <div className="metric-subtitle">
                        employees assigned work in accessible scope
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Active Workload</h4>
                        <FiCheckSquare className="metric-icon" />
                      </div>
                      <div className="metric-value">{managerMetrics.totalActiveTasks}</div>
                      <div className="metric-subtitle">
                        active tasks currently assigned or in progress
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Overdue Tasks</h4>
                        <FiAlertTriangle className="metric-icon" style={{ color: "#ef4444" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: managerMetrics.totalOverdueTasks > 0 ? "#ef4444" : "#0f172a" }}
                      >
                        {managerMetrics.totalOverdueTasks}
                      </div>
                      <div className="metric-subtitle">
                        active team tasks past due date
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Pending Reviews</h4>
                        <FiFileText className="metric-icon" style={{ color: "#f59e0b" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: managerMetrics.pendingReviewCount > 0 ? "#f59e0b" : "#0f172a" }}
                      >
                        {managerMetrics.pendingReviewCount}
                      </div>
                      <div className="metric-subtitle">
                        team submissions awaiting manager review
                      </div>
                    </div>
                  </div>

                  {/* Employee Workload Distribution Table */}
                  <div className="insight-section" style={{ marginTop: "16px" }}>
                    <div className="section-title">
                      <h3><FiUsers /> Employee Workload Distribution</h3>
                      <span className="badge-perspective manager">Team Breakdown</span>
                    </div>

                    {managerMetrics.teamWorkloadDistribution &&
                    managerMetrics.teamWorkloadDistribution.length > 0 ? (
                      <div className="table-responsive-container">
                        <table className="dept-performance-table team-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Active Tasks</th>
                              <th>Completed Tasks</th>
                              <th>Overdue Tasks</th>
                              <th>Pending Reviews</th>
                              <th>Completion Rate</th>
                              <th>Work Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {managerMetrics.teamWorkloadDistribution.map((emp) => (
                              <tr key={emp.employeeId}>
                                <td>
                                  <div className="dept-name-cell">
                                    <strong>{emp.employeeName}</strong>
                                    <span className="dept-code-pill">{emp.employeeCode}</span>
                                  </div>
                                </td>
                                <td>{emp.activeTasks}</td>
                                <td>{emp.completedTasks}</td>
                                <td style={{ color: emp.overdueTasks > 0 ? "#ef4444" : "inherit" }}>
                                  {emp.overdueTasks}
                                </td>
                                <td style={{ color: emp.pendingReviews > 0 ? "#f59e0b" : "inherit" }}>
                                  {emp.pendingReviews}
                                </td>
                                <td style={{ fontWeight: "700", color: "#10b981" }}>
                                  {emp.completionRate}%
                                </td>
                                <td style={{ fontWeight: "700", color: "#3b82f6" }}>
                                  {emp.workShare}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="foundation-card">
                        <h4>No Active Team Workload</h4>
                        <p>No active task workload currently assigned to your accessible team.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* 3. Employee Performance Intelligence */}
            {managerMetrics && !loadingManagerMetrics && (
              <div className="insight-section" style={{ marginTop: "16px" }}>
                <div className="section-title">
                  <h3><FiUserCheck /> Employee Performance Intelligence</h3>
                  <span className="badge-perspective manager">Execution Analytics</span>
                </div>

                {managerMetrics.employeePerformance &&
                managerMetrics.employeePerformance.length > 0 ? (
                  <div className="table-responsive-container">
                    <table className="dept-performance-table manager-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Total Assigned</th>
                          <th>Completed</th>
                          <th>Active Tasks</th>
                          <th>Overdue Rate</th>
                          <th>Completion Rate</th>
                          <th>Pending Reviews</th>
                          <th>Rejections</th>
                          <th>Execution Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managerMetrics.employeePerformance.map((emp) => (
                          <tr key={`perf-${emp.employeeId}`}>
                            <td>
                              <div className="dept-name-cell">
                                <strong>{emp.employeeName}</strong>
                                <span className="dept-code-pill">{emp.employeeCode}</span>
                              </div>
                            </td>
                            <td>{emp.totalTasks}</td>
                            <td>{emp.completedTasks}</td>
                            <td>{emp.activeTasks}</td>
                            <td style={{ fontWeight: "700", color: emp.overdueRate > 15 ? "#ef4444" : "#475569" }}>
                              {emp.overdueRate}%
                            </td>
                            <td style={{ fontWeight: "700", color: "#10b981" }}>
                              {emp.completionRate}%
                            </td>
                            <td style={{ color: emp.pendingReviews > 0 ? "#f59e0b" : "inherit" }}>
                              {emp.pendingReviews}
                            </td>
                            <td style={{ color: emp.rejectedTasks > 0 ? "#ef4444" : "inherit" }}>
                              {emp.rejectedTasks || 0}
                            </td>
                            <td>
                              <span
                                className={`status-chip-indicator ${
                                  emp.executionStatus === "Needs Attention"
                                    ? "danger"
                                    : emp.executionStatus === "Strong Execution"
                                    ? "success"
                                    : "neutral"
                                }`}
                              >
                                {emp.executionStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="foundation-card">
                    <h4>No Employee Performance Data</h4>
                    <p>No active performance data currently available for your accessible team.</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Bottlenecks & Deadline Risk */}
            {managerMetrics && !loadingManagerMetrics && managerMetrics.bottlenecksAndRisks && (
              <div className="insight-section" style={{ marginTop: "16px" }}>
                <div className="section-title">
                  <h3><FiAlertTriangle style={{ color: "#ef4444" }} /> Bottlenecks & Deadline Risk</h3>
                  <span className="badge-perspective manager">Risk & Backlog Intelligence</span>
                </div>

                {/* Summary Cards */}
                <div className="cards-container">
                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Overdue Tasks</h4>
                      <FiAlertTriangle className="metric-icon" style={{ color: "#ef4444" }} />
                    </div>
                    <div
                      className="metric-value"
                      style={{ color: managerMetrics.bottlenecksAndRisks.overdueTasksList.length > 0 ? "#ef4444" : "#0f172a" }}
                    >
                      {managerMetrics.bottlenecksAndRisks.overdueTasksList.length}
                    </div>
                    <div className="metric-subtitle">
                      active tasks past scheduled due date
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Upcoming Deadline Risk</h4>
                      <FiAlertCircle className="metric-icon" style={{ color: "#f59e0b" }} />
                    </div>
                    <div
                      className="metric-value"
                      style={{ color: managerMetrics.bottlenecksAndRisks.upcomingDeadlinesList.length > 0 ? "#f59e0b" : "#0f172a" }}
                    >
                      {managerMetrics.bottlenecksAndRisks.upcomingDeadlinesList.length}
                    </div>
                    <div className="metric-subtitle">
                      active tasks due within next 3 days
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Review Backlog</h4>
                      <FiFileText className="metric-icon" style={{ color: "#3b82f6" }} />
                    </div>
                    <div
                      className="metric-value"
                      style={{ color: managerMetrics.bottlenecksAndRisks.pendingReviewsList.length > 0 ? "#3b82f6" : "#0f172a" }}
                    >
                      {managerMetrics.bottlenecksAndRisks.pendingReviewsList.length}
                    </div>
                    <div className="metric-subtitle">
                      submissions awaiting manager verification
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-header">
                      <h4>Project / Phase Risks</h4>
                      <FiFolder className="metric-icon" style={{ color: "#8b5cf6" }} />
                    </div>
                    <div className="metric-value">
                      {managerMetrics.bottlenecksAndRisks.projectPhaseBottlenecks.length}
                    </div>
                    <div className="metric-subtitle">
                      projects or phases with concentrated delays
                    </div>
                  </div>
                </div>

                {/* Overdue Task Breakdown Table */}
                {managerMetrics.bottlenecksAndRisks.overdueTasksList.length > 0 && (
                  <div className="insight-section" style={{ marginTop: "16px" }}>
                    <div className="section-title">
                      <h3><FiAlertTriangle style={{ color: "#ef4444" }} /> Overdue Task Breakdown</h3>
                      <span className="badge-perspective manager">High Priority Action</span>
                    </div>
                    <div className="table-responsive-container">
                      <table className="dept-performance-table project-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Assignee</th>
                            <th>Project (Phase)</th>
                            <th>Priority</th>
                            <th>Due Date</th>
                            <th>Days Overdue</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managerMetrics.bottlenecksAndRisks.overdueTasksList.map((task) => (
                            <tr key={task.id}>
                              <td><strong>{task.title}</strong></td>
                              <td>
                                <div className="dept-name-cell">
                                  <span>{task.assigneeName}</span>
                                  <span className="dept-code-pill">{task.assigneeCode}</span>
                                </div>
                              </td>
                              <td>
                                {task.projectName}
                                {task.phaseName ? ` (${task.phaseName})` : ""}
                              </td>
                              <td>
                                <span className={`status-chip-indicator ${task.priority === "High" ? "danger" : "neutral"}`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td style={{ color: "#ef4444", fontWeight: "700" }}>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </td>
                              <td style={{ color: "#ef4444", fontWeight: "700" }}>
                                {task.daysOverdue} days overdue
                              </td>
                              <td>
                                <span className="status-chip-indicator neutral">{task.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pending Review Backlog Table */}
                {managerMetrics.bottlenecksAndRisks.pendingReviewsList.length > 0 && (
                  <div className="insight-section" style={{ marginTop: "16px" }}>
                    <div className="section-title">
                      <h3><FiFileText style={{ color: "#f59e0b" }} /> Pending Review Backlog</h3>
                      <span className="badge-perspective manager">Approval Bottleneck</span>
                    </div>
                    <div className="table-responsive-container">
                      <table className="dept-performance-table manager-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Submitted By</th>
                            <th>Project (Phase)</th>
                            <th>Submitted At</th>
                            <th>Waiting Time</th>
                            <th>Action Needed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managerMetrics.bottlenecksAndRisks.pendingReviewsList.map((sub) => (
                            <tr key={sub.id}>
                              <td><strong>{sub.taskTitle}</strong></td>
                              <td>
                                <div className="dept-name-cell">
                                  <span>{sub.submittedByName}</span>
                                  <span className="dept-code-pill">{sub.submittedByCode}</span>
                                </div>
                              </td>
                              <td>
                                {sub.projectName}
                                {sub.phaseName ? ` (${sub.phaseName})` : ""}
                              </td>
                              <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                              <td style={{ color: sub.waitingDays > 2 ? "#ef4444" : "#f59e0b", fontWeight: "700" }}>
                                {sub.waitingDays} days in review
                              </td>
                              <td>
                                <span className="status-chip-indicator danger">Review Required</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Empty State when no bottlenecks exist */}
                {managerMetrics.bottlenecksAndRisks.overdueTasksList.length === 0 &&
                  managerMetrics.bottlenecksAndRisks.upcomingDeadlinesList.length === 0 &&
                  managerMetrics.bottlenecksAndRisks.pendingReviewsList.length === 0 && (
                    <div className="foundation-card" style={{ marginTop: "12px" }}>
                      <h4>No Operational Bottlenecks Detected</h4>
                      <p>No immediate overdue tasks, deadline risks, or submission review backlogs found across your team's scope.</p>
                    </div>
                  )}
              </div>
            )}

            {/* 5. Employee Strength & Work-Type Intelligence */}
            {managerMetrics && !loadingManagerMetrics && managerMetrics.employeeStrengths && (() => {
              const allStrengthEmployees = managerMetrics.employeeStrengths.employeeStrengthsList || [];
              const filteredStrengthEmployees = selectedStrengthEmployeeId === "ALL"
                ? allStrengthEmployees
                : allStrengthEmployees.filter((emp) => {
                    const idStr = (emp.employeeId || emp.employeeCode || emp.id || "").toString();
                    return idStr === selectedStrengthEmployeeId;
                  });

              const hasRowsToRender = filteredStrengthEmployees.some(
                (emp) => emp.priorityBreakdown && emp.priorityBreakdown.length > 0
              );

              return (
                <div className="insight-section" style={{ marginTop: "16px" }}>
                  <div className="section-title">
                    <h3><FiShield style={{ color: "#8b5cf6" }} /> Employee Strength & Work-Type Intelligence</h3>
                    <span className="badge-perspective manager">Execution Evidence</span>
                  </div>

                  {/* Transparent Schema Limitation Notice */}
                  <div className="perspective-banner" style={{ background: "#f8fafc", borderLeft: "4px solid #8b5cf6", marginBottom: "16px" }}>
                    <div className="banner-icon" style={{ color: "#8b5cf6" }}>
                      <FiShield />
                    </div>
                    <div className="banner-text">
                      <h4 style={{ color: "#1e293b", margin: "0 0 4px 0" }}>
                        Structured Priority & Domain Execution Evidence
                      </h4>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12.5px" }}>
                        {managerMetrics.employeeStrengths.limitationNotice}
                      </p>
                    </div>
                  </div>

                  {/* Employee Filter Dropdown */}
                  {allStrengthEmployees.length > 0 && (
                    <div
                      className="filter-bar"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        htmlFor="strength-employee-filter"
                        style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}
                      >
                        Employee:
                      </label>
                      <select
                        id="strength-employee-filter"
                        className="perspective-select"
                        value={selectedStrengthEmployeeId}
                        onChange={(e) => setSelectedStrengthEmployeeId(e.target.value)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#1e293b",
                          cursor: "pointer",
                          maxWidth: "100%",
                        }}
                      >
                        <option value="ALL">All Employees</option>
                        {allStrengthEmployees.map((emp) => {
                          const optionVal = (emp.employeeId || emp.employeeCode || emp.id || "").toString();
                          return (
                            <option key={optionVal} value={optionVal}>
                              {emp.employeeName} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Employee Strength Breakdown Table */}
                  {hasRowsToRender ? (
                    <div className="table-responsive-container">
                      <table className="dept-performance-table project-table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Priority Tier</th>
                            <th>Total Tasks</th>
                            <th>Completed</th>
                            <th>Overdue</th>
                            <th>Completion Rate</th>
                            <th>Evidence Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStrengthEmployees.flatMap((emp) =>
                            (emp.priorityBreakdown || []).map((item, idx) => (
                              <tr key={`${emp.employeeId || emp.employeeCode}-${item.priorityTier}-${idx}`}>
                                <td>
                                  <div className="dept-name-cell">
                                    <strong>{emp.employeeName}</strong>
                                    <span className="dept-code-pill">{emp.employeeCode}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-chip-indicator ${item.priorityTier === "High" || item.priorityTier === "Critical" ? "danger" : "neutral"}`}>
                                    {item.priorityTier} Priority
                                  </span>
                                </td>
                                <td>{item.totalTasks}</td>
                                <td>{item.completedTasks}</td>
                                <td style={{ color: item.overdueTasks > 0 ? "#ef4444" : "inherit" }}>
                                  {item.overdueTasks}
                                </td>
                                <td style={{ fontWeight: "700", color: "#10b981" }}>
                                  {item.completionRate}%
                                </td>
                                <td>
                                  <span
                                    className={`status-chip-indicator ${
                                      item.evidenceLevel === "Strong Execution Indicator"
                                        ? "success"
                                        : "neutral"
                                    }`}
                                  >
                                    {item.evidenceLevel}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="foundation-card">
                      <h4>No Execution Strength Evidence Available</h4>
                      <p>
                        {selectedStrengthEmployeeId !== "ALL"
                          ? "No records available for this employee."
                          : "No task execution history available across accessible priority tiers."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 6. Assignment Intelligence */}
            {managerMetrics && !loadingManagerMetrics && managerMetrics.assignmentIntelligence && (
              <div className="insight-section" style={{ marginTop: "16px" }}>
                <div className="section-title">
                  <h3><FiUserCheck style={{ color: "#3b82f6" }} /> Assignment Intelligence</h3>
                  <span className="badge-perspective manager">Decision Support & Candidate Evidence</span>
                </div>

                {/* Informational Guidance Notice */}
                <div className="perspective-banner" style={{ background: "#eff6ff", borderLeft: "4px solid #3b82f6", marginBottom: "16px" }}>
                  <div className="banner-icon" style={{ color: "#3b82f6" }}>
                    <FiShield />
                  </div>
                  <div className="banner-text">
                    <h4 style={{ color: "#1e3a8a", margin: "0 0 4px 0" }}>
                      Informational Candidate Evidence
                    </h4>
                    <p style={{ margin: 0, color: "#1e40af", fontSize: "12.5px" }}>
                      {managerMetrics.assignmentIntelligence.guidanceNotice}
                    </p>
                  </div>
                </div>

                {managerMetrics.assignmentIntelligence.selectableTasks &&
                managerMetrics.assignmentIntelligence.selectableTasks.length > 0 ? (
                  <>
                    {/* Target Task Selector */}
                    <div className="perspective-selector-card" style={{ marginBottom: "16px" }}>
                      <label htmlFor="target-task-select">
                        <FiCheckSquare /> Evaluate Target Task:
                      </label>
                      <select
                        id="target-task-select"
                        className="perspective-dropdown"
                        value={selectedTargetTaskId || managerMetrics.assignmentIntelligence.selectableTasks[0]?.id}
                        onChange={(e) => setSelectedTargetTaskId(e.target.value)}
                      >
                        {managerMetrics.assignmentIntelligence.selectableTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.projectName} • {t.priority} Priority)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Candidate Evidence Breakdown */}
                    {(() => {
                      const currentTaskId =
                        selectedTargetTaskId || managerMetrics.assignmentIntelligence.selectableTasks[0]?.id;
                      const targetTask = managerMetrics.assignmentIntelligence.selectableTasks.find(
                        (t) => t.id === currentTaskId
                      );
                      if (!targetTask) return null;

                      const candidateList = (managerMetrics.assignmentIntelligence.candidates || []).map((c) => {
                        const projectExp = (targetTask.projectId && c.projectExperience[targetTask.projectId]) || 0;
                        const priorityExp = (targetTask.priority && c.priorityExperience[targetTask.priority]) || 0;

                        let category = "Viable Candidate";
                        if (c.totalActive <= 4 && c.totalOverdue === 0 && (projectExp > 0 || c.totalCompleted >= 3)) {
                          category = "Recommended Candidate";
                        } else if (c.totalActive > 6 || c.totalOverdue > 1) {
                          category = "High Workload Candidate";
                        }

                        return {
                          ...c,
                          projectExp,
                          priorityExp,
                          category,
                        };
                      });

                      return (
                        <div>
                          <h4 style={{ color: "#334155", margin: "12px 0 8px 0" }}>
                            Candidate Evidence for <strong>{targetTask.title}</strong>
                          </h4>
                          <div className="table-responsive-container">
                            <table className="dept-performance-table manager-table">
                              <thead>
                                <tr>
                                  <th>Candidate Employee</th>
                                  <th>Active Workload</th>
                                  <th>Overdue Tasks</th>
                                  <th>Completed Tasks</th>
                                  <th>Project Experience</th>
                                  <th>Priority Tier Exp</th>
                                  <th>Evidence Category</th>
                                </tr>
                              </thead>
                              <tbody>
                                {candidateList.map((cand) => (
                                  <tr key={cand.employeeId}>
                                    <td>
                                      <div className="dept-name-cell">
                                        <strong>{cand.employeeName}</strong>
                                        <span className="dept-code-pill">{cand.employeeCode}</span>
                                      </div>
                                    </td>
                                    <td>{cand.totalActive} active tasks</td>
                                    <td style={{ color: cand.totalOverdue > 0 ? "#ef4444" : "inherit" }}>
                                      {cand.totalOverdue} overdue
                                    </td>
                                    <td>{cand.totalCompleted} completed</td>
                                    <td>
                                      {cand.projectExp > 0
                                        ? `${cand.projectExp} tasks in ${targetTask.projectName}`
                                        : "No prior project tasks"}
                                    </td>
                                    <td>
                                      {cand.priorityExp > 0
                                        ? `${cand.priorityExp} ${targetTask.priority} priority tasks`
                                        : "General experience"}
                                    </td>
                                    <td>
                                      <span
                                        className={`status-chip-indicator ${
                                          cand.category === "Recommended Candidate"
                                            ? "success"
                                            : cand.category === "High Workload Candidate"
                                            ? "danger"
                                            : "neutral"
                                        }`}
                                      >
                                        {cand.category}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="foundation-card">
                    <h4>No Target Tasks Available</h4>
                    <p>No active tasks currently found in your scope to evaluate assignment candidates.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= EMPLOYEE PERSPECTIVE ================= */}
        {activePerspective === "employee" && (
          <div className="insight-section">
            {/* Employee Subject Selector — Shown for Admin & Manager roles */}
            {(userRole === "admin" || userRole === "manager") && (
              <div
                className="employee-subject-selector-card"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FiUsers style={{ color: "#4f46e5", fontSize: "20px" }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                      Select Employee Subject
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      Choose an employee to view their individual Role Insights analytics.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label
                    htmlFor="employee-subject-select"
                    style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}
                  >
                    Employee:
                  </label>
                  <select
                    id="employee-subject-select"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      background: "#f8fafc",
                      color: "#0f172a",
                      minWidth: "220px",
                      fontWeight: "600",
                    }}
                  >
                    <option value="">-- Select an Employee --</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(userRole === "admin" || userRole === "manager") && !selectedEmployeeId ? (
              <div
                className="foundation-card"
                style={{
                  background: "#ffffff",
                  padding: "40px 20px",
                  textAlign: "center",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <FiUsers style={{ fontSize: "42px", color: "#4f46e5", marginBottom: "12px" }} />
                <h4 style={{ fontSize: "18px", margin: "0 0 8px 0", color: "#0f172a" }}>
                  Select an Employee
                </h4>
                <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                  Please select an employee from the dropdown selector above to view their Employee Perspective analytics.
                </p>
              </div>
            ) : (
              <>
                {/* Viewing Subject Banner for Admin / Manager */}
                {(userRole === "admin" || userRole === "manager") && selectedEmployeeObj && (
                  <div
                    className="viewing-subject-banner"
                    style={{
                      background: "#e0e7ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "10px",
                      padding: "10px 16px",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#3730a3",
                      fontSize: "13.5px",
                    }}
                  >
                    <FiUserCheck style={{ fontSize: "18px", color: "#4f46e5" }} />
                    <span>
                      Viewing <strong>Employee Perspective</strong> analytics for:{" "}
                      <strong>{selectedEmployeeObj.name}</strong>{" "}
                      {selectedEmployeeObj.employeeId ? `(${selectedEmployeeObj.employeeId})` : ""}
                    </span>
                  </div>
                )}

                {/* 1. Employee Action Center — PLACED AT VERY TOP OF EMPLOYEE PERSPECTIVE */}
                <div className="section-title">
                  <h3>
                    <FiAlertCircle style={{ color: "#4f46e5" }} />{" "}
                    {userRole === "employee"
                      ? "Employee Action Center"
                      : `Employee Action Center — ${selectedEmployeeObj ? selectedEmployeeObj.name : "Target Employee"}`}
                  </h3>
                  <span className="badge-perspective employee">Priority Hub</span>
                </div>
                <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                  {userRole === "employee"
                    ? "What needs your attention right now?"
                    : `What needs ${selectedEmployeeObj ? selectedEmployeeObj.name : "the employee"}'s attention right now?`}
                </p>

                {loadingEmployeeMetrics ? (
                  <div className="insights-loading">
                    <Loader />
                    <p>Loading Action Center priorities...</p>
                  </div>
                ) : employeeMetricsError ? (
                  <div className="insights-error">
                    <p>{employeeMetricsError}</p>
                  </div>
                ) : employeeMetrics && employeeMetrics.actionCenter ? (
              <div className="action-center-container">
                {/* 🔴 Needs Attention */}
                {employeeMetrics.actionCenter.needsAttention &&
                employeeMetrics.actionCenter.needsAttention.length > 0 && (
                  <div className="action-category-block">
                    <h4 className="action-category-title danger">
                      <FiAlertTriangle /> Needs Attention ({employeeMetrics.actionCenter.needsAttention.length})
                    </h4>
                    <div className="action-cards-grid">
                      {employeeMetrics.actionCenter.needsAttention.map((item) => (
                        <div
                          className="employee-action-card needs-attention"
                          key={item.id}
                        >
                          <div className="action-card-header-row">
                            <span className="action-category-chip danger">
                              <FiAlertTriangle /> {item.category}
                            </span>
                            <span className={`priority-pill ${(item.priority || "medium").toLowerCase()}`}>
                              {item.priority} Priority
                            </span>
                          </div>

                          <div className="action-context-row">
                            <span className="context-tag-pill">
                              <FiFolder /> {item.projectName}
                            </span>
                            {item.phaseName && (
                              <span className="context-tag-pill">
                                <FiLayers /> {item.phaseName}
                              </span>
                            )}
                          </div>

                          <h4 className="action-card-title">{item.title}</h4>
                          
                          <div className="action-evidence-box">
                            {item.evidence}
                          </div>

                          <div className="action-card-footer">
                            <span className="action-signal-badge danger">
                              <FiAlertCircle /> {item.actionRequired}
                            </span>
                            {item.dueDate && (
                              <span className="deadline-tag overdue">
                                <FiCalendar /> Due {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🟡 Upcoming */}
                {employeeMetrics.actionCenter.upcoming &&
                employeeMetrics.actionCenter.upcoming.length > 0 && (
                  <div className="action-category-block">
                    <h4 className="action-category-title warning">
                      <FiClock /> Upcoming ({employeeMetrics.actionCenter.upcoming.length})
                    </h4>
                    <div className="action-cards-grid">
                      {employeeMetrics.actionCenter.upcoming.map((item) => (
                        <div
                          className="employee-action-card upcoming"
                          key={item.id}
                        >
                          <div className="action-card-header-row">
                            <span className="action-category-chip warning">
                              <FiClock /> {item.category}
                            </span>
                            <span className={`priority-pill ${(item.priority || "medium").toLowerCase()}`}>
                              {item.priority} Priority
                            </span>
                          </div>

                          <div className="action-context-row">
                            <span className="context-tag-pill">
                              <FiFolder /> {item.projectName}
                            </span>
                            {item.phaseName && (
                              <span className="context-tag-pill">
                                <FiLayers /> {item.phaseName}
                              </span>
                            )}
                          </div>

                          <h4 className="action-card-title">{item.title}</h4>

                          <div className="action-evidence-box">
                            {item.evidence}
                          </div>

                          <div className="action-card-footer">
                            <span className="action-signal-badge warning">
                              <FiClock /> {item.dueLabel}
                            </span>
                            {item.dueDate && (
                              <span className="deadline-tag today">
                                <FiCalendar /> {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🔵 Status Updates */}
                {employeeMetrics.actionCenter.statusUpdates &&
                employeeMetrics.actionCenter.statusUpdates.length > 0 && (
                  <div className="action-category-block">
                    <h4 className="action-category-title info">
                      <FiInfo /> Status Updates ({employeeMetrics.actionCenter.statusUpdates.length})
                    </h4>
                    <div className="action-cards-grid">
                      {employeeMetrics.actionCenter.statusUpdates.map((item) => (
                        <div
                          className="employee-action-card status-update"
                          key={item.id}
                        >
                          <div className="action-card-header-row">
                            <span className="action-category-chip info">
                              <FiInfo /> {item.category}
                            </span>
                            <span className={`priority-pill ${(item.priority || "medium").toLowerCase()}`}>
                              {item.priority} Priority
                            </span>
                          </div>

                          <div className="action-context-row">
                            <span className="context-tag-pill">
                              <FiFolder /> {item.projectName}
                            </span>
                            {item.phaseName && (
                              <span className="context-tag-pill">
                                <FiLayers /> {item.phaseName}
                              </span>
                            )}
                          </div>

                          <h4 className="action-card-title">{item.title}</h4>

                          <div className="action-evidence-box">
                            {item.evidence}
                          </div>

                          <div className="action-card-footer">
                            <span className="action-signal-badge info">
                              <FiCheckCircle /> Status: {item.status}
                            </span>
                            {item.dueDate && (
                              <span className="deadline-tag">
                                <FiCalendar /> {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {employeeMetrics.actionCenter.needsAttention.length === 0 &&
                  employeeMetrics.actionCenter.upcoming.length === 0 &&
                  employeeMetrics.actionCenter.statusUpdates.length === 0 && (
                    <div className="foundation-card">
                      <h4>You're All Caught Up!</h4>
                      <p>No active tasks requiring your immediate attention or upcoming deadlines at this time.</p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="foundation-card">
                <h4>No Action Center Data</h4>
                <p>No task assignments currently found for your account.</p>
              </div>
            )}

            {/* 2. My Workload & Progress Intelligence — PLACED DIRECTLY BELOW ACTION CENTER */}
            <div className="insight-section" style={{ marginTop: "32px" }}>
              <div className="section-title">
                <h3><FiActivity style={{ color: "#4f46e5" }} /> My Workload & Progress</h3>
                <span className="badge-perspective employee">Workload Intelligence</span>
              </div>
              <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                Personal overview of active assignments, workflow status breakdown, progress, and project distribution.
              </p>

              {employeeMetrics && employeeMetrics.workloadProgress ? (
                <div className="workload-progress-container">
                  {/* A. Overview Cards Grid */}
                  <div className="cards-container" style={{ marginBottom: "24px" }}>
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Active Tasks</h4>
                        <FiCheckSquare className="metric-icon" />
                      </div>
                      <div className="metric-value">{employeeMetrics.workloadProgress.activeTasks}</div>
                      <div className="metric-subtitle">
                        out of {employeeMetrics.workloadProgress.totalTasks} total assigned tasks
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Completed Tasks</h4>
                        <FiCheckCircle className="metric-icon" style={{ color: "#10b981" }} />
                      </div>
                      <div className="metric-value" style={{ color: "#10b981" }}>
                        {employeeMetrics.workloadProgress.completedTasks}
                      </div>
                      <div className="metric-subtitle">
                        closed and verified assignments
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Pending Reviews</h4>
                        <FiFileText className="metric-icon" style={{ color: "#f59e0b" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: employeeMetrics.workloadProgress.pendingReview > 0 ? "#f59e0b" : "#0f172a" }}
                      >
                        {employeeMetrics.workloadProgress.pendingReview}
                      </div>
                      <div className="metric-subtitle">
                        submitted work awaiting manager review
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Overdue Tasks</h4>
                        <FiAlertTriangle className="metric-icon" style={{ color: "#ef4444" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: employeeMetrics.workloadProgress.overdueTasks > 0 ? "#ef4444" : "#0f172a" }}
                      >
                        {employeeMetrics.workloadProgress.overdueTasks}
                      </div>
                      <div className="metric-subtitle">
                        active assignments past due date
                      </div>
                    </div>
                  </div>

                  {/* B. Progress Overview & Status Distribution Row */}
                  <div className="workload-grid-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                    {/* Progress Overview Panel */}
                    <div className="foundation-card progress-panel" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                          <FiTrendingUp style={{ color: "#10b981" }} /> Completion Progress
                        </h4>
                        <span className="badge-perspective employee">My Progress</span>
                      </div>

                      <div className="progress-display-box" style={{ display: "flex", alignItems: "center", gap: "20px", margin: "16px 0", flexWrap: "wrap" }}>
                        <div className="progress-radial-badge" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#ffffff", padding: "18px 24px", borderRadius: "16px", textAlign: "center", minWidth: "120px" }}>
                          <div style={{ fontSize: "32px", fontWeight: "800", lineHeight: "1" }}>
                            {employeeMetrics.workloadProgress.progressRate}%
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px", opacity: 0.9 }}>
                            Completed
                          </div>
                        </div>

                        <div className="progress-details-list" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#334155" }}>
                          <div>Total Assigned: <strong>{employeeMetrics.workloadProgress.totalTasks} tasks</strong></div>
                          <div>Applicable (Non-withdrawn): <strong>{employeeMetrics.workloadProgress.applicableTasks} tasks</strong></div>
                          <div>Closed: <strong style={{ color: "#10b981" }}>{employeeMetrics.workloadProgress.completedTasks} tasks</strong></div>
                          <div>Withdrawn: <span>{employeeMetrics.workloadProgress.withdrawnTasks} tasks</span></div>
                        </div>
                      </div>

                      <div className="formula-callout-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", color: "#64748b" }}>
                        Formula: <code>Closed Tasks ÷ (Total Assigned - Withdrawn) × 100</code>
                      </div>
                    </div>

                    {/* Workflow Status Breakdown */}
                    <div className="foundation-card status-distribution-panel" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                          <FiLayers style={{ color: "#4f46e5" }} /> Workflow Status Breakdown
                        </h4>
                        <span className="badge-perspective employee">Task Distribution</span>
                      </div>

                      {employeeMetrics.statusDistribution && (
                        <div className="status-bars-list" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                          {Object.entries(employeeMetrics.statusDistribution).map(([statusName, count]) => {
                            const total = employeeMetrics.workloadProgress.totalTasks || 1;
                            const percentage = Math.round((count / total) * 100);
                            return (
                              <div key={statusName} className="status-bar-item">
                                <div className="status-bar-labels" style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                  <span>{statusName}</span>
                                  <span><strong>{count}</strong> ({percentage}%)</span>
                                </div>
                                <div className="status-bar-track" style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                                  <div
                                    className="status-bar-fill"
                                    style={{
                                      height: "100%",
                                      width: `${percentage}%`,
                                      background:
                                        statusName === "Closed"
                                          ? "#10b981"
                                          : statusName === "In Progress"
                                          ? "#4f46e5"
                                          : statusName === "Submitted"
                                          ? "#f59e0b"
                                          : statusName === "Assigned"
                                          ? "#3b82f6"
                                          : statusName === "Rejected"
                                          ? "#ef4444"
                                          : "#94a3b8",
                                      borderRadius: "4px",
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* C. My Work by Project & Phase */}
                  <div className="foundation-card project-distribution-section" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                        <FiFolder style={{ color: "#f59e0b" }} /> My Work by Project & Phase
                      </h4>
                      <span className="badge-perspective employee">Personal Scope</span>
                    </div>

                    {employeeMetrics.projectDistribution && employeeMetrics.projectDistribution.length > 0 ? (
                      <div className="project-distribution-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                        {employeeMetrics.projectDistribution.map((proj) => (
                          <div
                            key={proj.projectId}
                            className="project-workload-card"
                            style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: "15px", color: "#0f172a" }}>{proj.projectName}</strong>
                              <span style={{ fontSize: "12px", fontWeight: "700", background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: "6px" }}>
                                {proj.taskCount} {proj.taskCount === 1 ? "task" : "tasks"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: "12px", fontSize: "12.5px", color: "#64748b" }}>
                              <span>Active: <strong style={{ color: "#4f46e5" }}>{proj.activeTasks}</strong></span>
                              <span>Completed: <strong style={{ color: "#10b981" }}>{proj.completedTasks}</strong></span>
                            </div>

                            {proj.phases && proj.phases.length > 0 && (
                              <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Phases:</span>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {proj.phases.map((ph) => (
                                    <span key={ph.phaseId} style={{ fontSize: "11.5px", background: "#ffffff", border: "1px solid #cbd5e1", padding: "2px 8px", borderRadius: "4px", color: "#334155" }}>
                                      {ph.phaseName}: <strong>{ph.taskCount}</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>No project task distributions found.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 3. My Performance Intelligence — PLACED DIRECTLY BELOW MY WORKLOAD & PROGRESS */}
            <div className="insight-section" style={{ marginTop: "32px" }}>
              <div className="section-title">
                <h3><FiTrendingUp style={{ color: "#10b981" }} /> My Performance</h3>
                <span className="badge-perspective employee">Personal Efficiency Lens</span>
              </div>
              <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                How effectively have you been handling your assigned work? Personal metrics & review outcomes.
              </p>

              {employeeMetrics && employeeMetrics.myPerformance ? (
                <div className="performance-intelligence-container">
                  {/* A. Performance Cards Grid (4 Cards) */}
                  <div className="cards-container" style={{ marginBottom: "24px" }}>
                    {/* 1. Completion Rate */}
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Completion Rate</h4>
                        <FiPercent className="metric-icon" style={{ color: "#10b981" }} />
                      </div>
                      <div className="metric-value" style={{ color: "#10b981" }}>
                        {employeeMetrics.myPerformance.completionRate}%
                      </div>
                      <div className="metric-subtitle">
                        closed tasks ratio ({employeeMetrics.myPerformance.sampleSize.completedTasks} closed of {employeeMetrics.myPerformance.sampleSize.totalAssigned} assigned)
                      </div>
                    </div>

                    {/* 2. On-Time Completion */}
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>On-Time Completion</h4>
                        <FiCheckCircle className="metric-icon" style={{ color: employeeMetrics.myPerformance.onTimeMetrics.onTimeRate !== null ? "#10b981" : "#64748b" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: employeeMetrics.myPerformance.onTimeMetrics.onTimeRate !== null ? "#10b981" : "#0f172a" }}
                      >
                        {employeeMetrics.myPerformance.onTimeMetrics.onTimeRate !== null
                          ? `${employeeMetrics.myPerformance.onTimeMetrics.onTimeRate}%`
                          : "N/A"}
                      </div>
                      <div className="metric-subtitle">
                        {employeeMetrics.myPerformance.onTimeMetrics.onTimeRate !== null
                          ? `${employeeMetrics.myPerformance.onTimeMetrics.onTimeClosedCount} of ${employeeMetrics.myPerformance.onTimeMetrics.totalClosedWithDueDate} closed tasks delivered on/before due date`
                          : "No closed tasks with due date yet"}
                      </div>
                    </div>

                    {/* 3. Overdue Rate */}
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Overdue Rate</h4>
                        <FiAlertTriangle className="metric-icon" style={{ color: employeeMetrics.myPerformance.overdueMetrics.overdueCount > 0 ? "#ef4444" : "#10b981" }} />
                      </div>
                      <div
                        className="metric-value"
                        style={{ color: employeeMetrics.myPerformance.overdueMetrics.overdueCount > 0 ? "#ef4444" : "#0f172a" }}
                      >
                        {employeeMetrics.myPerformance.overdueMetrics.overdueRate}%
                      </div>
                      <div className="metric-subtitle">
                        {employeeMetrics.myPerformance.overdueMetrics.overdueCount} active overdue task(s) in active queue
                      </div>
                    </div>

                    {/* 4. Submission Approval Rate */}
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h4>Submission Approval</h4>
                        <FiUserCheck className="metric-icon" style={{ color: "#3b82f6" }} />
                      </div>
                      <div className="metric-value" style={{ color: "#3b82f6" }}>
                        {employeeMetrics.myPerformance.submissionPerformance.approvalRate !== null
                          ? `${employeeMetrics.myPerformance.submissionPerformance.approvalRate}%`
                          : "N/A"}
                      </div>
                      <div className="metric-subtitle">
                        {employeeMetrics.myPerformance.submissionPerformance.approvalRate !== null
                          ? `${employeeMetrics.myPerformance.submissionPerformance.approvedCount} approved out of ${employeeMetrics.myPerformance.submissionPerformance.reviewedCount} reviewed submissions`
                          : "No submissions reviewed yet"}
                      </div>
                    </div>
                  </div>

                  {/* B. Submission History & Monthly Completion Trend Row */}
                  <div className="workload-grid-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                    {/* Submission & Review History Panel */}
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                          <FiFileText style={{ color: "#3b82f6" }} /> Submission & Review History
                        </h4>
                        <span className="badge-perspective employee">Personal History</span>
                      </div>

                      <div className="submission-history-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Submissions</div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                            {employeeMetrics.myPerformance.submissionPerformance.totalSubmissions}
                          </div>
                        </div>

                        <div style={{ background: "#ecfdf5", padding: "12px", borderRadius: "10px", border: "1px solid #a7f3d0" }}>
                          <div style={{ fontSize: "11.5px", color: "#047857", fontWeight: "700", textTransform: "uppercase" }}>Approved</div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: "#10b981", marginTop: "4px" }}>
                            {employeeMetrics.myPerformance.submissionPerformance.approvedCount}
                          </div>
                        </div>

                        <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "10px", border: "1px solid #fecaca" }}>
                          <div style={{ fontSize: "11.5px", color: "#b91c1c", fontWeight: "700", textTransform: "uppercase" }}>Rejected / Revised</div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: "#ef4444", marginTop: "4px" }}>
                            {employeeMetrics.myPerformance.submissionPerformance.rejectedCount}
                          </div>
                        </div>

                        <div style={{ background: "#fffbe6", padding: "12px", borderRadius: "10px", border: "1px solid #fef08a" }}>
                          <div style={{ fontSize: "11.5px", color: "#b45309", fontWeight: "700", textTransform: "uppercase" }}>Pending Review</div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: "#f59e0b", marginTop: "4px" }}>
                            {employeeMetrics.myPerformance.submissionPerformance.pendingCount}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", color: "#64748b" }}>
                        Note: Pending review submissions represent work awaiting manager evaluation and are excluded from final approval rates.
                      </div>
                    </div>

                    {/* Monthly Completion Trend Chart */}
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                          <FiTrendingUp style={{ color: "#10b981" }} /> Monthly Completion Trend
                        </h4>
                        <span className="badge-perspective employee">Last 6 Months</span>
                      </div>

                      {employeeMetrics.myPerformance.monthlyTrend && employeeMetrics.myPerformance.monthlyTrend.length > 0 ? (
                        <div style={{ width: "100%", height: 220, marginTop: "10px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={employeeMetrics.myPerformance.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px" }} />
                              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
                              <Bar dataKey="completed" name="Closed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                              <Bar dataKey="onTime" name="On-Time Closed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>No historical completion trend available yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 4. My Projects & Phases Intelligence — PLACED DIRECTLY BELOW MY PERFORMANCE */}
            <div className="insight-section" style={{ marginTop: "32px" }}>
              <div className="section-title">
                <h3><FiFolder style={{ color: "#f59e0b" }} /> My Projects & Phases</h3>
                <span className="badge-perspective employee">Project Participation Lens</span>
              </div>
              <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                Detailed breakdown of your tasks by project, phase, and upcoming project deadlines.
              </p>

              {employeeMetrics && employeeMetrics.myProjectsAndPhases ? (
                <div className="my-projects-phases-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* A. My Projects & Phases Breakdown */}
                  {employeeMetrics.myProjectsAndPhases.myProjects &&
                  employeeMetrics.myProjectsAndPhases.myProjects.length > 0 ? (
                    <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                      {employeeMetrics.myProjectsAndPhases.myProjects.map((proj) => (
                        <div
                          className="employee-project-card"
                          key={proj.projectId}
                          style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}
                        >
                          {/* Card Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <FiFolder style={{ color: proj.isIndependent ? "#8b5cf6" : "#f59e0b", fontSize: "18px" }} />
                              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{proj.projectName}</h4>
                            </div>
                            <span className="status-chip-indicator neutral" style={{ background: "#f1f5f9", color: "#475569" }}>
                              {proj.taskCount} {proj.taskCount === 1 ? "Task" : "Tasks"}
                            </span>
                          </div>

                          {/* Personal Project Progress */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                              <span>My Completion Progress</span>
                              <span><strong>{proj.progressRate}%</strong></span>
                            </div>
                            <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${proj.progressRate}%`, background: "#10b981", borderRadius: "3px" }} />
                            </div>
                          </div>

                          {/* Task Status Summary */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px", borderRadius: "8px", fontSize: "12px", textAlign: "center" }}>
                            <div>
                              <div style={{ color: "#64748b", fontSize: "11px" }}>Active</div>
                              <div style={{ fontWeight: "700", color: "#4f46e5", fontSize: "14px" }}>{proj.activeTasks}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", fontSize: "11px" }}>Completed</div>
                              <div style={{ fontWeight: "700", color: "#10b981", fontSize: "14px" }}>{proj.completedTasks}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", fontSize: "11px" }}>Overdue</div>
                              <div style={{ fontWeight: "700", color: proj.overdueTasks > 0 ? "#ef4444" : "#0f172a", fontSize: "14px" }}>{proj.overdueTasks}</div>
                            </div>
                          </div>

                          {/* Phases Breakdown (if project has phases) */}
                          {proj.hasPhases && proj.phases && proj.phases.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Phases Breakdown
                              </span>
                              {proj.phases.map((ph) => (
                                <div key={ph.phaseId} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: "8px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <span style={{ fontWeight: "700", fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <FiLayers style={{ color: "#4f46e5", fontSize: "13px" }} /> {ph.phaseName}
                                    </span>
                                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>{ph.taskCount} {ph.taskCount === 1 ? "task" : "tasks"}</span>
                                  </div>
                                  {/* Tasks inside phase */}
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    {ph.tasks.map((task) => (
                                      <div key={task.taskId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#334155" }}>
                                        <span>• {task.title}</span>
                                        <span style={{ fontSize: "11px", fontWeight: "600", color: task.status === "Closed" ? "#10b981" : task.isOverdue ? "#ef4444" : "#4f46e5" }}>
                                          {task.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Direct Tasks list (if project has no phases) */
                            proj.directTasks && proj.directTasks.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                  Tasks List
                                </span>
                                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {proj.directTasks.map((task) => (
                                    <div key={task.taskId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#334155" }}>
                                      <span>• {task.title}</span>
                                      <span style={{ fontSize: "11px", fontWeight: "600", color: task.status === "Closed" ? "#10b981" : task.isOverdue ? "#ef4444" : "#4f46e5" }}>
                                        {task.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="foundation-card">
                      <h4>No Assigned Project Work</h4>
                      <p>You are not currently assigned to any project tasks.</p>
                    </div>
                  )}

                  {/* B. Upcoming Project Deadlines Card */}
                  {employeeMetrics.myProjectsAndPhases.upcomingDeadlines &&
                  employeeMetrics.myProjectsAndPhases.upcomingDeadlines.length > 0 && (
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                          <FiClock style={{ color: "#d97706" }} /> Upcoming Project Deadlines
                        </h4>
                        <span className="badge-perspective employee">Personal Deadlines</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {employeeMetrics.myProjectsAndPhases.upcomingDeadlines.map((dl) => (
                          <div
                            key={dl.taskId}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px" }}
                          >
                            <div>
                              <strong style={{ color: "#0f172a", fontSize: "14px" }}>{dl.title}</strong>
                              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                {dl.projectName}{dl.phaseName ? ` → ${dl.phaseName}` : ""}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span className={`priority-pill ${(dl.priority || "medium").toLowerCase()}`}>
                                {dl.priority}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: "700", color: "#d97706", display: "flex", alignItems: "center", gap: "4px" }}>
                                <FiCalendar /> {new Date(dl.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 5. My Insights — PLACED DIRECTLY BELOW MY PROJECTS & PHASES */}
            <div className="insight-section" style={{ marginTop: "32px" }}>
              <div className="section-title">
                <h3><FiShield style={{ color: "#8b5cf6" }} /> My Insights</h3>
                <span className="badge-perspective employee">Personal Evidence Lens</span>
              </div>
              <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                What are you doing well, and where should you pay attention? Evidence-based analysis of your work.
              </p>

              {employeeMetrics && employeeMetrics.myInsights ? (
                <div className="my-insights-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
                  {/* A. Areas Requiring Attention Panel */}
                  <div className="foundation-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                    <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c" }}>
                        <FiAlertTriangle style={{ color: "#ef4444" }} /> Areas Requiring Attention
                      </h4>
                      <span className="status-chip-indicator warning" style={{ background: "#fef2f2", color: "#ef4444" }}>
                        {employeeMetrics.myInsights.areasRequiringAttention.length} {employeeMetrics.myInsights.areasRequiringAttention.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>

                    {employeeMetrics.myInsights.areasRequiringAttention &&
                    employeeMetrics.myInsights.areasRequiringAttention.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {employeeMetrics.myInsights.areasRequiringAttention.map((item) => (
                          <div
                            key={item.id}
                            style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", background: "#f87171", color: "#ffffff", padding: "1px 6px", borderRadius: "4px" }}>
                                {item.category}
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "#991b1b" }}>
                                {item.severity} Priority
                              </span>
                            </div>
                            <strong style={{ fontSize: "14px", color: "#7f1d1d" }}>{item.title}</strong>
                            <p style={{ margin: 0, fontSize: "12.5px", color: "#450a0a" }}>{item.evidence}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "10px", color: "#166534", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <FiCheckCircle style={{ color: "#16a34a", fontSize: "20px", flexShrink: 0 }} />
                        <div>
                          <strong style={{ display: "block", fontSize: "13.5px" }}>You're Currently on Track!</strong>
                          <span>No immediate performance or deadline concerns were detected.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* B. What's Going Well Panel */}
                  <div className="foundation-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                    <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#047857" }}>
                        <FiCheckCircle style={{ color: "#10b981" }} /> What's Going Well
                      </h4>
                      <span className="status-chip-indicator success" style={{ background: "#ecfdf5", color: "#047857" }}>
                        {employeeMetrics.myInsights.whatsGoingWell.length} {employeeMetrics.myInsights.whatsGoingWell.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>

                    {employeeMetrics.myInsights.whatsGoingWell &&
                    employeeMetrics.myInsights.whatsGoingWell.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {employeeMetrics.myInsights.whatsGoingWell.map((item) => (
                          <div
                            key={item.id}
                            style={{ background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", background: "#34d399", color: "#064e3b", padding: "1px 6px", borderRadius: "4px" }}>
                                {item.category}
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "#047857" }}>Verified Metric</span>
                            </div>
                            <strong style={{ fontSize: "14px", color: "#065f46" }}>{item.title}</strong>
                            <p style={{ margin: 0, fontSize: "12.5px", color: "#064e3b" }}>{item.evidence}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "10px", color: "#64748b", fontSize: "13px" }}>
                        Not enough historical data to identify strong performance patterns yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 6. My Summary — PLACED DIRECTLY BELOW MY INSIGHTS (FINAL EMPLOYEE SECTION) */}
            <div className="insight-section" style={{ marginTop: "32px" }}>
              <div className="section-title">
                <h3><FiCheckCircle style={{ color: "#10b981" }} /> My Summary</h3>
                <span className="badge-perspective employee">Executive Overview</span>
              </div>
              <p className="subtitle" style={{ margin: "-8px 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                Concise personal summary of your current workload, progress, performance, and key highlights.
              </p>

              {employeeMetrics && employeeMetrics.mySummary ? (
                <div className="my-summary-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* A. Summary KPI Cards Row */}
                  <div className="summary-kpis-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px" }}>
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Active Tasks</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#4f46e5", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.activeTasks}
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Completed Tasks</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.completedTasks}
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Completion Progress</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.completionRate}%
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>On-Time Rate</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: employeeMetrics.mySummary.kpis.onTimeRate !== null ? "#3b82f6" : "#64748b", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.onTimeRate !== null ? `${employeeMetrics.mySummary.kpis.onTimeRate}%` : "N/A"}
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Pending Review</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: employeeMetrics.mySummary.kpis.pendingReviews > 0 ? "#f59e0b" : "#0f172a", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.pendingReviews}
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Overdue Tasks</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: employeeMetrics.mySummary.kpis.overdueTasks > 0 ? "#ef4444" : "#10b981", marginTop: "2px" }}>
                        {employeeMetrics.mySummary.kpis.overdueTasks}
                      </div>
                    </div>
                  </div>

                  {/* B. Priority Highlights Grid */}
                  <div className="summary-highlights-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                    {/* Top Attention Item Callout */}
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Immediate Attention Priority
                      </span>
                      {employeeMetrics.mySummary.topAttentionItem ? (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                            {employeeMetrics.mySummary.topAttentionItem.title}
                          </strong>
                          <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                            {employeeMetrics.mySummary.topAttentionItem.evidence}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#10b981" }}>
                          ✓ No critical items requiring immediate action.
                        </p>
                      )}
                    </div>

                    {/* Earliest Upcoming Deadline Callout */}
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Earliest Upcoming Deadline
                      </span>
                      {employeeMetrics.mySummary.topUpcomingDeadline ? (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                            {employeeMetrics.mySummary.topUpcomingDeadline.title}
                          </strong>
                          <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                            {employeeMetrics.mySummary.topUpcomingDeadline.projectName} • Due {new Date(employeeMetrics.mySummary.topUpcomingDeadline.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                          No upcoming task deadlines scheduled.
                        </p>
                      )}
                    </div>

                    {/* Key Positive Highlight Callout */}
                    <div className="foundation-card" style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Key Achievement Highlight
                      </span>
                      {employeeMetrics.mySummary.topPositiveInsight ? (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <strong style={{ fontSize: "14px", color: "#065f46" }}>
                            {employeeMetrics.mySummary.topPositiveInsight.title}
                          </strong>
                          <p style={{ margin: 0, fontSize: "12.5px", color: "#047857" }}>
                            {employeeMetrics.mySummary.topPositiveInsight.evidence}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                          Building historical performance record...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    )}
      </div>
    </div>
  );
}

export default RoleInsights;
