# Mongoose Database Schemas & Collections Reference

All Mongoose models (`Backend/models/`) are synchronized with MongoDB. This document serves as the authoritative database reference for all 10 collections.

---

## 1. `User` Collection (`models/User.js`)

Stores account credentials, role authorization levels, organizational department/designation references, and authentication tokens.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key, Auto Generated | Unique user document ID |
| `name` | `String` | `required: true`, `trim: true` | Full name of the user |
| `email` | `String` | `required: true`, `unique: true`, `lowercase: true`, `trim: true` | Unique login email address |
| `password` | `String` | `required: true` | Hashed password (`bcryptjs`) |
| `refreshToken` | `String` | `default: null` | Hashed JWT refresh token stored on server |
| `role` | `String` | `enum: ["admin", "manager", "employee"]`, `default: "employee"` | Role authorization level |
| `employeeId` | `String` | `required: true`, `unique: true`, `trim: true` | Unique company employee ID code |
| `department` | `ObjectId` | `ref: "Department"`, `default: null` | Reference to user's assigned Department |
| `designation` | `ObjectId` | `ref: "Designation"`, `default: null` | Reference to user's assigned Designation |
| `isActive` | `Boolean` | `default: true` | User account status (active / deactivated) |
| `mustChangePassword` | `Boolean` | `default: true` | Forces password change on initial login |
| `createdBy` | `ObjectId` | `ref: "User"`, `default: null` | Admin/Manager who created this user |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | User who last updated this profile |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Indexes
- `email`: `unique: true`
- `employeeId`: `unique: true`

---

## 2. `Department` Collection (`models/Department.js`)

Stores master department records across the organization.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Department document ID |
| `name` | `String` | `required: true`, `unique: true`, `trim: true` | Department display name |
| `code` | `String` | `required: true`, `unique: true`, `uppercase: true`, `trim: true` | Department uppercase code (e.g. `ENG`, `HR`) |
| `isActive` | `Boolean` | `default: true` | Department active status |
| `createdBy` | `ObjectId` | `ref: "User"`, `default: null` | User who created department |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | User who last updated department |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Indexes
- `name`: `unique: true`
- `code`: `unique: true`

---

## 3. `Designation` Collection (`models/Designation.js`)

Stores department-scoped designation job titles.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Designation document ID |
| `name` | `String` | `required: true`, `trim: true` | Designation title name |
| `code` | `String` | `required: true`, `uppercase: true`, `trim: true` | Designation uppercase code |
| `department` | `ObjectId` | `ref: "Department"`, `required: true` | Parent department reference |
| `isActive` | `Boolean` | `default: true` | Designation active status |
| `createdBy` | `ObjectId` | `ref: "User"`, `default: null` | User who created designation |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | User who updated designation |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Compound Indexes
- `{ department: 1, name: 1 }`: `unique: true` (Guarantees unique designation name per department)
- `{ department: 1, code: 1 }`: `unique: true` (Guarantees unique designation code per department)

---

## 4. `Project` Collection (`models/Project.js`)

Stores project workspaces.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Project document ID |
| `name` | `String` | `required: true`, `unique: true`, `trim: true` | Unique project workspace name |
| `description` | `String` | `default: ""`, `trim: true` | Detailed project description |
| `members` | `[ObjectId]` | `ref: "User"` | Array of assigned project member ObjectIds |
| `isArchived` | `Boolean` | `default: false` | Project archive status |
| `createdBy` | `ObjectId` | `ref: "User"`, `required: true` | Manager/Admin who created project |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | User who last updated project |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Indexes
- `name`: `unique: true`

---

## 5. `Phase` Collection (`models/Phase.js`)

Stores sequential execution phases within project workspaces.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Phase document ID |
| `name` | `String` | `required: true`, `trim: true` | Phase title name (e.g., "Sprint 1") |
| `description` | `String` | `default: ""`, `trim: true` | Optional phase scope description |
| `project` | `ObjectId` | `ref: "Project"`, `required: true` | Parent project reference |
| `order` | `Number` | `default: 0` | Display & execution order index |
| `isArchived` | `Boolean` | `default: false` | Phase archive status |
| `createdBy` | `ObjectId` | `ref: "User"`, `required: true` | Creator user reference |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | Updater user reference |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Compound Indexes
- `{ project: 1, name: 1 }`
- `{ project: 1, order: 1 }`

---

