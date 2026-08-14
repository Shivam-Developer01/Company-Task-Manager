import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import "./WorkloadAttentionCard.css";

const ROLE_CONFIGS = {
  admin: {
    title: "Company Workload & Attention",
    description: "Current work requiring attention across the company.",
    emptyMessage: "No major workload items currently require attention.",
    routes: {
      pendingReview: "/submissions",
      awaitingAcceptance: "/tasks?status=Assigned",
    },
  },
  manager: {
    title: "Team Workload & Attention",
    description: "Current work requiring attention across your accessible projects.",
    emptyMessage: "No team workload items currently require attention.",
    routes: {
      pendingReview: "/submissions",
      awaitingAcceptance: "/tasks?status=Assigned",
    },
  },
  employee: {
    title: "My Workload & Attention",
    description: "Your current work requiring attention.",
    emptyMessage: "You're all caught up.",
    routes: {
      pendingReview: "/employee/submissions",
      awaitingAcceptance: "/employee/tasks?status=Assigned",
    },
  },
};

function WorkloadAttentionCard({ role = "employee", workloadAttention }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIGS[role?.toLowerCase()] || ROLE_CONFIGS.employee;

  const overdueCount = workloadAttention?.overdue || 0;
  const pendingReviewCount = workloadAttention?.pendingReview || 0;
  const awaitingAcceptanceCount = workloadAttention?.awaitingAcceptance || 0;

  const totalAttentionCount =
    overdueCount + pendingReviewCount + awaitingAcceptanceCount;

  const chartData = [
    {
      name: "Overdue",
      count: overdueCount,
      color: "#ef4444",
      route: null,
    },
    {
      name: "Pending Review",
      count: pendingReviewCount,
      color: "#8b5cf6",
      route: config.routes.pendingReview,
    },
    {
      name: "Awaiting Acceptance",
      count: awaitingAcceptanceCount,
      color: "#3b82f6",
      route: config.routes.awaitingAcceptance,
    },
  ];

  const handleBarClick = (entry) => {
    if (entry && entry.route) {
      navigate(entry.route);
    }
  };

  return (
    <div className="chart-card workload-attention-card">
      <div className="workload-attention-header">
        <h3>{config.title}</h3>
        <p className="workload-attention-desc">{config.description}</p>
      </div>

      {totalAttentionCount === 0 ? (
        <div className="workload-empty-state">
          <div className="workload-empty-icon">🎉</div>
          <h4>{config.emptyMessage}</h4>
          <p>All tasks and submissions in this scope are fully up to date.</p>
        </div>
      ) : (
        <div className="workload-chart-container">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="workload-tooltip">
                        <strong>{data.name}</strong>
                        <span>{data.count} item{data.count === 1 ? "" : "s"}</span>
                        {data.route && <small>Click to view</small>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                onClick={(data) => handleBarClick(data)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    cursor={entry.route ? "pointer" : "default"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="workload-attention-legend">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                className={`legend-item ${item.route ? "clickable" : "display-only"}`}
                onClick={() => item.route && navigate(item.route)}
                title={item.route ? `View ${item.name}` : `${item.name}`}
              >
                <span className="legend-dot" style={{ backgroundColor: item.color }} />
                <span className="legend-name">{item.name}</span>
                <span className="legend-badge" style={{ backgroundColor: item.color }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkloadAttentionCard;
