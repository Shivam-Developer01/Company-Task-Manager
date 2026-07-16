# Company Task Management System - Backend Documentation

## Overview

The Company Task Management System is a RESTful backend application built using Node.js, Express.js, and MongoDB. It is an upgraded version of a personal task manager designed for organizations where managers assign tasks to employees, monitor progress, review submissions, and track activities.

---

# Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Multer
- Validator.js
- Helmet
- Compression
- CORS

---

# Features

## Authentication

- JWT Authentication
- Secure Password Hashing
- First Login Password Change
- Role Based Authorization
- Profile Management
- Change Password

---

## Employee Management

Manager can

- Create Employee
- View Employees
- Update Employee
- Activate / Deactivate Employee

Employee can

- View Own Profile
- Change Password

---

## Project Management

Manager can

- Create Project
- Update Project
- Archive / Restore Project
- View Projects

Supports

- Search
- Filter
- Pagination
- Sorting

---

## Task Management

Manager can

- Create Task
- Update Task
- Reassign Task
- Withdraw Task
- Archive / Restore Task
- View All Tasks

Employee can

- View Assigned Tasks
- Accept Task
- Reject Assignment
- Start Task
- Update Checklist

Task supports

- Priority
- Due Date
- Project
- Checklist
- Reference Attachments
- Activity Timeline

---

## Submission Management

Employee

- Submit Work
- Upload Multiple Files
- Multiple Submissions

Manager

- Review Submission
- Approve
- Reject
- Provide Feedback

---

## Notifications

Automatic notifications for

- Task Assigned
- Task Updated
- Task Accepted
- Task Reassigned
- Task Withdrawn
- Assignment Rejected
- Submission Received
- Submission Approved
- Submission Rejected

Supports

- Get Notifications
- Mark as Read
- Mark All as Read

---

## Dashboard

Manager Dashboard

- Employee Statistics
- Project Statistics
- Task Statistics
- Pending Reviews
- Recent Activities
- Upcoming Deadlines

Employee Dashboard

- My Tasks
- My Submissions
- Recent Activities

---

## Activity Timeline

Every important action is recorded.

Examples

- Task Created
- Task Updated
- Task Accepted
- Task Started
- Checklist Updated
- Submission Submitted
- Submission Approved
- Submission Rejected
- Task Closed
- Task Reassigned
- Task Withdrawn

---

## File Upload

Reference Files

- Uploaded by Manager

Submission Files

- Uploaded by Employee

Supported Features

- Multiple Files
- File Size Limit
- File Type Validation
- Static File Serving

---

# Authentication Flow

Manager Login

↓

JWT Generated

↓

Protected Routes

↓

Role Verification

↓

Access Granted

---

# Task Workflow

Assigned

↓

Accepted

↓

In Progress

↓

Submitted

↓

Closed

Alternative States

- Assignment Rejected
- Withdrawn

---

# Project Structure

```
Backend
│
├── controllers
├── middleware
├── models
├── routes
├── utils
├── constants
├── uploads
│   ├── references
│   └── submissions
├── errors
├── app.js
├── server.js
```

---

# API Modules

| Module         | Description                |
| -------------- | -------------------------- |
| Authentication | Login, Password Management |
| Employees      | Employee CRUD              |
| Projects       | Project CRUD               |
| Tasks          | Task Workflow              |
| Submissions    | Work Submission            |
| Notifications  | User Notifications         |
| Activities     | Activity Timeline          |
| Dashboard      | Statistics                 |

---

# Security

- JWT Authentication
- Password Hashing using bcrypt
- Role Based Authorization
- Helmet
- CORS
- Compression
- Validation
- Sanitization
- Centralized Error Handling

---

# Search & Pagination

Implemented for

- Employees
- Projects
- Tasks
- Submissions

Supports

- Search
- Filter
- Pagination
- Sorting

---

# Database Collections

- Users
- Projects
- Tasks
- Submissions
- Activities
- Notifications

---

# Business Rules

- Public registration is disabled.
- Only managers can create employees.
- One employee can be assigned to one task.
- Tasks are never permanently deleted.
- Projects can be archived.
- Employees can submit multiple times after rejection.
- Managers review every submission.
- Activities are automatically logged.
- Notifications are automatically generated.

---

# Response Format

Success

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "..."
}
```

---

# Future Enhancements

- Email Notifications
- Real-time Notifications (Socket.IO)
- Admin Panel
- Team Management
- Analytics Dashboard
- Calendar Integration

---

# Developed Using

Node.js + Express.js + MongoDB + Mongoose
