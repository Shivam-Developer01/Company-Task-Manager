import "./Dashboard.css";

import ProjectMembersCard from "../../components/ProjectMembersCard/ProjectMembersCard";
import ProjectTasksCard from "../../components/ProjectTasksCard/ProjectTasksCard";

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
        <section className="stats-grid">
          <div className="summary-card employees-card">
            <div className="summary-header">
              <h3>👥 Employees</h3>
            </div>

            <div className="summary-body">
              <div>
                <span>Total</span>
                <strong>{statistics.employees?.total || 0}</strong>
              </div>

              <div>
                <span>Active</span>
                <strong>{statistics.employees?.active || 0}</strong>
              </div>

              <div>
                <span>Inactive</span>
                <strong>{statistics.employees?.inactive || 0}</strong>
              </div>
            </div>
          </div>

          <div className="summary-card projects-card">
            <div className="summary-header">
              <h3>📁 Projects</h3>
            </div>

            <div className="summary-body">
              <div>
                <span>Total</span>
                <strong>{statistics.projects?.total || 0}</strong>
              </div>

              <div>
                <span>Active</span>
                <strong>{statistics.projects?.active || 0}</strong>
              </div>

              <div>
                <span>Archived</span>
                <strong>
                  {(statistics.projects?.total || 0) -
                    (statistics.projects?.active || 0)}
                </strong>
              </div>
            </div>
          </div>

          <div className="summary-card tasks-card">
            <div className="summary-header">
              <h3>📌 Tasks</h3>
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
              <h3>📊 Overview</h3>
            </div>

            <div className="summary-body">
              <div>
                <span>Pending Reviews</span>
                <strong>{statistics.pendingReviews || 0}</strong>
              </div>

              <div>
                <span>Overdue Tasks</span>
                <strong>{statistics.overdueTasks || 0}</strong>
              </div>

              <div>
                <span>Completion</span>
                <strong>
                  {statistics.tasks?.closed || 0}/
                  {(statistics.tasks?.assigned || 0) +
                    (statistics.tasks?.accepted || 0) +
                    (statistics.tasks?.inProgress || 0) +
                    (statistics.tasks?.submitted || 0) +
                    (statistics.tasks?.closed || 0)}
                </strong>
              </div>
            </div>
          </div>
        </section>
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

            <div className="summary-card  projects-card">
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
                <h3>📌 Project Tasks</h3>
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
                <h3>📊 Overview</h3>
              </div>

              <div className="summary-body">
                <div>
                  <span>Pending Reviews</span>
                  <strong>{statistics.pendingReviews || 0}</strong>
                </div>

                <div>
                  <span>Overdue Tasks</span>
                  <strong>{statistics.overdueTasks || 0}</strong>
                </div>

                <div>
                  <span>Completion</span>
                  <strong>
                    {statistics.tasks?.closed || 0}/
                    {(statistics.tasks?.assigned || 0) +
                      (statistics.tasks?.accepted || 0) +
                      (statistics.tasks?.inProgress || 0) +
                      (statistics.tasks?.submitted || 0) +
                      (statistics.tasks?.closed || 0)}
                  </strong>
                </div>
              </div>
            </div>
          </section>
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
                      <th>Assigned Tasks</th>
                      <th>Overdue Tasks</th>
                      <th>Pending Reviews</th>
                    </tr>
                  </thead>

                  <tbody>
                    {managerPerformance
                      .slice(managerPage * 5, managerPage * 5 + 5)
                      .map((item) => (
                        <tr key={item.manager._id}>
                          <td>{item.manager.name}</td>
                          <td>{item.projects}</td>
                          <td>{item.activeTasks}</td>
                          <td>{item.overdueTasks}</td>
                          <td>{item.pendingReviews}</td>
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
          <div className="chart-card">
            <h3>Task Status Distribution</h3>

            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                >
                  {taskChartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Task Overview</h3>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={taskChartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <>
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
