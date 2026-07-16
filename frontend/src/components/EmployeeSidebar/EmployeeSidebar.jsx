import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiCheckSquare,
  FiUploadCloud,
  FiBell,
  FiUser,
  FiX,
} from "react-icons/fi";

import { ROUTES } from "../../constants/routes";

import "../Sidebar/Sidebar.css";

function EmployeeSidebar({ collapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Mobile Overlay */}

      <div
        className={`sidebar-overlay ${mobileOpen ? "show-overlay" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`sidebar ${
          collapsed ? "collapsed" : ""
        } ${mobileOpen ? "sidebar-open" : ""}`}
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
          <NavLink to={ROUTES.EMPLOYEE_DASHBOARD}>
            <FiGrid />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to={ROUTES.EMPLOYEE_TASKS}>
            <FiCheckSquare />
            <span>My Tasks</span>
          </NavLink>

          <NavLink to={ROUTES.EMPLOYEE_SUBMISSIONS}>
            <FiUploadCloud />
            <span>My Submissions</span>
          </NavLink>

          <NavLink to={ROUTES.EMPLOYEE_NOTIFICATIONS}>
            <FiBell />
            <span>Notifications</span>
          </NavLink>

          <NavLink to={ROUTES.EMPLOYEE_PROFILE}>
            <FiUser />
            <span>Profile</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

export default EmployeeSidebar;
