import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  let user = null;

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser && rawUser !== "undefined") {
      user = JSON.parse(rawUser);
    }
  } catch (e) {
    user = null;
  }

  if (token && user) {
    if (user.role === "manager" || user.role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;
