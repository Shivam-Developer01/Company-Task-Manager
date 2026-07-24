# Company Task Manager Documentation

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
- React Context API
- Custom Reusable Hooks

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
- Helmet
- Compression
- CORS

---

# Features

## Authentication

- Secure Login
- JWT Access Token Authentication
- Refresh Token Authentication
- Automatic Token Refresh using Axios Interceptors
- Logout
- Role Based Authorization
- Protected Routes
- Public Route Protection
- Mandatory Password Change on First Login
- Password Reset by Manager
- Persistent Login

---

## Dashboard

### Manager Dashboard

- Employee Statistics
- Project Statistics
- Task Statistics
- Submission Statistics
- Recent Activities
- Pending Reviews
- Recent Notifications
- Quick Navigation

### Employee Dashboard

- Personal Task Statistics
- Pending Reviews
- My Recent Tasks
- My Recent Activities
- Upcoming Deadlines
- View Employee Profile
- Department Assignment
- Designation Assignment

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

# Department Management

Manager can

- Create Department
- Edit Department
- Activate Department
- Deactivate Department
- Search Departments
- Pagination

---

# Designation Management

Manager can

- Create Designation
- Edit Designation
- Activate Designation
- Deactivate Designation
- Search Designations
- Pagination

---

# Project Management

Manager can

- Create Project
- Edit Project
- Manage Members
- View Project Overview
- View Project Statistics
- View Project Tasks
- Search Projects
- Pagination
- Archive Project
- Restore Project
- Project Member Validation
- Create Task directly from Project

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
- Create Tasks inside Projects
- Automatic Project Member Validation
- Activity Logging

Employee can

- View Assigned Tasks
- Accept Tasks
- Reject Assigned Tasks
- Start Working
- Update Checklist
- Submit Tasks
- Upload Multiple Submission Files

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

# Project Workflow

Project

│

├── Members

├── Tasks

├── Statistics

├── Activity

└── Archive

Managers can create project-specific tasks that can only be assigned to project members.

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

or

Submitted
│
▼
Manager Rejects
│
▼
In Progress

or

Assigned
Accepted
In Progress
│
▼
Withdrawn

or

Withdrawn
│
▼
Reassigned
│
▼
Assigned

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
- Departments
- Designations
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

Departments

- CRUD
- Status Change
- Search
- Pagination

---

Designations

- CRUD
- Status Change
- Search
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
- Notification Navigation
- Deep Linking to Tasks
- Deep Linking to Submissions

---

## Activities

- Automatic Activity Logging
- Timeline View

---

# Reusable Frontend Components

- DataTable
- Pagination
- AppSearchBar
- SearchableMultiSelect
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
- TaskCard
- ProjectCard
- FilterBar
- Modal Components

---

# Reusable Hooks

- useDebounce
- useNotification
- useTableParams

---

# Utility Functions

- formatDate
- formatDateTime
- formatRelativeTime
- formatDueDate
- downloadFile
- Axios Interceptors
- Token Helpers

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
- Helmet
- Compression
- CORS
- Centralized Error Handling
- Express Validator

---

# Project Highlights

- Enterprise-style MERN Architecture
- Modular MVC Backend
- JWT + Refresh Token Authentication
- Role-Based Access Control
- Public & Protected Route Guards
- Department & Designation Masters
- Project Member Management
- Advanced Task Lifecycle
- Submission Review Workflow
- Automatic Activity Logging
- Notification System with Deep Linking
- Reusable React Components
- Custom Hooks
- Generic DataTable Architecture
- Advanced Search, Filters & Pagination
- Responsive UI
- Clean Folder Structure
- Scalable Codebase

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

Company Task Manager is a production-oriented task management application built using the MERN stack. It follows clean architecture principles, secure authentication practices with JWT and Refresh Tokens, modular component design, and role-based access control. The application streamlines task assignment, project tracking, submission review, and team collaboration through an intuitive, responsive interface and a scalable backend architecture suitable for real-world business workflows.
