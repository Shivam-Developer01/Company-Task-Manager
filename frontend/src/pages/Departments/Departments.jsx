import "./Departments.css";

import { useState, useEffect, useCallback, useMemo } from "react";

import useDebounce from "../../hooks/useDebounce";

import { FiEye, FiEdit2, FiFolderMinus, FiFolderPlus } from "react-icons/fi";

import { toast } from "react-toastify";

import departmentService from "../../services/departmentService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ActionButtons from "../../components/ActionButtons/ActionButtons";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import DepartmentModal from "../../components/DepartmentModal/DepartmentModal";

import formatDateTime from "../../utils/formatDateTime";

function Departments() {
  const [departments, setDepartments] = useState([]);

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
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [confirmationConfig, setConfirmationConfig] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (status !== "") {
        params.isActive = status;
      }

      const response = await departmentService.getDepartments(params);

      setDepartments(response.data);

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch departments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [page, debouncedSearch, status]);

  const handleView = useCallback((department) => {
    setSelectedDepartment(department);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((department) => {
    setEditingDepartment(department);
    setModalOpen(true);
  }, []);

  const handleStatus = useCallback((department) => {
    setSelectedDepartment(department);

    setConfirmationConfig({
      title: department.isActive
        ? "Deactivate Department?"
        : "Activate Department?",

      message: department.isActive
        ? "This department will become inactive."
        : "This department will become active.",

      confirmText: department.isActive ? "Deactivate" : "Activate",

      confirmType: department.isActive ? "danger" : "success",
    });

    setConfirmationOpen(true);
  }, []);

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      const response = await departmentService.toggleStatus(
        selectedDepartment._id,
      );

      toast.success(response.message);

      setConfirmationOpen(false);

      setDrawerOpen(false);

      setSelectedDepartment(null);

      await fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const createDepartment = async (departmentData) => {
    try {
      setModalLoading(true);

      const response = await departmentService.createDepartment(departmentData);

      toast.success(response.message);

      setModalOpen(false);

      await fetchDepartments();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create department.",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const updateDepartment = async (departmentData) => {
    try {
      setModalLoading(true);

      const response = await departmentService.updateDepartment(
        editingDepartment._id,
        departmentData,
      );

      toast.success(response.message);

      setModalOpen(false);

      setEditingDepartment(null);

      await fetchDepartments();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update department.",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Department",
      },
      {
        key: "code",
        label: "Code",
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge status={row.isActive ? "Active" : "Inactive"} />
        ),
      },
      {
        key: "actions",
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
                title: row.isActive ? "Deactivate" : "Activate",
                icon: row.isActive ? <FiFolderMinus /> : <FiFolderPlus />,
                variant: row.isActive ? "danger" : "success",
                onClick: () => handleStatus(row),
              },
            ]}
          />
        ),
      },
    ],
    [handleView, handleEdit, handleStatus],
  );

  return (
    <div className="departments-page">
      <div className="department-top">
        <AppSearchBar
          searchValue={search}
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search departments..."
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
          className="primary-btn"
          style={{ marginBottom: "15px" }}
          onClick={() => {
            setEditingDepartment(null);
            setModalOpen(true);
          }}
        >
          + Add Department
        </button>
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        emptyMessage="No departments found."
      />

      <DepartmentModal
        isOpen={modalOpen}
        department={editingDepartment}
        loading={modalLoading}
        onClose={() => {
          setModalOpen(false);
          setEditingDepartment(null);
        }}
        onSubmit={editingDepartment ? updateDepartment : createDepartment}
      />

      <SideDrawer
        isOpen={drawerOpen}
        title="Department Details"
        onClose={() => {
          setDrawerOpen(false);
          setSelectedDepartment(null);
        }}
      >
        {selectedDepartment && (
          <>
            <div className="department-profile">
              <div className="profile-avatar">
                {selectedDepartment.name?.charAt(0).toUpperCase()}
              </div>

              <h3>{selectedDepartment.name}</h3>

              <StatusBadge
                status={selectedDepartment.isActive ? "Active" : "Inactive"}
              />
            </div>

            <div className="department-details">
              <div className="detail-item">
                <label>Name</label>
                <span>{selectedDepartment.name}</span>
              </div>

              <div className="detail-item">
                <label>Code</label>
                <span>{selectedDepartment.code}</span>
              </div>

              <div className="detail-item">
                <label>Created On</label>
                <span>{formatDateTime(selectedDepartment.createdAt)}</span>
              </div>

              <div className="detail-item">
                <label>Last Updated</label>
                <span>{formatDateTime(selectedDepartment.updatedAt)}</span>
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="drawer-btn edit-btn"
                onClick={() => {
                  setDrawerOpen(false);

                  setTimeout(() => {
                    handleEdit(selectedDepartment);
                  }, 200);
                }}
              >
                Edit Department
              </button>

              <button
                className={`drawer-btn ${
                  selectedDepartment.isActive ? "danger-btn" : "success-btn"
                }`}
                onClick={() => handleStatus(selectedDepartment)}
              >
                {selectedDepartment.isActive
                  ? "Deactivate Department"
                  : "Activate Department"}
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
    </div>
  );
}

export default Departments;
