# 🏢 Company Task Manager v1 — System Technical Documentation

## 1. Executive Summary & System Overview

**Company Task Manager v1** is an enterprise MERN stack web application built for task assignment, project workspace management, multi-stage submission reviews, role-governed authorization, AI-driven performance reporting, and automated department snapshot analytics.

The application follows a clean, decoupled architecture:
- **Frontend**: Single-page application built with **React v19** and **Vite v8**, employing **React Router v7** for public/protected route authorization, **Axios** with silent token refresh interceptors for API communication, and **Recharts** for interactive visual analytics.
- **Backend**: **Node.js** with **Express v5**, utilizing **Mongoose v9** for MongoDB object modeling, dual-token JWT authentication (`jsonwebtoken`), **Multer** in-memory streaming, and an in-process monthly scheduler for department performance snapshots.
- **File Storage**: Private **Supabase Storage** (`references` and `submissions` buckets) for binary files with dynamic short-lived signed URLs (1-hour expiration) and fallback support for legacy local files.
- **AI Analytics & Recommendation Engine**: Powered by Google Gemini (`@google/genai` SDK using `gemini-3.5-flash-lite`), featuring 6 structured report types, task reassignment decision-support, fail-closed security boundary defenses, and PDF/DOCX document export engines.

---

## 2. Technology Stack & Dependencies

### Frontend (`frontend/package.json`)
- **Core Library**: React v19.2.7 & React DOM v19.2.7
- **Build Tool**: Vite v8.1.1 & `@vitejs/plugin-react` v6.0.3
- **Routing**: React Router DOM v7.18.1 (`PublicRoute` & `ProtectedRoute`)
- **HTTP Client**: Axios v1.18.1 (configured with request/response interceptors)
- **UI & Analytics**: `recharts` v3.9.2, `react-icons` v5.7.0, `react-toastify` v11.1.0
- **Styling**: Modular Vanilla CSS3 Design System with modern glassmorphism, responsive tables, drawer panels, and badge utilities.

### Backend (`Backend/package.json`)
- **Runtime & Framework**: Node.js & Express v5.2.1
- **Database & ODM**: MongoDB & Mongoose v9.7.2
- **Authentication**: `jsonwebtoken` v9.0.3, `bcryptjs` v3.0.3
- **File Storage & Security**: `@supabase/supabase-js` v2.112.3, `multer` v2.2.0 (memory storage)
- **AI Integration**: `@google/genai` v2.16.0 (Google Gemini Provider)
- **Document Export**: `pdfkit` v0.19.1 (PDF generation), `docx` v9.7.1 (DOCX generation)
- **Middleware & Utility**: `helmet` v8.2.0, `compression` v1.8.1, `cors` v2.8.6, `dotenv` v17.4.2, `validator` v13.15.35

---

## 3. High-Level System Architecture

```
                                ┌──────────────────────────────────────────────┐
                                │             React 19 + Vite Frontend         │
                                │   (PublicRoute / ProtectedRoute Guards)       │
                                └──────────────────────┬───────────────────────┘
                                                       │  Axios HTTP Requests
                                                       │  Bearer JWT Authorization
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │            Express 5 Backend Server          │
                                │           (Helmet, Cors, Compression)        │
                                └──────┬───────────────┬───────────────┬───────┘
                                       │               │               │
                     ┌─────────────────┘               │               └──────────────────┐
                     ▼                                 ▼                                  ▼
      ┌─────────────────────────────┐   ┌─────────────────────────────┐   ┌─────────────────────────────┐
      │       MongoDB Atlas         │   │   Supabase Private Storage  │   │     Google Gemini AI        │
      │    (Mongoose v9 Schemas)    │   │  ('references'/'submissions')│   │   (@google/genai Provider)  │
      └─────────────────────────────┘   └─────────────────────────────┘   └─────────────────────────────┘
```

---

## 4. Frontend Architecture & Workflows

### 4.1 Layouts & Routing Hierarchy (`App.jsx`)
The frontend is split into two distinct layout shells protected by role-based guards:

