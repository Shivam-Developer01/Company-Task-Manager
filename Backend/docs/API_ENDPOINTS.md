# Complete API Endpoints Reference

Base URL:
```
http://localhost:3000/api
```

All protected routes require an HTTP header: `Authorization: Bearer <accessToken>`.

---

## 1. Authentication & User Management (`/api/auth`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | No | Public | Body: `{ email, password }` | Authenticate user credentials and return User object, Access Token (15m), and Refresh Token (7d). |
| `/api/auth/refresh-token` | `POST` | No | Public | Body: `{ refreshToken }` | Exchange valid refresh token for a new access token. |
| `/api/auth/logout` | `POST` | Yes | Authenticated | None | Invalidates user refresh token session in MongoDB database. |
| `/api/auth/me` | `GET` | Yes | Authenticated | None | Fetch current authenticated user profile. |
| `/api/auth/change-password` | `PATCH` | Yes | Authenticated | Body: `{ currentPassword, newPassword }` | Update user password and set `mustChangePassword` to `false`. |
| `/api/auth/users` | `GET` | Yes | Admin, Manager | Query: `search`, `role`, `department`, `page`, `limit` | List organization users with filters & pagination. |
| `/api/auth/users` | `POST` | Yes | Admin, Manager | Body: `{ name, email, password, employeeId, role, department, designation }` | Create new user employee/manager account. |
| `/api/auth/users/options` | `GET` | Yes | Admin, Manager | Query: `role`, `department` | Fetch active user key-value options for select dropdowns. |
| `/api/auth/users/:id` | `GET` | Yes | Admin, Manager | Params: `id` | Get user details by ObjectId. |
| `/api/auth/users/:id` | `PATCH` | Yes | Admin, Manager | Body: `{ name, email, role, department, designation, employeeId }` | Update user employee details. |
| `/api/auth/users/:id/status` | `PATCH` | Yes | Admin, Manager | Body: `{ isActive }` | Toggle user active / deactivated account status. |
| `/api/auth/users/:id/reset-password` | `PATCH` | Yes | Admin, Manager | Body: `{ newPassword }` | Admin/Manager forced password reset for user. |
| `/api/auth/users/:id/active-tasks-count` | `GET` | Yes | Admin, Manager | Params: `id` | Get count of active tasks currently assigned to target user. |

---

## 2. Department Master Management (`/api/departments`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/departments` | `GET` | Yes | Authenticated | Query: `search`, `status`, `page`, `limit` | List departments with pagination and search. |
| `/api/departments/:id` | `GET` | Yes | Authenticated | Params: `id` | Fetch department by ObjectId. |
| `/api/departments` | `POST` | Yes | Admin, Manager | Body: `{ name, code }` | Create new department record. |
| `/api/departments/:id` | `PATCH` | Yes | Admin, Manager | Body: `{ name, code }` | Update existing department details. |
| `/api/departments/:id/status` | `PATCH` | Yes | Admin, Manager | Body: `{ isActive }` | Toggle department active status. |

---

## 3. Designation Master Management (`/api/designations`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/designations` | `GET` | Yes | Authenticated | Query: `search`, `department`, `status`, `page`, `limit` | List designations with filters & pagination. |
| `/api/designations/:id` | `GET` | Yes | Authenticated | Params: `id` | Fetch designation by ObjectId. |
| `/api/designations` | `POST` | Yes | Admin, Manager | Body: `{ name, code, department }` | Create department-scoped designation. |
| `/api/designations/:id` | `PATCH` | Yes | Admin, Manager | Body: `{ name, code, department }` | Update designation details. |
| `/api/designations/:id/status` | `PATCH` | Yes | Admin, Manager | Body: `{ isActive }` | Toggle designation active status. |

---

