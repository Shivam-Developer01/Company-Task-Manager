# 🏢 Company Task Manager v1

A production-ready enterprise MERN stack application designed to streamline project management, task assignments, work submission reviews, role-based access control, AI-driven operational reporting, and organizational analytics.

---

## 🌟 Key Features

### 🔐 Authentication & Authorization
- **Role-Based Access Control (RBAC)**: Dedicated permissions and interfaces for **Admin**, **Manager**, and **Employee**.
- **JWT Dual-Token Security**: 15-minute access token + 7-day refresh token saved in MongoDB `User` model.
- **Automatic Token Refresh**: Axios interceptors handle `401 Unauthorized` responses and queue concurrent requests during refresh seamlessly in the background.
- **First-Time Password Enforcement**: Newly created users must update their temporary password on initial login (`mustChangePassword: true`).
- **Password Reset & Profile Management**: Admins/Managers can reset user passwords; all users can manage their profiles and update passwords.

### 📋 Task & Submission Lifecycle Management
- **Task Assignments**: Tasks can be assigned directly to employees or linked to specific project workspaces and phases.
- **Interactive Checklists**: Multi-item sub-task checklists manageable by assigned employees.
- **Reference Attachments**: Managers attach spec files, documents, and reference materials (up to 10 files per task, max 10MB each).
- **Lifecycle Tracking**: Strict state flow: `Assigned` → `Accepted` / `Rejected` → `In Progress` → `Submitted` → `Closed` / `Withdrawn`.
- **Deliverable Submissions**: Employees upload multi-file deliverables with notes (up to 10 files, max 10MB each).
- **Manager Review Loop**: Managers approve deliverables (closing task) or reject deliverables (reverting task to `In Progress` with feedback).

### 📁 Projects, Departments & Designations
- **Project Workspaces & Phases**: Manage projects, assign members, track multi-phase execution, and calculate phase progress.
- **Department & Designation Masters**: Master Data management for organizational departments and department-scoped designations with unique constraints.
- **Archive & Restore**: Archive completed projects or obsolete tasks without permanent data loss.

### ☁️ Supabase Private File Storage
- **Private Buckets**: Files stored in private Supabase Storage buckets (`references` for task reference files, `submissions` for deliverable files).
- **In-Memory Uploads**: Multer memory storage buffers uploaded files on the backend before streaming to Supabase Storage.
- **Short-Lived Signed URLs**: Time-limited signed URLs (1-hour expiration) generated dynamically for secure, authorized access.
- **Legacy Fallback**: Transparently supports legacy local static uploads (`/uploads/...`) alongside Supabase Storage objects.

### 🤖 AI Reports, Task Recommendations & Export Pipeline
- **Google Gemini Provider**: Built on `@google/genai` SDK using `gemini-3.5-flash-lite` (configurable via environment variables).
- **6 Structured AI Reports**:
  - **Employee Performance Report** (`EMPLOYEE_PERFORMANCE`)
  - **Manager Team Performance Report** (`MANAGER_TEAM_PERFORMANCE`)
  - **Manager Performance Report** (`MANAGER_PERFORMANCE`)
  - **Admin Company Performance Report** (`ADMIN_COMPANY_PERFORMANCE`)
  - **Project Performance Report** (`PROJECT_PERFORMANCE`)
  - **Department Performance Report** (`DEPARTMENT_PERFORMANCE`)
- **AI Task Reassignment Recommendation**: Evaluates candidate workload, past completion rate, project membership, phase experience, and deterministic suitability score to recommend optimal task reassignments.
- **Fail-Closed Security Boundary**:
  - Deep secret leak detection (blocks JWTs, API keys, connection strings, sensitive keys).
  - Context allowlist filtering (data minimization per report type).
  - ObjectId obfuscation / human-readable business ID mapping.
  - Strict system instructions preventing prompt injection and ungrounded claims.
  - XSS sanitization and output schema validation.
- **Document Export Pipeline**: Export generated AI reports to formatted **PDF** (PDFKit) or **DOCX** (docx library) documents.

### 📊 Analytics & Automated Department Snapshot Scheduler
- **Multi-Level Analytics**: Company-wide, Manager team, Employee, Project, and Department metrics.
- **Historical Department Performance Snapshots**: Stores raw monthly snapshots in `DepartmentPerformanceSnapshot` collection (unique compound index on `{ departmentId, period }`).
- **In-Process Monthly Scheduler**: Automatically calculates previous completed month metrics (Asia/Kolkata timezone), running 5 seconds after server startup and every 24 hours. Includes manual Admin trigger API.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Node.js & Express v5
- **Database**: MongoDB with Mongoose v9
- **Authentication**: `jsonwebtoken`, `bcryptjs`
- **File Storage**: `@supabase/supabase-js`, `multer` (memory storage)
- **AI Integration**: `@google/genai` (Google Gemini)
- **Document Export**: `pdfkit`, `docx`
- **Middleware & Security**: `helmet`, `compression`, `cors`, `validator`

### Frontend
- **Framework**: React v19 + Vite v8 (ES module structure)
- **Routing**: React Router DOM v7 (`PublicRoute` & `ProtectedRoute` role wrappers)
- **State & HTTP**: Axios with Interceptors, React Context API (`NotificationContext`)
- **UI & Visualization**: `recharts`, `react-icons`, `react-toastify`, Vanilla CSS3 Design System

---

## 📂 Project Structure