## 6. `Task` Collection (`models/Task.js`)

Stores individual tasks, checklist sub-items, and file attachment metadata.

### Sub-Schemas
- **`ChecklistSchema`** (`_id: true`):
  - `title`: `String`, required, trimmed
  - `completed`: `Boolean`, `default: false`
- **`AttachmentSchema`** (`_id: false`):
  - `fileName`: `String` (Sanitized filename)
  - `originalName`: `String` (Original user uploaded name)
  - `fileUrl`: `String` (Public/signed file URL or legacy relative path)
  - `mimeType`: `String`
  - `fileSize`: `Number` (Bytes)
  - `storagePath`: `String` (Supabase storage object key)
  - `bucket`: `String` (`"references"` or `"submissions"`)

### Task Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Task document ID |
| `title` | `String` | `required: true`, `trim: true` | Task title |
| `description` | `String` | `required: true`, `trim: true` | Detailed task instructions |
| `project` | `ObjectId` | `ref: "Project"`, `default: null` | Optional parent project workspace |
| `phase` | `ObjectId` | `ref: "Phase"`, `default: null` | Optional project phase link |
| `assignedTo` | `ObjectId` | `ref: "User"`, `required: true` | Assigned employee User reference |
| `assignedBy` | `ObjectId` | `ref: "User"`, `required: true` | Assigning manager User reference |
| `priority` | `String` | `enum: ["Low", "Medium", "High", "Critical"]`, `default: "Medium"` | Task priority level |
| `dueDate` | `Date` | `required: true` | Task deadline timestamp |
| `status` | `String` | `enum: ["Assigned", "Accepted", "Rejected", "In Progress", "Submitted", "Closed", "Withdrawn"]`, `default: "Assigned"` | Task lifecycle state |
| `rejectionReason` | `String` | `default: ""` | Reason if employee rejected task assignment |
| `checklist` | `[ChecklistSchema]` | Sub-schema Array | Array of checklist sub-items |
| `referenceAttachments` | `[AttachmentSchema]` | Sub-schema Array | Reference spec attachment metadata |
| `isArchived` | `Boolean` | `default: false` | Archive status |
| `createdBy` | `ObjectId` | `ref: "User"`, `required: true` | Task creator user reference |
| `updatedBy` | `ObjectId` | `ref: "User"`, `default: null` | Task updater user reference |
| `completedAt` | `Date` | `default: null` | Timestamp when task reached Closed status |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Indexes
- `{ assignedTo: 1, status: 1 }`
- `{ priority: 1 }`
- `{ dueDate: 1 }`
- `{ project: 1 }`
- `{ phase: 1 }`
- `{ isArchived: 1 }`
- `{ title: "text", description: "text" }` (Text search index)

---

## 7. `Submission` Collection (`models/Submission.js`)

Stores employee work deliverables, submission notes, attachments, and manager feedback.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Submission document ID |
| `task` | `ObjectId` | `ref: "Task"`, `required: true` | Target task reference |
| `submittedBy` | `ObjectId` | `ref: "User"`, `required: true` | Submitting employee reference |
| `submissionNumber` | `Number` | `required: true` | Sequential submission attempt number (1, 2, 3...) |
| `message` | `String` | `default: ""`, `trim: true` | Employee deliverable notes |
| `attachments` | `[AttachmentSchema]` | Sub-schema Array | Delivered work attachment metadata |
| `status` | `String` | `enum: ["Pending Review", "Approved", "Rejected"]`, `default: "Pending Review"` | Manager review state |
| `managerFeedback` | `String` | `default: ""` | Manager feedback notes upon review |
| `reviewedBy` | `ObjectId` | `ref: "User"`, `default: null` | Reviewing manager user reference |
| `reviewedAt` | `Date` | `default: null` | Review timestamp |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |
| `updatedAt` | `Date` | Mongoose Timestamps | Record update timestamp |

### Indexes
- `{ task: 1 }`
- `{ submittedBy: 1 }`
- `{ status: 1 }`

---

## 8. `Activity` Collection (`models/Activity.js`)

Stores system-wide audit trail logs.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Activity log document ID |
| `project` | `ObjectId` | `ref: "Project"`, `default: null` | Optional project workspace link |
| `task` | `ObjectId` | `ref: "Task"`, `required: true` | Task link |
| `action` | `String` | `required: true`, `trim: true` | Action string (e.g. "Task Created", "Task Accepted") |
| `performedBy` | `ObjectId` | `ref: "User"`, `required: true` | Performer user reference |
| `remarks` | `String` | `default: ""`, `trim: true` | Optional detail remarks |
| `createdAt` | `Date` | Mongoose Timestamps | Activity timestamp |

