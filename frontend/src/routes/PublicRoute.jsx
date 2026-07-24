import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("user"));

  if (token && user) {
    if (user.role === "manager") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;
