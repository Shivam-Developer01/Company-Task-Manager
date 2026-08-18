# Backend Technical Architecture & Developer Reference

## 1. Executive Summary & Server Setup

The backend of **Company Task Manager v1** is an Express 5 RESTful API running on Node.js with MongoDB (via Mongoose v9).

Key Operational Features:
- **Server Startup (`server.js`)**: Connects to MongoDB (`connectDB()`), starts the in-process monthly department snapshot scheduler (`initDepartmentSnapshotScheduler()`), and listens on port 3000.
- **Middleware Chain**: Standard Express JSON body parser (`express.json()`), header security (`helmet()`), response compression (`compression()`), and cross-origin resource sharing (`cors()` with credentials support for `FRONTEND_URL`).
- **File Storage Integration**: Supabase Storage for private binary bucket uploads (`references` and `submissions`) with 1-hour signed URLs and legacy static local fallback (`/uploads`).
- **AI Integration**: Google Gemini AI provider (`@google/genai`) for structured reports, task reassignment recommendations, fail-closed security boundary, and PDF/DOCX document export engines.
- **Automated Analytics Scheduler**: Background monthly scheduler targeting previous completed reporting month in `Asia/Kolkata` timezone.

---

## 2. Directory Structure

```
Backend/
├── constants/
│   └── constants.js                 # Enums (ROLES, TASK_STATUS, SUBMISSION_STATUS, PRIORITY, NOTIFICATION_TYPE) & FILE_UPLOAD limits
├── controllers/
│   ├── aiController.js              # AI health, preview, security verify, reports, recommendations, exports
│   ├── analyticsController.js       # Employee, team, project, company metrics & department snapshot trigger
│   ├── authController.js            # Login, token refresh, logout, profile, employee CRUD, password resets
│   ├── dashboardController.js       # Overview dashboard aggregations
│   ├── departmentController.js      # Department master CRUD & status toggle
│   ├── designationController.js     # Designation master CRUD & status toggle
│   ├── notificationController.js    # Notification fetching, read status, mark all read
│   ├── projectController.js         # Project CRUD, phases, members management
│   ├── submissionController.js     # Work deliverable submission and review
│   └── taskController.js           # Task CRUD, lifecycle state transitions, checklists
├── db/
│   └── connect.js                   # Mongoose connection logic
├── docs/
│   ├── API_ENDPOINTS.md             # Complete API route reference
│   ├── BACKEND_DOCUMENTATION.md     # Backend architecture & developer reference
│   └── DATABASE_SCHEMA.md           # Mongoose schemas & indexes specification
├── errors/
│   └── CustomError.js               # Centralized operational error class
├── middleware/
│   ├── auth.js                      # Bearer JWT verification middleware
│   ├── authorize.js                 # Role-based access control middleware
│   ├── errorHandler.js              # Express global error handling middleware
│   ├── uploadReference.js           # Multer memory storage for reference files (max 10, 10MB)
│   ├── uploadSubmission.js          # Multer memory storage for submission files (max 10, 10MB)
│   └── validate*.js                 # Input validation middleware using validator.js
├── models/                          # Mongoose Schemas
│   ├── Activity.js                  # Audit log model
│   ├── Department.js                # Department master model
│   ├── DepartmentPerformanceSnapshot.js # Historical department snapshot model
│   ├── Designation.js               # Designation master model
│   ├── Notification.js              # System notifications model with TTL
│   ├── Phase.js                     # Project phase model
│   ├── Project.js                   # Project workspace model
│   ├── Submission.js                # Task deliverable submission model
│   ├── Task.js                      # Task model with sub-schemas
│   └── User.js                      # System user model
├── routes/                          # Mounted Express Route definitions
├── seed/                            # Seeder scripts (masterSeeder.js, seedAdmin.js, seedManager.js)
├── services/                        # Business Logic Layer
│   ├── access/                      # Domain authorization services (taskAccess.js, submissionAccess.js)
│   ├── ai/                          # AI reports, recommendation, security, provider, PDF/DOCX generators
│   ├── analytics/                   # Analytics aggregations & department snapshot service/scheduler
│   ├── dashboard/                   # Scope & overview dashboard aggregation services
│   ├── project/                     # Project management & member services
│   ├── submission/                  # Submission creation & review services
│   ├── task/                        # Task lifecycle, query & workflow services
│   └── user/                        # Authentication & employee management services
├── utils/                           # Supabase storage, JWT helpers, notification & activity builders
└── server.js                        # Server entry point
```

---

## 3. Core Business Services & Workflows

