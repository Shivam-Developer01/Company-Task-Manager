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
import { ROLES } from "../../constants/roles";

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

  const handleView = useCallback(async (project) => {
    try {
      const response = await projectService.getProject(project._id);

      setSelectedProject(response.data);

      setDrawerOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load project.");
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    const action = searchParams.get("action");
    const projectId = searchParams.get("project");

    if (!projectId || projects.length === 0) {
      return;
    }

    const project = projects.find((p) => p._id === projectId);

    if (!project) return;

    if (action === "members") {
      setSelectedProject(project);
      setProjectModalMode("members");
      setEditingProject(project);
      setModalOpen(true);
    }

    if (action === "view") {
      handleView(project);
    }

    const params = new URLSearchParams(searchParams);

    params.delete("action");
    params.delete("project");

    setSearchParams(params, { replace: true });
  }, [projects, searchParams, setSearchParams, handleView]);

  const handleEdit = useCallback(async (project) => {
    setProjectModalMode("edit");
    try {
      const response = await projectService.getProject(project._id);
      setEditingProject(response.data);
    } catch {
      setEditingProject(project);
    }
    setModalOpen(true);
  }, []);

  const handleTaskClick = (task) => {
    navigate(
      `/tasks?project=${selectedProject._id}&task=${task._id}&source=project`,
    );
  };

  const handleMemberClick = (member) => {
    const memberId = member._id || member.id;
    if (memberId) {
      navigate(`/employees?user=${memberId}&source=project`);
    }
  };

  const handleManageMembers = () => {
    setProjectModalMode("members");
    setEditingProject(selectedProject);
    setModalOpen(true);
  };

  const updateProjectMembers = async (data) => {
    try {
      setModalLoading(true);

      // Preserve existing managers
      const managerIds =
        selectedProject?.members
          ?.filter(
            (member) =>
              typeof member === "object" &&
              member?.role?.toLowerCase() === ROLES.MANAGER,
          )
          .map((member) => member._id) || [];

      const response = await projectService.updateProjectMembers(
        editingProject._id,
        {
          members: [...managerIds, ...data.members],
        },
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

      let response;

      if (projectModalMode === "members") {
        response = await projectService.updateProjectMembers(
          editingProject._id,
          data,
        );
      } else {
        response = await projectService.updateProject(editingProject._id, {
          name: data.name,
          description: data.description,
        });

        await projectService.updateProjectMembers(editingProject._id, {
          members: data.members,
        });
      }

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
        headerColor="#10b981"
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No projects found."
        onRowClick={handleView}
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
                    <div
                      className="project-member-card clickable"
                      key={member._id}
                      onClick={() => handleMemberClick(member)}
                    >
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

            {selectedProject.phases?.length > 0 ? (
              <div className="project-section" style={{ marginBottom: "15px" }}>
                <div className="project-section-header">
                  <h3>Project Phases & Tasks</h3>
                  <span>
                    {selectedProject.phases.length} Phase
                    {selectedProject.phases.length !== 1 ? "s" : ""} •{" "}
                    {selectedProject.tasks?.length || 0} Task
                    {selectedProject.tasks?.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {selectedProject.phases.map((phase) => {
                  const phaseTasks = (selectedProject.tasks || []).filter(
                    (t) =>
                      (t.phase?._id || t.phase) === phase._id ||
                      t.phase?.name === phase.name,
                  );

                  return (
                    <div
                      key={phase._id}
                      style={{
                        marginBottom: "16px",
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justify: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            color: "#1e293b",
                            fontWeight: "700",
                          }}
                        >
                          📌 Phase: {phase.name}
                        </h4>
                        <span
                          style={{
                            fontSize: "12px",
                            background: "#e2e8f0",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            color: "#475569",
                            fontWeight: "600",
                          }}
                        >
                          {phaseTasks.length} Task
                          {phaseTasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {phaseTasks.length > 0 ? (
                        <div className="project-task-list">
                          {phaseTasks.map((task) => (
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
                                  {task.dueDate
                                    ? formatDateTime(task.dueDate)
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#94a3b8",
                            fontStyle: "italic",
                            padding: "4px 0",
                          }}
                        >
                          No tasks in this phase.
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Direct Tasks if any legacy unphased tasks exist */}
                {(() => {
                  const directTasks = (selectedProject.tasks || []).filter(
                    (t) => !t.phase,
                  );
                  if (directTasks.length === 0) return null;

                  return (
                    <div
                      style={{
                        marginBottom: "16px",
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justify: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            color: "#475569",
                            fontWeight: "700",
                          }}
                        >
                          📄 Direct Tasks (No Phase)
                        </h4>
                        <span
                          style={{
                            fontSize: "12px",
                            background: "#e2e8f0",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            color: "#475569",
                            fontWeight: "600",
                          }}
                        >
                          {directTasks.length} Task
                          {directTasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="project-task-list">
                        {directTasks.map((task) => (
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
                                {task.dueDate
                                  ? formatDateTime(task.dueDate)
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
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
            )}

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
