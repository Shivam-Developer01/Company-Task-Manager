import "./Dashboard.css";

import ProjectMembersCard from "../../components/ProjectMembersCard/ProjectMembersCard";
import ProjectTasksCard from "../../components/ProjectTasksCard/ProjectTasksCard";
import ProjectPhaseOverview from "../../components/ProjectPhaseOverview/ProjectPhaseOverview";

import { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import dashboardService from "../../services/dashboardService";
import Loader from "../../components/Loader/Loader";
import RecentActivitiesCard from "../../components/RecentActivitiesCard/RecentActivitiesCard";
import PendingReviewsCard from "../../components/PendingReviewsCard/PendingReviewsCard";
import UpcomingDeadlinesCard from "../../components/UpcomingDeadlinesCard/UpcomingDeadlinesCard";
import WorkloadAttentionCard from "../../components/WorkloadAttentionCard/WorkloadAttentionCard";
import TaskStatusDistributionCard from "../../components/TaskStatusDistributionCard/TaskStatusDistributionCard";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [managerPage, setManagerPage] = useState(0);

  const user = JSON.parse(localStorage.getItem("user"));

  const isSingleProject = selectedProject && selectedProject !== "NO_PROJECT";

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await dashboardService.getDashboard(selectedProject);

      setDashboardData(response);

      setDashboard(response);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedProject]);

  if (loading) {
    return <Loader />;
  }

  const statistics = dashboard?.statistics || {};
  const admin = dashboard?.admin || {};
  const userOverview = admin.userOverview || {};
  const projectOverview = admin.projectOverview || {};
  const managerPerformance = admin.managerPerformance || [];

  const taskChartData =
    user.role === "manager" || user.role === "admin"
      ? [
          {
            name: "Assigned",
            value: statistics.tasks?.assigned || 0,
          },
          {
            name: "Accepted",
            value: statistics.tasks?.accepted || 0,
          },
          {
            name: "Progress",
            value: statistics.tasks?.inProgress || 0,
          },
          {
            name: "Submitted",
            value: statistics.tasks?.submitted || 0,
          },
          {
            name: "Closed",
            value: statistics.tasks?.closed || 0,
          },
        ]
      : [
          {
            name: "Assigned",
            value: statistics.assigned || 0,
          },
          {
            name: "Accepted",
            value: statistics.accepted || 0,
          },
          {
            name: "Progress",
            value: statistics.inProgress || 0,
          },
          {
            name: "Submitted",
            value: statistics.submitted || 0,
          },
          {
            name: "Closed",
            value: statistics.closed || 0,
          },
        ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  return (
    <div className="dashboard">
      <section className="welcome-section">
        <div className="welcome-header">
          <div>
            <h1>
              Welcome back,
              <span> {user.name}</span>
            </h1>

            <p>Here's what's happening in your workspace today.</p>
          </div>

          <div className="dashboard-filter">
            <label>Project</label>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>

              <option value="NO_PROJECT">No Project</option>

              {(dashboard?.projects || []).map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      {user.role === "manager" && (
        <>
          <section className="stats-grid">
            <div className="summary-card employees-card">
              <div className="summary-header">
                <h3>👥 Team Workforce</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Team Size</span>
                  <strong>{dashboard?.teamMetrics?.teamSize || statistics.employees?.total || 0}</strong>
                </div>

                <div>
                  <span>Active Employees</span>
                  <strong>{statistics.employees?.active || 0}</strong>
                </div>

                <div>
                  <span>Inactive Employees</span>
                  <strong>{statistics.employees?.inactive || 0}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card projects-card">
              <div className="summary-header">
                <h3>📁 Managed Projects</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Total Projects</span>
                  <strong>{statistics.projects?.total || 0}</strong>
                </div>

                <div>
                  <span>Active Projects</span>
                  <strong>{statistics.projects?.active || 0}</strong>
                </div>

                <div>
                  <span>Archived Projects</span>
                  <strong>
                    {(statistics.projects?.total || 0) -
                      (statistics.projects?.active || 0)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="summary-card tasks-card">
              <div className="summary-header">
                <h3>📌 Team Tasks</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Assigned</span>
                  <strong>{statistics.tasks?.assigned || 0}</strong>
                </div>

                <div>
                  <span>Accepted</span>
                  <strong>{statistics.tasks?.accepted || 0}</strong>
                </div>

                <div>
                  <span>In Progress</span>
                  <strong>{statistics.tasks?.inProgress || 0}</strong>
                </div>

                <div>
                  <span>Submitted</span>
                  <strong>{statistics.tasks?.submitted || 0}</strong>
                </div>

                <div>
                  <span>Closed</span>
                  <strong>{statistics.tasks?.closed || 0}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card overview-card">
              <div className="summary-header">
                <h3>📊 Operational Status</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Team Completion</span>
                  <strong>
                    {dashboard?.teamMetrics?.teamTaskCompletion !== undefined
                      ? `${dashboard.teamMetrics.teamTaskCompletion}%`
                      : "0%"}
                  </strong>
                </div>

                <div>
                  <span>Pending Reviews</span>
                  <strong>{statistics.pendingReviews || 0}</strong>
                </div>

                <div>
                  <span>Overdue Tasks</span>
                  <strong>{statistics.overdueTasks || 0}</strong>
                </div>
              </div>
            </div>
          </section>

          {dashboard?.managerAttention &&
            dashboard.managerAttention.length > 0 && (
              <section className="attention-section">
                <div className="attention-card">
                  <div className="attention-header">
                    <h3>⚡ Action Items</h3>
                  </div>
                  <div className="attention-list">
                    {dashboard.managerAttention.map((item, idx) => (
                      <div
                        key={idx}
                        className={`attention-item attention-${item.type}`}
                      >
                        <strong>{item.title}:</strong> {item.message}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          {dashboard?.teamMetrics?.teamWorkloadDistribution?.length > 0 &&
            !isSingleProject && (
              <section className="chart-card team-workload-card">
                <div className="manager-performance-header">
                  <h3>👥 Team Workload & Distribution</h3>
                </div>

                <div className="table-wrapper">
                  <table className="manager-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Active Tasks</th>
                        <th>Completed Tasks</th>
                        <th>Overdue Tasks</th>
                        <th>Total Assigned</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.teamMetrics.teamWorkloadDistribution.map(
                        (emp) => (
                          <tr key={emp.employeeId}>
                            <td className="manager-name">
                              {emp.employeeName} ({emp.employeeCode})
                            </td>
                            <td>
                              <span className="badge tasks">
                                {emp.activeTasks}
                              </span>
                            </td>
                            <td>{emp.completedTasks}</td>
                            <td>
                              <span
                                className={
                                  emp.overdueTasks > 0
                                    ? "badge warning-badge"
                                    : ""
                                }
                              >
                                {emp.overdueTasks}
                              </span>
                            </td>
                            <td>{emp.totalTasks}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
        </>
      )}
      {user.role === "admin" && admin.userOverview && (
        <>
          <section className="stats-grid">
            <div className="summary-card employees-card">
              <div className="summary-header">
                <h3>👥 User Overview</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Total Users</span>
                  <strong>{userOverview.totalUsers}</strong>
                </div>

                <div>
                  <span>Admins</span>
                  <strong>{userOverview.admins}</strong>
                </div>

                <div>
                  <span>Managers</span>
                  <strong>{userOverview.managers}</strong>
                </div>

                <div>
                  <span>Employees</span>
                  <strong>{userOverview.employees}</strong>
                </div>

                <div>
                  <span>Active</span>
                  <strong>{userOverview.activeUsers}</strong>
                </div>

                <div>
                  <span>Inactive</span>
                  <strong>{userOverview.inactiveUsers}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card projects-card">
              <div className="summary-header">
                <h3>📁 Company Projects</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Total</span>
                  <strong>{projectOverview.totalProjects}</strong>
                </div>

                <div>
                  <span>Active</span>
                  <strong>{projectOverview.activeProjects}</strong>
                </div>

                <div>
                  <span>Archived</span>
                  <strong>{projectOverview.archivedProjects}</strong>
                </div>

                <div>
                  <span>Overdue</span>
                  <strong>{projectOverview.overdueProjects}</strong>
                </div>

                <div>
                  <span>Independent Tasks</span>
                  <strong>{projectOverview.independentTasks}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card tasks-card">
              <div className="summary-header">
                <h3>📌 Company Tasks</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Assigned</span>
                  <strong>{statistics.tasks?.assigned || 0}</strong>
                </div>

                <div>
                  <span>Accepted</span>
                  <strong>{statistics.tasks?.accepted || 0}</strong>
                </div>

                <div>
                  <span>In Progress</span>
                  <strong>{statistics.tasks?.inProgress || 0}</strong>
                </div>

                <div>
                  <span>Submitted</span>
                  <strong>{statistics.tasks?.submitted || 0}</strong>
                </div>

                <div>
                  <span>Closed</span>
                  <strong>{statistics.tasks?.closed || 0}</strong>
                </div>
              </div>
            </div>

            <div className="summary-card overview-card">
              <div className="summary-header">
                <h3>📊 Performance</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Completion Rate</span>
                  <strong>
                    {admin.companyMetrics?.tasks?.taskCompletionRate !== undefined
                      ? `${admin.companyMetrics.tasks.taskCompletionRate}%`
                      : `${Math.round(
                          ((statistics.tasks?.closed || 0) /
                            Math.max(
                              1,
                              (statistics.tasks?.assigned || 0) +
                                (statistics.tasks?.accepted || 0) +
                                (statistics.tasks?.inProgress || 0) +
                                (statistics.tasks?.submitted || 0) +
                                (statistics.tasks?.closed || 0),
                            )) *
                            100,
                        )}%`}
                  </strong>
                </div>

                <div>
                  <span>Pending Reviews</span>
                  <strong>{statistics.pendingReviews || 0}</strong>
                </div>

                <div>
                  <span>Overdue Tasks</span>
                  <strong>{statistics.overdueTasks || 0}</strong>
                </div>

                <div>
                  <span>Closed Tasks</span>
                  <strong>{statistics.tasks?.closed || 0}</strong>
                </div>
              </div>
            </div>
          </section>

          {admin.attentionItems && admin.attentionItems.length > 0 && (
            <section className="attention-section">
              <div className="attention-card">
                <div className="attention-header">
                  <h3>⚠️ Items Requiring Attention</h3>
                </div>
                <div className="attention-list">
                  {admin.attentionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`attention-item attention-${item.type}`}
                    >
                      <strong>{item.title}:</strong> {item.message}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {admin.insights && admin.insights.length > 0 && (
            <section className="insights-section">
              <div className="insights-card">
                <div className="insights-header">
                  <h3>💡 Operational Insights</h3>
                </div>
                <ul className="insights-list">
                  {admin.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {user.role === "admin" && admin.userOverview && !isSingleProject && (
            <section className="chart-card manager-performance-card">
              <div className="manager-performance-header">
                <h3>👥 Manager Performance</h3>

                {managerPerformance.length > 5 && (
                  <button
                    className="view-more-btn"
                    onClick={() =>
                      setManagerPage((prev) =>
                        prev + 1 >= Math.ceil(managerPerformance.length / 5)
                          ? 0
                          : prev + 1,
                      )
                    }
                  >
                    View More →
                  </button>
                )}
              </div>

              <div className="table-wrapper">
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Manager</th>
                      <th>Projects</th>
                      <th>Active Tasks</th>
                      <th>Overdue Tasks</th>
                      <th>Pending Reviews</th>
                    </tr>
                  </thead>

                  <tbody>
                    {managerPerformance
                      .slice(managerPage * 5, managerPage * 5 + 5)
                      .map((item) => (
                        <tr key={item.manager._id}>
                          <td className="manager-name">{item.manager.name}</td>
                          <td>
                            <span className="badge projects">{item.projects}</span>
                          </td>
                          <td>
                            <span className="badge tasks">{item.activeTasks}</span>
                          </td>
                          <td>{item.overdueTasks}</td>
                          <td>
                            <span className="badge reviews">
                              {item.pendingReviews}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {!isSingleProject ? (
        <section className="chart-section">
          <TaskStatusDistributionCard
            role={user.role}
            taskChartData={taskChartData}
          />

          <WorkloadAttentionCard
            role={user.role}
            workloadAttention={statistics.workloadAttention}
          />
        </section>
      ) : (
        <>
          {dashboard?.projectPhases?.length > 0 && (
            <ProjectPhaseOverview phases={dashboard.projectPhases} />
          )}

          <ProjectMembersCard members={dashboard?.projectMembers || []} />

          <ProjectTasksCard tasks={dashboard?.projectTasks || []} />
        </>
      )}

      <section className="dashboard-bottom">
        <RecentActivitiesCard
          title="Recent Activities"
          activities={dashboard?.recentActivities || []}
          viewAllLink="/tasks"
        />
        <PendingReviewsCard
          title="Recent Submissions"
          reviews={dashboard?.pendingReviews || []}
          viewAllLink="/submissions"
        />
        <UpcomingDeadlinesCard
          tasks={dashboard?.upcomingDeadlines || []}
          viewAllLink="/tasks?sort=dueDate&order=asc"
        />
      </section>
    </div>
  );
}

export default Dashboard;