## 4. Project Workspaces & Phases (`/api/projects`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/projects` | `GET` | Yes | Admin, Manager | Query: `search`, `isArchived`, `page`, `limit` | List project workspaces. |
| `/api/projects` | `POST` | Yes | Admin, Manager | Body: `{ name, description, members }` | Create new project workspace. |
| `/api/projects/:id` | `GET` | Yes | Admin, Manager | Params: `id` | Get project workspace details. |
| `/api/projects/:id` | `PATCH` | Yes | Admin, Manager | Body: `{ name, description }` | Update project workspace details. |
| `/api/projects/:id/status` | `PATCH` | Yes | Admin, Manager | Body: `{ isArchived }` | Toggle project workspace archive status. |
| `/api/projects/:id/members` | `GET` | Yes | Admin, Manager | Params: `id` | List member details assigned to project. |
| `/api/projects/:id/members` | `PATCH` | Yes | Admin, Manager | Body: `{ members: [userIds] }` | Update assigned project team members list. |
| `/api/projects/:id/employees` | `GET` | Yes | Admin, Manager | Params: `id` | Get available employees eligible to join project. |
| `/api/projects/:id/phases` | `POST` | Yes | Admin, Manager | Body: `{ name, description, order }` | Add new phase to project workspace. |
| `/api/projects/:id/phases/:phaseId` | `PATCH` | Yes | Admin, Manager | Body: `{ name, description, order, isArchived }` | Update project phase details. |
| `/api/projects/:id/phases/:phaseId` | `DELETE` | Yes | Admin, Manager | Params: `id`, `phaseId` | Delete phase from project workspace. |

---

## 5. Task Management (`/api/tasks`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/tasks` | `POST` | Yes | Admin, Manager | Multipart: `referenceAttachments` (max 10, 10MB) + Body fields (`title`, `description`, `assignedTo`, `priority`, `dueDate`, `project`, `phase`, `checklist`) | Create new task with spec attachments. |
| `/api/tasks` | `GET` | Yes | Admin, Manager | Query: `search`, `status`, `priority`, `project`, `assignedTo`, `page`, `limit` | List all system tasks with filters. |
| `/api/tasks/my` | `GET` | Yes | Employee | Query: `search`, `status`, `priority`, `page`, `limit` | List tasks assigned to logged-in employee. |
| `/api/tasks/:id` | `GET` | Yes | Admin, Manager, Employee | Params: `id` | Get task details by ObjectId. |
| `/api/tasks/:id` | `PATCH` | Yes | Admin, Manager | Multipart: `referenceAttachments` + Body fields | Update task details and attachments. |
| `/api/tasks/:id/withdraw` | `PATCH` | Yes | Admin, Manager | Params: `id` | Withdraw task assignment (sets status to `Withdrawn`). |
| `/api/tasks/:id/reassign` | `PATCH` | Yes | Admin, Manager | Body: `{ newAssigneeId }` | Reassign task to a new employee. |
| `/api/tasks/:id/close` | `PATCH` | Yes | Admin, Manager | Params: `id` | Mark task as `Closed`. |
| `/api/tasks/:id/archive` | `PATCH` | Yes | Admin, Manager | Body: `{ isArchived }` | Toggle task archive status. |
| `/api/tasks/:id/accept` | `PATCH` | Yes | Employee | Params: `id` | Employee accepts task assignment (`Accepted`). |
| `/api/tasks/:id/reject` | `PATCH` | Yes | Employee | Body: `{ rejectionReason }` | Employee rejects task assignment (`Rejected`). |
| `/api/tasks/:id/start` | `PATCH` | Yes | Employee | Params: `id` | Employee starts working (`In Progress`). |
| `/api/tasks/:taskId/checklist/:checklistId` | `PATCH` | Yes | Employee | Body: `{ completed: true/false }` | Update checklist sub-item completed status. |
| `/api/tasks/:id/activities` | `GET` | Yes | Admin, Manager, Employee | Params: `id` | Fetch task activity log timeline. |

---

## 6. Submission Management (`/api/submissions`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/submissions/:taskId` | `POST` | Yes | Employee | Multipart: `attachments` (max 10, 10MB) + Body: `{ message }` | Submit work deliverable for task. |
| `/api/submissions/my` | `GET` | Yes | Employee | Query: `status`, `page`, `limit` | List submissions created by logged-in employee. |
| `/api/submissions` | `GET` | Yes | Admin, Manager | Query: `status`, `task`, `submittedBy`, `page`, `limit` | List all work submissions for review. |
| `/api/submissions/:id` | `GET` | Yes | Admin, Manager, Employee | Params: `id` | Get submission details by ObjectId. |
| `/api/submissions/:id/review` | `PATCH` | Yes | Admin, Manager | Body: `{ status: "Approved"/"Rejected", managerFeedback }` | Review submission (Approve closes task, Reject reverts to `In Progress`). |

