const ROLES = {
  MANAGER: "manager",
  EMPLOYEE: "employee",
};

const TASK_STATUS = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  CLOSED: "Closed",
  WITHDRAWN: "Withdrawn",
  TASK_REJECTED: "Rejected",
};

const SUBMISSION_STATUS = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const PRIORITY = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const NOTIFICATION_TYPE = {
  TASK_ASSIGNED: "Task Assigned",
  TASK_UPDATED: "Task Updated",
  TASK_REASSIGNED: "Task Reassigned",
  TASK_WITHDRAWN: "Task Withdrawn",

  ASSIGNMENT_ACCEPTED: "Assignment Accepted",
  ASSIGNMENT_REJECTED: "Assignment Rejected",

  SUBMISSION_RECEIVED: "Submission Received",
  SUBMISSION_APPROVED: "Submission Approved",
  SUBMISSION_REJECTED: "Submission Rejected",
};

const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB

  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

module.exports = {
  ROLES,
  TASK_STATUS,
  SUBMISSION_STATUS,
  PRIORITY,
  NOTIFICATION_TYPE,
  FILE_UPLOAD,
};
