# API Endpoints

Base URL

```
http://localhost:3000/api
```

---

# Authentication

## Login

POST `/auth/login`

Access

- Public

---

## Get Profile

GET `/auth/profile`

Access

- Manager
- Employee

---

## Change Password

PATCH `/auth/change-password`

Access

- Manager
- Employee

---

# Employee Management

## Create Employee

POST `/auth/employees`

Access

- Manager

---

## Get All Employees

GET `/auth/employees`

Supports

- Search
- Filter
- Pagination
- Sorting

Access

- Manager

---

## Get Employee

GET `/auth/employees/:id`

Access

- Manager

---

## Update Employee

PATCH `/auth/employees/:id`

Access

- Manager

---

## Activate / Deactivate Employee

PATCH `/auth/employees/:id/status`

Access

- Manager

---

# Projects

## Create Project

POST `/projects`

Access

- Manager

---

## Get All Projects

GET `/projects`

Supports

- Search
- Pagination
- Sorting

Access

- Manager

---

## Get Project

GET `/projects/:id`

Access

- Manager

---

## Update Project

PATCH `/projects/:id`

Access

- Manager

---

## Archive / Restore Project

PATCH `/projects/:id/status`

Access

- Manager

---

# Tasks

## Create Task

POST `/tasks`

Access

- Manager

---

## Get All Tasks

GET `/tasks`

Supports

- Search
- Filter
- Pagination
- Sorting

Access

- Manager

---

## Get Task

GET `/tasks/:id`

Access

- Manager

---

## Update Task

PATCH `/tasks/:id`

Access

- Manager

---

## Withdraw Task

PATCH `/tasks/:id/withdraw`

Access

- Manager

---

## Reassign Task

PATCH `/tasks/:id/reassign`

Access

- Manager

---

## Archive / Restore Task

PATCH `/tasks/:id/archive`

Access

- Manager

---

## Get My Tasks

GET `/tasks/my`

Access

- Employee

---

## Accept Task

PATCH `/tasks/:id/accept`

Access

- Employee

---

## Reject Assignment

PATCH `/tasks/:id/reject`

Access

- Employee

---

## Start Task

PATCH `/tasks/:id/start`

Access

- Employee

---

## Update Checklist

PATCH `/tasks/:taskId/checklist/:checklistId`

Access

- Employee

Body

```json
{
  "isCompleted": true
}
```

---

## Task Activities

GET `/tasks/:id/activities`

Access

- Manager
- Assigned Employee

---

## Remove Reference Attachment

DELETE `/tasks/:taskId/reference/:fileName`

Access

- Manager

---

# Submissions

## Submit Task

POST `/submissions/:taskId`

Access

- Employee

Multipart Form Data

---

## Get My Submissions

GET `/submissions/my`

Access

- Employee

---

## Get All Submissions

GET `/submissions`

Supports

- Filter
- Pagination
- Sorting

Access

- Manager

---

## Review Submission

PATCH `/submissions/:id/review`

Access

- Manager

---

# Notifications

## Get Notifications

GET `/notifications`

Access

- Manager
- Employee

---

## Mark Read

PATCH `/notifications/:id/read`

Access

- Manager
- Employee

---

## Mark All Read

PATCH `/notifications/read-all`

Access

- Manager
- Employee

---

# Dashboard

## Manager Dashboard

GET `/dashboard/manager`

Access

- Manager

---

## Employee Dashboard

GET `/dashboard/employee`

Access

- Employee
