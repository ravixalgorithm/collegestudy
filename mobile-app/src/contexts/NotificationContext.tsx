import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getUnreadCount, loadUserNotifications, markNotificationAsRead, type Notification } from "../lib/notifications";

interface PopupNotification extends Notification {
  showAsPopup: boolean;
}

interface NotificationContextType {
  unreadCount: number;
  popupNotifications: PopupNotification[];
  showNotificationPopup: (notification: Notification) => void;
  dismissPopup: (notificationId: string) => void;
  markAsReadAndDismiss: (notificationId: string) => void;
  refreshUnreadCount: () => Promise<void>;
  checkForNewNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
      if (event === "SIGNED_OUT") {
        setUnreadCount(0);
        setPopupNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const count = await getUnreadCount(currentUserId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing unread count:", error);
    }
  }, [currentUserId]);

  // Check for new notifications
  const checkForNewNotifications = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const notifications = await loadUserNotifications(currentUserId, 10);
      const newNotifications = notifications.filter(
        (notification) => !notification.is_read && new Date(notification.created_at) > lastCheckedAt,
      );

      // Show new notifications as popups
      newNotifications.forEach((notification) => {
        showNotificationPopup(notification);
      });

      setLastCheckedAt(new Date());
      await refreshUnreadCount();
    } catch (error) {
      console.error("Error checking for new notifications:", error);
    }
  }, [currentUserId, lastCheckedAt, refreshUnreadCount]);

  // Show notification as popup
  const showNotificationPopup = useCallback((notification: Notification) => {
    const popupNotification: PopupNotification = {
      ...notification,
      showAsPopup: true,
    };

    setPopupNotifications((prev) => {
      // Avoid duplicates
      const exists = prev.some((p) => p.id === notification.id);
      if (exists) return prev;

      // Limit to 3 popups at once
      const updated = [popupNotification, ...prev].slice(0, 3);
      return updated;
    });

    // Auto-dismiss after 8 seconds for non-urgent notifications
    if (notification.priority !== "urgent") {
      setTimeout(() => {
        dismissPopup(notification.id);
      }, 8000);
    }
  }, []);

  // Dismiss popup without marking as read
  const dismissPopup = useCallback((notificationId: string) => {
    setPopupNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
  }, []);

  // Mark as read and dismiss
  const markAsReadAndDismiss = useCallback(
    async (notificationId: string) => {
      if (!currentUserId) return;

      try {
        const success = await markNotificationAsRead(notificationId, currentUserId);
        if (success) {
          dismissPopup(notificationId);
          await refreshUnreadCount();
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [currentUserId, dismissPopup, refreshUnreadCount],
  );

  // Initial load and periodic checks
  useEffect(() => {
    if (currentUserId) {
      refreshUnreadCount();
      checkForNewNotifications();

      // Check for new notifications every 30 seconds
      const interval = setInterval(checkForNewNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, refreshUnreadCount, checkForNewNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!currentUserId) return;

    const subscription = supabase
      .channel("user_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          console.log("New notification received:", payload);
          await checkForNewNotifications();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, checkForNewNotifications]);

  const value: NotificationContextType = {
    unreadCount,
    popupNotifications,
    showNotificationPopup,
    dismissPopup,
    markAsReadAndDismiss,
    refreshUnreadCount,
    checkForNewNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