---

## 7. Dashboards (`/api/dashboard`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/dashboard/manager` | `GET` | Yes | Admin, Manager | Manager overview stats, pending reviews, overdue tasks, team metrics. |
| `/api/dashboard/employee` | `GET` | Yes | Employee | Personal employee stats, assigned tasks, pending submissions. |
| `/api/dashboard/project/:id` | `GET` | Yes | Authenticated | Dashboard details for specific project workspace. |
| `/api/dashboard/project/:id/analytics` | `GET` | Yes | Authenticated | Analytics breakdown for specific project. |

---

## 8. Notifications (`/api/notifications`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/notifications` | `GET` | Yes | Authenticated | List notifications for logged-in user with pagination. |
| `/api/notifications/unread-count` | `GET` | Yes | Authenticated | Get unread notification count. |
| `/api/notifications/:id/read` | `PATCH` | Yes | Authenticated | Mark single notification as read. |
| `/api/notifications/read-all` | `PATCH` | Yes | Authenticated | Mark all notifications as read. |

---

## 9. Analytics & Snapshots (`/api/analytics`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/analytics/employee/me` | `GET` | Yes | Employee | Current logged-in employee's performance metrics. |
| `/api/analytics/employee/:id` | `GET` | Yes | Admin, Manager | Performance metrics for target employee ID. |
| `/api/analytics/manager/team` | `GET` | Yes | Admin, Manager | Manager team workload and completion metrics. |
| `/api/analytics/project/:id` | `GET` | Yes | Admin, Manager | Analytics breakdown for target project ID. |
| `/api/analytics/company` | `GET` | Yes | Admin | Company-wide executive analytics summary. |
| `/api/analytics/department-snapshot` | `POST` | Yes | Admin | Manually trigger monthly department snapshot generation. |

---

## 10. AI Engine, Context, Security & Exports (`/api/ai`)

| Endpoint Path | Method | Auth Required | Allowed Roles | Request Parameters / Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/ai/health` | `GET` | Yes | Admin, Manager | None | Gemini AI Provider configuration & health check. |
| `/api/ai/test` | `POST` | Yes | Admin | None | Test provider connectivity with fixed test prompt. |
| `/api/ai/context/preview` | `GET` | Yes | Authenticated | Query: `contextType`, `targetId` | Preview sanitized AIContextDTO payload. |
| `/api/ai/security/verify` | `POST` | Yes | Admin, Manager | Body: `{ contextDto }` | Test AI security boundary validation & fail-closed checks. |
| `/api/ai/response/verify` | `POST` | Yes | Admin, Manager | Body: `{ rawResponse, schemaName }` | Test structured AI output schema validation. |
| `/api/ai/audit` | `GET` | Yes | Admin | None | Execute automated AI security boundary test assertions. |
| `/api/ai/report/generate` | `POST` | Yes | Authenticated | Body: `{ reportType, targetId, scopeMode }` | Generate structured AI performance report (6 types supported). |
| `/api/ai/report/export/pdf` | `POST` | Yes | Authenticated | Body: `{ reportData, reportType }` | Export validated AI report as binary PDF file. |
| `/api/ai/report/export/docx` | `POST` | Yes | Authenticated | Body: `{ reportData, reportType }` | Export validated AI report as binary DOCX file. |
| `/api/ai/recommendation/generate` | `POST` | Yes | Authenticated | Body: `{ recommendationType: "TASK_ASSIGNMENT", targetId }` | Generate structured AI task reassignment recommendation. |
| `/api/ai/recommendation/candidate-evidence` | `POST` | Yes | Admin, Manager | Body: `{ taskId }` | Fetch deterministic candidate evidence & pre-scores for target task. |