```
Task Manager v1/
├── Backend/
│   ├── constants/          # Application enums, file upload limits, and role constants
│   ├── controllers/        # Express request controllers (Auth, Tasks, AI, Analytics, Projects, etc.)
│   ├── db/                 # MongoDB connection initialization
│   ├── docs/               # Technical documentation (API_ENDPOINTS, BACKEND_DOCUMENTATION, DATABASE_SCHEMA)
│   ├── errors/             # Custom error handling classes (CustomError)
│   ├── middleware/         # Auth, Authorization, Multer memory storage, and Validator middleware
│   ├── models/             # Mongoose schemas (User, Task, Project, Phase, Submission, Notification, Activity, Department, Designation, DepartmentPerformanceSnapshot)
│   ├── routes/             # Mounted Express API route declarations
│   ├── seed/               # Database seeder scripts
│   ├── services/           # Business logic layer (access/, ai/, analytics/, dashboard/, project/, submission/, task/, user/)
│   ├── utils/              # Supabase storage helpers, JWT utilities, activity & notification helpers
│   ├── server.js           # Express server entry point & snapshot scheduler boot
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components (DataTable, SideDrawer, Modals, StatusBadge, Cards)
│   │   ├── context/        # React context providers (NotificationContext)
│   │   ├── hooks/          # Custom hooks (useDebounce, useForm, etc.)
│   │   ├── layouts/        # MainLayout (Manager/Admin) & EmployeeLayout (Employee)
│   │   ├── pages/          # Application page views (Dashboard, Tasks, Projects, AiReports, RoleInsights, Departments, Designations, etc.)
│   │   ├── routes/         # Protected and public route guards
│   │   ├── services/       # Frontend API HTTP services (aiService, analyticsService, authService, etc.)
│   │   └── utils/          # Axios instance with refresh interceptor, date formatters
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── DOCUMENTATION.md        # Master technical documentation
└── README.md               # High-level project guide and setup instructions
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster connection URI
- **Supabase Account**: Bucket configuration for private `references` and `submissions` buckets
- **Google Gemini API Key**: API key for Google Gemini model execution

---

### 1. Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `Backend` directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/Task_Manager
   FRONTEND_URL=http://localhost:5173

   NOTIFICATION_RETENTION_DAYS=180

   JWT_ACCESS_SECRET=<your-access-secret>
   JWT_REFRESH_SECRET=<your-refresh-secret>

   ACCESS_TOKEN_EXPIRES=15m
   REFRESH_TOKEN_EXPIRES=7d

   # Google Gemini Configuration
   GEMINI_API_KEY=<your-gemini-api-key>
   GEMINI_MODEL=gemini-3.5-flash-lite
   GEMINI_TIMEOUT_MS=30000

   # Supabase Storage Configuration
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SECRET_KEY=<your-supabase-secret-key>
   ```

4. Seed initial database master data and seed accounts:
   ```bash
   # Seed master Departments and Designations
   npm run seed:masters

   # Seed initial Admin account
   npm run script1

   # Seed initial Manager account
   npm run script
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The Express backend will start on `http://localhost:3000`.

---

### 2. Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

---

## 📜 Official Available Scripts

### Backend Scripts (`Backend/package.json`)
- `npm start`: Runs `node server.js`
- `npm run dev`: Runs `nodemon server.js`
- `npm run seed:masters`: Runs `node seed/masterSeeder.js`
- `npm run script`: Runs `node seed/seedManager.js`
- `npm run script1`: Runs `node seed/seedAdmin.js`

### Frontend Scripts (`frontend/package.json`)
- `npm run dev`: Runs Vite dev server (`vite`)
- `npm run build`: Bundles production assets (`vite build`)
- `npm run lint`: Runs ESLint (`eslint .`)
- `npm run preview`: Previews Vite build locally (`vite preview`)

---

## 🔗 Key API Endpoints Summary

| Category | Route Endpoint | Method | Role Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate user & receive access/refresh tokens |
| **Auth** | `/api/auth/refresh-token` | `POST` | Public | Exchange refresh token for new access token |
| **Auth** | `/api/auth/me` | `GET` | Authenticated | Get current authenticated user profile |
| **Users** | `/api/auth/users` | `GET / POST` | Admin / Manager | List or create employee/manager accounts |
| **Tasks** | `/api/tasks` | `GET / POST` | Admin / Manager | List tasks or create task with reference attachments |
| **Tasks** | `/api/tasks/my` | `GET` | Employee | List tasks assigned to logged-in employee |
| **Submissions** | `/api/submissions/:taskId` | `POST` | Employee | Submit work deliverable with attachments |
| **Submissions** | `/api/submissions/:id/review` | `PATCH` | Admin / Manager | Review submission (Approve / Reject) |
| **Projects** | `/api/projects` | `GET / POST` | Admin / Manager | List or create project workspaces |
| **Analytics** | `/api/analytics/company` | `GET` | Admin | Fetch company-wide analytics |
| **Analytics** | `/api/analytics/department-snapshot` | `POST` | Admin | Manually trigger monthly department snapshots |
| **AI** | `/api/ai/report/generate` | `POST` | Authenticated | Generate structured AI performance report |
| **AI** | `/api/ai/recommendation/generate` | `POST` | Authenticated | Generate AI task reassignment recommendation |
| **AI** | `/api/ai/report/export/pdf` | `POST` | Authenticated | Export AI report as PDF document |
| **AI** | `/api/ai/report/export/docx` | `POST` | Authenticated | Export AI report as DOCX document |

---

## 📜 License

This project is licensed under the ISC License.
