import formatDateTime from "../../utils/formatDateTime";
import "./NotificationCard.css";

import {
  FiClipboard,
  FiRefreshCw,
  FiRepeat,
  FiXCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiUpload,
  FiBell,
} from "react-icons/fi";

function NotificationCard({ notification, onClick }) {
  const getIcon = () => {
    switch (notification.type) {
      case "Task Assigned":
        return <FiClipboard className="notification-icon assigned" />;

      case "Task Updated":
        return <FiRefreshCw className="notification-icon updated" />;

      case "Task Reassigned":
        return <FiRepeat className="notification-icon reassigned" />;

      case "Task Withdrawn":
        return <FiXCircle className="notification-icon withdrawn" />;

      case "Assignment Accepted":
        return <FiCheckCircle className="notification-icon accepted" />;

      case "Assignment Rejected":
        return <FiAlertCircle className="notification-icon rejected" />;

      case "Submission Received":
        return <FiUpload className="notification-icon received" />;

      case "Submission Approved":
        return <FiCheckCircle className="notification-icon approved" />;

      case "Submission Rejected":
        return <FiAlertCircle className="notification-icon rejected" />;

      default:
        return <FiBell className="notification-icon default" />;
    }
  };

  return (
    <div
      className={`notification-card ${notification.isRead ? "" : "unread"}`}
      onClick={() => onClick(notification)}
    >
      <div className="notification-left">{getIcon()}</div>

      <div className="notification-content">
        <div className="notification-header">
          <h4>{notification.title}</h4>

          {!notification.isRead && <span className="unread-dot"></span>}
        </div>

        <p title={notification.message}>{notification.message}</p>

        <small>{formatDateTime(notification.createdAt)}</small>
      </div>
    </div>
  );
}

export default NotificationCard;
