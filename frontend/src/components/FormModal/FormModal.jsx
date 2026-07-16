import "./FormModal.css";

import { FiX } from "react-icons/fi";

function FormModal({ isOpen, title, children, onClose, width = "600px" }) {
  if (!isOpen) return null;

  return (
    <div className="form-modal-overlay" onClick={onClose}>
      <div
        className="form-modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="form-modal-header">
          <h2>{title}</h2>

          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="form-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default FormModal;
