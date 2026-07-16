import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

function ReviewSubmissionModal({ isOpen, type, loading, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFeedback("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (type === "reject" && !feedback.trim()) {
      setError("Feedback is required when rejecting a submission.");
      return;
    }

    onSubmit(feedback.trim());
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={type === "approve" ? "Approve Submission" : "Reject Submission"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Feedback
            {type === "reject" && <span style={{ color: "#dc2626" }}> *</span>}
          </label>

          <textarea
            rows={5}
            placeholder={
              type === "approve"
                ? "Optional feedback..."
                : "Reason for rejection..."
            }
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);

              if (error) setError("");
            }}
          />

          {error && <span className="error-text">{error}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className={type === "approve" ? "save-btn" : "danger-btn"}
          >
            {loading
              ? "Please wait..."
              : type === "approve"
                ? "Approve"
                : "Reject"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default ReviewSubmissionModal;
