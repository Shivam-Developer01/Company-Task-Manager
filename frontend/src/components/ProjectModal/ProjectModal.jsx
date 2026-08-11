import "../FormModal/FormModal.css";
import "./ProjectModal.css";

import FormModal from "../FormModal/FormModal";
import SearchableMultiSelect from "../SearchableMultiSelect/SearchableMultiSelect";
import userService from "../../services/userService";
import projectService from "../../services/projectService";

import { useEffect, useState } from "react";

function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project = null,
  loading = false,
  mode = "edit",
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: [],
    phases: [],
  });

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const response = await userService.getUserOptions();

      setEmployees(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialize = async () => {
      setLoadingEmployees(true);

      try {
        const response = await userService.getUserOptions();
        const employeeOptions = response.data || [];

        setEmployees(employeeOptions);

        if (project) {
          let projectData = project;
          if ((!project.phases || project.phases.length === 0) && project._id) {
            try {
              const res = await projectService.getProject(project._id);
              if (res?.data?.phases) {
                projectData = res.data;
              }
            } catch (err) {
              console.error(err);
            }
          }

          const selectedMembers = employeeOptions.filter((employee) =>
            (projectData.members || []).some(
              (member) =>
                (typeof member === "string" ? member : member._id) ===
                employee._id,
            ),
          );

          setFormData({
            name: projectData.name || "",
            description: projectData.description || "",
            members: selectedMembers,
            phases: (projectData.phases || []).map((p) =>
              typeof p === "string" ? p : p.name,
            ),
          });
        } else {
          setFormData({
            name: "",
            description: "",
            members: [],
            phases: [],
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    initialize();
  }, [project, isOpen]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleMembersChange = (members) => {
    setFormData((prev) => ({
      ...prev,
      members,
    }));
  };

  const handleAddPhase = () => {
    setFormData((prev) => ({
      ...prev,
      phases: [...prev.phases, ""],
    }));
  };

  const handlePhaseChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.phases];
      updated[index] = value;
      return { ...prev, phases: updated };
    });
  };

  const handleRemovePhase = (index) => {
    setFormData((prev) => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      members: formData.members.map((member) => member._id),
      phases: formData.phases.filter((p) => typeof p === "string" && p.trim() !== ""),
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={
        !project
          ? "Create Project"
          : mode === "members"
            ? "Add Team Members"
            : "Edit Project"
      }
      onClose={onClose}
      width="650px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Name</label>

          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            readOnly={mode === "members"}
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <textarea
            rows={5}
            name="description"
            value={formData.description}
            onChange={handleChange}
            readOnly={mode === "members"}
          />
        </div>

        <div className="form-group">
          <SearchableMultiSelect
            label="Team Members"
            placeholder={
              loadingEmployees ? "Loading employees..." : "Search employees..."
            }
            options={employees}
            value={formData.members}
            onChange={handleMembersChange}
            getOptionLabel={(employee) => employee.name}
            getOptionValue={(employee) => employee._id}
            renderOption={(employee) => (
              <>
                <strong>{employee.name}</strong>

                <small>
                  {employee.employeeId} • {employee.designation?.name || "-"} •{" "}
                  {employee.department?.name || "-"}
                </small>
              </>
            )}
          />
        </div>

        {mode !== "members" && (
          <div className="form-group">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ margin: 0 }}>Project Phases (Optional)</label>
              <button
                type="button"
                className="add-item-btn"
                onClick={handleAddPhase}
                style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600" }}
              >
                + Add Phase
              </button>
            </div>
            {formData.phases.map((phase, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder={`Phase ${idx + 1} Name`}
                  value={phase}
                  onChange={(e) => handlePhaseChange(idx, e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhase(idx)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading
              ? "Please Wait..."
              : !project
                ? "Create"
                : mode === "members"
                  ? "Save Members"
                  : "Update"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default ProjectModal;
