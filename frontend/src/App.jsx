import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login/Login";
import PublicRoute from "./routes/PublicRoute";

import Dashboard from "./pages/Dashboard/Dashboard";
import Employees from "./pages/Employees/Employees";
import Projects from "./pages/Projects/Projects";
import Tasks from "./pages/Tasks/Tasks";
import Submissions from "./pages/Submissions/Submissions";
import Notifications from "./pages/Notifications/Notifications";
import Profile from "./pages/Profile/Profile";

import EmployeeDashboard from "./pages/EmployeeDashboard/EmployeeDashboard";
import MyTasks from "./pages/MyTasks/MyTasks";
import MySubmissions from "./pages/MySubmissions/MySubmissions";

import ProtectedRoute from "./routes/ProtectedRoute";

import MainLayout from "./layouts/MainLayout/MainLayout";
import EmployeeLayout from "./layouts/EmployeeLayout/EmployeeLayout";
import Departments from "./pages/Departments/Departments";
import Designations from "./pages/Designations/Designations";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ================= MANAGER ================= */}

      <Route
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/employees" element={<Employees />} />

        <Route path="/departments" element={<Departments />} />

        <Route path="/designations" element={<Designations />} />

        <Route path="/projects" element={<Projects />} />

        <Route path="/tasks" element={<Tasks />} />

        <Route path="/submissions" element={<Submissions />} />

        <Route path="/notifications" element={<Notifications />} />

        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* ================= EMPLOYEE ================= */}

      <Route
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />

        <Route path="/employee/tasks" element={<MyTasks />} />

        <Route path="/employee/submissions" element={<MySubmissions />} />

        <Route path="/employee/notifications" element={<Notifications />} />

        <Route path="/employee/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
