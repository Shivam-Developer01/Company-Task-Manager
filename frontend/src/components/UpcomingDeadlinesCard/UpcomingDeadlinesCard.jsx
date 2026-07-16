import "./UpcomingDeadlinesCard.css";

import { FiCalendar, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import formatDueDate from "../../utils/formatDueDate";

function UpcomingDeadlinesCard({
  title = "Upcoming Deadlines",
  tasks = [],
  viewAllLink = "/tasks?sort=dueDate&order=asc",
  emptyMessage = "🎉 No upcoming deadlines.",
}) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>
          <FiCalendar />
          {title}
        </h3>

        <button
          className="view-all-btn"
          onClick={() => navigate(viewAllLink)}
        >
          View All <FiArrowRight />
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="dashboard-empty">{emptyMessage}</div>
      ) : (
        <div className="deadline-list">
          {tasks.map((task) => {
            const due = formatDueDate(task.dueDate);

            return (
              <div key={task._id} className="deadline-item">
                <div className="deadline-content">
                  <h4>{task.title}</h4>

                  <p>
                    {task.assignedTo?.name || "Unassigned"}
                    {task.project?.name && <> • {task.project.name}</>}
                  </p>
                </div>

                <span className={`deadline-status ${due.type}`}>
                  {due.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UpcomingDeadlinesCard;