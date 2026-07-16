import { useEffect, useState } from "react";
import { FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

import { toast } from "react-toastify";

import profileService from "../../services/profileService";

import "./ChangePasswordModal.css";

function ChangePasswordModal({
  isOpen,
  onClose,
  mustChangePassword = false,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword.trim())
      return toast.error("Current password is required.");

    if (!newPassword.trim()) return toast.error("New password is required.");

    if (newPassword.length < 8)
      return toast.error("Password must contain at least 8 characters.");

    if (currentPassword === newPassword)
      return toast.error(
        "New password must be different from current password.",
      );

    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match.");

    try {
      setLoading(true);

      const response = await profileService.changePassword({
        currentPassword,
        newPassword,
      });

      toast.success(response.message);

      const user = JSON.parse(localStorage.getItem("user"));

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          mustChangePassword: false,
        }),
      );

      await onSuccess?.();

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="password-overlay"
      onClick={() => {
        if (!mustChangePassword) onClose();
      }}
    >
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="password-header">
          <div className="password-icon">
            <FiLock />
          </div>

          <h2>Change Password</h2>

          <p>Keep your account secure by updating your password regularly.</p>
        </div>

        {mustChangePassword && (
          <div className="password-warning">
            <FiShield />

            <div>
              <strong>Temporary Password</strong>

              <span>
                You must change your temporary password before continuing.
              </span>
            </div>
          </div>
        )}

        <form className="password-form" onSubmit={handleSubmit}>
          <div className="password-field">
            <label>Current Password</label>

            <div className="password-input">
              <input
                disabled={loading}
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                autoComplete="current-password"
              />

              <button
                disabled={loading}
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="password-field">
            <label>New Password</label>

            <div className="password-input">
              <input
                disabled={loading}
                type={showNew ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="password-field">
            <label>Confirm Password</label>

            <div className="password-input">
              <input
                onPaste={(e) => e.preventDefault()}
                disabled={loading}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="password-note">
            Password should contain at least 8 characters, including uppercase,
            lowercase and a number.
          </div>

          <div className="password-actions">
            {!mustChangePassword && (
              <button
                disabled={loading}
                type="button"
                className="cancel-password-btn"
                onClick={onClose}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="save-password-btn"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
