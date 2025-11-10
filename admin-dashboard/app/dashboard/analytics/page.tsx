"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Download,
  BookmarkIcon,
  Activity,
  Eye,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock,
  Target,
  Star,
  ArrowUp,
  ArrowDown,
  Zap,
  Globe,
  Shield,
  Award,
  Bell,
  MessageSquare,
  Building,
  GraduationCap,
  Search,
  Filter,
} from "lucide-react";

interface OverallStats {
  totalUsers: number;
  totalNotes: number;
  totalEvents: number;
  totalOpportunities: number;
  totalDownloads: number;
  totalBookmarks: number;
  totalBranches: number;
  totalSubjects: number;
}

interface DownloadAnalytics {
  total_downloads: number;
  unique_users: number;
  unique_notes: number;
  downloads_today: number;
  downloads_this_week: number;
  downloads_this_month: number;
}

interface PopularNote {
  note_id: string;
  title: string;
  download_count: number;
  subject_name: string;
  subject_code: string;
}

interface BranchStats {
  id: string;
  name: string;
  code: string;
  user_count: number;
  notes_count: number;
  download_count: number;
}

interface UserActivityData {
  user_id: string;
  name: string;
  email: string;
  branch_name: string;
  semester: number;
  total_downloads: number;
  saved_opportunities: number;
  last_login: string;
  is_admin: boolean;
}

interface DailyActivity {
  date: string;
  downloads: number;
  new_users: number;
  notes_uploaded: number;
}

interface SubjectAnalytics {
  id: string;
  name: string;
  code: string;
  branch_name: string;
  semester: number;
  notes_count: number;
  total_downloads: number;
  avg_downloads_per_note: number;
}

