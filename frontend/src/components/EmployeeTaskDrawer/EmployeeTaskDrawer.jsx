import SideDrawer from "../SideDrawer/SideDrawer";
import "./EmployeeTaskDrawer.css";
import { useEffect, useState } from "react";
import taskService from "../../services/taskService";
import formatDate from "../../utils/formatDate";
import formatRelativeTime from "../../utils/formatRelativeTime";
import { API_BASE_URL } from "../../constants/config";

import StatusBadge from "../StatusBadge/StatusBadge";

function EmployeeTaskDrawer({
  isOpen,
  task,
  loading,
  onClose,
  onAccept,
  onReject,
  onStart,
  onChecklistToggle,
  onSubmit,
}) {
  const [activities, setActivities] = useState([]);

  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!isOpen || !task) return;

      try {
        setLoadingActivities(true);

        const response = await taskService.getTaskActivities(task._id);

        setActivities(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [isOpen, task]);

  return (
    <SideDrawer isOpen={isOpen} title="Task Details" onClose={onClose}>
      {!task ? null : (
        <>
          {/* Header */}

          <div className="task-d-header">
            <div className="task-d-avatar">
              {task.title?.charAt(0).toUpperCase()}
            </div>

            <h2>{task.title}</h2>

            <StatusBadge status={task.status} />

            <span className={`priority-d-chip ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
          </div>

          {/* Description */}

          <div className="task-d-section">
            <h4>Description</h4>

            <p>{task.description}</p>
          </div>

          {/* Assignment */}

          <div className="task-d-section">
            <h4>Assignment</h4>

            <div className="task-info-d-grid">
              <div>
                <label>Employee</label>

                <span>{task.assignedTo?.name}</span>
              </div>

              <div>
                <label>Project</label>

                <span>{task.project?.name || "-"}</span>
              </div>

              <div>
                <label>Assigned By</label>

                <span>{task.assignedBy?.name}</span>
              </div>

              <div>
                <label>Due Date</label>

                <span>{formatDate(task.dueDate)}</span>
              </div>
            </div>
          </div>

          <div className="task-d-section">
            <h4>Checklist</h4>

            {task.checklist?.length ? (
              <div className="task-d-checklist">
                {task.checklist.map((item) => (
                  <div
                    key={item._id}
                    className={`checklist-d-row ${
                      item.completed ? "completed" : ""
                    }`}
                  >
                    <span className="check-d-icon">
                      {item.completed ? "✔" : "○"}
                    </span>

                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-d-text">No checklist items.</p>
            )}
          </div>
          <div className="task-d-section">
            <h4>Reference Attachments</h4>

            {task.referenceAttachments?.length ? (
              <div className="attachment-d-list">
                {task.referenceAttachments.map((file, index) => (
                  <a
                    key={index}
                    href={`${API_BASE_URL}${file.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="attachment-card"
                  >
                    <div>
                      <strong>{file.originalName}</strong>

                      <small>{file.mimeType}</small>
                    </div>

                    <span>↗</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="empty-d-text">No reference attachments.</p>
            )}
          </div>

          <div className="task-d-section">
            <h4>Activity Timeline</h4>

            {loadingActivities ? (
              <p className="empty-d-text">Loading...</p>
            ) : activities.length === 0 ? (
              <p className="empty-d-text">No activity available.</p>
            ) : (
              <div className="activity-d-timeline">
                {activities.map((activity) => (
                  <div key={activity._id} className="timeline-d-item">
                    <div className="timeline-d-dot" />

                    <div className="timeline-d-content">
                      <strong>{activity.action}</strong>

                      {activity.remarks && <p>{activity.remarks}</p>}

                      <small
                        title={new Date(activity.createdAt).toLocaleString()}
                      >
                        {activity.performedBy?.name || "System"} •{" "}
                        {formatRelativeTime(activity.createdAt)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {task.status === "Assigned" && (
            <div className="task-drawer-actions">
              <button className="danger-btn" onClick={() => onReject(task)}>
                Reject
              </button>

              <button
                className="save-d-btn"
                disabled={loading}
                onClick={() => onAccept(task)}
              >
                {loading ? "Accepting..." : "Accept"}
              </button>
            </div>
          )}
          {task.status === "Accepted" && (
            <div className="task-drawer-actions">
              <button
                className="save-d-btn"
                disabled={loading}
                onClick={() => onStart(task)}
              >
                {loading ? "Starting..." : "Start Task"}
              </button>
            </div>
          )}
          {task.checklist.map((item) => (
            <div
              key={item._id}
              className={`checklist-d-row ${item.completed ? "completed" : ""}`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                disabled={task.status !== "In Progress"}
                onChange={() => onChecklistToggle(task._id, item._id)}
              />

              <span>{item.title}</span>
            </div>
          ))}
          {task.status === "In Progress" && (
            <div className="task-drawer-actions">
              <button className="save-d-btn" onClick={() => onSubmit(task)}>
                Submit Task
              </button>
            </div>
          )}
          {task.status === "Submitted" && (
            <div className="task-status-message waiting">
              ⏳ Waiting for manager review
            </div>
          )}
          {task.status === "Closed" && (
            <div className="task-status-message success">✅ Task completed</div>
          )}
          {task.status === "Rejected" && (
            <div className="task-status-message danger">
              ❌ Assignment rejected
              {task.rejectionReason && <p>{task.rejectionReason}</p>}
            </div>
          )}
          {task.status === "Withdrawn" && (
            <div className="task-status-message warning">
              ⚠ This task has been withdrawn by the manager.
            </div>
          )}
        </>
      )}
    </SideDrawer>
  );
}

export default EmployeeTaskDrawer;
