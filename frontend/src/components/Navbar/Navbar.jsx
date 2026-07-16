import "./Navbar.css";

import { useNavigate, useLocation } from "react-router-dom";

import { useNotification } from "../../context/NotificationContext";

import { FiBell, FiMenu } from "react-icons/fi";

import { PAGE_TITLES } from "../../constants/pageTitles";
import authService from "../../services/authService";

function Navbar({ setSidebarCollapsed, setMobileSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotification();

  const user = JSON.parse(localStorage.getItem("user"));

  const isEmployee = user?.role === "employee";

  const currentPage =
    PAGE_TITLES[location.pathname] ||
    PAGE_TITLES[isEmployee ? "/employee/dashboard" : "/dashboard"];

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.clear();
      navigate("/");
    }
  };

  const handleClick = (role) => {
    if (role === "employee") {
      navigate(`/${role}/notifications`);
    } else if (role === "manager") {
      navigate("/notifications");
    }
  };

  const handleMenuClick = () => {

    if (window.innerWidth <= 768) {

      setMobileSidebarOpen(true);
    } else {

      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-btn" onClick={handleMenuClick}>
          <FiMenu />
        </button>

        <div className="page-heading">
          <h2>{currentPage.title}</h2>
        </div>
      </div>

      <div className="navbar-right">
        <button
          className="notification-btn"
          onClick={() => handleClick(user.role)}
        >
          <FiBell />

          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="user-box">
          <div className="user-details">
            <h4>{user?.name}</h4>
            <span>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
