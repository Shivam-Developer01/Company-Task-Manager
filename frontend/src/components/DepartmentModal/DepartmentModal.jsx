import { useEffect, useState } from "react";
import FormModal from "../FormModal/FormModal";

import "./DepartmentModal.css";

function DepartmentModal({
  isOpen,
  onClose,
  onSubmit,
  department = null,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (department) {
      setFormData({
        name: department.name || "",
        code: department.code || "",
      });
    } else {
      setFormData({
        name: "",
        code: "",
      });
    }
  }, [department, isOpen]);

  if (!isOpen) return null;

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

  return (
    <FormModal
      isOpen={isOpen}
      title={department ? "Edit Department" : "Add Department"}
      onClose={onClose}
      width="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Department Name</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter department name"
              required
            />
          </div>

          <div className="form-group">
            <label>Department Code</label>

            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="ENG"
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
              : department
                ? "Update Department"
                : "Create Department"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default DepartmentModal;
