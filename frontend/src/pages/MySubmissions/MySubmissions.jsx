import { useEffect, useMemo, useState, useCallback } from "react";

import { useSearchParams } from "react-router-dom";

import { FiEye } from "react-icons/fi";

import { toast } from "react-toastify";

import useDebounce from "../../hooks/useDebounce";

import submissionService from "../../services/submissionService";
import formatDate from "../../utils/formatDate";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import DataTable from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ActionButtons from "../../components/ActionButtons/ActionButtons";
import SubmissionDrawerEmp from "../../components/SubmissionDrawer/SubmissionDrawerEmp";

import "../Submissions/Submissions.css";

function MySubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search);

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const handleView = useCallback(async (submission) => {
    try {
      const response = await submissionService.getSubmission(submission._id);

      setSelectedSubmission(response.data);

      setDrawerOpen(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load submission.",
      );
    }
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        search: debouncedSearch,
      };

      if (status) {
        params.status = status;
      }

      const response = await submissionService.getMySubmissions(params);

      setSubmissions(response.data);

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch submissions.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    const submissionId = searchParams.get("submission");

    if (!submissionId || submissions.length === 0) return;

    const submission = submissions.find((s) => s._id === submissionId);

    if (submission) {
      handleView(submission);

      searchParams.delete("submission");
      setSearchParams(searchParams, {
        replace: true,
      });
    }
  }, [submissions]);

  const columns = useMemo(
    () => [
      {
        key: "submission",
        label: "Submission",

        render: (row) => (
          <div>
            <strong>#{row.submissionNumber}</strong>

            <small
              style={{
                display: "block",
                color: "#6b7280",
              }}
            >
              {row.task?.title}
            </small>
          </div>
        ),
      },

      {
        key: "priority",
        label: "Priority",

        render: (row) =>
          row.task ? (
            <span
              className={`priority-badge ${row.task.priority
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {row.task.priority}
            </span>
          ) : (
            "-"
          ),
      },

      {
        key: "status",
        label: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },

      {
        key: "submittedAt",
        label: "Submitted On",
        render: (row) => formatDate(row.createdAt),
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
            ]}
          />
        ),
      },
    ],
    [handleView],
  );

  return (
    <div className="submissions-page">
      <div className="submission-header">
        <AppSearchBar
          searchValue={search}
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search submissions..."
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
              label: "Pending",
              value: "Pending Review",
            },
            {
              label: "Approved",
              value: "Approved",
            },
            {
              label: "Rejected",
              value: "Rejected",
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={submissions}
        loading={loading}
        emptyMessage="No submissions found."
      />

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
      <SubmissionDrawerEmp
        isOpen={drawerOpen}
        submission={selectedSubmission}
        loading={false}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSubmission(null);
        }}
      />
    </div>
  );
}

export default MySubmissions;
