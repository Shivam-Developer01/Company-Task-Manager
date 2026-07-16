# Database Schema

MongoDB Collections

---

# User

Stores manager and employee information.

Fields

- name
- email
- password
- employeeId
- department
- designation
- role
- isActive
- mustChangePassword
- createdBy
- updatedBy

Relationships

- One User → Many Tasks
- One User → Many Notifications
- One User → Many Activities
- One User → Many Submissions

---

# Project

Stores company projects.

Fields

- name
- description
- isArchived
- createdBy
- updatedBy

Relationships

- One Project → Many Tasks

---

# Task

Stores assigned work.

Fields

- title
- description
- project
- assignedTo
- assignedBy
- priority
- dueDate
- checklist
- referenceAttachments
- status
- isArchived
- createdBy
- updatedBy

Relationships

- One Task → Many Activities
- One Task → Many Submissions
- One Task → Many Notifications

Workflow

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

# Checklist

Embedded inside Task.

Fields

- title
- isCompleted

---

# Reference Attachment

Embedded inside Task.

Fields

- fileName
- originalName
- fileUrl
- mimeType
- fileSize

---

# Submission

Stores employee submissions.

Fields

- task
- submissionNumber
- message
- attachments
- status
- managerFeedback
- submittedBy
- reviewedBy

Relationships

- Many Submissions → One Task
- Many Submissions → One Employee

Statuses

- Pending Review
- Approved
- Rejected

---

# Submission Attachment

Embedded inside Submission.

Fields

- fileName
- originalName
- fileUrl
- mimeType
- fileSize

---

# Activity

Stores system activity logs.

Fields

- task
- action
- performedBy
- createdAt

Examples

- Task Created
- Task Accepted
- Task Started
- Submission Submitted
- Submission Approved
- Task Closed

---

# Notification

Stores user notifications.

Fields

- user
- title
- message
- type
- task
- submission
- isRead

Notification Types

- Task Assigned
- Task Updated
- Task Accepted
- Task Reassigned
- Task Withdrawn
- Assignment Rejected
- Submission Received
- Submission Approved
- Submission Rejected

---

# Database Relationships

```
User (Manager)
        │
        ├──────────────┐
        │              │
        ▼              ▼
    Projects       Employees
        │
        ▼
      Tasks
        │
 ┌──────┼─────────────┐
 │      │             │
 ▼      ▼             ▼
Checklist Activities Submissions
                       │
                       ▼
                 Notifications
```

---

# Indexes

## User

- email
- employeeId

---

## Project

- name
- isArchived

---

## Task

- assignedTo
- status
- priority
- dueDate
- project

---

## Submission

- task
- submittedBy
- status

---

## Activity

- task
- performedBy

---

## Notification

- user
- isRead

---

# Soft Delete Strategy

Hard delete is avoided.

Projects

- isArchived

Tasks

- isArchived

Employees

- isActive

---

# File Storage

uploads/

```
uploads
│
├── references
│
└── submissions
```

Reference files

- Uploaded by Manager

Submission files

- Uploaded by Employee

Served using

```
/uploads/*
```
