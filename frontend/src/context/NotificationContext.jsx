import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import notificationService from "../services/notificationService";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken")

      // Don't call API if user is not logged in
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await notificationService.getUnreadCount();

      setUnreadCount(response.unread);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);

      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        hasUnread: unreadCount > 0,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  return context;
}
