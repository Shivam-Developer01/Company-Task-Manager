import SideDrawer from "../SideDrawer/SideDrawer";
import StatusBadge from "../StatusBadge/StatusBadge";
import { FiDownload, FiFileText } from "react-icons/fi";

import formatRelativeTime from "../../utils/formatRelativeTime";

import "./SubmissionDrawer.css";
import formatDateTime from "../../utils/formatDateTime";
import { API_BASE_URL } from "../../constants/config";

function SubmissionDrawer({
  isOpen,
  submission,
  loading,
  onClose,
  onApprove,
  onReject,
}) {
 

  return (
    <SideDrawer isOpen={isOpen} title="Submission Details" onClose={onClose}>
      {!submission ? null : (
        <>
          {/* Hierarchy Banner */}
          <div className="submission-hierarchy-banner">
            <div className="hierarchy-item">
              {submission.task?.project?.name ? (
                <>
                  📁 <strong>{submission.task.project.name}</strong>
                  {submission.task?.phase?.name && (
                    <>
                      <span className="hierarchy-separator">›</span>
                      📌 <span className="phase-chip">{submission.task.phase.name}</span>
                    </>
                  )}
                  <span className="hierarchy-separator">›</span>
                  📋 <span>{submission.task?.title}</span>
                </>
              ) : (
                <span>⚡ <strong>Independent Task</strong> › {submission.task?.title}</span>
              )}
            </div>
          </div>

          {/* ===========================
          Header
          =========================== */}

          <div className="submission-d-header">
            <div className="submission-d-avatar">📄</div>

            <div className="submission-d-title">
              <h2>Submission {submission.submissionNumber}</h2>

              <small>
                Submitted {formatRelativeTime(submission.createdAt)}
              </small>

              <div className="submission-status">
                <StatusBadge status={submission.status} />
              </div>
            </div>
          </div>

          {/* ===========================
        Task Information
        =========================== */}

          <div className="task-d-section">
            <h4>Task & Context Information</h4>

            <div className="task-info-d-grid">
              <div>
                <label>Task</label>
                <span>{submission.task?.title}</span>
              </div>

              {submission.task?.project?.name && (
                <div>
                  <label>Project</label>
                  <span>{submission.task.project.name}</span>
                </div>
              )}

              {submission.task?.phase?.name && (
                <div>
                  <label>Phase</label>
                  <span className="phase-text-badge">📌 {submission.task.phase.name}</span>
                </div>
              )}

              <div>
                <label>Assigned To</label>
                <span>
                  {submission.task?.assignedTo?.name}
                  {submission.task?.assignedTo?.employeeId &&
                    ` (${submission.task.assignedTo.employeeId})`}
                </span>
              </div>

              <div>
                <label>Assigned By</label>
                <span>{submission.task?.assignedBy?.name}</span>
              </div>

              <div>
                <label>Priority</label>

                <span
                  className={`priority-badge ${submission.task?.priority
                    ?.toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {submission.task?.priority}
                </span>
              </div>

              <div>
                <label>Due Date</label>

                <span>{formatDateTime(submission.task?.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* ===========================
        Task Description
=========================== */}

          <div className="task-d-section">
            <h4>Task Description</h4>

            <p>{submission.task?.description || "No description available."}</p>
          </div>

          {/* ===========================
          Checklist
=========================== */}

          <div className="task-d-section">
            <h4>
              Checklist (
              {
                submission.task?.checklist?.filter((item) => item.completed)
                  .length
              }
              /{submission.task?.checklist?.length || 0})
            </h4>

            {submission.task?.checklist?.length ? (
              <div className="task-d-checklist">
                {submission.task.checklist.map((item) => (
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
              <p className="empty-d-text">No checklist available.</p>
            )}
          </div>

          {/* ===========================
    Reference Attachments
=========================== */}

          <div className="task-d-section">
            <h4>Reference Attachments</h4>

            {submission.task?.referenceAttachments?.length ? (
              <div className="attachment-d-list">
                {submission.task.referenceAttachments.map((file, index) => (
                  <a
                    key={index}
                    href={file.fileUrl?.startsWith("http") ? file.fileUrl : `${API_BASE_URL}${file.fileUrl}`}
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

          {/* ===========================
                Submission Message
          =========================== */}

          <div className="task-d-section">
            <h4>Submission Message</h4>

            <p>{submission.message || "No message provided."}</p>
          </div>

          {/* ===========================
                    Attachments
          =========================== */}

          <div className="task-d-section">
            <h4>Attachments</h4>

            {submission.attachments?.length ? (
              <div className="attachment-d-list">
                {submission.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={file.fileUrl?.startsWith("http") ? file.fileUrl : `${API_BASE_URL}${file.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="attachment-card"
                  >
                    <div className="attachment-info">
                      <FiFileText className="attachment-icon" />

                      <div>
                        <strong>{file.originalName}</strong>
                        <small>{file.mimeType}</small>
                      </div>
                    </div>

                    <FiDownload className="download-icon" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="empty-d-text">No attachments uploaded.</p>
            )}
          </div>

          {/* ===========================
                Reviewer Feedback
          =========================== */}

          <div className="task-d-section">
            <h4>
              {submission.reviewedBy?.role === "admin"
                ? "Admin Feedback"
                : submission.reviewedBy?.role === "manager"
                ? "Manager Feedback"
                : "Reviewer Feedback"}
            </h4>

            <p>
              {submission.status === "Pending Review"
                ? "Submission is awaiting review."
                : submission.managerFeedback?.trim()
                  ? submission.managerFeedback
                  : `No feedback was provided by the ${
                      submission.reviewedBy?.role === "admin"
                        ? "admin"
                        : submission.reviewedBy?.role === "manager"
                        ? "manager"
                        : "reviewer"
                    }.`}
            </p>

            {submission.reviewedAt && (
              <small className="review-date">
                Reviewed {submission.reviewedBy?.name ? `by ${submission.reviewedBy.name}` : ""} on {formatDateTime(submission.reviewedAt)}
              </small>
            )}
          </div>

          {/* ===========================
                    Actions
          =========================== */}

          {submission.status === "Pending Review" && (
            <div className="task-drawer-actions">
              {submission.task?.assignedTo?.isActive !== false &&
                submission.submittedBy?.isActive !== false && (
                  <button
                    className="danger-d-btn"
                    disabled={loading}
                    onClick={() => onReject(submission)}
                  >
                    {loading ? "Please wait..." : "Reject"}
                  </button>
                )}

              <button
                className="save-d-btn"
                disabled={loading}
                onClick={() => onApprove(submission)}
              >
                {loading ? "Please wait..." : "Approve"}
              </button>
            </div>
          )}
        </>
      )}
    </SideDrawer>
  );
}

export default SubmissionDrawer;