### Indexes
- `{ project: 1, createdAt: -1 }`
- `{ task: 1, createdAt: -1 }`
- `{ performedBy: 1, createdAt: -1 }`

---

## 9. `Notification` Collection (`models/Notification.js`)

Stores user system alerts with automated Time-To-Live (TTL) expiration.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Notification document ID |
| `user` | `ObjectId` | `ref: "User"`, `required: true` | Recipient user reference |
| `title` | `String` | `required: true`, `trim: true` | Notification heading title |
| `message` | `String` | `required: true`, `trim: true` | Notification body text |
| `type` | `String` | `enum: [...]`, `required: true` | Notification event type (see list below) |
| `task` | `ObjectId` | `ref: "Task"`, `default: null` | Linked task reference |
| `project` | `ObjectId` | `ref: "Project"`, `default: null` | Linked project reference |
| `submission` | `ObjectId` | `ref: "Submission"`, `default: null` | Linked submission reference |
| `isRead` | `Boolean` | `default: false` | Read status |
| `expiresAt` | `Date` | `default: Now + RETENTION_DAYS` | Expiration date for automatic TTL deletion |
| `createdAt` | `Date` | Mongoose Timestamps | Record creation timestamp |

### Enum Notification Types
`Task Assigned`, `Task Updated`, `Task Reassigned`, `Task Withdrawn`, `Assignment Accepted`, `Assignment Rejected`, `Submission Received`, `Submission Approved`, `Submission Rejected`, `Project Created`, `Project Updated`, `Project Member Added`, `Project Member Removed`, `Project Archived`, `Project Restored`.

### Indexes
- `{ user: 1, isRead: 1, createdAt: -1 }` (Fast notification retrieval)
- `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }` (MongoDB TTL index)

---

## 10. `DepartmentPerformanceSnapshot` Collection (`models/DepartmentPerformanceSnapshot.js`)

Stores deterministic monthly historical snapshots for department performance comparisons.

### Schema Fields
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Snapshot document ID |
| `departmentId` | `ObjectId` | `ref: "Department"`, `required: true` | Department reference |
| `departmentCode` | `String` | `required: true`, `uppercase: true`, `trim: true` | Department code snapshot |
| `departmentName` | `String` | `required: true`, `trim: true` | Department name snapshot |
| `period` | `String` | `required: true` | Reporting period format `"YYYY-MM"` (e.g. `"2026-07"`) |
| `snapshotDate` | `Date` | `required: true`, `default: Date.now` | Snapshot creation timestamp |
| `employeeCount` | `Number` | `required: true`, `default: 0` | Total department employees count |
| `activeEmployeeCount` | `Number` | `required: true`, `default: 0` | Active employees count |
| `managerCount` | `Number` | `required: true`, `default: 0` | Department managers count |
| `totalTasks` | `Number` | `required: true`, `default: 0` | Total department tasks count |
| `activeTasks` | `Number` | `required: true`, `default: 0` | Active department tasks count |
| `completedTasks` | `Number` | `required: true`, `default: 0` | Completed tasks count |
| `overdueTasks` | `Number` | `required: true`, `default: 0` | Overdue tasks count |
| `withdrawnTasks` | `Number` | `required: true`, `default: 0` | Withdrawn tasks count |
| `onTimeCompletedTasks` | `Number` | `required: true`, `default: 0` | On-time completed tasks count |
| `averageCompletionTimeDays` | `Number` | `default: 0` | Average task completion time in days |
| `totalSubmissions` | `Number` | `required: true`, `default: 0` | Submissions count |
| `pendingReviews` | `Number` | `required: true`, `default: 0` | Pending review submissions count |
| `approvedSubmissions` | `Number` | `required: true`, `default: 0` | Approved submissions count |
| `rejectedSubmissions` | `Number` | `required: true`, `default: 0` | Rejected submissions count |
| `activeProjectsCount` | `Number` | `default: 0` | Active projects count |

### Compound Unique Index
- `{ departmentId: 1, period: 1 }`: `unique: true` (Guarantees exactly 1 snapshot per department per reporting period)
