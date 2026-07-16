# Task Manager Documentation

## Overview

Task Manager is a full-stack MERN application developed to help teams efficiently manage projects, tasks, employees, submissions, and notifications. The system provides separate interfaces for Managers and Employees with secure JWT authentication, role-based authorization, task tracking, submission review, activity logging, and real-time notifications.

---

# Tech Stack

## Frontend

- React.js
- React Router DOM
- Axios
- React Toastify
- React Icons
- CSS3
- Context API

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Refresh Token Authentication
- bcryptjs
- Multer
- Express Validator

---

# Features

## Authentication

- Secure Login
- JWT Access Token Authentication
- Refresh Token Authentication
- Automatic Token Refresh
- Logout
- Role Based Authorization
- Protected Routes
- Mandatory Password Change on First Login
- Password Reset by Manager

---

## Dashboard

### Manager Dashboard

- Statistics Cards
- Employee Summary
- Project Summary
- Task Statistics
- Submission Statistics
- Pending Reviews
- Upcoming Deadlines
- Recent Activities

### Employee Dashboard

- Personal Task Statistics
- Pending Reviews
- My Recent Tasks
- My Recent Activities
- Upcoming Deadlines

---

# Employee Management

Manager can

- Create Employee
- View Employees
- Search Employees
- Filter Employees
- Update Employee Details
- Activate Employee
- Deactivate Employee
- Reset Employee Password

Employee can

- View Own Profile
- Change Password

---

# Project Management

Manager can

- Create Project
- Edit Project
- Archive Project
- Restore Project
- Search Projects
- Pagination
- Sorting
- View Project Details

---

# Task Management

Manager can

- Create Tasks
- Assign Tasks
- Edit Tasks
- Withdraw Tasks
- Reassign Tasks
- Archive Tasks
- Restore Tasks
- Search Tasks
- Filter Tasks
- Pagination
- Sorting
- View Task Details
- Upload Reference Attachments

Employee can

- View Assigned Tasks
- Accept Tasks
- Reject Assigned Tasks
- Start Working
- Update Checklist
- Submit Tasks

---

# Submission Management

Employee

- Submit Work
- Add Submission Message
- Upload Attachments
- View Previous Submissions

Manager

- Review Submission
- Approve Submission
- Reject Submission
- Add Feedback
- View Attachments

---

# Notification System

Automatic notifications for

- Task Assigned
- Task Accepted
- Task Rejected
- Task Submitted
- Submission Approved
- Submission Rejected
- Task Withdrawn
- Task Reassigned

Features

- Search
- Read/Unread Filter
- Pagination
- Mark as Read
- Mark All Read
- Navigate directly to related Task/Submission

---

# Activity Log

Every important action is recorded.

Examples

- Task Created
- Task Updated
- Task Assigned
- Task Accepted
- Task Rejected
- Task Submitted
- Submission Approved
- Submission Rejected
- Employee Updated
- Password Changed

---

# User Roles

## Manager

Permissions

- Manage Employees
- Manage Projects
- Manage Tasks
- Review Submissions
- View Dashboard
- View Notifications
- Change Password
- View Profile

---

## Employee

Permissions

- View Dashboard
- Manage Assigned Tasks
- Submit Work
- View Notifications
- Change Password
- View Profile

---

# Task Lifecycle

```
Assigned
     │
     ▼
Accepted
     │
     ▼
In Progress
     │
     ▼
Submitted
     │
     ▼
Closed
```

Alternative Flow

```
Assigned
     │
     ▼
Rejected
```

or

```
Assigned
     │
     ▼
Withdrawn
```

---

# Submission Lifecycle

```
Pending Review
        │
        ├────────► Approved
        │
        └────────► Rejected
```

---

# Authentication Flow

```
Login
      │
      ▼
Access Token (15 min)

Refresh Token (7 days)

      │
      ▼
Protected APIs
      │
      ▼
Access Token Expired?
      │
      ├── No
      │
      ▼
Continue

      │
      └── Yes
              │
              ▼
Refresh Token API
              │
              ▼
Generate New Access Token
              │
              ▼
Retry Original Request
```

---

# Database Collections

- Users
- Projects
- Tasks
- Submissions
- Activities
- Notifications

---

# Core Modules

## Authentication

- Login
- Logout
- Refresh Token
- Change Password
- Reset Password

---

## Employees

- CRUD
- Search
- Filters
- Pagination

---

## Projects

- CRUD
- Archive
- Restore
- Search
- Pagination

---

## Tasks

- CRUD
- Assignment
- Checklist
- Reference Attachments
- Status Management
- Search
- Filters
- Pagination

---

## Submissions

- Submit Work
- Attachments
- Approval
- Rejection
- Feedback

---

## Notifications

- Automatic Notification Creation
- Read Status
- Search
- Filters
- Pagination

---

## Activities

- Automatic Activity Logging
- Timeline View

---

# Reusable Frontend Components

- DataTable
- Pagination
- AppSearchBar
- StatusBadge
- ActionButtons
- Loader
- EmptyState
- SideDrawer
- ConfirmationModal
- ChangePasswordModal
- NotificationCard
- Dashboard Cards
- Navbar
- Sidebar
- EmployeeSidebar

---

# Reusable Hooks

- useDebounce
- useNotification

---

# Utility Functions

- formatDate
- formatDateTime
- formatRelativeTime
- formatDueDate
- token helpers
- Axios Interceptors

---

# Security

- JWT Authentication
- Refresh Token Authentication
- Password Hashing using bcrypt
- Role Based Authorization
- Protected Routes
- Request Validation
- Input Sanitization
- File Upload Validation
- Secure Password Reset
- First Login Password Change

---

# Project Highlights

- Full MERN Stack Architecture
- Modular Folder Structure
- Clean MVC Backend
- Role-Based Access Control
- Automatic Activity Logging
- Automatic Notification System
- File Upload Support
- Dashboard Analytics
- Refresh Token Authentication
- Reusable React Components
- Responsive Design
- Search, Filter, Sorting & Pagination
- Professional UI with Drawers and Modals
- Scalable Codebase Ready for Future Enhancements

---

# Future Enhancements

- Email Notifications
- Real-time Notifications using Socket.IO
- Team Management
- Calendar Integration
- Task Comments
- Recurring Tasks
- Time Tracking
- Reports & Analytics Export
- Dark Mode
- Two-Factor Authentication (2FA)
- Audit Dashboard
- Multi-language Support

---

## Conclusion

Task Manager is a production-oriented task management application built using the MERN stack. It follows clean architecture principles, secure authentication practices with JWT and Refresh Tokens, modular component design, and role-based access control. The application streamlines task assignment, project tracking, submission review, and team collaboration through an intuitive, responsive interface and a scalable backend architecture suitable for real-world business workflows.
