import { useEffect, useState } from "react";
import FormModal from "../FormModal/FormModal";

import departmentService from "../../services/departmentService";
import designationService from "../../services/designationService";

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

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

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

    loadDepartments();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        employeeId: employee.employeeId || "",
        department: employee.department?._id || employee.department || "",
        designation: employee.designation?._id || employee.designation || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        employeeId: "",
        department: "",
        designation: "",
      });

      setDesignations([]);
    }
  }, [employee, isOpen]);

  useEffect(() => {
    if (!formData.department) {
      setDesignations([]);
      return;
    }

    const loadDesignations = async () => {
      try {
        const response = await designationService.getDesignations({
          department: formData.department,
          limit: 100,
        });

        setDesignations(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    loadDesignations();
  }, [formData.department]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        department: value,
        designation: "",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
              disabled={!!employee}
            />
          </div>

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
            <label>Designation</label>

            <select
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              required
              disabled={!formData.department}
            >
              <option value="">Select Designation</option>

              {designations.map((designation) => (
                <option key={designation._id} value={designation._id}>
                  {designation.name}
                </option>
              ))}
            </select>
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
