import "../FormModal/FormModal.css";
import "./ProjectModal.css";

import FormModal from "../FormModal/FormModal";
import SearchableMultiSelect from "../SearchableMultiSelect/SearchableMultiSelect";
import employeeService from "../../services/employeeService";

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
  });

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const response = await employeeService.getEmployeeOptions();

      console.log("Employee Options:", response);

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
        const response = await employeeService.getEmployeeOptions();
        const employeeOptions = response.data || [];

        setEmployees(employeeOptions);

        if (project) {
          const selectedMembers = employeeOptions.filter((employee) =>
            (project.members || []).some(
              (member) =>
                (typeof member === "string" ? member : member._id) ===
                employee._id,
            ),
          );

          setFormData({
            name: project.name || "",
            description: project.description || "",
            members: selectedMembers,
          });
        } else {
          setFormData({
            name: "",
            description: "",
            members: [],
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      members: formData.members.map((member) => member._id),
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
