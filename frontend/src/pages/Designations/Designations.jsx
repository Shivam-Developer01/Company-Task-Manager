import "./Designations.css";

import { useState, useEffect, useMemo, useCallback } from "react";

import { FiEye, FiEdit2, FiToggleLeft, FiToggleRight } from "react-icons/fi";

import { toast } from "react-toastify";

import useDebounce from "../../hooks/useDebounce";

import designationService from "../../services/designationService";
import departmentService from "../../services/departmentService";

import AdvancedSearchBar from "../../components/AdvancedSearchBar/AdvancedSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ActionButtons from "../../components/ActionButtons/ActionButtons";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import DesignationModal from "../../components/DesignationModal/DesignationModal";

import formatDateTime from "../../utils/formatDateTime";

function Designations() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [status, setStatus] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState({});

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getDepartments({
        limit: 100,
      });

      setDepartments(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (status !== "") {
        params.isActive = status;
      }

      if (departmentFilter) {
        params.department = departmentFilter;
      }

      const response = await designationService.getDesignations(params);

      setDesignations(response.data);

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch designations.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [page, debouncedSearch, status, departmentFilter]);

  const handleView = useCallback((designation) => {
    setSelectedDesignation(designation);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((designation) => {
    setEditingDesignation(designation);
    setModalOpen(true);
  }, []);

  const handleStatus = useCallback((designation) => {
    setSelectedDesignation(designation);

    setConfirmationConfig({
      title: designation.isActive
        ? "Deactivate Designation?"
        : "Activate Designation?",

      message: designation.isActive
        ? "This designation will become inactive."
        : "This designation will become active.",

      confirmText: designation.isActive ? "Deactivate" : "Activate",

      confirmType: designation.isActive ? "danger" : "success",
    });

    setConfirmationOpen(true);
  }, []);

  const confirmAction = async () => {
    try {
      setActionLoading(true);

      const response = await designationService.toggleStatus(
        selectedDesignation._id,
      );

      toast.success(response.message);

      setConfirmationOpen(false);
      setDrawerOpen(false);
      setSelectedDesignation(null);

      await fetchDesignations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const createDesignation = async (designationData) => {
    try {
      setModalLoading(true);

      const response =
        await designationService.createDesignation(designationData);

      toast.success(response.message);

      setModalOpen(false);

      await fetchDesignations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create designation.",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const updateDesignation = async (designationData) => {
    try {
      setModalLoading(true);

      const response = await designationService.updateDesignation(
        editingDesignation._id,
        designationData,
      );

      toast.success(response.message);

      setModalOpen(false);

      setEditingDesignation(null);

      await fetchDesignations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update designation.",
      );
    } finally {
      setModalLoading(false);
    }
  };
  const columns = useMemo(
    () => [
      {
        key: "department",
        label: "Department",
        render: (row) => row.department?.name || "-",
      },

      {
        key: "name",
        label: "Designation",
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

                icon: row.isActive ? <FiToggleLeft /> : <FiToggleRight />,

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
    <div className="designations-page">
      <AdvancedSearchBar
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        placeholder="Search designations..."
        filters={[
          {
            key: "department",
            value: departmentFilter,
            onChange: (value) => {
              setPage(1);
              setDepartmentFilter(value);
            },
            placeholder: "All Departments",
            options: departments.map((department) => ({
              label: department.name,
              value: department._id,
            })),
          },
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setPage(1);
              setStatus(value);
            },
            options: [
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
            ],
          },
        ]}
      >
        <button
          className="primary-btn"
          onClick={() => {
            setEditingDesignation(null);
            setModalOpen(true);
          }}
        >
          + Add Designation
        </button>
      </AdvancedSearchBar>

      <DataTable
        columns={columns}
        data={designations}
        loading={loading}
        emptyMessage="No designations found."
      />

      <DesignationModal
        isOpen={modalOpen}
        designation={editingDesignation}
        loading={modalLoading}
        onClose={() => {
          setModalOpen(false);
          setEditingDesignation(null);
        }}
        onSubmit={editingDesignation ? updateDesignation : createDesignation}
      />

      <SideDrawer
        isOpen={drawerOpen}
        title="Designation Details"
        onClose={() => {
          setDrawerOpen(false);
          setSelectedDesignation(null);
        }}
      >
        {selectedDesignation && (
          <>
            <div className="designation-profile">
              <div className="profile-avatar">
                {selectedDesignation.name?.charAt(0).toUpperCase()}
              </div>

              <h3>{selectedDesignation.name}</h3>

              <p>{selectedDesignation.department?.name}</p>

              <StatusBadge
                status={selectedDesignation.isActive ? "Active" : "Inactive"}
              />
            </div>

            <div className="designation-details">
              <div className="detail-item">
                <label>Department</label>

                <span>{selectedDesignation.department?.name}</span>
              </div>

              <div className="detail-item">
                <label>Designation</label>

                <span>{selectedDesignation.name}</span>
              </div>

              <div className="detail-item">
                <label>Code</label>

                <span>{selectedDesignation.code}</span>
              </div>

              <div className="detail-item">
                <label>Created On</label>

                <span>{formatDateTime(selectedDesignation.createdAt)}</span>
              </div>

              <div className="detail-item">
                <label>Updated On</label>

                <span>{formatDateTime(selectedDesignation.updatedAt)}</span>
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="drawer-btn edit-btn"
                onClick={() => {
                  setDrawerOpen(false);

                  setTimeout(() => {
                    handleEdit(selectedDesignation);
                  }, 200);
                }}
              >
                Edit Designation
              </button>

              <button
                className={`drawer-btn ${
                  selectedDesignation.isActive ? "danger-btn" : "success-btn"
                }`}
                onClick={() => handleStatus(selectedDesignation)}
              >
                {selectedDesignation.isActive
                  ? "Deactivate Designation"
                  : "Activate Designation"}
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

export default Designations;
