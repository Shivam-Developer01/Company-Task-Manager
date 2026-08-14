import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import "./TaskStatusDistributionCard.css";

const STATUS_CONFIG = {
  Assigned: {
    label: "Assigned",
    color: "#2563eb",
    bg: "#dbeafe",
    border: "#bfdbfe",
    rawStatus: "Assigned",
  },
  Accepted: {
    label: "Accepted",
    color: "#8b5cf6",
    bg: "#f3e8ff",
    border: "#e9d5ff",
    rawStatus: "Accepted",
  },
  Progress: {
    label: "In Progress",
    color: "#f59e0b",
    bg: "#fef3c7",
    border: "#fde68a",
    rawStatus: "In Progress",
  },
  "In Progress": {
    label: "In Progress",
    color: "#f59e0b",
    bg: "#fef3c7",
    border: "#fde68a",
    rawStatus: "In Progress",
  },
  Submitted: {
    label: "Submitted",
    color: "#0284c7",
    bg: "#e0f2fe",
    border: "#bae6fd",
    rawStatus: "Submitted",
  },
  Closed: {
    label: "Closed",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#bbf7d0",
    rawStatus: "Closed",
  },
};

function TaskStatusDistributionCard({ role = "employee", taskChartData = [] }) {
  const navigate = useNavigate();

  const totalTasks = taskChartData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  const formattedChartData = taskChartData.map((item) => {
    const val = Number(item.value) || 0;
    const pct = totalTasks > 0 ? Math.round((val / totalTasks) * 100) : 0;
    const conf = STATUS_CONFIG[item.name] || {
      label: item.name,
      color: "#64748b",
      bg: "#f1f5f9",
      border: "#e2e8f0",
      rawStatus: item.name,
    };

    return {
      name: conf.label,
      value: val,
      percentage: pct,
      color: conf.color,
      rawStatus: conf.rawStatus,
    };
  });

  const getRoute = (rawStatus) => {
    const isEmployee = role?.toLowerCase() === "employee";
    return isEmployee
      ? `/employee/tasks?status=${encodeURIComponent(rawStatus)}`
      : `/tasks?status=${encodeURIComponent(rawStatus)}`;
  };

  const handleSliceClick = (entry) => {
    if (entry && entry.rawStatus) {
      navigate(getRoute(entry.rawStatus));
    }
  };

  return (
    <div className="chart-card task-status-distribution-card">
      <div className="status-dist-header">
        <div>
          <h3>Task Status Distribution</h3>
          <p className="status-dist-desc">
            Current distribution of accessible tasks across workflow statuses.
          </p>
        </div>
        <div className="status-dist-total">
          <span>Total Tasks</span>
          <strong>{totalTasks}</strong>
        </div>
      </div>

      {totalTasks === 0 ? (
        <div className="status-dist-empty">
          <div className="status-dist-empty-icon">📊</div>
          <h4>No tasks available in your current scope.</h4>
          <p>Tasks will appear here as they progress through workflow statuses.</p>
        </div>
      ) : (
        <div className="status-pie-container">
          <div className="pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={formattedChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={85}
                  paddingAngle={3}
                  onClick={(entry) => handleSliceClick(entry)}
                  cursor="pointer"
                >
                  {formattedChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="status-pie-tooltip">
                          <strong>{data.name}</strong>
                          <span>
                            {data.value} task{data.value === 1 ? "" : "s"} ·{" "}
                            {data.percentage}%
                          </span>
                          <small>Click to view</small>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-badge">
              <span className="pie-center-count">{totalTasks}</span>
              <span className="pie-center-label">Tasks</span>
            </div>
          </div>

          <div className="status-pie-legend">
            {formattedChartData.map((item, idx) => (
              <div
                key={idx}
                className="legend-row clickable"
                onClick={() => handleSliceClick(item.rawStatus)}
                title={`View ${item.name} tasks`}
              >
                <div className="legend-row-left">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="legend-status-name">{item.name}</span>
                </div>
                <div className="legend-row-right">
                  <span className="legend-status-count">{item.value}</span>
                  <span className="legend-status-sep">·</span>
                  <span className="legend-status-pct">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskStatusDistributionCard;
