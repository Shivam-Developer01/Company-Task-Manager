import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

function ReassignModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  employees,
  loading = false,
}) {
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setAssignedTo("");
  }, [isOpen]);

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

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            <option value="">Select Employee</option>

            {employees
              .filter((emp) => emp._id !== task?.assignedTo?._id)
              .map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button className="save-btn" disabled={loading}>
            {loading ? "Please Wait..." : "Reassign"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default ReassignModal;
