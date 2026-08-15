import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import taskService from "../../services/taskService";
import projectService from "../../services/projectService";
import userService from "../../services/userService";
import submissionService from "../../services/submissionService";
import Loader from "../../components/Loader/Loader";
import TaskDrawer from "../../components/TaskDrawer/TaskDrawer";
import EmployeeTaskDrawer from "../../components/EmployeeTaskDrawer/EmployeeTaskDrawer";
import SubmitTaskModal from "../../components/SubmitTaskModal/SubmitTaskModal";
import RejectTaskModal from "../../components/RejectTaskModal/RejectTaskModal";
import ReviewSubmissionModal from "../../components/ReviewSubmissionModal/ReviewSubmissionModal";
import ReassignModal from "../../components/ReassignModal/ReassignModal";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import SubmissionDrawer from "../../components/SubmissionDrawer/SubmissionDrawer";
import formatDate from "../../utils/formatDate";
import "./Kanban.css";

const KANBAN_PRIMARY_COLUMNS = [
  { key: "Assigned", keys: ["Assigned"], label: "Assigned", className: "status-assigned" },
  { key: "Accepted", keys: ["Accepted"], label: "Accepted", className: "status-accepted" },
  { key: "In Progress", keys: ["In Progress"], label: "In Progress", className: "status-in-progress" },
  { key: "Submitted", keys: ["Submitted"], label: "Submitted / Pending Reviews", className: "status-submitted" },
  { key: "Closed", keys: ["Closed"], label: "Closed", className: "status-closed" },
];

