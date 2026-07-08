import { useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="logo">
        <div className="logo-icon">✓</div>

        <div>
          <h2>RKI</h2>
          <span>Task Manager</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="user-info">
          <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>

          <div>
            <h4>{user?.name}</h4>
            <p>{user?.email}</p>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
