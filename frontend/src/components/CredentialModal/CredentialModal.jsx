import { useState } from "react";

import "./CredentialModal.css";

import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiCopy } from "react-icons/fi";

function CredentialModal({ isOpen, onClose, credentials }) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !credentials) return null;

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const copyAll = () => {
    copy(
      `Employee Name : ${credentials.name}
Email : ${credentials.email}
Employee ID : ${credentials.employeeId}
Temporary Password : ${credentials.temporaryPassword}`,
      "Credentials copied successfully.",
    );
  };

  return (
    <div className="credential-overlay">
      <div className="credential-modal">
        <div className="credential-header">
          <h2>Employee Created Successfully 🎉</h2>
        </div>

        <div className="credential-body">
          <div className="credential-row">
            <span>Name</span>
            <strong>{credentials.name}</strong>
          </div>

          <div className="credential-row">
            <span>Email</span>
            <strong>{credentials.email}</strong>
          </div>

          <div className="credential-row">
            <span>Employee ID</span>
            <strong>{credentials.employeeId}</strong>
          </div>

          <div className="credential-row">
            <span>Temporary Password</span>

            <div className="password-box">
              <strong>
                {showPassword
                  ? credentials.temporaryPassword
                  : "•".repeat(credentials.temporaryPassword.length)}
              </strong>

              <button
                className="icon-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>

              <button
                className="icon-btn"
                onClick={() =>
                  copy(credentials.temporaryPassword, "Password copied.")
                }
              >
                <FiCopy />
              </button>
            </div>
          </div>
        </div>

        <div className="credential-footer">
          <button className="copy-btn" onClick={copyAll}>
            Copy Credentials
          </button>

          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CredentialModal;
