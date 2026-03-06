import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useCreateAccount } from "./CreateAccountContext";
import {
  fetchNotificationsByEmail,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "../services/notificationService";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isLoggedIn, userEmail } = useCreateAccount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn || !userEmail?.trim()) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchNotificationsByEmail(userEmail);
      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, userEmail]);

  useEffect(() => {
    loadNotifications();
    // Poll every 60s when logged in to pick up new notifications
    if (!isLoggedIn || !userEmail?.trim()) return;
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications, isLoggedIn, userEmail]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (id) => {
      try {
        await markNotificationRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!userEmail?.trim()) return;
    try {
      await markAllNotificationsRead(userEmail);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  }, [userEmail]);

  const removeNotification = useCallback(
    async (id) => {
      try {
        await deleteNotification(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } catch (err) {
        console.error("Failed to delete notification:", err);
      }
    },
    []
  );

  const clearAll = useCallback(async () => {
    if (!userEmail?.trim()) return;
    try {
      await clearAllNotifications(userEmail);
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }, [userEmail]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
