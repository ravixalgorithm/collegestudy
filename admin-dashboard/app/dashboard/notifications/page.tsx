"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Send,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Target,
  Loader2,
  MessageSquare,
  Megaphone,
  BookOpen,
  Briefcase,
  CalendarDays,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_all_users: boolean;
  target_branches: string[];
  target_semesters: number[];
  target_years: number[];
  scheduled_for: string;
  expires_at: string | null;
  is_sent: boolean;
  send_count: number;
  created_at: string;
  users?: {
    name: string;
  };
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "custom",
    priority: "normal",
    target_all_users: true,
    target_branches: [] as string[],
    target_semesters: [] as number[],
    target_years: [] as number[],
    scheduled_for: new Date().toISOString().slice(0, 16),
    expires_at: "",
  });

  const [stats, setStats] = useState({
    totalNotifications: 0,
    sentNotifications: 0,
    pendingNotifications: 0,
    totalRecipients: 0,
  });

  const notificationTypes = [
    { value: "custom", label: "Custom Message", icon: MessageSquare, color: "blue" },
    { value: "announcement", label: "Announcement", icon: Megaphone, color: "purple" },
    { value: "exam_reminder", label: "Exam Reminder", icon: BookOpen, color: "red" },
    { value: "event", label: "Event", icon: CalendarDays, color: "green" },
    { value: "opportunity", label: "Opportunity", icon: Briefcase, color: "amber" },
    { value: "timetable_update", label: "Timetable Update", icon: Clock, color: "indigo" },
  ];

  const priorityLevels = [
    { value: "low", label: "Low", color: "gray" },
    { value: "normal", label: "Normal", color: "blue" },
    { value: "high", label: "High", color: "amber" },
    { value: "urgent", label: "Urgent", color: "red" },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadBranches();
      loadStats();
    }
  }, [user]);

  async function checkAuth() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        window.location.href = "/login";
        return;
      }

      if (!session?.user) {
        console.error("No session found");
        window.location.href = "/login";
        return;
      }

      // Verify user is admin
      const { data: userCheck, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (userError || !userCheck?.is_admin) {
        console.error("Admin verification failed");
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      setUser(userCheck);
    } catch (error) {
      console.error("Auth check failed:", error);
      window.location.href = "/login";
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          users (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const { data, error } = await supabase.from("branches").select("id, code, name").order("code");

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  }

  async function loadStats() {
    try {
      const { data: notifData } = await supabase.from("notifications").select("is_sent, send_count");

      if (notifData) {
        const total = notifData.length;
        const sent = notifData.filter((n) => n.is_sent).length;
        const pending = total - sent;
        const totalRecipients = notifData.reduce((sum, n) => sum + (n.send_count || 0), 0);

        setStats({
          totalNotifications: total,
          sentNotifications: sent,
          pendingNotifications: pending,
          totalRecipients,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function handleCreateNotification(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      if (!user) {
        throw new Error("Not authenticated");
      }

      console.log("=== NOTIFICATION CREATION DEBUG ===");
      console.log("Form data:", formData);
      console.log("User:", user);

      // Create notification directly
      const { data: notification, error: notificationError } = await supabase
        .from("notifications")
        .insert({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          priority: formData.priority,
          expires_at: formData.expires_at || null,
          is_published: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (notificationError) throw notificationError;
      console.log("✅ Notification created:", notification);

      // Get target users
      let targetUsers: string[] = [];

      if (formData.target_all_users) {
        console.log("📤 Targeting all users");
        const { data: users, error: usersError } = await supabase.from("users").select("id");
        console.log("Users query result:", { users, error: usersError });
        targetUsers = users?.map((u) => u.id) || [];
        console.log("Target users (all):", targetUsers);
      } else {
        console.log("📤 Targeting specific users");
        // Build query for specific targeting
        let query = supabase.from("users").select("id");

        if (formData.target_branches.length > 0) {
          console.log("🎯 Filtering by branches:", formData.target_branches);
          query = query.in("branch_id", formData.target_branches);
        }
        if (formData.target_semesters.length > 0) {
          console.log("🎯 Filtering by semesters:", formData.target_semesters);
          query = query.in("semester", formData.target_semesters);
        }
        if (formData.target_years.length > 0) {
          console.log("🎯 Filtering by years:", formData.target_years);
          query = query.in("year", formData.target_years);
        }

        const { data: users, error: usersError } = await query;
        console.log("Filtered users query result:", { users, error: usersError });
        targetUsers = users?.map((u) => u.id) || [];
        console.log("Target users (filtered):", targetUsers);
      }

      // Create user notifications
      if (targetUsers.length > 0) {
        console.log("📬 Creating user notifications for", targetUsers.length, "users");
        const userNotifications = targetUsers.map((userId) => ({
          user_id: userId,
          notification_id: notification.id,
          is_read: false,
        }));

        console.log("User notifications to insert:", userNotifications);
        const { error: userNotificationError, data: insertedNotifications } = await supabase
          .from("user_notifications")
          .insert(userNotifications)
          .select();

        if (userNotificationError) {
          console.error("❌ User notification error:", userNotificationError);
          throw userNotificationError;
        }
        console.log("✅ User notifications created:", insertedNotifications);
      } else {
        console.warn("⚠️ No target users found!");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        message: "",
        type: "custom",
        priority: "normal",
        target_all_users: true,
        target_branches: [],
        target_semesters: [],
        target_years: [],
        scheduled_for: new Date().toISOString().slice(0, 16),
        expires_at: "",
      });
      setShowCreateModal(false);

      // Reload data
      loadNotifications();
      loadStats();

      console.log("=== NOTIFICATION CREATION COMPLETE ===");
      alert(`Notification sent successfully to ${targetUsers.length} users!`);
    } catch (error) {
      console.error("Error creating notification:", error);
      const errorMessage = (error as Error).message;

      // If authentication error, redirect to login
      if (
        errorMessage.includes("Not authenticated") ||
        errorMessage.includes("Please log in") ||
        errorMessage.includes("Authentication error")
      ) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      alert("Error creating notification: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotification(id: string) {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);

      if (error) throw error;
      loadNotifications();
      loadStats();
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Error deleting notification");
    }
  }

  function viewNotificationDetails(notification: Notification) {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required. Redirecting...</p>
        </div>
      </div>
    );
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesPriority = filterPriority === "all" || notification.priority === filterPriority;

    return matchesSearch && matchesType && matchesPriority;
  });

  function getTypeIcon(type: string) {
    const typeConfig = notificationTypes.find((t) => t.value === type);
    return typeConfig ? typeConfig.icon : MessageSquare;
  }

  function getTypeColor(type: string) {
    const typeConfig = notificationTypes.find((t) => t.value === type);
    return typeConfig ? typeConfig.color : "blue";
  }

  function getPriorityColor(priority: string) {
    const priorityConfig = priorityLevels.find((p) => p.value === priority);
    return priorityConfig ? priorityConfig.color : "blue";
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-1">Send and manage notifications for students</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Notification</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalNotifications}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Sent</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.sentNotifications}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingNotifications}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Recipients</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalRecipients}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Types</option>
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Priorities</option>
                {priorityLevels.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notification</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading notifications...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No notifications found
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.type);
                  const typeColor = getTypeColor(notification.type);
                  const priorityColor = getPriorityColor(notification.priority);

                  return (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${typeColor}-100`}>
                            <TypeIcon className={`w-5 h-5 text-${typeColor}-600`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm line-clamp-1">{notification.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              By {notification.users?.name || "System"} •{" "}
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-700`}
                        >
                          {notificationTypes.find((t) => t.value === notification.type)?.label || notification.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-700`}
                        >
                          {notification.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {notification.target_all_users ? "All Users" : "Targeted"}
                          </span>
                          {notification.send_count > 0 && (
                            <span className="text-xs text-gray-500">({notification.send_count})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notification.is_sent ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {notification.is_sent ? "Sent" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewNotificationDetails(notification)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateNotification}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create Notification</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter notification title"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter notification message"
                  />
                </div>

                {/* Type and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {notificationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {priorityLevels.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Targeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.target_all_users}
                        onChange={(e) => setFormData({ ...formData, target_all_users: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Send to all users</span>
                    </label>

                    {!formData.target_all_users && (
                      <div className="ml-6 space-y-3">
                        {/* Branches */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Branches</label>
                          <div className="grid grid-cols-3 gap-2">
                            {branches.map((branch) => (
                              <label key={branch.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.target_branches.includes(branch.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        target_branches: [...formData.target_branches, branch.id],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        target_branches: formData.target_branches.filter((id) => id !== branch.id),
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{branch.code}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Semesters */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Semesters</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                              <label key={sem} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.target_semesters.includes(sem)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        target_semesters: [...formData.target_semesters, sem],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        target_semesters: formData.target_semesters.filter((s) => s !== sem),
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">Sem {sem}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Years */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Years</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((year) => (
                              <label key={year} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.target_years.includes(year)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, target_years: [...formData.target_years, year] });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        target_years: formData.target_years.filter((y) => y !== year),
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">Year {year}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduling */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Schedule For</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_for}
                      onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Notification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Notification Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedNotification.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span>By: {selectedNotification.users?.name || "System"}</span>
                  <span>•</span>
                  <span>{new Date(selectedNotification.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span>{selectedNotification.send_count} recipients</span>
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium text-gray-900">
                    {notificationTypes.find((t) => t.value === selectedNotification.type)?.label ||
                      selectedNotification.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className="font-medium text-gray-900">{selectedNotification.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Target</p>
                  <p className="font-medium text-gray-900">
                    {selectedNotification.target_all_users ? "All Users" : "Targeted Groups"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium text-gray-900">{selectedNotification.is_sent ? "Sent" : "Pending"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedNotification.is_sent ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedNotification.is_sent ? "Delivered" : "Pending"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium bg-${getPriorityColor(selectedNotification.priority)}-100 text-${getPriorityColor(selectedNotification.priority)}-700`}
                >
                  {selectedNotification.priority} priority
                </span>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => deleteNotification(selectedNotification.id)}
                className="px-4 py-2.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
