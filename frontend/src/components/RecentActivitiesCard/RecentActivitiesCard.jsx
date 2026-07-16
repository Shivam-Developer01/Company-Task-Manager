import "./RecentActivitiesCard.css";

import { FiActivity, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import formatRelativeTime from "../../utils/formatRelativeTime";

function RecentActivitiesCard({
  title = "Recent Activities",
  activities = [],
  viewAllLink = "/tasks",
}) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>
          <FiActivity />
          {title}
        </h3>

        <button
          className="view-all-btn"
          onClick={() => navigate(viewAllLink)}
        >
          View All <FiArrowRight />
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="dashboard-empty">
          No recent activity yet.
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="activity-item"
            >
              <div className="activity-content">
                <h4>{activity.action}</h4>

                <p>{activity.performedBy?.name || "System"}</p>
              </div>

              <span className="activity-time">
                {formatRelativeTime(activity.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentActivitiesCard;