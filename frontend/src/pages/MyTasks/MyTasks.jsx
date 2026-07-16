import { useEffect, useMemo, useState, useCallback } from "react";

import { useSearchParams } from "react-router-dom";

import { FiEye } from "react-icons/fi";

import { toast } from "react-toastify";

import useDebounce from "../../hooks/useDebounce";

import taskService from "../../services/taskService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ActionButtons from "../../components/ActionButtons/ActionButtons";
import EmployeeTaskDrawer from "../../components/EmployeeTaskDrawer/EmployeeTaskDrawer";
import formatDueDate from "../../utils/formatDueDate";

import "./MyTasks.css";
import RejectTaskModal from "../../components/RejectTaskModal/RejectTaskModal";
import SubmitTaskModal from "../../components/SubmitTaskModal/SubmitTaskModal";
import submissionService from "../../services/submissionService";

function MyTasks() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search);

  const [status, setStatus] = useState("");

  const [priority, setPriority] = useState("");

  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const [rejectingTask, setRejectingTask] = useState(null);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const [submittingTask, setSubmittingTask] = useState(null);

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

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
        priority,
      };

      if (status !== "") {
        params.status = status;
      }

      if (priority) {
        params.priority = priority;
      }

      const response = await taskService.getMyTasks(params);

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

    if (!taskId || tasks.length === 0) return;

    const task = tasks.find((t) => t._id === taskId);

    if (task) {
      handleView(task);

      searchParams.delete("task");
      setSearchParams(searchParams, { replace: true });
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [page, debouncedSearch, status, priority]);

  const handleAccept = async (task) => {
    try {
      setActionLoading(true);

      const response = await taskService.acceptTask(task._id);

      toast.success(response.message);

      updateTaskInState(response.data);

      setDrawerOpen(false);
      setSelectedTask(null);

      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to accept task.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (task) => {
    setRejectingTask(task);

    setRejectModalOpen(true);
  };

  const submitReject = async (reason) => {
    try {
      setActionLoading(true);

      const response = await taskService.rejectTask(rejectingTask._id, reason);

      toast.success(response.message);

      updateTaskInState(response.data);

      setRejectModalOpen(false);
      setDrawerOpen(false);
      setRejectingTask(null);
      setSelectedTask(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to reject task.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (task) => {
    try {
      setActionLoading(true);

      const response = await taskService.startTask(task._id);

      toast.success(response.message);

      updateTaskInState(response.data);

      setDrawerOpen(false);

      setSelectedTask(null);

      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to start task.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChecklistToggle = async (taskId, checklistId) => {
    try {
      const response = await taskService.updateChecklist(taskId, checklistId);

      const updatedTask = response.data;

      // Update drawer
      setSelectedTask(updatedTask);

      // Update table without another API call
      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)),
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update checklist.",
      );
    }
  };

  const handleSubmit = (task) => {
    setSubmittingTask(task);
    setSubmitModalOpen(true);
  };

  const submitTaskHandler = async (formData) => {
    try {
      setActionLoading(true);

      const response = await submissionService.submitTask(
        submittingTask._id,
        formData,
      );

      toast.success(response.message);
      updateTaskInState(response.task);

      setSubmitModalOpen(false);
      setDrawerOpen(false);

      setSubmittingTask(null);
      setSelectedTask(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to submit task.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateTaskInState = (updatedTask) => {
    setTasks((prev) => {
      // If task is no longer part of this page, remove it
      if (
        updatedTask.status === "Rejected" ||
        updatedTask.status === "Closed" ||
        updatedTask.status === "Withdrawn"
      ) {
        return prev.filter((task) => task._id !== updatedTask._id);
      }

      return prev.map((task) =>
        task._id === updatedTask._id ? updatedTask : task,
      );
    });

    setSelectedTask(updatedTask);
  };

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Task",
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
            ]}
          />
        ),
      },
    ],
    [handleView],
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
              setStatus(value);
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
            ]}
          />
        </div>
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

      <EmployeeTaskDrawer
        isOpen={drawerOpen}
        task={selectedTask}
        loading={actionLoading}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
        }}
        onAccept={handleAccept}
        onReject={handleReject}
        onStart={handleStart}
        onChecklistToggle={handleChecklistToggle}
        onSubmit={handleSubmit}
      />
      <RejectTaskModal
        isOpen={rejectModalOpen}
        loading={actionLoading}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectingTask(null);
        }}
        onSubmit={submitReject}
      />

      <SubmitTaskModal
        isOpen={submitModalOpen}
        loading={actionLoading}
        onClose={() => {
          setSubmitModalOpen(false);
          setSubmittingTask(null);
        }}
        onSubmit={submitTaskHandler}
      />
    </div>
  );
}

export default MyTasks;
