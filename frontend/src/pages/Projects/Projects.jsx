import "./Projects.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEdit2, FiArchive, FiRotateCcw } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";

import ActionButtons from "../../components/ActionButtons/ActionButtons";
import { toast } from "react-toastify";

import projectService from "../../services/projectService";
import formatDateTime from "../../utils/formatDateTime";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ProjectModal from "../../components/ProjectModal/ProjectModal";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import useDebounce from "../../hooks/useDebounce";

function Projects() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search);

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState(null);

  const [projectModalMode, setProjectModalMode] = useState("edit");

  const [modalLoading, setModalLoading] = useState(false);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [confirmationConfig, setConfirmationConfig] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (status !== "") {
        params.isArchived = status;
      }

      const response = await projectService.getProjects(params);

      setProjects(response.data);

      setTotalPages(response.totalPages);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    const action = searchParams.get("action");
    const projectId = searchParams.get("project");

    if (action !== "members" || !projectId || projects.length === 0) {
      return;
    }

    const project = projects.find((p) => p._id === projectId);

    if (!project) return;

    setSelectedProject(project);

    setProjectModalMode("members");

    setEditingProject(project);

    setModalOpen(true);

    const params = new URLSearchParams(searchParams);

    params.delete("action");

    setSearchParams(params, { replace: true });
  }, [projects]);

  const handleView = useCallback(async (project) => {
    try {
      const response = await projectService.getProject(project._id);

      console.log(response.data);

      setSelectedProject(response.data);

      setDrawerOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load project.");
    }
  }, []);

  const handleEdit = useCallback((project) => {
    setProjectModalMode("edit");
    setEditingProject(project);
    setModalOpen(true);
  }, []);

  const handleTaskClick = (task) => {
    navigate(
      `/tasks?project=${selectedProject._id}&task=${task._id}&source=project`,
    );
  };

  const handleManageMembers = () => {
    setProjectModalMode("members");
    setEditingProject(selectedProject);
    setModalOpen(true);
  };

  const updateProjectMembers = async (data) => {
    try {
      setModalLoading(true);

      const response = await projectService.updateProjectMembers(
        editingProject._id,
        data,
      );

      toast.success(response.message);

      await fetchProjects();

      const updated = await projectService.getProject(editingProject._id);

      setSelectedProject(updated.data);

      const returnTask = searchParams.get("returnTask");

      if (returnTask) {
        navigate(`/tasks?task=${returnTask}&action=reassign`);
        return;
      }

      setModalOpen(false);
      setDrawerOpen(true);
      setEditingProject(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update project members.",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleArchive = useCallback((project) => {
    setSelectedProject(project);

    setConfirmationConfig({
      title: project.isArchived ? "Restore Project?" : "Archive Project?",

      message: project.isArchived
        ? "This project will become active again."
        : "The project will be archived and hidden from active projects.",

      confirmText: project.isArchived ? "Restore" : "Archive",

      confirmType: project.isArchived ? "success" : "danger",
    });

    setConfirmationOpen(true);
  }, []);

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      const response = await projectService.toggleStatus(selectedProject._id);

      toast.success(response.message);

      await fetchProjects();

      setEditingProject(null);

      setConfirmationOpen(false);

      setDrawerOpen(false);

      setSelectedProject(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Project",
      },

      {
        key: "description",
        label: "Description",
      },

      {
        key: "status",
        label: "Status",

        render: (row) => (
          <StatusBadge status={row.isArchived ? "Archived" : "Active"} />
        ),
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
                title: row.isArchived ? "Restore" : "Archive",

                icon: row.isArchived ? <FiRotateCcw /> : <FiArchive />,

                variant: row.isArchived ? "success" : "danger",

                onClick: () => handleArchive(row),
              },
            ]}
          />
        ),
      },
    ],
    [handleView, handleEdit, handleArchive],
  );

  const createProject = async (data) => {
    try {
      setModalLoading(true);

      const response = await projectService.createProject(data);

      toast.success(response.message);

      setModalOpen(false);

      setEditingProject(null);

      await fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create project.");
    } finally {
      setModalLoading(false);
    }
  };

  const updateProject = async (data) => {
    try {
      setModalLoading(true);

      const response = await projectService.updateProject(
        editingProject._id,
        data,
      );

      toast.success(response.message);

      await fetchProjects();

      const updated = await projectService.getProject(editingProject._id);

      setSelectedProject(updated.data);

      const returnTask = searchParams.get("returnTask");

      if (projectModalMode === "members" && returnTask) {
        navigate(`/tasks?task=${returnTask}&action=reassign`);
        return;
      }

      setModalOpen(false);
      setDrawerOpen(true);
      setEditingProject(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update project.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="projects-page">
      <div className="employee-top">
        <AppSearchBar
          searchValue={search}
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search projects..."
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
              label: "Active",
              value: "false",
            },
            {
              label: "Archived",
              value: "true",
            },
          ]}
        />

        <button
          className="add-employee-btn"
          onClick={() => {
            setEditingProject(null);
            setModalOpen(true);
          }}
        >
          + Create Project
        </button>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No projects found."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <SideDrawer
        isOpen={drawerOpen}
        title="Project Details"
        onClose={() => {
          setDrawerOpen(false);
          setSelectedProject(null);
        }}
      >
        {selectedProject && (
          <>
            <div className="employee-profile">
              <div className="profile-avatar">📁</div>

              <h3>{selectedProject.name}</h3>

              <StatusBadge
                status={selectedProject.isArchived ? "Archived" : "Active"}
              />
            </div>

            <div className="project-stats">
              <div className="project-stat-card">
                <h3>{selectedProject.statistics?.totalTasks ?? 0}</h3>
                <span>Total Tasks</span>
              </div>

              <div className="project-stat-card">
                <h3>{selectedProject.statistics?.openTasks ?? 0}</h3>
                <span>Open Tasks</span>
              </div>

              <div className="project-stat-card">
                <h3>{selectedProject.statistics?.completedTasks ?? 0}</h3>
                <span>Closed Tasks</span>
              </div>

              <div className="project-stat-card">
                <h3>{selectedProject.statistics?.members ?? 0}</h3>
                <span>Members</span>
              </div>

              <div className="project-stat-card">
                <h3>{selectedProject.statistics?.progress ?? 0}%</h3>
                <span>Progress</span>
              </div>
            </div>

            <div className="project-progress">
              <div className="project-progress-header">
                <span>Project Progress</span>
                <strong>{selectedProject.statistics?.progress ?? 0}%</strong>
              </div>

              <div className="project-progress-track">
                <div
                  className="project-progress-fill"
                  style={{
                    width: `${selectedProject.statistics?.progress ?? 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="project-section">
              <div className="project-section-header">
                <h3>Team Members</h3>
                <span>
                  {selectedProject.members?.length || 0} Member
                  {selectedProject.members?.length !== 1 ? "s" : ""}
                </span>
              </div>

              {selectedProject.members?.length ? (
                <div className="project-members">
                  {selectedProject.members.map((member) => (
                    <div className="project-member-card" key={member._id}>
                      <div className="project-member-info">
                        <h4>{member.name}</h4>

                        <p>
                          {member.designation?.name || "-"} •{" "}
                          {member.department?.name || "-"}
                        </p>
                      </div>

                      <StatusBadge
                        status={member.isActive ? "Active" : "Inactive"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="project-empty-state">
                  No team members assigned.
                </div>
              )}
            </div>

            <div className="project-section" style={{ marginBottom: "10px" }}>
              <div className="project-section-header">
                <h3>Project Tasks</h3>
                <span>
                  {selectedProject.tasks?.length || 0} Task
                  {selectedProject.tasks?.length !== 1 ? "s" : ""}
                </span>
              </div>

              {selectedProject.tasks?.length ? (
                <div className="project-task-list">
                  {selectedProject.tasks.map((task) => (
                    <div
                      key={task._id}
                      className="project-task-card"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="project-task-top">
                        <h4>{task.title}</h4>

                        <StatusBadge status={task.status} />
                      </div>

                      <div className="project-task-meta">
                        <span>
                          <strong>Assigned To:</strong>{" "}
                          {task.assignedTo?.name || "-"}
                        </span>

                        <span>
                          <strong>Priority:</strong> {task.priority}
                        </span>

                        <span>
                          <strong>Due:</strong>{" "}
                          {task.dueDate ? formatDateTime(task.dueDate) : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="project-empty-state">
                  No tasks have been created for this project.
                </div>
              )}
            </div>

            <div className="employee-details">
              <div className="detail-item">
                <label>Description</label>
                <span>{selectedProject.description || "-"}</span>
              </div>

              <div className="detail-item">
                <label>Created On</label>
                <span>{formatDateTime(selectedProject.createdAt)}</span>
              </div>

              <div className="detail-item">
                <label>Updated On</label>
                <span>{formatDateTime(selectedProject.updatedAt)}</span>
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="drawer-btn edit-btn"
                onClick={() => {
                  setDrawerOpen(false);

                  setTimeout(() => {
                    setProjectModalMode("edit");
                    handleEdit(selectedProject);
                  }, 200);
                }}
              >
                Edit Project
              </button>

              <button
                className="drawer-btn add-members-btn"
                onClick={() => handleManageMembers(selectedProject)}
              >
                Add Employees
              </button>

              <button
                className="drawer-btn create-task-btn"
                onClick={() => {
                  setDrawerOpen(false);

                  navigate(
                    `/tasks?action=create&project=${selectedProject._id}&source=project`,
                  );
                }}
              >
                Create Task
              </button>

              <button
                className={`drawer-btn ${
                  selectedProject.isArchived ? "success-btn" : "danger-btn"
                }`}
                onClick={() => handleArchive(selectedProject)}
              >
                {selectedProject.isArchived
                  ? "Restore Project"
                  : "Archive Project"}
              </button>
            </div>
          </>
        )}
      </SideDrawer>

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

      <ProjectModal
        mode={projectModalMode}
        isOpen={modalOpen}
        project={editingProject}
        loading={modalLoading}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={
          !editingProject
            ? createProject
            : projectModalMode === "members"
              ? updateProjectMembers
              : updateProject
        }
      />
    </div>
  );
}

export default Projects;
