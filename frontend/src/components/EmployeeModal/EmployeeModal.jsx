import { useEffect, useState } from "react";
import FormModal from "../FormModal/FormModal";

import "./EmployeeModal.css";

function EmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  employee = null,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    department: "",
    designation: "",
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        employeeId: employee.employeeId || "",
        department: employee.department || "",
        designation: employee.designation || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        employeeId: "",
        department: "",
        designation: "",
      });
    }
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit(formData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={employee ? "Edit Employee" : "Add Employee"}
      onClose={onClose}
      width="600px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Name</label>

            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Employee ID</label>

            <input
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>

            <input
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Designation</label>

            <input
              name="designation"
              value={formData.designation}
              onChange={handleChange}
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
              : employee
                ? "Update Employee"
                : "Create Employee"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default EmployeeModal;