const KANBAN_ALTERNATE_COLUMNS = [
  {
    key: "Rejected",
    keys: ["Rejected", "Assignment Rejected", "Task Rejected"],
    label: "Assignment Rejected",
    className: "status-rejected",
  },
  {
    key: "Withdrawn",
    keys: ["Withdrawn"],
    label: "Withdrawn",
    className: "status-withdrawn",
  },
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDrawerOpen, setSubmissionDrawerOpen] = useState(false);

  // Drag and Drop States
  const [draggingTask, setDraggingTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [isArchiveDragOver, setIsArchiveDragOver] = useState(false);

  // Sequence ref for preventing race conditions from out-of-order API responses
  const fetchIdRef = useRef(0);

  // Modal States
  const [submitModalState, setSubmitModalState] = useState({
    isOpen: false,
    task: null,
    loading: false,
  });

  const [rejectModalState, setRejectModalState] = useState({
    isOpen: false,
    task: null,
    loading: false,
  });

  const [reviewModalState, setReviewModalState] = useState({
    isOpen: false,
    type: null, // "approve" or "reject"
    task: null,
    loading: false,
  });

  const [reassignModalState, setReassignModalState] = useState({
    isOpen: false,
    task: null,
    loading: false,
  });

  const [archiveModalState, setArchiveModalState] = useState({
    isOpen: false,
    task: null,
    loading: false,
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isEmployee = user?.role === "employee";

  // Debounce search query changes to prevent rapid API calls & focus loss
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch authorized projects for filter
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.getProjects();
        const projectList = Array.isArray(response)
          ? response
          : response.data || response.projects || [];
        setProjects(projectList);
      } catch (err) {
        console.error("Failed to load projects for filter:", err);
      }
    };

    fetchProjects();
  }, []);

  // Fetch authorized employees for Manager/Admin filter
  useEffect(() => {
    if (isEmployee) return;

    const fetchEmployees = async () => {
      try {
        const response = await userService.getUsers({ role: "employee" });
        const empList = Array.isArray(response)
          ? response
          : response.data || response.users || [];
        setEmployees(empList);
      } catch (err) {
        console.error("Failed to load employees for filter:", err);
      }
    };

    fetchEmployees();
  }, [isEmployee]);

  // Fetch tasks with request sequence tracking to eliminate race conditions
  const fetchKanbanTasks = async () => {
    const currentFetchId = ++fetchIdRef.current;
    try {
      setFetching(true);
      setError(null);

      const params = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedProject) params.project = selectedProject;
      if (selectedEmployee) params.employee = selectedEmployee;
      if (selectedPriority) params.priority = selectedPriority;

      let response;
      let pendingSubmissionsRes;

      if (isEmployee) {
        response = await taskService.getMyTasks(params);
        pendingSubmissionsRes = await submissionService.getMySubmissions({
          status: "Pending Review",
          limit: 100,
        });
      } else {
        params.isArchived = false;
        response = await taskService.getTasks(params);
        pendingSubmissionsRes = await submissionService.getSubmissions({
          status: "Pending Review",
          limit: 100,
        });
      }

      const pendingSubList =
        pendingSubmissionsRes?.data ||
        pendingSubmissionsRes?.submissions ||
        pendingSubmissionsRes ||
        [];
      const pendingSubMap = new Map();
      pendingSubList.forEach((sub) => {
        const taskId =
          sub.task?._id || (typeof sub.task === "string" ? sub.task : null);
        if (taskId) {
          pendingSubMap.set(taskId.toString(), sub);
        }
      });

      if (currentFetchId === fetchIdRef.current) {
        const fetchedTasks = (response.data || []).map((t) => {
          const sub = pendingSubMap.get(t._id.toString());
          if (sub) {
            return { ...t, pendingSubmission: sub };
          }
          return t;
        });

        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error("Failed to retrieve Kanban tasks:", err);
      if (currentFetchId === fetchIdRef.current) {
        setError(
          err.response?.data?.message || "Failed to load Kanban tasks.",
        );
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setInitialLoading(false);
        setFetching(false);
      }
    }
  };

  useEffect(() => {
    fetchKanbanTasks();
  }, [isEmployee, debouncedSearch, selectedProject, selectedEmployee, selectedPriority]);

  // Permission Check for Dragging
  const isTaskDraggable = (task) => {
    if (!task || task.isArchived) {
      return false;
    }

    if (isEmployee) {
      const isAssignee =
        task.assignedTo?._id === user?.userId ||
        task.assignedTo === user?.userId ||
        task.assignedTo?._id === user?.id ||
        task.assignedTo === user?.id;

      if (!isAssignee) return false;

      return ["Assigned", "Accepted", "In Progress"].includes(task.status);
    }

    return ["Assigned", "Accepted", "In Progress", "Submitted", "Rejected", "Withdrawn", "Closed"].includes(
      task.status,
    );
  };

  // Transition Validity Check
  const isTransitionValid = (currentStatus, targetStatus) => {
    if (!currentStatus || !targetStatus || currentStatus === targetStatus) {
      return false;
    }

    if (isEmployee) {
      if (currentStatus === "Assigned" && targetStatus === "Accepted") return true;
      if (currentStatus === "Assigned" && targetStatus === "Rejected") return true;
      if (currentStatus === "Accepted" && targetStatus === "In Progress") return true;
      if (currentStatus === "In Progress" && targetStatus === "Submitted") return true;
      return false;
    }

    // Manager / Admin transitions
    if (
      ["Assigned", "Accepted", "In Progress", "Rejected"].includes(currentStatus) &&
      targetStatus === "Withdrawn"
    ) {
      return true;
    }
    if (currentStatus === "Submitted" && targetStatus === "Closed") return true;
    if (currentStatus === "Submitted" && targetStatus === "In Progress") return true;

    // Phase 8.7 Transitions (Withdrawn & Assignment Rejected)
    if (
      (currentStatus === "Withdrawn" || currentStatus === "Rejected") &&
      (targetStatus === "Assigned" || targetStatus === "Closed")
    ) {
      return true;
    }

    return false;
  };

  // Drag Event Handlers
  const handleDragStart = (e, task) => {
    if (!isTaskDraggable(task) || updatingTaskId !== null) {
      e.preventDefault();
      return;
    }

    setDraggingTask(task);
    e.dataTransfer.setData("application/json", JSON.stringify(task));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnKey) => {
    e.preventDefault();
    if (!draggingTask) return;

    const valid = isTransitionValid(draggingTask.status, columnKey);
    e.dataTransfer.dropEffect = valid ? "move" : "none";

    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = (e, columnKey) => {
    if (dragOverColumn === columnKey) {
      setDragOverColumn(null);
    }
  };

  const executeStatusTransition = async (task, targetStatus) => {
    try {
      setUpdatingTaskId(task._id);

      // 1. Employee: Assigned -> Accepted
      if (task.status === "Assigned" && targetStatus === "Accepted") {
        await taskService.acceptTask(task._id);
        toast.success("Task accepted successfully.");
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: "Accepted" } : t)),
        );
      }
      // 2. Employee: Accepted -> In Progress
      else if (task.status === "Accepted" && targetStatus === "In Progress") {
        await taskService.startTask(task._id);
        toast.success("Task started successfully.");
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: "In Progress" } : t)),
        );
      }
      // 3. Employee: Assigned -> Rejected (opens modal)
      else if (task.status === "Assigned" && targetStatus === "Rejected") {
        setRejectModalState({ isOpen: true, task, loading: false });
      }
      // 4. Employee: In Progress -> Submitted (opens modal)
      else if (task.status === "In Progress" && targetStatus === "Submitted") {
        setSubmitModalState({ isOpen: true, task, loading: false });
      }
      // 5. Manager/Admin: Submitted -> Closed (opens ReviewSubmissionModal for approval)
      else if (task.status === "Submitted" && targetStatus === "Closed") {
        setReviewModalState({
          isOpen: true,
          type: "approve",
          task,
          loading: false,
        });
      }
      // 6. Manager/Admin: Submitted -> In Progress (opens ReviewSubmissionModal for rejection)
      else if (task.status === "Submitted" && targetStatus === "In Progress") {
        if (task.assignedTo?.isActive === false) {
          toast.error(
            "Cannot reject submission for a deactivated employee. Only approval is allowed.",
          );
          return;
        }
        setReviewModalState({
          isOpen: true,
          type: "reject",
          task,
          loading: false,
        });
      }
      // 7. Manager/Admin: Withdrawn or Rejected -> Assigned (opens ReassignModal)
      else if (
        (task.status === "Withdrawn" || task.status === "Rejected") &&
        targetStatus === "Assigned"
      ) {
        setReassignModalState({
          isOpen: true,
          task,
          loading: false,
        });
      }
      // 8. Manager/Admin: Withdrawn or Rejected -> Closed
      else if (
        (task.status === "Withdrawn" || task.status === "Rejected") &&
        targetStatus === "Closed"
      ) {
        await taskService.closeTask(task._id);
        toast.success("Task closed successfully.");
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: "Closed" } : t)),
        );
      }
      // 9. Manager/Admin: Any -> Withdrawn
      else if (targetStatus === "Withdrawn") {
        await taskService.withdrawTask(task._id);
        toast.success("Task withdrawn successfully.");
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: "Withdrawn" } : t)),
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Task status update failed.");
      fetchKanbanTasks();
    } finally {
      setUpdatingTaskId(null);
      setDraggingTask(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    let task = draggingTask;
    if (!task) {
      try {
        const dataStr = e.dataTransfer.getData("application/json");
        if (dataStr) task = JSON.parse(dataStr);
      } catch (err) {}
    }

    if (!task) return;

    // Same column check
    if (task.status === targetStatus) {
      setDraggingTask(null);
      return;
    }

    // Validity check
    if (!isTransitionValid(task.status, targetStatus)) {
      toast.error(`Transition from "${task.status}" to "${targetStatus}" is not allowed.`);
      setDraggingTask(null);
      return;
    }

    await executeStatusTransition(task, targetStatus);
  };

  // Submit Modal Handler
  const handleSubmitTask = async (formData) => {
    if (!submitModalState.task) return;
    try {
      setSubmitModalState((prev) => ({ ...prev, loading: true }));
      await submissionService.submitTask(submitModalState.task._id, formData);
      toast.success("Task work submitted successfully.");
      setTasks((prev) =>
        prev.map((t) =>
          t._id === submitModalState.task._id ? { ...t, status: "Submitted" } : t,
        ),
      );
      setSubmitModalState({ isOpen: false, task: null, loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || "Task submission failed.");
      setSubmitModalState((prev) => ({ ...prev, loading: false }));
      fetchKanbanTasks();
    }
  };

  // Reject Assignment Modal Handler
  const handleRejectTask = async (reason) => {
    if (!rejectModalState.task) return;
    try {
      setRejectModalState((prev) => ({ ...prev, loading: true }));
      await taskService.rejectTask(rejectModalState.task._id, reason);
      toast.success("Task assignment rejected.");
      setTasks((prev) =>
        prev.map((t) =>
          t._id === rejectModalState.task._id ? { ...t, status: "Rejected" } : t,
        ),
      );
      setRejectModalState({ isOpen: false, task: null, loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || "Task rejection failed.");
      setRejectModalState((prev) => ({ ...prev, loading: false }));
      fetchKanbanTasks();
    }
  };

  // Review Submission Modal Handler (Approve / Reject)
  const handleReviewSubmission = async (feedback) => {
    if (!reviewModalState.task && !reviewModalState.submission) return;
    const { task, submission, type } = reviewModalState;

    try {
      setReviewModalState((prev) => ({ ...prev, loading: true }));

      let submissionId = submission?._id;
      if (!submissionId && task) {
        let pendingSubmission = null;
        try {
          const subRes = isEmployee
            ? await submissionService.getMySubmissions({
                task: task._id,
                status: "Pending Review",
              })
            : await submissionService.getSubmissions({
                task: task._id,
                status: "Pending Review",
              });
          const subList = subRes.data || subRes.submissions || subRes || [];
          pendingSubmission = subList[0];
        } catch (err) {
          console.error("Error fetching submission for task:", err);
        }
        submissionId = pendingSubmission?._id;
      }

      if (!submissionId) {
        toast.error("No pending submission found to review.");
        setReviewModalState({
          isOpen: false,
          type: null,
          task: null,
          submission: null,
          loading: false,
        });
        fetchKanbanTasks();
        return;
      }

      const action = type === "approve" ? "approve" : "reject";
      await submissionService.reviewSubmission(
        submissionId,
        action,
        feedback,
      );

      if (action === "approve") {
        toast.success("Task submission approved and task closed.");
        if (task) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === task._id ? { ...t, status: "Closed" } : t,
            ),
          );
        }
      } else {
        toast.success(
          "Task submission rejected and returned to In Progress.",
        );
        if (task) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === task._id ? { ...t, status: "In Progress" } : t,
            ),
          );
        }
      }

      setReviewModalState({
        isOpen: false,
        type: null,
        task: null,
        submission: null,
        loading: false,
      });
      fetchKanbanTasks();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to review submission.",
      );
      setReviewModalState((prev) => ({ ...prev, loading: false }));
      fetchKanbanTasks();
    }
  };

  const handleOpenPendingSubmission = async (task) => {
    try {
      if (!task.pendingSubmission) return;
      const fullSubRes = await submissionService.getSubmission(
        task.pendingSubmission._id,
      );
      setSelectedSubmission(fullSubRes.data || fullSubRes);
      setSubmissionDrawerOpen(true);
    } catch (err) {
      console.error("Failed to fetch submission details:", err);
      setSelectedSubmission(task.pendingSubmission);
      setSubmissionDrawerOpen(true);
    }
  };

  const handleApproveFromDrawer = (submission) => {
    setSubmissionDrawerOpen(false);
    setReviewModalState({
      isOpen: true,
      type: "approve",
      task: submission.task,
      submission: submission,
      loading: false,
    });
  };

  const handleRejectFromDrawer = (submission) => {
    setSubmissionDrawerOpen(false);
    setReviewModalState({
      isOpen: true,
      type: "reject",
      task: submission.task,
      submission: submission,
      loading: false,
    });
  };

  // Reassign Task Modal Handler
  const handleReassignTask = async (assignedTo) => {
    if (!reassignModalState.task) return;
    try {
      setReassignModalState((prev) => ({ ...prev, loading: true }));
      await taskService.reassignTask(reassignModalState.task._id, assignedTo);
      toast.success("Task reassigned successfully.");
      setTasks((prev) =>
        prev.map((t) =>
          t._id === reassignModalState.task._id
            ? { ...t, status: "Assigned" }
            : t,
        ),
      );
      setReassignModalState({ isOpen: false, task: null, loading: false });
      fetchKanbanTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Task reassignment failed.");
      setReassignModalState((prev) => ({ ...prev, loading: false }));
      fetchKanbanTasks();
    }
  };

  // Archive Task Modal Handler
  const handleConfirmArchive = async () => {
    if (!archiveModalState.task) return;
    const task = archiveModalState.task;
    try {
      setArchiveModalState((prev) => ({ ...prev, loading: true }));
      await taskService.archiveTask(task._id);
      toast.success(`Task "${task.title}" archived successfully.`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setArchiveModalState({ isOpen: false, task: null, loading: false });
      fetchKanbanTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to archive task.");
      setArchiveModalState((prev) => ({ ...prev, loading: false }));
      fetchKanbanTasks();
    }
  };

  const renderColumn = (column) => {
    let columnTasks = [];
    if (column.key === "Submitted") {
      columnTasks = tasks.filter((t) => {
        const matchesStatus = column.keys
          ? column.keys.includes(t.status)
          : t.status === column.key;
        const hasPendingSub =
          t.pendingSubmission &&
          t.pendingSubmission.status === "Pending Review";
        return matchesStatus && hasPendingSub;
      });
    } else {
      columnTasks = tasks.filter((t) =>
        column.keys ? column.keys.includes(t.status) : t.status === column.key,
      );
    }

    const isValidDrop =
      draggingTask && isTransitionValid(draggingTask.status, column.key);
    const isDragOver = dragOverColumn === column.key;

    return (
      <div
        key={column.key}
        className={`kanban-column ${
          isDragOver
            ? isValidDrop
              ? "drag-over-valid"
              : "drag-over-invalid"
            : ""
        }`}
        onDragOver={(e) => handleDragOver(e, column.key)}
        onDragLeave={(e) => handleDragLeave(e, column.key)}
        onDrop={(e) => handleDrop(e, column.key)}
      >
        <div className={`kanban-column-header ${column.className}`}>
          <span className="kanban-column-title">{column.label}</span>
          <span className="kanban-column-count">{columnTasks.length}</span>
        </div>

        <div className="kanban-column-body">
          {columnTasks.length === 0 ? (
            <div className="kanban-empty-column">No tasks</div>
          ) : (
            columnTasks.map((task, idx) => {
              const draggable = isTaskDraggable(task);
              const isUpdating = updatingTaskId === task._id;
              const isDragging = draggingTask?._id === task._id;

              return (
                <div
                  className={`kanban-card ${draggable ? "is-draggable" : ""} ${
                    isDragging ? "is-dragging" : ""
                  } ${isUpdating ? "is-updating" : ""}`}
                  key={task._id ? `${column.key}-${task._id}` : `${column.key}-${idx}`}
                  draggable={draggable && !isUpdating}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={() => setDraggingTask(null)}
                  onClick={() => {
                    if (draggingTask || isUpdating) return;
                    if (column.key === "Submitted" && task.pendingSubmission) {
                      handleOpenPendingSubmission(task);
                    } else {
                      setSelectedTask(task);
                      setIsDrawerOpen(true);
                    }
                  }}
                >
                  <div className="kanban-card-header">
                    <span
                      className={`priority-tag ${
                        task.priority?.toLowerCase() || "low"
                      }`}
                    >
                      {task.priority || "Low"}
                    </span>

                    {draggable && (
                      <span
                        className="drag-handle"
                        title="Drag to change status"
                      >
                        ⋮⋮
                      </span>
                    )}
                  </div>

                  <h4 className="kanban-card-title">{task.title}</h4>

                  {(task.project?.name || task.phase?.name) && (
                    <div className="kanban-card-context">
                      {task.project?.name && (
                        <div
                          className="context-line project-line"
                          title={task.project.name}
                        >
                          <span className="context-label">Project:</span>{" "}
                          <span className="context-value">
                            {task.project.name}
                          </span>
                        </div>
                      )}

                      {task.phase?.name && (
                        <div
                          className="context-line phase-line"
                          title={task.phase.name}
                        >
                          <span className="context-label">Phase:</span>{" "}
                          <span className="context-value">
                            📌 {task.phase.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="kanban-card-meta">
                    <span className="kanban-card-assignee">
                      👤 {task.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="kanban-card-footer">
                    <span
                      className={`due-date ${
                        task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== "Closed"
                          ? "overdue"
                          : ""
                      }`}
                    >
                      📅{" "}
                      {task.dueDate
                        ? formatDate(task.dueDate)
                        : "No due date"}
                    </span>

                    {!isEmployee && task.status === "Closed" && (
                      <button
                        className="archive-card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveModalState({
                            isOpen: true,
                            task,
                            loading: false,
                          });
                        }}
                        title="Archive this closed task"
                      >
                        📥 Archive
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return <Loader />;
  }

  return (
    <div className="kanban-page">
      <div className="page-header">
        <div>
          <h2>Kanban Board</h2>
          <p className="subtitle">Visual task board with controlled status movement, search, and filters</p>
        </div>
      </div>

      <div className="kanban-filter-header">
        <div className="kanban-filter-group">
          {/* Search Box */}
          <div className="filter-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="kanban-search-input"
              placeholder="Search tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="filter-item">
            <label htmlFor="kanban-project-filter">Project:</label>
            <select
              id="kanban-project-filter"
              className="kanban-filter-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              <option value="NO_PROJECT">Independent Tasks</option>
              {projects.map((p, idx) => (
                <option key={p._id ? `proj-${p._id}` : `proj-${idx}`} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter (Manager / Admin) */}
          {!isEmployee && (
            <div className="filter-item">
              <label htmlFor="kanban-employee-filter">Employee:</label>
              <select
                id="kanban-employee-filter"
                className="kanban-filter-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp, idx) => (
                  <option key={emp._id ? `emp-${emp._id}` : `emp-${idx}`} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Filter */}
          <div className="filter-item">
            <label htmlFor="kanban-priority-filter">Priority:</label>
            <select
              id="kanban-priority-filter"
              className="kanban-filter-select"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((prio) => (
                <option key={prio} value={prio}>
                  {prio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="kanban-summary-badge">
          {fetching ? "Updating..." : `Total: ${tasks.length} Task${tasks.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Archive Drop Zone when dragging a Closed task */}
      {draggingTask?.status === "Closed" && !isEmployee && (
        <div
          className={`kanban-archive-drop-zone ${isArchiveDragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsArchiveDragOver(true);
          }}
          onDragLeave={() => setIsArchiveDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsArchiveDragOver(false);
            if (draggingTask?.status === "Closed") {
              setArchiveModalState({
                isOpen: true,
                task: draggingTask,
                loading: false,
              });
              setDraggingTask(null);
            }
          }}
        >
          📥 Drop here to Archive Closed Task
        </div>
      )}

      {error ? (
        <div className="kanban-error-banner">⚠️ {error}</div>
      ) : (
        <>
          {/* Primary Workflow Section */}
          <div className="kanban-section">
            <div className="kanban-section-title">
              <h3>⚡ Primary Workflow</h3>
            </div>
            <div className="kanban-board">
              {KANBAN_PRIMARY_COLUMNS.map((column) => renderColumn(column))}
            </div>
          </div>

          {/* Alternate Task States Section */}
          <div className="kanban-section">
            <div className="kanban-section-title">
              <h3>🔄 Alternate Task States</h3>
            </div>
            <div className="kanban-board">
              {KANBAN_ALTERNATE_COLUMNS.map((column) => renderColumn(column))}
            </div>
          </div>
        </>
      )}

      {/* Read-Only Task Details Side Drawer */}
      {isEmployee ? (
        <EmployeeTaskDrawer
          isOpen={isDrawerOpen}
          task={selectedTask}
          onClose={() => setIsDrawerOpen(false)}
        />
      ) : (
        <TaskDrawer
          isOpen={isDrawerOpen}
          task={selectedTask}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Modals for Status Transition Integration */}
      <SubmitTaskModal
        isOpen={submitModalState.isOpen}
        loading={submitModalState.loading}
        onClose={() => setSubmitModalState({ isOpen: false, task: null, loading: false })}
        onSubmit={handleSubmitTask}
      />

      <RejectTaskModal
        isOpen={rejectModalState.isOpen}
        loading={rejectModalState.loading}
        onClose={() => setRejectModalState({ isOpen: false, task: null, loading: false })}
        onSubmit={handleRejectTask}
      />

      <ReviewSubmissionModal
        isOpen={reviewModalState.isOpen}
        type={reviewModalState.type}
        loading={reviewModalState.loading}
        onClose={() => setReviewModalState({ isOpen: false, type: null, task: null, loading: false })}
        onSubmit={handleReviewSubmission}
      />

      <ReassignModal
        isOpen={reassignModalState.isOpen}
        loading={reassignModalState.loading}
        task={reassignModalState.task}
        employees={employees}
        projects={projects}
        onClose={() => setReassignModalState({ isOpen: false, task: null, loading: false })}
        onSubmit={handleReassignTask}
      />

      <ConfirmationModal
        isOpen={archiveModalState.isOpen}
        title="Archive Task"
        message={`Are you sure you want to archive task "${archiveModalState.task?.title}"? Archived tasks will be hidden from the active Kanban board.`}
        confirmText="Archive"
        confirmType="danger"
        loading={archiveModalState.loading}
        onConfirm={handleConfirmArchive}
        onClose={() => setArchiveModalState({ isOpen: false, task: null, loading: false })}
      />

      <SubmissionDrawer
        isOpen={submissionDrawerOpen}
        submission={selectedSubmission}
        onClose={() => {
          setSubmissionDrawerOpen(false);
          setSelectedSubmission(null);
        }}
        onApprove={handleApproveFromDrawer}
        onReject={handleRejectFromDrawer}
      />
    </div>
  );
}

export default Kanban;
