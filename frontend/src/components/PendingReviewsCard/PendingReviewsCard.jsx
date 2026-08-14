import "./PendingReviewsCard.css";

import { FiClipboard, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import formatRelativeTime from "../../utils/formatRelativeTime";

function PendingReviewsCard({
  title = "Pending Reviews",
  reviews = [],
  viewAllLink = "/submissions",
}) {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const taskBaseUrl = user?.role === "employee" ? "/employee/tasks" : "/tasks";

  const handleRowClick = (review) => {
    const taskId =
      review.task?._id ||
      (typeof review.task === "string" ? review.task : null);

    if (taskId) {
      navigate(`${taskBaseUrl}?task=${taskId}`);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>
          <FiClipboard />
          {title}
        </h3>

        <button className="view-all-btn" onClick={() => navigate(viewAllLink)}>
          View All <FiArrowRight />
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="dashboard-empty">
          {title === "Pending Reviews"
            ? "✅ No pending reviews."
            : "No submissions found."}
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => {
            const taskId =
              review.task?._id ||
              (typeof review.task === "string" ? review.task : null);
            const isClickable = Boolean(taskId);

            return (
              <div
                key={review._id}
                className={`review-item ${isClickable ? "clickable" : ""}`}
                onClick={() => isClickable && handleRowClick(review)}
              >
                <div className="review-content">
                  <h4>{review.task?.title || "Task Submission"}</h4>

                  <p>
                    {review.submittedBy?.name}
                    {review.submittedBy?.employeeId &&
                      ` (${review.submittedBy.employeeId})`}
                  </p>
                </div>

                <span className="review-time">
                  {formatRelativeTime(review.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PendingReviewsCard;
