import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

function RejectTaskModal({ isOpen, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      return;
    }

    onSubmit(reason.trim());
  };

  return (
    <FormModal isOpen={isOpen} title="Reject Task" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Reason</label>

          <textarea
            rows={5}
            placeholder="Enter reason for rejecting this task..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button
            type="submit"
            className="danger-btn"
            disabled={loading || !reason.trim()}
          >
            {loading ? "Rejecting..." : "Reject Task"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default RejectTaskModal;
