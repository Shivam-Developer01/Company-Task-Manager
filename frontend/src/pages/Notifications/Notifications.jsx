import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

import { toast } from "react-toastify";

import useDebounce from "../../hooks/useDebounce";
import { useNotification } from "../../context/NotificationContext";

import notificationService from "../../services/notificationService";

import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import NotificationCard from "../../components/NotificationCard/NotificationCard";
import Pagination from "../../components/Pagination/Pagination";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import formatDate from "../../utils/formatDate";

import "./Notifications.css";

function Notifications() {
  const navigate = useNavigate();
  const fetchTimer = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true); // Initial load
  const [fetching, setFetching] = useState(false); // Search/Filter/Page
  const [showFetching, setShowFetching] = useState(false); // Show spinner after delay

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const [readFilter, setReadFilter] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const { unreadCount, refreshUnreadCount } = useNotification();

  const fetchNotifications = async (initialLoad = false) => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        fetchTimer.current = setTimeout(() => setShowFetching(true), 200);
      }

      const params = {
        page,
        search: debouncedSearch,
      };

      if (readFilter !== "") {
        params.read = readFilter;
      }

      const response = await notificationService.getNotifications(params);

      setNotifications(response.data);

      await refreshUnreadCount();

      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch notifications.",
      );
    } finally {
      if (fetchTimer.current) {
        clearTimeout(fetchTimer.current);
      }

      setShowFetching(false);

      if (initialLoad) {
        setLoading(false);
      } else {
        setFetching(false);
      }
    }
  };

  useEffect(() => {
    fetchNotifications(page === 1 && notifications.length === 0);
  }, [page, debouncedSearch, readFilter]);

  useEffect(() => {
    return () => clearTimeout(fetchTimer.current);
  }, []);

  const groupedNotifications = useMemo(() => {
    const groups = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach((notification) => {
      const created = new Date(notification.createdAt);
      created.setHours(0, 0, 0, 0);

      let group;

      if (created.getTime() === today.getTime()) {
        group = "Today";
      } else if (created.getTime() === yesterday.getTime()) {
        group = "Yesterday";
      } else {
        group = formatDate(created);
      }

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(notification);
    });

    return groups;
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification._id);

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item,
          ),
        );

        await refreshUnreadCount();
      }

      const role = JSON.parse(localStorage.getItem("user"))?.role;

      if (notification.submission) {
        if (role === "employee") {
          navigate(
            `/${role}/submissions?submission=${notification.submission._id}`,
          );
        } else {
          navigate(`/submissions?submission=${notification.submission._id}`);
        }
        return;
      }

      if (notification.task) {
        if (role === "employee") {
          navigate(`/${role}/tasks?task=${notification.task._id}`);
        } else {
          navigate(`/tasks?task=${notification.task._id}`);
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to open notification.",
      );
    }
  };

  const handlePageChange = (newPage) => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setPage(newPage);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();

      toast.success("All notifications marked as read.");

      await refreshUnreadCount();

      await fetchNotifications();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to mark notifications.",
      );
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h4>
            {unreadCount === 0
              ? "You're all caught up"
              : `${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`}
          </h4>
        </div>

        <button
          className="mark-all-btn"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          Mark All Read
        </button>
      </div>

      <AppSearchBar
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        placeholder="Search notifications..."
        filterValue={readFilter}
        onFilterChange={(value) => {
          setPage(1);
          setReadFilter(value);
        }}
        filters={[
          {
            label: "All",
            value: "",
          },
          {
            label: "Unread",
            value: "false",
          },
          {
            label: "Read",
            value: "true",
          },
        ]}
      />
      {showFetching && (
        <div className="updating-indicator">
          <span className="mini-spinner"></span>
          Updating notifications...
        </div>
      )}

      {loading ? (
        <Loader />
      ) : notifications.length === 0 ? (
        <EmptyState
          title={
            search || readFilter
              ? "No notifications found"
              : "You're all caught up!"
          }
          message="No notifications found."
        />
      ) : (
        Object.entries(groupedNotifications).map(
          ([title, items]) =>
            items.length > 0 && (
              <div key={title} className="notification-group">
                <h3>{title}</h3>

                {items.map((notification) => (
                  <NotificationCard
                    key={notification._id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            ),
        )
      )}

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default Notifications;