1. **Public Routes** (`PublicRoute.jsx`):
   - `/` — Login Page (`Login.jsx`). Redirects authenticated users automatically to their role dashboard.

2. **Manager / Admin Workspace Layout** (`MainLayout.jsx` inside `ProtectedRoute allowedRoles={["manager", "admin"]}`):
   - `/dashboard` — Manager / Admin Overview Dashboard (`Dashboard.jsx`)
   - `/employees` — Employee & User Management (`Employees.jsx`)
   - `/departments` — Department Master Management (`Departments.jsx`)
   - `/designations` — Designation Master Management (`Designations.jsx`)
   - `/projects` — Project Workspaces & Phases (`Projects.jsx`)
   - `/kanban` — Interactive Task Kanban Board (`Kanban.jsx`)
   - `/tasks` — Task Management & Assignments (`Tasks.jsx`)
   - `/submissions` — Deliverable Submissions Review Queue (`Submissions.jsx`)
   - `/role-insights` — Team Performance & Role Analytics (`RoleInsights.jsx`)
   - `/ai-reports` — AI Executive Performance Reports & Reassignments (`AiReports.jsx`)
   - `/notifications` — System Notifications Center (`Notifications.jsx`)
   - `/profile` — User Profile & Password Change (`Profile.jsx`)

3. **Employee Workspace Layout** (`EmployeeLayout.jsx` inside `ProtectedRoute allowedRoles={["employee"]}`):
   - `/employee/dashboard` — Personal Employee Dashboard (`EmployeeDashboard.jsx`)
   - `/employee/kanban` — Employee Personal Kanban Board (`Kanban.jsx`)
   - `/employee/tasks` — Assigned Tasks & Progress (`MyTasks.jsx`)
   - `/employee/submissions` — My Work Deliverable Submissions (`MySubmissions.jsx`)
   - `/employee/role-insights` — Personal Workload & Performance Insights (`RoleInsights.jsx`)
   - `/employee/ai-reports` — Self Performance AI Reports (`AiReports.jsx`)
   - `/employee/notifications` — Personal Notifications Center (`Notifications.jsx`)
   - `/employee/profile` — Employee Profile & Password Change (`Profile.jsx`)

### 4.2 Axios HTTP Interceptor & Token Refresh (`utils/axios.js`)
- Attach Authorization Header: Adds `Bearer <accessToken>` from `localStorage` to all outgoing requests.
- Automatic 401 Interception: On receiving a 401 error, pauses original requests in a `failedQueue`.
- Token Refresh Execution: Makes a request to `POST /api/auth/refresh-token` with the stored `refreshToken`.
- Concurrent Request Processing: Upon successful token acquisition, updates `localStorage` and retries all queued requests with the new access token. If refresh fails, clears storage and redirects to `/`.

---

## 5. Backend Architecture & Service Layer

The backend adopts a layered MVC structure:
- **Routes (`/routes`)**: Define HTTP verbs, endpoint paths, and mount middleware chains.
- **Middleware (`/middleware`)**: Auth checking (`auth.js`), role authorization (`authorize.js`), Multer memory buffer uploaders (`uploadReference.js`, `uploadSubmission.js`), validation rules, and central error handling (`errorHandler.js`).
- **Controllers (`/controllers`)**: Parse request parameters, delegate to services, and return standardized JSON responses.
- **Services (`/services`)**: Enforce core business rules, access policies, data aggregations, AI prompt pipelines, and database updates.
- **Models (`/models`)**: Define Mongoose schemas, field types, enums, validation constraints, and database indexes.

---

## 6. Authentication & Security Architecture

### 6.1 Authentication Flow
- **Login (`POST /api/auth/login`)**: Validates credentials against hashed passwords using `bcryptjs`. Returns user object, 15-minute Access Token, and 7-day Refresh Token. Saves the refresh token in the `User` model document.
- **Access Token Expiration**: 15 minutes (`ACCESS_TOKEN_EXPIRES=15m`). Signed with `JWT_ACCESS_SECRET`.
- **Refresh Token Expiration**: 7 days (`REFRESH_TOKEN_EXPIRES=7d`). Signed with `JWT_REFRESH_SECRET`.
- **Token Refresh (`POST /api/auth/refresh-token`)**: Validates refresh token against secret and checks if it matches the stored token on the user document in MongoDB. Issues a new 15-minute access token.
- **Logout (`POST /api/auth/logout`)**: Clears `refreshToken` in the database user document, invalidating the session.
- **First-Time Password Enforcement**: When created by an Admin/Manager, `mustChangePassword` is set to `true`. On login, user is restricted until changing their password via `PATCH /api/auth/change-password`.

