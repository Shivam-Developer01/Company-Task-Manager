import { useEffect, useMemo, useState, useCallback } from "react";

import { useSearchParams } from "react-router-dom";

import { FiEye, FiEdit2, FiArchive } from "react-icons/fi";

import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";

import useDebounce from "../../hooks/useDebounce";

import taskService from "../../services/taskService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ActionButtons from "../../components/ActionButtons/ActionButtons";
import TaskModal from "../../components/TaskModal/TaskModal";
import employeeService from "../../services/employeeService";
import projectService from "../../services/projectService";
import TaskDrawer from "../../components/TaskDrawer/TaskDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import ReassignModal from "../../components/ReassignModal/ReassignModal";
import formatDueDate from "../../utils/formatDueDate";
import "./Tasks.css";

function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const source = searchParams.get("source");
  const action = searchParams.get("action");
  const projectId = searchParams.get("project");
  const taskId = searchParams.get("task");

  const initialProject = searchParams.get("project") || "";

  const [defaultProject, setDefaultProject] = useState(null);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search);

  const [status, setStatus] = useState("");

  const [priority, setPriority] = useState("");

  const [project, setProject] = useState("");

  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);

  const [employees, setEmployees] = useState([]);

  const [projects, setProjects] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [confirmationConfig, setConfirmationConfig] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  const [reassignOpen, setReassignOpen] = useState(false);

  const [archived, setArchived] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const handleView = useCallback(async (task) => {
    try {
      const response = await taskService.getTask(task._id);

      setSelectedTask(response.data);

      setDrawerOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load task.");
    }
  }, []);

  const handleManageMembersFromTask = () => {
    if (!selectedTask?.project?._id) return;

    setReassignOpen(false);

    navigate(
      `/projects?action=members&project=${selectedTask.project._id}&returnTask=${selectedTask._id}`,
    );
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
        priority,
        project,
        isArchived: archived,
      };

      if (status !== "") {
        params.status = status;
      }

      if (priority) {
        params.priority = priority;
      }

      const response = await taskService.getTasks(params);

      setTasks(response.data);

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const taskId = searchParams.get("task");
    const action = searchParams.get("action");

    if (!taskId || tasks.length === 0) return;

    const task = tasks.find((t) => t._id === taskId);

    if (!task) return;

    handleView(task);

    if (action === "reassign") {
      setSelectedTask(task);
      setReassignOpen(true);
    }

    const params = new URLSearchParams(searchParams);

    params.delete("task");
    params.delete("action");

    setSearchParams(params, { replace: true });
  }, [tasks]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getEmployees({
        limit: 1000,
        isActive: true,
      });

      setEmployees(response.data);
    } catch (error) {
      toast.error("Failed to load employees.");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectService.getProjects({
        limit: 1000,
        isArchived: false,
      });

      setProjects(response.data);
    } catch (error) {
      toast.error("Failed to load projects.");
    }
  };

  useEffect(() => {
    const action = searchParams.get("action");
    const projectId = searchParams.get("project");

    if (action !== "create" || !projectId || projects.length === 0) {
      return;
    }

    const project = projects.find((p) => p._id === projectId);

    if (!project) return;

    setEditingTask(null);

    setDefaultProject(project);

    setModalOpen(true);

    const params = new URLSearchParams(searchParams);

    params.delete("action");
    params.delete("source");

    // Keep project so the filter remains applied

    setSearchParams(params, { replace: true });
  }, [projects]);

  const createTask = async (formData) => {
    try {
      setModalLoading(true);

      const response = await taskService.createTask(formData);

      toast.success(response.message);

      setModalOpen(false);

      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create task.");
    } finally {
      setModalLoading(false);
    }
  };

  const updateTask = async (formData) => {
    try {
      setModalLoading(true);

      const response = await taskService.updateTask(editingTask._id, formData);

      toast.success(response.message);

      setModalOpen(false);

      setEditingTask(null);

      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update task.");
    } finally {
      setModalLoading(false);
    }
  };

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      let response;

      if (confirmationConfig.action === "withdraw") {
        response = await taskService.withdrawTask(selectedTask._id);
      } else if (confirmationConfig.action === "archive") {
        response = await taskService.archiveTask(selectedTask._id);
      }

      toast.success(response.message);

      setConfirmationOpen(false);

      setDrawerOpen(false);

      setSelectedTask(null);

      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const reassignTask = async (employeeId) => {
    try {
      setActionLoading(true);

      const response = await taskService.reassignTask(
        selectedTask._id,
        employeeId,
      );

      toast.success(response.message);

      setReassignOpen(false);

      setDrawerOpen(false);

      setSelectedTask(null);

      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to reassign task.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, debouncedSearch, status, priority, project]);

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (source === "project" && initialProject) {
      setProject(initialProject);
    }
  }, [source, initialProject]);

  useEffect(() => {
    if (!initialProject) {
      setProject("");
    }
  }, [initialProject]);

  /* ===========================
          PLACEHOLDER ACTIONS
     =========================== */

  const handleEdit = useCallback((task) => {
    setDefaultProject(null);

    setEditingTask(task);

    setModalOpen(true);
  }, []);

  const handleArchive = useCallback((task) => {
    setSelectedTask(task);

    setConfirmationConfig({
      title: task.isArchived ? "Restore Task?" : "Archive Task?",

      message: task.isArchived
        ? "This task will become active again."
        : "This task will be moved to archived tasks.",

      confirmText: task.isArchived ? "Restore" : "Archive",

      confirmType: task.isArchived ? "success" : "danger",

      action: "archive",
    });

    setConfirmationOpen(true);
  }, []);

  const handleWithdraw = useCallback((task) => {
    setSelectedTask(task);

    setConfirmationConfig({
      title: "Withdraw Task?",
      message: "The employee will no longer be able to continue this task.",
      confirmText: "Withdraw",
      confirmType: "warning",
      action: "withdraw",
    });

    setConfirmationOpen(true);
  }, []);

  const handleReassign = useCallback((task) => {
    setSelectedTask(task);

    setReassignOpen(true);
  }, []);

  /* ===========================
            TABLE COLUMNS
     =========================== */

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Task",
      },

      {
        key: "employee",
        label: "Employee",

        render: (row) => row.assignedTo?.name || "-",
      },

      {
        key: "project",
        label: "Project",

        render: (row) => row.project?.name || "-",
      },

      {
        key: "priority",
        label: "Priority",

        render: (row) => (
          <span
            className={`priority-badge ${row.priority
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {row.priority}
          </span>
        ),
      },

      {
        key: "dueDate",
        label: "Due Date",

        render: (row) => {
          const due = formatDueDate(row.dueDate);

          return <span className={`due-status ${due.type}`}>{due.label}</span>;
        },
      },

      {
        key: "status",
        label: "Status",

        render: (row) => <StatusBadge status={row.status} />,
      },

      {
        key: "actions",
        label: "Actions",

        render: (row) => (
          <ActionButtons
            actions={[
              {
                title: "View",
                icon: <FiEye />,
                onClick: () => handleView(row),
              },

              {
                title: "Edit",
                icon: <FiEdit2 />,
                variant: "edit",
                onClick: () => handleEdit(row),
              },

              {
                title: "Archive",
                icon: <FiArchive />,
                variant: "danger",
                onClick: () => handleArchive(row),
              },
            ]}
          />
        ),
      },
    ],
    [handleView, handleEdit, handleArchive],
  );

  return (
    <div className="tasks-page">
      <div className="task-header">
        <div className="task-search-section">
          <AppSearchBar
            searchValue={search}
            onSearchChange={(value) => {
              setPage(1);
              setSearch(value);
            }}
            placeholder="Search tasks..."
            filterValue={status}
            onFilterChange={(value) => {
              setPage(1);

              if (value === "__ARCHIVED__") {
                setArchived(true);
                setStatus("");
              } else {
                setArchived(false);
                setStatus(value);
              }
            }}
            filters={[
              {
                label: "All",
                value: "",
              },
              {
                label: "Assigned",
                value: "Assigned",
              },
              {
                label: "Accepted",
                value: "Accepted",
              },
              {
                label: "In Progress",
                value: "In Progress",
              },
              {
                label: "Submitted",
                value: "Submitted",
              },
              {
                label: "Closed",
                value: "Closed",
              },
              {
                label: "Rejected",
                value: "Rejected",
              },
              {
                label: "Withdrawn",
                value: "Withdrawn",
              },
              {
                label: "Archived",
                value: "__ARCHIVED__",
              },
            ]}
          />
        </div>
        <div className="task-actions">
          <select
            className="employee-filter"
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value);
            }}
          >
            <option value="">All Priorities</option>

            <option value="Low">Low</option>

            <option value="Medium">Medium</option>

            <option value="High">High</option>

            <option value="Critical">Critical</option>
          </select>

          <select
            className="employee-filter"
            value={project}
            onChange={(e) => {
              setPage(1);
              setProject(e.target.value);
            }}
          >
            <option value="">All Projects</option>

            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className="add-employee-btn"
            onClick={() => {
              setEditingTask(null);

              setDefaultProject(null);

              setModalOpen(true);
            }}
          >
            + Create Task
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyMessage="No tasks found."
      />

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        employees={employees}
        projects={projects}
        defaultProject={defaultProject}
        loading={modalLoading}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
          setDefaultProject(null);
        }}
        onSubmit={editingTask ? updateTask : createTask}
      />

      <TaskDrawer
        isOpen={drawerOpen}
        task={selectedTask}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
        }}
        onEdit={handleEdit}
        onWithdraw={handleWithdraw}
        onArchive={handleArchive}
        onReassign={handleReassign}
      />
      <ConfirmationModal
        isOpen={confirmationOpen}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmText={confirmationConfig.confirmText}
        confirmType={confirmationConfig.confirmType}
        loading={actionLoading}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={confirmAction}
      />

      <ReassignModal
        isOpen={reassignOpen}
        task={selectedTask}
        employees={employees}
        projects={projects}
        loading={actionLoading}
        onClose={() => setReassignOpen(false)}
        onSubmit={reassignTask}
        onManageMembers={handleManageMembersFromTask}
      />
    </div>
  );
}

export default Tasks;