export default function ComprehensiveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "30d" | "90d" | "1y" | "lifetime">("30d");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Core Statistics
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalUsers: 0,
    totalNotes: 0,
    totalEvents: 0,
    totalOpportunities: 0,
    totalDownloads: 0,
    totalBookmarks: 0,
    totalBranches: 0,
    totalSubjects: 0,
  });

  const [downloadAnalytics, setDownloadAnalytics] = useState<DownloadAnalytics>({
    total_downloads: 0,
    unique_users: 0,
    unique_notes: 0,
    downloads_today: 0,
    downloads_this_week: 0,
    downloads_this_month: 0,
  });

  // Detailed Analytics
  const [popularNotes, setPopularNotes] = useState<PopularNote[]>([]);
  const [branchStats, setBranchStats] = useState<BranchStats[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserActivityData[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedTimeRange, selectedBranch]);

  async function loadAllAnalytics() {
    try {
      setLoading(true);
      await Promise.all([
        loadOverallStats(),
        loadDownloadAnalytics(),
        loadPopularNotes(),
        loadBranchStats(),
        loadActiveUsers(),
        loadDailyActivity(),
        loadSubjectAnalytics(),
        loadBranches(),
      ]);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverallStats() {
    try {
      const [usersRes, notesRes, eventsRes, opportunitiesRes, branchesRes, subjectsRes, bookmarksRes] =
        await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("notes").select("id, download_count", { count: "exact" }),
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("opportunities").select("id", { count: "exact", head: true }),
          supabase.from("branches").select("id", { count: "exact", head: true }),
          supabase.from("subjects").select("id", { count: "exact", head: true }),
          supabase.from("opportunity_bookmarks").select("id", { count: "exact", head: true }),
        ]);

      const totalDownloads = notesRes.data?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

      setOverallStats({
        totalUsers: usersRes.count || 0,
        totalNotes: notesRes.count || 0,
        totalEvents: eventsRes.count || 0,
        totalOpportunities: opportunitiesRes.count || 0,
        totalDownloads,
        totalBookmarks: bookmarksRes.count || 0,
        totalBranches: branchesRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading overall stats:", error);
    }
  }

  async function loadDownloadAnalytics() {
    try {
      const { data, error } = await supabase.rpc("get_download_analytics");

      if (error || !data || data.length === 0) {
        // Fallback calculation
        const { data: downloadsData } = await supabase.from("note_downloads").select("*");
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        setDownloadAnalytics({
          total_downloads: downloadsData?.length || 0,
          unique_users: new Set(downloadsData?.map((d) => d.user_id)).size || 0,
          unique_notes: new Set(downloadsData?.map((d) => d.note_id)).size || 0,
          downloads_today: downloadsData?.filter((d) => d.download_date === today).length || 0,
          downloads_this_week: downloadsData?.filter((d) => d.download_date >= weekAgo).length || 0,
          downloads_this_month: downloadsData?.filter((d) => d.download_date >= monthAgo).length || 0,
        });
      } else {
        const analytics = data[0];
        setDownloadAnalytics({
          total_downloads: Number(analytics.total_downloads) || 0,
          unique_users: Number(analytics.unique_users) || 0,
          unique_notes: Number(analytics.unique_notes) || 0,
          downloads_today: Number(analytics.downloads_today) || 0,
          downloads_this_week: Number(analytics.downloads_this_week) || 0,
          downloads_this_month: Number(analytics.downloads_this_month) || 0,
        });
      }
    } catch (error) {
      console.error("Error loading download analytics:", error);
    }
  }

  async function loadPopularNotes() {
    try {
      const { data, error } = await supabase.rpc("get_popular_notes", { p_limit: 15 });

      if (error || !data) {
        // Fallback query
        const { data: notesData } = await supabase
          .from("notes")
          .select(
            `
            id,
            title,
            download_count,
            subjects (
              name,
              code
            )
          `,
          )
          .eq("is_verified", true)
          .order("download_count", { ascending: false })
          .limit(15);

        setPopularNotes(
          notesData?.map((note) => ({
            note_id: note.id,
            title: note.title,
            download_count: note.download_count || 0,
            subject_name: (note.subjects as any)?.name || "Unknown",
            subject_code: (note.subjects as any)?.code || "N/A",
          })) || [],
        );
      } else {
        setPopularNotes(data);
      }
    } catch (error) {
      console.error("Error loading popular notes:", error);
    }
  }

  async function loadBranchStats() {
    try {
      const { data: branchesData } = await supabase.from("branches").select("id, name, code");

      const branchStatsPromises =
        branchesData?.map(async (branch) => {
          const [usersRes, notesRes, downloadsRes] = await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }).eq("branch_id", branch.id),
            supabase
              .from("notes")
              .select("id, download_count")
              .in(
                "subject_id",
                (await supabase.from("subjects").select("id").eq("branch_id", branch.id)).data?.map((s) => s.id) || [],
              ),
            supabase.from("note_downloads").select("id", { count: "exact", head: true }),
          ]);

          const totalDownloads = notesRes.data?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

          return {
            id: branch.id,
            name: branch.name,
            code: branch.code,
            user_count: usersRes.count || 0,
            notes_count: notesRes.data?.length || 0,
            download_count: totalDownloads,
          };
        }) || [];

      const branchStatsData = await Promise.all(branchStatsPromises);
      setBranchStats(branchStatsData);
    } catch (error) {
      console.error("Error loading branch stats:", error);
    }
  }

  async function loadActiveUsers() {
    try {
      const { data: usersData } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          email,
          semester,
          is_admin,
          last_login,
          branches (
            name
          )
        `,
        )
        .order("last_login", { ascending: false })
        .limit(20);

      if (usersData) {
        const usersWithActivity = await Promise.all(
          usersData.map(async (user) => {
            const [downloadsRes, bookmarksRes] = await Promise.all([
              supabase.from("note_downloads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
              supabase
                .from("opportunity_bookmarks")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id),
            ]);

            return {
              user_id: user.id,
              name: user.name || "Unknown",
              email: user.email,
              branch_name: (user.branches as any)?.name || "Unknown",
              semester: user.semester || 0,
              total_downloads: downloadsRes.count || 0,
              saved_opportunities: bookmarksRes.count || 0,
              last_login: user.last_login || "Never",
              is_admin: user.is_admin || false,
            };
          }),
        );

        setActiveUsers(usersWithActivity);
      }
    } catch (error) {
      console.error("Error loading active users:", error);
    }
  }

  async function loadDailyActivity() {
    try {
      let daysToFetch;
      let useRealTimeframe = false;

      if (selectedTimeRange === "lifetime") {
        // For lifetime, calculate actual days since first record
        const { data: firstRecord } = await supabase
          .from("note_downloads")
          .select("download_date")
          .order("download_date", { ascending: true })
          .limit(1);

        if (firstRecord && firstRecord.length > 0) {
          const firstDate = new Date(firstRecord[0].download_date);
          const today = new Date();
          daysToFetch = Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          useRealTimeframe = true;
        } else {
          daysToFetch = 30; // Default if no data
        }
      } else {
        daysToFetch =
          selectedTimeRange === "7d" ? 7 : selectedTimeRange === "30d" ? 30 : selectedTimeRange === "90d" ? 90 : 365;
      }
      const dates = Array.from({ length: daysToFetch }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).reverse();

      const dailyData = await Promise.all(
        dates.map(async (date) => {
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateStr = nextDate.toISOString().split("T")[0];

          const [downloadsRes, usersRes, notesRes] = await Promise.all([
            supabase.from("note_downloads").select("id", { count: "exact", head: true }).eq("download_date", date),
            supabase
              .from("users")
              .select("id", { count: "exact", head: true })
              .gte("created_at", date)
              .lt("created_at", nextDateStr),
            supabase
              .from("notes")
              .select("id", { count: "exact", head: true })
              .gte("created_at", date)
              .lt("created_at", nextDateStr),
          ]);

          return {
            date,
            downloads: downloadsRes.count || 0,
            new_users: usersRes.count || 0,
            notes_uploaded: notesRes.count || 0,
          };
        }),
      );

      setDailyActivity(dailyData);
    } catch (error) {
      console.error("Error loading daily activity:", error);
    }
  }

  async function loadSubjectAnalytics() {
    try {
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select(
          `
          id,
          name,
          code,
          semester,
          branches (
            name
          )
        `,
        )
        .limit(20);

      if (subjectsData) {
        const subjectAnalyticsPromises = subjectsData.map(async (subject) => {
          const { data: notesData } = await supabase
            .from("notes")
            .select("id, download_count")
            .eq("subject_id", subject.id)
            .eq("is_verified", true);

          const notesCount = notesData?.length || 0;
          const totalDownloads = notesData?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

          return {
            id: subject.id,
            name: subject.name,
            code: subject.code,
            branch_name: (subject.branches as any)?.name || "Unknown",
            semester: subject.semester,
            notes_count: notesCount,
            total_downloads: totalDownloads,
            avg_downloads_per_note: notesCount > 0 ? Math.round(totalDownloads / notesCount) : 0,
          };
        });

        const subjectAnalyticsData = await Promise.all(subjectAnalyticsPromises);
        setSubjectAnalytics(subjectAnalyticsData.sort((a, b) => b.total_downloads - a.total_downloads));
      }
    } catch (error) {
      console.error("Error loading subject analytics:", error);
    }
  }

  async function loadBranches() {
    try {
      const { data } = await supabase.from("branches").select("id, name, code").order("name");
      setBranches(data || []);
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAllAnalytics();
    setRefreshing(false);
  }

  async function handleExportReport() {
    try {
      // Generate CSV content
      const csvData = [
        ["Metric", "Value"],
        ["Total Users", overallStats.totalUsers.toString()],
        ["Total Notes", overallStats.totalNotes.toString()],
        ["Total Events", overallStats.totalEvents.toString()],
        ["Total Downloads", downloadAnalytics.total_downloads.toString()],
        ["Unique Users", downloadAnalytics.unique_users.toString()],
        ["Downloads Today", downloadAnalytics.downloads_today.toString()],
        ["Downloads This Week", downloadAnalytics.downloads_this_week.toString()],
        ["Downloads This Month", downloadAnalytics.downloads_this_month.toString()],
      ];

      const csvContent = csvData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report. Please try again.");
    }
  }

  function handleSetupAlerts() {
    alert(
      "Alert setup feature coming soon! This will allow you to configure notifications for:\n\n• Low user activity\n• High download spikes\n• New user registrations\n• Content moderation alerts",
    );
  }

  function handleAdvancedAnalytics() {
    alert(
      "Advanced analytics features coming soon! This will include:\n\n• Custom date ranges\n• Cohort analysis\n• Predictive analytics\n• Custom reports\n• API integration",
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    if (dateString === "Never") return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-12 h-12 animate-pulse text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading comprehensive analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center">
              Analytics Dashboard
              {selectedTimeRange === "lifetime" && (
                <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                  🕐 Lifetime View
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedTimeRange === "lifetime"
                ? "Complete platform analytics from the beginning of time"
                : "Comprehensive platform insights and metrics"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last 1 year</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 opacity-80" />
              <div className="text-right">
                <ArrowUp className="w-5 h-5 inline mr-1" />
                <span className="text-sm">+12%</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-1">Total Users</p>
            <p className="text-4xl font-bold">{formatNumber(overallStats.totalUsers)}</p>
            <p className="text-blue-100 text-sm mt-2">Across {overallStats.totalBranches} branches</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Download className="w-10 h-10 opacity-80" />
              <div className="text-right">
                <ArrowUp className="w-5 h-5 inline mr-1" />
                <span className="text-sm">+25%</span>
              </div>
            </div>
            <p className="text-green-100 text-sm mb-1">Total Downloads</p>
            <p className="text-4xl font-bold">{formatNumber(downloadAnalytics.total_downloads)}</p>
            <p className="text-green-100 text-sm mt-2">By {downloadAnalytics.unique_users} users</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-10 h-10 opacity-80" />
              <div className="text-right">
                <ArrowUp className="w-5 h-5 inline mr-1" />
                <span className="text-sm">+8%</span>
              </div>
            </div>
            <p className="text-purple-100 text-sm mb-1">Total Notes</p>
            <p className="text-4xl font-bold">{formatNumber(overallStats.totalNotes)}</p>
            <p className="text-purple-100 text-sm mt-2">{overallStats.totalSubjects} subjects covered</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10 opacity-80" />
              <div className="text-right">
                <ArrowUp className="w-5 h-5 inline mr-1" />
                <span className="text-sm">+15%</span>
              </div>
            </div>
            <p className="text-amber-100 text-sm mb-1">Events & Opportunities</p>
            <p className="text-4xl font-bold">
              {formatNumber(overallStats.totalEvents + overallStats.totalOpportunities)}
            </p>
            <p className="text-amber-100 text-sm mt-2">{overallStats.totalBookmarks} bookmarks saved</p>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Download Activity */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Download Activity
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today</span>
                <span className="font-bold text-2xl text-blue-600">{downloadAnalytics.downloads_today}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Week</span>
                <span className="font-bold text-xl text-green-600">{downloadAnalytics.downloads_this_week}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="font-bold text-xl text-purple-600">{downloadAnalytics.downloads_this_month}</span>
              </div>
              <hr className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{downloadAnalytics.unique_users}</div>
                  <div className="text-xs text-blue-600">Active Users</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{downloadAnalytics.unique_notes}</div>
                  <div className="text-xs text-green-600">Downloaded Notes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              Engagement Metrics
            </h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {downloadAnalytics.unique_users > 0
                    ? Math.round(downloadAnalytics.total_downloads / downloadAnalytics.unique_users)
                    : 0}
                </div>
                <div className="text-sm text-blue-600">Avg Downloads per User</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {downloadAnalytics.unique_notes > 0
                    ? Math.round(downloadAnalytics.total_downloads / downloadAnalytics.unique_notes)
                    : 0}
                </div>
                <div className="text-sm text-green-600">Avg Downloads per Note</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {overallStats.totalNotes > 0
                    ? Math.round((downloadAnalytics.unique_notes / overallStats.totalNotes) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-purple-600">Notes Downloaded</div>
              </div>
            </div>
          </div>

          {/* Platform Overview */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe
                className="w-5 h-
5 mr-2 text-purple-600"
              />
              Platform Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Active Users</div>
                  <div className="text-sm text-gray-500">Registered</div>
                </div>
                <div className="text-xl font-bold text-gray-900">{overallStats.totalUsers}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Content Library</div>
                  <div className="text-sm text-gray-500">Verified notes</div>
                </div>
                <div className="text-xl font-bold text-gray-900">{overallStats.totalNotes}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Events Published</div>
                  <div className="text-sm text-gray-500">Active events</div>
                </div>
                <div className="text-xl font-bold text-gray-900">{overallStats.totalEvents}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Opportunities</div>
                  <div className="text-sm text-gray-500">Available</div>
                </div>
                <div className="text-xl font-bold text-gray-900">{overallStats.totalOpportunities}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Activity Trends - Compact */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Daily Activity Trends
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                {selectedTimeRange === "lifetime"
                  ? `All time data (${dailyActivity.length} days)`
                  : `Last ${dailyActivity.length} days`}
              </span>
              {selectedTimeRange === "lifetime" && dailyActivity.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  Since {new Date(dailyActivity[0]?.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Compact Chart */}
          <div className="h-24 mb-4 relative">
            <div className="flex items-end h-full space-x-0.5">
              {dailyActivity
                .slice(selectedTimeRange === "lifetime" ? Math.max(-60, -dailyActivity.length) : -14)
                .map((day, index) => {
                  const maxValue = Math.max(...dailyActivity.map((d) => d.downloads)) || 1;
                  const height = Math.max((day.downloads / maxValue) * 100, 2);
                  return (
                    <div key={day.date} className="flex-1 group relative">
                      <div
                        className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t w-full"
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        <br />
                        {day.downloads} downloads
                        <br />
                        {day.new_users} new users
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedTimeRange === "lifetime" && (
              <div className="col-span-2 md:col-span-4 mb-2">
                <div className="text-center p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                  <span className="text-sm font-semibold text-purple-700">
                    📊 Lifetime Analytics - Complete Platform History
                  </span>
                </div>
              </div>
            )}
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {dailyActivity.reduce((sum, day) => sum + day.downloads, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Downloads</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {dailyActivity.reduce((sum, day) => sum + day.new_users, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">New Users</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {dailyActivity.reduce((sum, day) => sum + day.notes_uploaded, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Notes Uploaded</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {dailyActivity.length > 0
                  ? Math.round(dailyActivity.reduce((sum, day) => sum + day.downloads, 0) / dailyActivity.length)
                  : 0}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {selectedTimeRange === "lifetime" ? "Lifetime Avg/Day" : "Avg Daily Downloads"}
              </div>
            </div>
            {selectedTimeRange === "lifetime" && (
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-xl font-bold text-indigo-600">{dailyActivity.length}</div>
                <div className="text-xs text-gray-600 mt-1">Days Active</div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Performance */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-green-600" />
              Branch Performance
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {branchStats.slice(0, 6).map((branch, index) => {
                const maxDownloads = Math.max(...branchStats.map((b) => b.download_count)) || 1;
                const downloadPercentage = (branch.download_count / maxDownloads) * 100;

                return (
                  <div key={branch.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {branch.code}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.user_count} students</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{branch.download_count}</div>
                        <div className="text-sm text-gray-500">downloads</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${downloadPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Content and Active Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Downloaded Notes */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-600" />
              Most Downloaded Notes
            </h3>
            <div className="space-y-3">
              {popularNotes.slice(0, 10).map((note, index) => (
                <div
                  key={note.note_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-600"
                          : index === 1
                            ? "bg-gray-100 text-gray-600"
                            : index === 2
                              ? "bg-orange-100 text-orange-600"
                              : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1">{note.title}</p>
                      <p className="text-sm text-gray-500">
                        {note.subject_code} • {note.subject_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 flex items-center">
                      <Download className="w-4 h-4 mr-1" />
                      {note.download_count}
                    </p>
                    <p className="text-sm text-gray-500">downloads</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Users */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-red-600" />
              Most Active Users
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activeUsers.slice(0, 6).map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {user.is_admin && <Shield className="w-4 h-4 text-blue-500" />}
                      </div>
                      <p className="text-sm text-gray-500">
                        {user.branch_name} • Sem {user.semester}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{user.total_downloads}</div>
                        <div className="text-xs text-gray-500">downloads</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{user.saved_opportunities}</div>
                        <div className="text-xs text-gray-500">bookmarks</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Analytics */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />
            Subject-wise Analytics
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch & Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg per Note
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjectAnalytics.slice(0, 15).map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{subject.name}</div>
                        <div className="text-sm text-gray-500">{subject.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subject.branch_name}</div>
                      <div className="text-sm text-gray-500">Semester {subject.semester}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {subject.notes_count} notes
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subject.total_downloads}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subject.avg_downloads_per_note}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export and Additional Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2 text-gray-600" />
            Export & Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Analytics Report</span>
            </button>
            <button
              onClick={handleSetupAlerts}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>Setup Alerts</span>
            </button>
            <button
              onClick={handleAdvancedAnalytics}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Advanced Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