### 6.2 Role Authorization Policy
- **`admin`**: Full access to system configuration, user creation, master data (departments, designations), all projects, all tasks, company-wide analytics, all AI report types, and manual snapshot triggers.
- **`manager`**: Access to create/update tasks, manage assigned projects, manage employees, review work submissions, view manager team analytics, generate manager AI reports, and trigger task reassignment recommendations.
- **`employee`**: Access restricted to assigned tasks, personal task checklists, task acceptance/rejection, deliverable submissions, personal notifications, personal employee analytics, and self employee performance AI reports.

---

## 7. Supabase Storage Architecture

File uploads are handled through private **Supabase Storage** buckets, ensuring sensitive task attachments and work deliverables are never publicly exposed.

```
Upload Flow:
Client (Multipart Form) ──► Multer Memory Storage ──► Backend Buffer ──► Supabase Private Bucket

Download/Access Flow:
Client Request ──► Backend Auth & Role Check ──► Supabase createSignedUrl (3600s) ──► Short-Lived Signed URL
```

### 7.1 Private Buckets
- **`references`**: Private bucket for manager task specification files and reference materials.
- **`submissions`**: Private bucket for employee work deliverable files.
- Credentials: `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are kept strictly on the backend. `SUPABASE_SECRET_KEY` is never sent to the client.

### 7.2 Upload & File Handling Policies (`utils/supabaseStorage.js`)
- **Memory Uploads**: Multer config (`uploadReference.js`, `uploadSubmission.js`) uses `multer.memoryStorage()`. Files are buffered in memory before being uploaded to Supabase Storage via `uploadFile()`.
- **File Validation**:
  - Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip`.
  - File Size Limit: Maximum **10 MB** (`10 * 1024 * 1024` bytes) per file.
  - File Count Limit: Maximum **10 files** per request (`uploadReference.array("referenceAttachments", 10)` and `uploadSubmission.array("attachments", 10)`).
