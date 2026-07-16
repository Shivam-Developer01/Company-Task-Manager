import "./Dashboard.css";

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

  const user = JSON.parse(localStorage.getItem("user"));

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await dashboardService.getDashboard();

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
  }, []);

  if (loading) {
    return <Loader />;
  }

  const statistics = dashboard?.statistics || {};

  const managerCards = [
    {
      title: "Employees",
      value: statistics.employees?.total || 0,
      color: "#2563eb",
      icon: "👥",
    },
    {
      title: "Projects",
      value: statistics.projects?.active || 0,
      color: "#8b5cf6",
      icon: "📁",
    },
    {
      title: "Assigned",
      value: statistics.tasks?.assigned || 0,
      color: "#f59e0b",
      icon: "📌",
    },
    {
      title: "In Progress",
      value: statistics.tasks?.inProgress || 0,
      color: "#0ea5e9",
      icon: "⚡",
    },
    {
      title: "Submitted",
      value: statistics.tasks?.submitted || 0,
      color: "#10b981",
      icon: "📤",
    },
    {
      title: "Closed",
      value: statistics.tasks?.closed || 0,
      color: "#ef4444",
      icon: "✅",
    },
  ];

  const employeeCards = [
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
      title: "Closed",
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
  ];

  const cards = user.role === "manager" ? managerCards : employeeCards;

  const taskChartData =
    user.role === "manager"
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
        <div>
          <h1>
            Welcome back,
            <span> {user.name}</span>
          </h1>

          <p>Here's what's happening in your workspace today.</p>
        </div>
      </section>

      <section className="stats-grid">
        {user.role === "manager" ? (
          <>
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
          </>
        ) : (
          cards.map((card) => (
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
          ))
        )}
      </section>

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
