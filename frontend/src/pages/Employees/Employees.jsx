import "./Employees.css";

import { useEffect, useMemo, useState, useCallback } from "react";

import useDebounce from "../../hooks/useDebounce";

import { FiEye, FiEdit2, FiKey, FiUserX, FiUserCheck } from "react-icons/fi";

import ActionButtons from "../../components/ActionButtons/ActionButtons";

import employeeService from "../../services/employeeService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import formatDateTime from "../../utils/formatDateTime"

import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import EmployeeModal from "../../components/EmployeeModal/EmployeeModal";
import CredentialModal from "../../components/CredentialModal/CredentialModal";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";


import { toast } from "react-toastify";

function Employees() {
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

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (status !== "") {
        params.isActive = status;
      }

      const response = await employeeService.getEmployees(params);

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
    fetchEmployees();
  }, [page, debouncedSearch, status]);

  const handleView = useCallback((employee) => {
    setSelectedEmployee(employee);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  }, []);

  const handleResetPassword = useCallback((employee) => {
    setSelectedEmployee(employee);

    setConfirmationConfig({
      title: "Reset Password?",
      message:
        "A new temporary password will be generated. The employee must change it after logging in.",
      confirmText: "Reset Password",
      confirmType: "warning",
      action: "reset",
    });

    setConfirmationOpen(true);
  }, []);

  const handleStatus = useCallback((employee) => {
    setSelectedEmployee(employee);

    setConfirmationConfig({
      title: employee.isActive ? "Deactivate Employee?" : "Activate Employee?",

      message: employee.isActive
        ? "This employee will no longer be able to login until activated again."
        : "This employee will be able to login again.",

      confirmText: employee.isActive ? "Deactivate" : "Activate",

      confirmType: employee.isActive ? "danger" : "success",
    });

    setConfirmationOpen(true);
  }, []);

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      if (confirmationConfig.action === "reset") {
        const response = await employeeService.resetPassword(
          selectedEmployee._id,
        );

        toast.success(response.message);

        setCredentials(response.data);

        setCredentialModalOpen(true);
      } else {
        const response = await employeeService.toggleStatus(
          selectedEmployee._id,
        );

        toast.success(response.message);

        await fetchEmployees();
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
        label: "Employee ID",
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
      },

      {
        key: "designation",
        label: "Designation",
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
      const response = await employeeService.createEmployee(employee);

      toast.success(response.message);

      setCredentials(response.data);

      setCredentialModalOpen(true);

      setModalOpen(false);

      await fetchEmployees();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create employee.",
      );
    }
  };

  const updateEmployee = async (employeeData) => {
    try {
      setModalLoading(true);

      const response = await employeeService.updateEmployee(
        editingEmployee._id,
        employeeData,
      );

      toast.success(response.message);

      setModalOpen(false);

      setEditingEmployee(null);

      await fetchEmployees();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update employee.",
      );
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
          placeholder="Search employees..."
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

        <button
          className="add-employee-btn"
          onClick={() => {
            setEditingEmployee(null);
            setModalOpen(true);
          }}
        >
          + Add Employee
        </button>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        emptyMessage="No employees found."
      />

      <EmployeeModal
        isOpen={modalOpen}
        employee={editingEmployee}
        loading={modalLoading}
        onClose={() => {
          setModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={editingEmployee ? updateEmployee : createEmployee}
      />

      <SideDrawer
        isOpen={drawerOpen}
        title="Employee Details"
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

              <p>{selectedEmployee.designation}</p>

              <StatusBadge
                status={selectedEmployee.isActive ? "Active" : "Inactive"}
              />
            </div>

            <div className="employee-details">
              <div className="detail-item">
                <label>Employee ID</label>
                <span>{selectedEmployee.employeeId}</span>
              </div>

              <div className="detail-item">
                <label>Email</label>
                <span>{selectedEmployee.email}</span>
              </div>

              <div className="detail-item">
                <label>Department</label>
                <span>{selectedEmployee.department}</span>
              </div>

              <div className="detail-item">
                <label>Designation</label>
                <span>{selectedEmployee.designation}</span>
              </div>

              <div className="detail-item">
                <label>Created On</label>
                <span>
                  {formatDateTime(selectedEmployee.createdAt)}
                </span>
              </div>

              <div className="detail-item">
                <label>Last Updated</label>
                <span>
                  {formatDateTime(selectedEmployee.updatedAt)}
                </span>
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
                Edit Employee
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
                  ? "Deactivate Employee"
                  : "Activate Employee"}
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
