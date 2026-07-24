import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

import departmentService from "../../services/departmentService";

import "./DesignationModal.css";

function DesignationModal({
  isOpen,
  onClose,
  onSubmit,
  designation = null,
  loading = false,
}) {
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    department: "",
    name: "",
    code: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    loadDepartments();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (designation) {
      setFormData({
        department: designation.department?._id || designation.department || "",
        name: designation.name || "",
        code: designation.code || "",
      });
    } else {
      setFormData({
        department: "",
        name: "",
        code: "",
      });
    }
  }, [designation, isOpen]);

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getDepartments({
        limit: 100,
      });

      setDepartments(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase().replace(/\s/g, "") : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <FormModal
      isOpen={isOpen}
      title={designation ? "Edit Designation" : "Add Designation"}
      onClose={onClose}
      width="550px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Department</label>

            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">Select Department</option>

              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Designation Name</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Software Engineer"
              required
            />
          </div>

          <div className="form-group">
            <label>Designation Code</label>

            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="SDE"
              maxLength={10}
              required
            />
          </div>
        </div>

        <div className="employee-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading
              ? "Please Wait..."
              : designation
                ? "Update Designation"
                : "Create Designation"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default DesignationModal;
