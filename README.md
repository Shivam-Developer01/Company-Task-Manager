# 🏢 Company Task Manager v1

A production-ready enterprise MERN stack application designed to streamline project management, task assignments, work submission reviews, employee role authorization, and organizational collaboration.

---

## 🌟 Key Features

### 🔐 Authentication & Authorization
- **Role-Based Access Control (RBAC)**: Dedicated permissions and interfaces for **Admin**, **Manager**, and **Employee**.
- **JWT & Refresh Tokens**: Dual-token authentication (15-minute access token + 7-day refresh token hashed in MongoDB).
- **Silent Token Refresh**: Axios interceptors handle automatic `401 Unauthorized` token refreshing seamlessly in the background.
- **First-Time Password Enforcement**: Newly created users are forced to update their temporary password on initial login.
- **Password Reset**: Admins and Managers can trigger password resets for employees.

### 📋 Task Management Workflow
- **Flexible Assignment**: Tasks can be assigned directly to employees or linked to specific project workflows.
- **Interactive Checklists**: Multi-item sub-task checklists manageable by assigned employees.
- **Reference Attachments**: Managers can attach spec files, documents, and reference materials.
- **Lifecycle Tracking**: States include `Assigned`, `Accepted`, `Rejected`, `In Progress`, `Submitted`, `Closed`, and `Withdrawn`.

### 📤 Submission & Review Workflow
- **Multi-File Submissions**: Employees upload deliverables (PDF, Images, DOCX, ZIP up to 10MB) with notes.
- **Manager Feedback Loop**: Managers can **Approve** (closing the task) or **Reject** (reverting to `In Progress` with feedback notes).
- **Submission History**: Complete versioned log of past submissions for auditability.

### 📁 Project & Master Data Management
- **Project Workspaces**: Manage projects, assign managers/employees, and scope tasks strictly to team members.
- **Departments & Designations**: Full master CRUD for active/inactive departments and designation job titles.
- **Archive & Restore**: Archive completed projects or obsolete tasks without permanent data loss.

### 🔔 Notifications & Analytics
- **System Notifications**: Automated alerts for assignments, state changes, reviews, and project actions.
- **TTL Auto-Expiration**: Notifications automatically clean up after retention threshold (e.g., 180 days).
- **Deep Linking**: Click notifications to navigate directly to target projects, tasks, or submissions.
- **Interactive Dashboards**: Role-specific overview metrics and Recharts visualization breakdown.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Node.js & Express v5
- **Database**: MongoDB with Mongoose v9
- **Authentication**: `jsonwebtoken`, `bcryptjs`
- **Security & Uploads**: `helmet`, `compression`, `cors`, `multer`, `validator`

### Frontend
- **Framework**: React v19 + Vite v8
- **Routing**: React Router DOM v7 (`PublicRoute` & `ProtectedRoute` guards)
- **State & HTTP**: Axios with Interceptors, React Context API (`NotificationContext`)
- **UI & Analytics**: `recharts`, `react-icons`, `react-toastify`, CSS3 Design System

---

## 📂 Project Structure

```
Task Manager v1/
├── Backend/
│   ├── constants/          # Application enums & file upload config
│   ├── controllers/        # Request handlers (Auth, Tasks, Projects, etc.)
│   ├── db/                 # MongoDB database connection logic
│   ├── errors/             # Custom error handling classes
│   ├── middleware/         # Auth, Authorization, Multer & Validator middleware
│   ├── models/             # Mongoose schemas (User, Task, Project, Submission, Notification, Activity, Department, Designation)
│   ├── routes/             # Express API router definitions
│   ├── seed/               # Database seeder scripts
│   ├── services/           # Business logic layer split by domain
│   ├── uploads/            # Static storage for task & submission attachments
│   ├── server.js           # Main Express server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components (DataTable, SideDrawer, Modals, StatusBadge, Cards)
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom utility hooks (useDebounce, useForm, etc.)
│   │   ├── layouts/        # MainLayout (Manager/Admin) & EmployeeLayout (Employee)
│   │   ├── pages/          # Application views & pages
│   │   ├── routes/         # Route protection wrappers
│   │   ├── services/       # Frontend API HTTP services
│   │   └── utils/          # Axios setup & date/string formatters
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── DOCUMENTATION.md        # Comprehensive technical documentation
└── README.md               # Project guide and setup instructions
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster connection URI

---

### 1. Backend Setup

1. Open a terminal and navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `Backend` directory with the following variables:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/Task_Manager
   FRONTEND_URL=http://localhost:5173

   NOTIFICATION_RETENTION_DAYS=180

   JWT_ACCESS_SECRET=your_access_token_secret
   JWT_REFRESH_SECRET=your_refresh_token_secret

   ACCESS_TOKEN_EXPIRES=15m
   REFRESH_TOKEN_EXPIRES=7d
   ```

4. Seed the initial database master data and admin user:
   ```bash
   # Seed Departments and Designations
   npm run seed:masters

   # Seed initial Admin user
   npm run script1

   # Seed initial Manager user
   npm run script
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:3000`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
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
   The application will be accessible at `http://localhost:5173`.

---

## 🔗 Key API Endpoints

| Category | Endpoint | Method | Role Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate user & receive tokens |
| **Auth** | `/api/auth/refresh-token` | `POST` | Public | Exchange refresh token for new access token |
| **Auth** | `/api/auth/me` | `GET` | Authenticated | Get current logged-in user profile |
| **Users** | `/api/auth/users` | `GET / POST` | Admin / Manager | List or create employee/manager accounts |
| **Tasks** | `/api/tasks` | `GET / POST` | Admin / Manager | Fetch all tasks or create a new task |
| **Tasks** | `/api/tasks/my` | `GET` | Employee | Fetch tasks assigned to the current employee |
| **Tasks** | `/api/tasks/:id/accept` | `PATCH` | Employee | Accept assigned task |
| **Submissions** | `/api/submissions/:taskId` | `POST` | Employee | Submit work with message & file attachments |
| **Submissions** | `/api/submissions/:id/review` | `PATCH` | Admin / Manager | Review submission (Approve / Reject) |
| **Projects** | `/api/projects` | `GET / POST` | Admin / Manager | List or create project workspaces |
| **Dashboard** | `/api/dashboard/manager` | `GET` | Admin / Manager | Manager dashboard stats & charts |
| **Dashboard** | `/api/dashboard/employee` | `GET` | Employee | Personal employee dashboard stats |

---

## 📜 License

This project is licensed under the ISC License.
