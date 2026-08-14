import "./Employees.css";

import { useEffect, useMemo, useState, useCallback } from "react";

import useDebounce from "../../hooks/useDebounce";

import { FiEye, FiEdit2, FiKey, FiUserX, FiUserCheck } from "react-icons/fi";

import ActionButtons from "../../components/ActionButtons/ActionButtons";

import userService from "../../services/userService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import formatDateTime from "../../utils/formatDateTime";

import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import EmployeeModal from "../../components/EmployeeModal/EmployeeModal";
import CredentialModal from "../../components/CredentialModal/CredentialModal";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";

import { toast } from "react-toastify";

import { useSearchParams } from "react-router-dom";

function Employees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const [modalOpen, setModalOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);

  const [credentialModalOpen, setCredentialModalOpen] = useState(false);

  const [credentials, setCredentials] = useState(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [confirmationConfig, setConfirmationConfig] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [roleFilter, setRoleFilter] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const currentUserRole = currentUser?.role;

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (currentUserRole === "admin" && roleFilter) {
        params.role = roleFilter;
      }

      if (status !== "") {
        params.isActive = status;
      }

      const response = await userService.getUsers(params);

      setEmployees(response.data);

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, status, roleFilter]);

  const handleView = useCallback((employee) => {
    setSelectedEmployee(employee);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    const userId = searchParams.get("user") || searchParams.get("employee");
    if (!userId) return;

    const userObj = employees.find(
      (e) => (e._id || e.id) === userId,
    );

    if (userObj) {
      handleView(userObj);
      const params = new URLSearchParams(searchParams);
      params.delete("user");
      params.delete("employee");
      params.delete("source");
      setSearchParams(params, { replace: true });
    } else if (!loading) {
      userService
        .getUser(userId)
        .then((res) => {
          if (res.data) {
            handleView(res.data);
          }
        })
        .catch((err) => {
          console.error("Unable to load user:", err);
          toast.error("User not found or access denied.");
        })
        .finally(() => {
          const params = new URLSearchParams(searchParams);
          params.delete("user");
          params.delete("employee");
          params.delete("source");
          setSearchParams(params, { replace: true });
        });
    }
  }, [employees, loading, searchParams, setSearchParams, handleView]);

  const handleEdit = useCallback(
    (employee) => {
      if (employee.role === "admin" && employee._id !== currentUser._id) {
        toast.error("You can't edit another Admin.");
        return;
      }

      setEditingEmployee(employee);
      setModalOpen(true);
    },
    [currentUser],
  );

  const handleResetPassword = useCallback((employee) => {
    if (employee.role === "admin") {
      toast.error("Can't reset Admin password");
      return;
    }

    setSelectedEmployee(employee);

    setConfirmationConfig({
      title: "Reset Password?",
      message:
        "A new temporary password will be generated. The user must change it after logging in.",
      confirmText: "Reset Password",
      confirmType: "warning",
      action: "reset",
    });

    setConfirmationOpen(true);
  }, []);

  const handleStatus = useCallback(async (employee) => {
    if (employee.role === "admin") {
      toast.error(
        employee.isActive ? "Can't deactivate Admin" : "Can't activate Admin",
      );
      return;
    }

    setSelectedEmployee(employee);

    if (employee.isActive) {
      let count = 0;
      try {
        const countRes = await userService.getActiveTasksCount(employee._id);
        count = countRes.count || 0;
      } catch {
        count = 0;
      }

      if (count > 0) {
        setConfirmationConfig({
          title: "Deactivate User?",
          message: `This employee has ${count} active assigned task${count === 1 ? "" : "s"}. Deactivating this employee will withdraw ${count === 1 ? "this task" : "these tasks"}. Do you want to continue?`,
          confirmText: "Continue & Deactivate",
          confirmType: "danger",
          action: "toggleStatus",
        });
      } else {
        setConfirmationConfig({
          title: "Deactivate User?",
          message:
            "This user will no longer be able to login until activated again.",
          confirmText: "Deactivate",
          confirmType: "danger",
          action: "toggleStatus",
        });
      }
    } else {
      setConfirmationConfig({
        title: "Activate User?",
        message: "This user will be able to login again.",
        confirmText: "Activate",
        confirmType: "success",
        action: "toggleStatus",
      });
    }

    setConfirmationOpen(true);
  }, []);

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      if (confirmationConfig.action === "reset") {
        const response = await userService.resetPassword(selectedEmployee._id);

        toast.success(response.message);

        setCredentials(response.data);

        setCredentialModalOpen(true);
      } else {
        const response = await userService.toggleStatus(selectedEmployee._id);

        toast.success(response.message);

        await fetchUsers();
      }

      setConfirmationOpen(false);

      setDrawerOpen(false);

      setSelectedEmployee(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "employeeId",
        label: "User ID",
      },

      {
        key: "name",
        label: "Name",
      },

      {
        key: "email",
        label: "Email",
      },

      {
        key: "department",
        label: "Department",
        render: (row) => row.department?.name || "-",
      },
      {
        key: "designation",
        label: "Designation",
        render: (row) => row.designation?.name || "-",
      },

      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge status={row.isActive ? "Active" : "Inactive"} />
        ),
      },

      {
        key: "role",
        label: "Role",
        render: (row) => row.role.charAt(0).toUpperCase() + row.role.slice(1),
      },

      {
        key: "action",
        label: "Actions",

        render: (row) => (
          <ActionButtons
            actions={[
              {
                title: "View",
                icon: <FiEye />,
                onClick: () => handleView(row),
              },

              {
                title: "Edit",
                icon: <FiEdit2 />,
                variant: "edit",
                onClick: () => handleEdit(row),
              },

              {
                title: "Reset Password",
                icon: <FiKey />,
                variant: "warning",
                onClick: () => handleResetPassword(row),
              },

              {
                title: row.isActive ? "Deactivate" : "Activate",

                icon: row.isActive ? <FiUserX /> : <FiUserCheck />,

                variant: row.isActive ? "danger" : "success",

                onClick: () => handleStatus(row),
              },
            ]}
          />
        ),
      },
    ],
    [selectedEmployee],
  );

  const createEmployee = async (employee) => {
    try {
      const response = await userService.createUser(employee);

      toast.success(response.message);

      setCredentials(response.data);

      setCredentialModalOpen(true);

      setModalOpen(false);

      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create employee.",
      );
    }
  };

  const updateEmployee = async (employeeData) => {
    // Prevent editing Admins from the frontend
    // Prevent editing other Admins, but allow editing your own profile
    if (
      editingEmployee?.role === "admin" &&
      editingEmployee?._id !== currentUser._id
    ) {
      toast.error("You can't edit another Admin.");
      return;
    }

    try {
      setModalLoading(true);

      const response = await userService.updateUser(
        editingEmployee._id,
        employeeData,
      );

      toast.success(response.message);

      setModalOpen(false);
      setEditingEmployee(null);

      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="employees-page">
      <div className="employee-top">
        <AppSearchBar
          searchValue={search}
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search users..."
          filterValue={status}
          onFilterChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          filters={[
            {
              label: "All",
              value: "",
            },
            {
              label: "Active",
              value: "true",
            },
            {
              label: "Inactive",
              value: "false",
            },
          ]}
        />
        {currentUserRole === "admin" && (
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
            className="employee-filter"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        )}

        <button
          className="add-employee-btn"
          onClick={() => {
            setEditingEmployee(null);
            setModalOpen(true);
          }}
        >
          + Add User
        </button>
      </div>

      <DataTable
        headerColor="#2563eb"
        columns={columns}
        data={employees}
        loading={loading}
        emptyMessage="No employees found."
        onRowClick={handleView}
      />

      <EmployeeModal
        isOpen={modalOpen}
        employee={editingEmployee}
        loading={modalLoading}
        currentUserRole={currentUserRole}
        onClose={() => {
          setModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={editingEmployee ? updateEmployee : createEmployee}
      />

      <SideDrawer
        isOpen={drawerOpen}
        title="User Details"
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEmployee(null);
        }}
      >
        {selectedEmployee && (
          <>
            <div className="employee-profile">
              <div className="profile-avatar">
                {selectedEmployee.name?.charAt(0).toUpperCase()}
              </div>

              <h3>{selectedEmployee.name}</h3>

              <p>{selectedEmployee.designation?.name}</p>

              <StatusBadge
                status={selectedEmployee.isActive ? "Active" : "Inactive"}
              />
            </div>

            <div className="employee-details">
              <div className="detail-item">
                <label>User ID</label>
                <span>{selectedEmployee.employeeId}</span>
              </div>

              <div className="detail-item">
                <label>Email</label>
                <span>{selectedEmployee.email}</span>
              </div>

              <div className="detail-item">
                <label>Department</label>
                <span>{selectedEmployee.department?.name}</span>
              </div>

              <div className="detail-item">
                <label>Designation</label>
                <span>{selectedEmployee.designation?.name}</span>
              </div>

              <div className="detail-item">
                <label>Created On</label>
                <span>{formatDateTime(selectedEmployee.createdAt)}</span>
              </div>

              <div className="detail-item">
                <label>Last Updated</label>
                <span>{formatDateTime(selectedEmployee.updatedAt)}</span>
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="drawer-btn edit-btn"
                onClick={() => {
                  setDrawerOpen(false);

                  setTimeout(() => {
                    handleEdit(selectedEmployee);
                  }, 200);
                }}
              >
                Edit User
              </button>

              <button
                className="drawer-btn reset-btn"
                onClick={() => handleResetPassword(selectedEmployee)}
              >
                Reset Password
              </button>

              <button
                className={`drawer-btn ${
                  selectedEmployee.isActive ? "danger-btn" : "success-btn"
                }`}
                onClick={() => handleStatus(selectedEmployee)}
              >
                {selectedEmployee.isActive
                  ? "Deactivate User"
                  : "Activate User"}
              </button>
            </div>
          </>
        )}
      </SideDrawer>
      <ConfirmationModal
        isOpen={confirmationOpen}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmText={confirmationConfig.confirmText}
        confirmType={confirmationConfig.confirmType}
        loading={actionLoading}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={confirmAction}
      />
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />

      <CredentialModal
        isOpen={credentialModalOpen}
        credentials={credentials}
        onClose={() => {
          setCredentialModalOpen(false);
          setCredentials(null);
        }}
      />
    </div>
  );
}

export default Employees;
