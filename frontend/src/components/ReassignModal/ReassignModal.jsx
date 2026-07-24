import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

function ReassignModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  employees,
  projects,
  loading = false,
  onManageMembers,
}) {
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setAssignedTo("");
  }, [isOpen]);

  const project = task?.project
    ? projects.find((p) => p._id === task.project._id)
    : null;

  const availableEmployees = project
    ? employees.filter((employee) =>
        project.members.some((member) => {
          const memberId = typeof member === "string" ? member : member._id;

          return memberId === employee._id;
        }),
      )
    : employees;

  const reassignableEmployees = availableEmployees.filter(
    (employee) => employee._id !== task?.assignedTo?._id,
  );

  return (
    <FormModal
      isOpen={isOpen}
      title="Reassign Task"
      onClose={onClose}
      width="500px"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();

          onSubmit(assignedTo);
        }}
      >
        <div className="form-group">
          <label>Current Employee</label>

          <input value={task?.assignedTo?.name || ""} disabled />
        </div>

        <div className="form-group">
          <label>New Employee</label>

          {reassignableEmployees.length > 0 ? (
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
            >
              <option value="">Select Employee</option>

              {reassignableEmployees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="empty-state-message">
              <p>No other team members are available in this project.</p>

              <p>Add members to the project before reassigning this task.</p>

              <button
                type="button"
                className="secondary-btn"
                onClick={onManageMembers}
              >
                Manage Project Members
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="save-btn"
            disabled={loading || reassignableEmployees.length === 0}
          >
            {loading ? "Please Wait..." : "Reassign"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default ReassignModal;