- **Safe Filenames**: `getSafeFileName()` normalizes user-provided original filenames to eliminate path traversal characters (`..`, `/`, `\`) and non-alphanumeric symbols.
- **Signed URLs**: Backend generates 1-hour (3600 seconds) signed URLs via `createSignedUrl()` dynamically when sending task or submission payloads to authorized frontend viewers (`transformAttachment`, `transformAttachments`).
- **Cleanup & Rollback**: `deleteFile()` and `deleteFiles()` bulk delete objects from Supabase buckets during rollback scenarios or record deletion.
- **Legacy Local Fallback**: Maintains transparent compatibility for older attachments stored as local file paths (`/uploads/...`) while serving new uploads via Supabase signed URLs.

---

## 8. AI Analytics, Recommendation & Document Export Engine

The AI integration operates via a backend-governed decision support engine using Google Gemini.

### 8.1 6 Structured AI Reports (`aiReportConfig.js`)
1. **Employee Performance Report** (`EMPLOYEE_PERFORMANCE`): Evaluates personal completion velocity, active workload, overdue risks, and performance trends (`improving`, `stable`, `declining`, `insufficient_data`).
2. **Manager Team Performance Report** (`MANAGER_TEAM_PERFORMANCE`): Analyzes team completion rates, review bottlenecks, workload concentration, and operational insights.
3. **Manager Performance Report** (`MANAGER_PERFORMANCE`): Evaluates manager oversight effectiveness, review turnaround time, team workload distribution, and department comparisons.
4. **Admin Company Performance Report** (`ADMIN_COMPANY_PERFORMANCE`): Provides company-wide executive performance summary, overall organizational health (`healthy`, `stable`, `needs_attention`), department execution, manager effectiveness, and project risks.
5. **Project Performance Report** (`PROJECT_PERFORMANCE`): Evaluates project completion velocity, phase progress, pending review bottlenecks, and upcoming deadline risks.
6. **Department Performance Report** (`DEPARTMENT_PERFORMANCE`): Analyzes department workforce, task execution, manager workload, project impacts, and historical month-over-month comparisons (or single vs multi-department scope).

### 8.2 AI Task Reassignment Recommendation Engine (`aiRecommendationConfig.js`)
Answers: *"Who is the best eligible person to take this task RIGHT NOW, and WHY?"*
- Supports both **Independent Tasks** (all active employees evaluated) and **Project Tasks** (prioritizes active project members).
- Deterministic Pre-Scoring: Computes a deterministic candidate suitability score considering active tasks count, overdue count, completion rate, on-time rate, and project membership.
- Gemini Advisory Recommendation: Evaluates evidence and pre-computed scores to recommend the optimal candidate with exact numerical rationale and trade-offs.
- No-Candidate & Missing-Metric Handling: Candidates with missing or `N/A` metrics are evaluated using available data without crash or arbitrary exclusion.

### 8.3 AI Security Boundary & Prompt-Injection Hardening (`aiSecurityBoundary.js`)
- **Fail-Closed Security**: Throws `AI_CONTEXT_SECURITY_REJECTED` (403/400) if context DTO structure is invalid.
- **Deep Secret Leak Scanning**: RegEx pattern scanning (`SECRET_VALUE_PATTERNS`) blocks JWT tokens, MongoDB connection strings, Bearer tokens, and API key patterns. Scans key names against `SENSITIVE_FIELDS` denylist (`password`, `refreshToken`, `JWT_SECRET`, etc.).
- **Context Allowlist Filtering**: Data minimization via `ALLOWED_FIELDS` mapping per report type.
- **ObjectId Mapping**: Maps raw MongoDB ObjectIds to human-readable business IDs (e.g. Employee ID, Department Code) before sending context to AI models.
- **System Instructions & Structural Tags**: Wraps application context inside `<AUTHORIZED_APPLICATION_DATA>` XML tags and instructs the model to treat data strictly as UNTRUSTED DATA.
- **Output Sanitization & Schema Validation (`aiResponseValidator.js`)**: Strips `<script>`, `<iframe>`, and inline event handlers from AI string outputs. Validates output JSON strictly against predefined report/recommendation JSON schemas.

### 8.4 Document Export Pipeline
- **PDF Export (`pdfReportGenerator.js`)**: Generates structured, styled PDF documents using `pdfkit` featuring clean typography, status indicators, positive developments, attention areas, evidence lists, and advisory recommendations.
- **DOCX Export (`docxReportGenerator.js`)**: Builds native Microsoft Word `.docx` documents using `docx` library with custom styling, headings, bullet lists, and tables.

---

## 9. Analytics & Automated Department Snapshot Scheduler

### 9.1 Multi-Level Analytics
- **Company Analytics**: Total users, active projects, overall completion rate, overdue task counts, pending review counts, and average review turnaround time.
- **Manager Team Analytics**: Team member workload distribution, completion velocity, review turnaround days, and pending review queue.
- **Employee Analytics**: Personal task stats, completion rate, on-time completion percentage, and active workload.
- **Project Analytics**: Phase progress, completion rate, member task distribution, and overdue task count.
- **Department Analytics**: Workforce numbers, task delivery metrics, submission/review rates, and historical performance trends.

### 9.2 Department Snapshot Architecture (`DepartmentPerformanceSnapshot.js`)
- Model: `DepartmentPerformanceSnapshot` stores compact, deterministic historical snapshot counts at the end of each reporting period (`YYYY-MM`).
- Indexes: Unique compound index on `{ departmentId: 1, period: 1 }` guaranteeing idempotency (exactly 1 snapshot per department per period).

### 9.3 In-Process Snapshot Scheduler (`departmentSnapshotScheduler.js`)
- Lifecycle: Initialized on server boot in `server.js` via `initDepartmentSnapshotScheduler()`.
- Single-Process Guard: `isInitialized` flag prevents duplicate intervals in the same process.
- Execution Timing: Runs an initial check **5 seconds after server startup**, then schedules daily checks every **24 hours** (`setInterval`) to capture month transitions.
- Period Calculation: Calculates previous completed month in `Asia/Kolkata` timezone via `getPreviousCompletedPeriodString()` (e.g., returns `"2026-07"` when executed in August 2026).
- Idempotency: Uses `findOneAndUpdate` with `upsert: true` so re-running snapshot generation for an existing period updates the existing snapshot without duplication.
- Manual Trigger API: Admin can trigger snapshot generation manually on-demand via `POST /api/analytics/department-snapshot`.

---

## 10. Database Schemas Overview

The application utilizes 10 Mongoose schemas (`Backend/models/`):

1. **`User`**: User accounts with `name`, `email`, `password`, `role` (`admin`, `manager`, `employee`), `employeeId`, `department` (ref), `designation` (ref), `isActive`, `mustChangePassword`, `refreshToken`, `createdBy`, `updatedBy`.
2. **`Department`**: Department master with `name` (unique), `code` (uppercase, unique), `isActive`, timestamps.
3. **`Designation`**: Department-scoped designations with `name`, `code`, `department` (ref), `isActive`. Unique compound indexes on `{ department: 1, name: 1 }` and `{ department: 1, code: 1 }`.
4. **`Task`**: Tasks with `title`, `description`, `project` (ref), `phase` (ref), `assignedTo` (ref), `assignedBy` (ref), `priority` (`Low`, `Medium`, `High`, `Critical`), `dueDate`, `status` (`Assigned`, `Accepted`, `Rejected`, `In Progress`, `Submitted`, `Closed`, `Withdrawn`), `rejectionReason`, `checklist` (`ChecklistSchema`), `referenceAttachments` (`AttachmentSchema`), `isArchived`, `completedAt`. Text index on title & description.
5. **`Project`**: Workspaces with `name` (unique), `description`, `members` (array of User refs), `isArchived`, `createdBy`, `updatedBy`.
6. **`Phase`**: Project phases with `name`, `description`, `project` (ref), `order`, `isArchived`. Compound indexes on `{ project: 1, name: 1 }` and `{ project: 1, order: 1 }`.
7. **`Submission`**: Work deliverables with `task` (ref), `submittedBy` (ref), `submissionNumber`, `message`, `attachments` (`AttachmentSchema`), `status` (`Pending Review`, `Approved`, `Rejected`), `managerFeedback`, `reviewedBy` (ref), `reviewedAt`.
8. **`Activity`**: Audit trail with `project` (ref), `task` (ref), `action`, `performedBy` (ref), `remarks`, timestamps. Indexes on project, task, and performedBy.
9. **`Notification`**: Notifications with `user` (ref), `title`, `message`, `type`, `task` (ref), `project` (ref), `submission` (ref), `isRead`, `expiresAt`. TTL index on `expiresAt` (`expireAfterSeconds: 0`).
10. **`DepartmentPerformanceSnapshot`**: Historical snapshots with `departmentId` (ref), `departmentCode`, `departmentName`, `period` (`YYYY-MM`), `snapshotDate`, workforce counts, task performance counts, submission/review counts, active projects count. Unique compound index `{ departmentId: 1, period: 1 }`.

---

## 11. Environment Configuration Reference

All sensitive keys must be set in `Backend/.env` (and `frontend/.env` for client):

### Backend (`Backend/.env`)
```env
# Database Connection
MONGO_URI=mongodb://localhost:27017/Task_Manager

# CORS & Frontend Origin
FRONTEND_URL=http://localhost:5173

# Notification Retention (Days)
NOTIFICATION_RETENTION_DAYS=180

# JWT Token Configuration
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# Google Gemini AI Provider
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=30000

# Supabase Storage Configuration
SUPABASE_URL=<your-supabase-url>
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 12. System Conclusion

Company Task Manager v1 delivers an enterprise-grade solution combining core task management workflows with modern AI decision support, private cloud storage security, and automated historical department performance analytics.
