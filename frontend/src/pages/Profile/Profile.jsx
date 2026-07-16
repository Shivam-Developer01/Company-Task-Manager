import { useEffect, useState } from "react";

import { FiKey, FiUser, FiBriefcase } from "react-icons/fi";

import { toast } from "react-toastify";

import profileService from "../../services/profileService";

import Loader from "../../components/Loader/Loader";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ChangePasswordModal from "../../components/ChangePasswordModal/ChangePasswordModal";

import "./Profile.css";

function Profile() {
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await profileService.getProfile();

      setProfile(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile?.mustChangePassword) {
      setPasswordModalOpen(true);
    }
  }, [profile]);

  if (loading) return <Loader />;

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      {/* Header */}

      <div className="profile-header-card">
        <div className="profile-avatar">{initials}</div>

        <h2>{profile.name}</h2>

        <span className="role-chip">
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        </span>
      </div>

      {/* Personal Information */}

      <div className="profile-card">
        <div className="profile-card-title">
          <FiUser />

          <h3>Personal Information</h3>
        </div>

        <div className="profile-grid">
          <div className="profile-item">
            <label>Name</label>

            <span>{profile.name}</span>
          </div>

          <div className="profile-item">
            <label>Email</label>

            <span>{profile.email}</span>
          </div>
        </div>
      </div>

      {/* Employment Information */}

      <div className="profile-card">
        <div className="profile-card-title">
          <FiBriefcase />

          <h3>Employment Information</h3>
        </div>

        <div className="profile-grid">
          <div className="profile-item">
            <label>Employee ID</label>

            <span>{profile.employeeId}</span>
          </div>

          <div className="profile-item">
            <label>Department</label>

            <span>{profile.department || "-"}</span>
          </div>

          <div className="profile-item">
            <label>Designation</label>

            <span>{profile.designation || "-"}</span>
          </div>

          <div className="profile-item">
            <label>Status</label>

            <StatusBadge status={profile.isActive ? "Active" : "Inactive"} />
          </div>

          <div className="profile-item">
            <label>Joined On</label>

            {new Date(profile.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Security */}

      <div className="profile-card">
        <div className="profile-card-title">
          <FiKey />

          <h3>Security</h3>
        </div>

        {profile.mustChangePassword && (
          <div className="password-alert">
            <strong>Temporary Password</strong>

            <p>
              Your account is currently using a temporary password. Please
              change it immediately.
            </p>
          </div>
        )}

        <div className="security-row">
          <div>
            <label>Password</label>

            <p>••••••••••••</p>
          </div>

          <button
            className="change-password-btn"
            onClick={() => setPasswordModalOpen(true)}
          >
            Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        mustChangePassword={profile.mustChangePassword}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={fetchProfile}
      />
    </div>
  );
}

export default Profile;
