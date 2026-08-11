import "./EmployeeDashboard.css";

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

function EmployeeDashboard() {
  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await dashboardService.getDashboard(selectedProject);

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

  const cards = [
    {
      title: "Assigned",
      value: statistics.assigned || 0,
      color: "#f59e0b",
      icon: "📌",
    },
    {
      title: "Accepted",
      value: statistics.accepted || 0,
      color: "#2563eb",
      icon: "👍",
    },
    {
      title: "In Progress",
      value: statistics.inProgress || 0,
      color: "#0ea5e9",
      icon: "⚡",
    },
    {
      title: "Submitted",
      value: statistics.submitted || 0,
      color: "#10b981",
      icon: "📤",
    },
    {
      title: "Completed",
      value: statistics.closed || 0,
      color: "#22c55e",
      icon: "✅",
    },
    {
      title: "Overdue",
      value: statistics.overdue || 0,
      color: "#ef4444",
      icon: "⏰",
    },
    {
      title: "Pending Review",
      value: statistics.pendingReview || 0,
      color: "#8b5cf6",
      icon: "📝",
    },
  ];

  const taskChartData = [
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
      {/* Welcome */}

      <section className="welcome-section">
        <div className="welcome-header">
          <div>
            <h1>
              Welcome back,
              <span> {user.name}</span>
            </h1>

            <p>Here's your task summary for today.</p>
          </div>

          <div className="dashboard-filter">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>

              <option value="NO_PROJECT">No Project</option>

              {dashboard?.projects?.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Statistics */}

      <section className="stats-grid">
        {cards.map((card) => (
          <div
            key={card.title}
            className="stats-card"
            style={{
              borderTop: `5px solid ${card.color}`,
            }}
          >
            <div className="card-header">
              <span className="card-icon">{card.icon}</span>

              <h4>{card.title}</h4>
            </div>

            <h2>{card.value}</h2>
          </div>
        ))}
      </section>

      {/* Action Items / Personal Attention */}

      {dashboard?.myAttentionItems && dashboard.myAttentionItems.length > 0 && (
        <section className="attention-section">
          <div className="attention-card">
            <div className="attention-header">
              <h3>⚡ Need Attention</h3>
            </div>
            <div className="attention-list">
              {dashboard.myAttentionItems.map((item, idx) => (
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

      {/* Personal Performance & Efficiency */}

      {dashboard?.performanceMetrics && (
        <section className="personal-performance-section">
          <div className="summary-card overview-card">
            <div className="summary-header">
              <h3>📊 My Efficiency & Performance</h3>
            </div>

            <div className="summary-body performance-grid">
              <div>
                <span>Completion Rate</span>
                <strong>{dashboard.performanceMetrics.completionRate}%</strong>
              </div>

              <div>
                <span>Avg Completion Time</span>
                <strong>
                  {dashboard.performanceMetrics.averageCompletionTime !== null
                    ? `${dashboard.performanceMetrics.averageCompletionTime} days`
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>Avg Task Acceptance</span>
                <strong>
                  {dashboard.performanceMetrics.averageAcceptanceTime !== null
                    ? `${dashboard.performanceMetrics.averageAcceptanceTime} days`
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>Submission Rejection Rate</span>
                <strong>{dashboard.performanceMetrics.rejectionRate}%</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Charts */}

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
      <section className="dashboard-bottom">
        <RecentActivitiesCard
          title="My Recent Activities"
          activities={dashboard?.myRecentActivities || []}
          viewAllLink="/employee/tasks"
        />

        <PendingReviewsCard
          title="My Recent Submissions"
          reviews={dashboard?.myRecentSubmissions || []}
          viewAllLink="/employee/submissions"
        />

        <UpcomingDeadlinesCard
          title="My Upcoming Deadlines"
          tasks={dashboard?.myUpcomingTasks || []}
          viewAllLink="/employee/tasks?sort=dueDate&order=asc"
          emptyMessage="🎉 No upcoming tasks."
        />
      </section>
    </div>
  );
}
export default EmployeeDashboard;
