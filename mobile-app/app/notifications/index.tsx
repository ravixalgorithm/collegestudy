import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, Check } from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import { useNotifications } from "../../src/contexts/NotificationContext";
import {
  loadUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationIcon,
  getPriorityColor,
  formatRelativeTime,
  type Notification,
} from "../../src/lib/notifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const allNotifications = await loadUserNotifications(user.id, 50);
      // Only show unread notifications
      const unreadNotifications = allNotifications.filter((notification) => !notification.is_read);
      setNotifications(unreadNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    await refreshUnreadCount();
    setRefreshing(false);
  }

  async function markAsRead(notificationId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const success = await markNotificationAsRead(notificationId, user.id);

      if (success) {
        // Remove from local state since we only show unread
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const unreadIds = notifications.map((n) => n.id);
      const success = await markAllNotificationsAsRead(user.id, unreadIds);

      if (success) {
        setNotifications([]);
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Quick Action */}
      {notifications.length > 0 && (
        <View style={styles.quickAction}>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Check color="#3B82F6" size={20} />
            <Text style={styles.markAllText}>Mark all as read ({notifications.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyState}>
              <Bell color="#D1D5DB" size={80} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No unread notifications. Check back later for updates.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification, index) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  index === 0 && styles.firstCard,
                  index === notifications.length - 1 && styles.lastCard,
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationEmoji}>{getNotificationIcon(notification.type)}</Text>
                    <View style={styles.headerContent}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notificationTitle} numberOfLines={2}>
                          {notification.title}
                        </Text>
                        <View
                          style={[styles.priorityDot, { backgroundColor: getPriorityColor(notification.priority) }]}
                        />
                      </View>
                      <Text style={styles.notificationTime}>{formatRelativeTime(notification.created_at)}</Text>
                    </View>
                  </View>

                  <Text style={styles.notificationMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>

                  <View style={styles.actionHint}>
                    <Text style={styles.actionText}>Tap to mark as read</Text>
                  </View>
                </View>

                {/* Unread indicator bar */}
                <View style={[styles.unreadBar, { backgroundColor: getPriorityColor(notification.priority) }]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginRight: 8,
  },
  placeholder: {
    width: 40,
  },
  unreadBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  quickAction: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EBF8FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  markAllText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  notificationsList: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: "#FEFEFE",
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    position: "relative",
    overflow: "hidden",
  },
  firstCard: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastCard: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  cardContent: {
    padding: 20,
    paddingLeft: 24,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  notificationEmoji: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 24,
    marginRight: 12,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  notificationTime: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  notificationMessage: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 12,
  },
  actionHint: {
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});
