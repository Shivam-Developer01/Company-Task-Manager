import "./DeleteModal.css";

function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  task,
}) {
  if (!isOpen) return null;

  return (
    <div className="delete-overlay">

      <div className="delete-modal">

        <div className="delete-icon">
          🗑
        </div>

        <h2>Delete Task?</h2>

        <p>
          Are you sure you want to delete
          <strong> "{task?.title}" </strong>?

          <br /><br />

          This action cannot be undone.
        </p>

        <div className="delete-actions">

          <button
            className="cancel-delete"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="confirm-delete"
            onClick={onConfirm}
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  );
}

export default DeleteModal;