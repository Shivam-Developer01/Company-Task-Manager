import "./ConfirmationModal.css";

import { FiAlertTriangle } from "react-icons/fi";

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmType = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirmation-overlay" onClick={onClose}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-icon">
          <FiAlertTriangle />
        </div>

        <h2>{title}</h2>

        <p>{message}</p>

        <div className="confirmation-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            className={`confirm-button ${confirmType}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please Wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
