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
} from "react-icons/fi";

import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";

import "./Sidebar.css";

function Sidebar({
  collapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const user = JSON.parse(localStorage.getItem("user"));

  const isManager = user?.role === ROLES.MANAGER;

  return (
    <>
      {/* Mobile Overlay */}

      <div
        className={`sidebar-overlay ${
          mobileOpen ? "show-overlay" : ""
        }`}
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
          <NavLink to={ROUTES.DASHBOARD}>
            <FiGrid />
            <span>Dashboard</span>
          </NavLink>

          {isManager && (
            <>
              <NavLink to={ROUTES.EMPLOYEES}>
                <FiUsers />
                <span>Employees</span>
              </NavLink>

              <NavLink to={ROUTES.PROJECTS}>
                <FiFolder />
                <span>Projects</span>
              </NavLink>
            </>
          )}

          <NavLink to={ROUTES.TASKS}>
            <FiCheckSquare />
            <span>Tasks</span>
          </NavLink>

          <NavLink to={ROUTES.SUBMISSIONS}>
            <FiUploadCloud />
            <span>Submissions</span>
          </NavLink>

          <NavLink to={ROUTES.NOTIFICATIONS}>
            <FiBell />
            <span>Notifications</span>
          </NavLink>

          <NavLink to={ROUTES.PROFILE}>
            <FiUser />
            <span>Profile</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;