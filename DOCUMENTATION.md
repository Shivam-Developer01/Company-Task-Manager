# Company Task Manager Documentation

## Overview

Company Task Manager is a production-ready enterprise MERN application developed to streamline project management, task assignment, employee management, submission review, and organizational collaboration.

The system provides dedicated interfaces for Admins, Managers, and Employees with secure JWT authentication, Refresh Token support, role-based authorization, project management, task workflows, submission review, dashboard analytics, activity logging, and real-time notifications.

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

## Admin Dashboard

- User Overview
- Project Overview
- Manager Performance
- System Statistics

## Manager Dashboard

- Employee Statistics
- Project Statistics
- Task Status Distribution
- Task Overview
- Overdue Tasks
- Pending Reviews
- Recent Tasks
- Upcoming Deadlines
- Recent Activities
- Project Filter
- Quick Navigation

## Employee Dashboard

- Personal Task Statistics
- Assigned Tasks
- Recent Activities
- Upcoming Deadlines
- Pending Reviews
- Employee Profile

---

# Employee Management

Admin / Manager can

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

Admin / Manager can

- Create Department
- Edit Department
- Activate Department
- Deactivate Department
- Search Departments
- Pagination

---

# Designation Management

Admin / Manager can

- Create Designation
- Edit Designation
- Activate Designation
- Deactivate Designation
- Search Designations
- Pagination

---

# Project Management

Manager/Admin can

- Create Projects
- Edit Projects
- Archive Projects
- Restore Projects
- Manage Members
- Add Managers
- Add Employees
- Remove Members
- View Project Overview
- View Project Statistics
- View Project Tasks
- Search
- Pagination
- Automatic Member Notifications

---

# Task Management

Admin / Manager can

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
- Independent Tasks
- Project Tasks
- Task Activities
- Role-based Visibility

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

- Automatic notifications for
- Task Assigned
- Task Updated
- Task Reassigned
- Task Withdrawn
- Assignment Accepted
- Assignment Rejected
- Submission Received
- Submission Approved
- Submission Rejected
- Project Created
- Project Member Added
- Project Member Removed
- Project Archived
- Project Restored

Features

- Search
- Read/Unread Filter
- Pagination
- Mark as Read
- Mark All Read
- Navigate directly to related Task/Submission
- Deep Linking to Projects
- Deep Linking to Tasks
- Deep Linking to Submissions
- Automatic Expiration (TTL)

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

## Admin

Permissions

- Create Managers
- Create Employees
- Manage Departments
- Manage Designations
- Manage Projects
- Manage Tasks
- Review Submissions
- Access System Dashboard
- View Manager Performance
- View Notifications
- Change Password

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

├── Managers

├── Employees

├── Tasks

├── Statistics

├── Activities

├── Notifications

└── Archive

Managers can create project-specific tasks that can only be assigned to project members.

---

# Task Lifecycle

```
Assigned
   │
   ├────────► Assignment Rejected

   ▼

Accepted

   ▼

In Progress

   ▼

Submitted

   ├────────► Rejected
   │             │
   │             ▼
   │        In Progress
   │
   ▼

Closed

Alternative

Assigned

▼

Withdrawn├────────► Closed

▼

Reassigned

▼

Assigned
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

## User Management

- Employee CRUD
- Manager CRUD
- Profile Management
- Password Management

---

## Department Management

- CRUD
- Status Change
- Search
- Pagination

---

## Designation Management

- CRUD
- Status Change
- Search
- Pagination

---

## Project Management

- CRUD
- Member Management
- Archive / Restore
- Search
- Pagination
- Project Statistics

---

## Task Management

- CRUD
- Assignment
- Reassignment
- Withdrawal
- Archive / Restore
- Checklist
- Reference Attachments
- Status Workflow
- Search
- Filters
- Pagination

---

## Submission Management

- Submit Work
- Multiple Attachments
- Approval
- Rejection
- Feedback

---

## Notification System

- Automatic Notification Creation
- Read Status
- Search
- Filters
- Pagination
- Deep Linking
- TTL Expiration

---

## Activity Logging

- Automatic Activity Creation
- Timeline View
- Task History
- Project History

---

## Dashboard Analytics

- Admin Dashboard
- Manager Dashboard
- Employee Dashboard
- Project Analytics
- Task Statistics
- Employee Statistics
- Manager Performance

---

## Access Control Helpers

- Project Access
- Task Access
- Submission Access
- Dashboard Scope
- Role-based Authorization

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
- Role-based Access Control
- Project-level Authorization
- Task-level Authorization
- Submission-level Authorization

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
- Dashboard Analytics
- Enterprise RBAC
- Service-based Backend
- Modular Controller Structure
- Activity Timeline

---

# Access Control

Admin

- Full access

Manager

- Projects created by manager
- Projects where manager is a member
- Independent tasks assigned by manager

Employee

- Assigned Tasks
- Own Submissions
- Own Notifications

---

# Backend Architecture

```
Routes
   │
   ▼
Middleware
(Authentication, Authorization, Validation)
   │
   ▼
Controllers
(Request Handling)
   │
   ▼
Services
(Business Logic)
   │
   ▼
Access Control Layer
(Role & Permission Validation)
   │
   ▼
Database Layer
(Mongoose Models)

```

### Architecture Principles

- Controllers remain thin and only handle request/response.
- Business logic is implemented inside service modules.
- Access permissions are centralized using reusable access helper services.
- Middleware is responsible for authentication, authorization, validation, and error handling.
- Database operations are performed through Mongoose models.

---

# Folder Structure

Backend

```
controllers/
middleware/
models/
routes/
services/
  ├── access/
  ├── dashboard/
  ├── notification/
  ├── project/
  ├── submission/
  ├── task/
  └── user/
utils/
constants/
validators/
uploads/
```

Frontend

```
components/
pages/
services/
hooks/
context/
layouts/
routes/
utils/
assets/
```

---

# API Architecture

Routes
↓
Authentication Middleware
↓
Authorization Middleware
↓
Validation Middleware
↓
Controller
↓
Service
↓
Access Control
↓
Database

---

# Database Relationships

User
├── creates → Projects
├── creates → Tasks
├── reviews → Submissions
└── receives → Notifications

Project
├── has many → Members
└── has many → Tasks

Task
├── belongs to → Project (optional)
├── assigned to → User
├── has many → Activities
└── has many → Submissions

Submission
└── belongs to → Task

Notification
└── belongs to → User

---

# Future Enhancements

- Role & Permission Management
- Project Templates
- Project Milestones
- Kanban Board
- Gantt Charts
- Socket.IO Notifications
- Email Notification
- Calendar Integration
- Time Tracking
- Reports Export
- Audit Logs
- Dark Mode
- 2FA
- Multi-language Support

---

## Conclusion

Company Task Manager is a production-oriented task management application built using the MERN stack. It follows clean architecture principles, secure authentication practices with JWT and Refresh Tokens, modular component design, and role-based access control. The application streamlines task assignment, project tracking, submission review, and team collaboration through an intuitive, responsive interface and a scalable backend architecture suitable for real-world business workflows.
