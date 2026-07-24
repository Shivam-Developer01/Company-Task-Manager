import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiUploadCloud,
  FiBell,
  FiUser,
  FiX,
  FiBriefcase,
  FiAward,
} from "react-icons/fi";

import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";

import "./Sidebar.css";

function Sidebar({ collapsed, mobileOpen, setMobileOpen }) {
  const user = JSON.parse(localStorage.getItem("user"));

  const isManager = user?.role === ROLES.MANAGER;

  const navClass = ({ isActive }) => (isActive ? "active" : "");

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "show-overlay" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={[
          "sidebar",
          collapsed && "collapsed",
          mobileOpen && "sidebar-open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sidebar-logo">
          <div>
            <h2>Ravikiran Infotech</h2>
            <span>Company Task Manager</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setMobileOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to={ROUTES.DASHBOARD}
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            <FiGrid />
            <span>Dashboard</span>
          </NavLink>

          {isManager && (
            <>
              <NavLink
                to={ROUTES.EMPLOYEES}
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <FiUsers />
                <span>Employees</span>
              </NavLink>

              <NavLink
                to={ROUTES.DEPARTMENTS}
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <FiBriefcase />
                <span>Departments</span>
              </NavLink>

              <NavLink
                to={ROUTES.DESIGNATIONS}
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <FiAward />
                <span>Designations</span>
              </NavLink>

              <NavLink
                to={ROUTES.PROJECTS}
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <FiFolder />
                <span>Projects</span>
              </NavLink>
            </>
          )}

          <NavLink
            to={ROUTES.TASKS}
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            <FiCheckSquare />
            <span>Tasks</span>
          </NavLink>

          <NavLink
            to={ROUTES.SUBMISSIONS}
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            <FiUploadCloud />
            <span>Submissions</span>
          </NavLink>

          <NavLink
            to={ROUTES.NOTIFICATIONS}
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            <FiBell />
            <span>Notifications</span>
          </NavLink>

          <NavLink
            to={ROUTES.PROFILE}
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            <FiUser />
            <span>Profile</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