### 3.1 Domain Services (`/services`)
- **`user/authService.js`**: Handles user login authentication, password verification, access token and refresh token generation, token refresh validation, and user logout.
- **`user/userManagementService.js`**: Controls user creation by Admin/Manager, employee ID generation, updating employee details, and toggling user active status.
- **`task/taskManagementService.js`**: Manages task creation, updates, withdrawal, reassignment, closing, archiving, and checklist status updates.
- **`task/taskWorkflowService.js`**: Controls task state transitions (`Assigned` → `Accepted` / `Rejected` → `In Progress` → `Submitted` → `Closed` / `Withdrawn`).
- **`submission/submissionManagementService.js`**: Handles work deliverable submission creation, multi-file storage handling, and manager review (`Approved` / `Rejected`).
- **`project/projectManagementService.js`**: Manages project workspaces, member assignments, project status toggles, and phase ordering.
- **`analytics/departmentSnapshotService.js`**: Calculates monthly department metrics and creates idempotent snapshots in `DepartmentPerformanceSnapshot`.
- **`analytics/departmentSnapshotScheduler.js`**: In-process background scheduler running initial check 5s after boot and periodic checks every 24 hours.

### 3.2 Access Control Helper Services (`/services/access`)
- **`taskAccess.js`**: Enforces task visibility permissions. Admins have system-wide access; Managers access tasks in their created/assigned projects or tasks assigned by them; Employees access tasks assigned directly to them.
- **`submissionAccess.js`**: Enforces submission review permissions.

---

## 4. Supabase Storage Integration (`utils/supabaseStorage.js`)

All file uploads stream into private Supabase Storage buckets via backend memory buffers:

- **Private Buckets**:
  - `references`: Stores task reference specification files.
  - `submissions`: Stores employee work deliverable files.
- **Memory Buffers**: `uploadReference.js` and `uploadSubmission.js` use `multer.memoryStorage()`.
- **File Validation**:
  - Allowed MIMEs: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip`.
  - Size Limit: 10 MB per file.
  - Count Limit: Maximum 10 attachments per upload call.
- **Filename Sanitization**: `getSafeFileName()` strips unsafe characters and path traversal sequences.
- **Short-Lived Signed URLs**: `createSignedUrl()` generates 1-hour (3600 seconds) signed URLs for authorized viewers (`transformAttachment` / `transformAttachments`).
- **Legacy Fallback**: Legacy local file paths (`/uploads/...`) remain supported transparently.

---

## 5. AI System & Security Boundary (`services/ai`)

- **Provider**: Google Gemini via `@google/genai` SDK using `gemini-3.5-flash-lite`.
- **6 Report Types**:
  1. `EMPLOYEE_PERFORMANCE`
  2. `MANAGER_TEAM_PERFORMANCE`
  3. `MANAGER_PERFORMANCE`
  4. `ADMIN_COMPANY_PERFORMANCE`
  5. `PROJECT_PERFORMANCE`
  6. `DEPARTMENT_PERFORMANCE`
- **Task Reassignment Engine (`TASK_ASSIGNMENT`)**: Recommends eligible candidates for task reassignment using candidate workload, completion rates, project membership, phase experience, and deterministic suitability pre-scores.
- **Fail-Closed Security Boundary (`aiSecurityBoundary.js`)**:
  - Secret leak detection RegEx (`SECRET_VALUE_PATTERNS`) scanning for JWTs, connection strings, API keys.
  - Allowlist field filtering (`ALLOWED_FIELDS`) per context type.
  - Human-readable business ID mapping (replacing raw MongoDB ObjectIds).
  - Strict system prompt rules enforcing factual grounding and preventing override attempts.
  - XSS sanitization (`sanitizeAiString`) and response JSON schema validation (`aiResponseValidator.js`).
- **Export Pipeline**: Generates formatted PDF (`pdfReportGenerator.js` via `pdfkit`) and DOCX (`docxReportGenerator.js` via `docx`) documents for download.

---

## 6. Environment Variables Reference

Configure in `Backend/.env`:

```env
# Database Connection
MONGO_URI=mongodb://localhost:27017/Task_Manager

# Frontend Application URL (for CORS credentials allowed origin)
FRONTEND_URL=http://localhost:5173

# Notification Auto-Expiration Retention (Days)
NOTIFICATION_RETENTION_DAYS=180

# JWT Secrets & Expiration
JWT_ACCESS_SECRET=<your-access-token-secret>
JWT_REFRESH_SECRET=<your-refresh-token-secret>
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# Google Gemini AI Configuration
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=30000

# Supabase Storage Configuration (Server-Side Only)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
```

---

## 7. Official Available Scripts (`Backend/package.json`)

- `npm start`: Starts production server (`node server.js`)
- `npm run dev`: Starts development server with hot-reload (`nodemon server.js`)
- `npm run seed:masters`: Seeds default master Departments and Designations (`node seed/masterSeeder.js`)
- `npm run script`: Seeds default Manager account (`node seed/seedManager.js`)
- `npm run script1`: Seeds default Admin account (`node seed/seedAdmin.js`)
