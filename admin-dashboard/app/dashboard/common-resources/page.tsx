"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Code,
  Grid3X3,
  Target,
  Bot,
  FileText,
  Download,
  Users,
  TrendingUp,
  Star,
  Activity,
  ArrowRight,
  Plus,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  Zap,
  BookOpen,
} from "lucide-react";

interface CategoryStats {
  id: string;
  title: string;
  icon: any;
  color: string;
  topics_count: number;
  notes_count: number;
  downloads: number;
  active_notes: number;
}

interface AIToolStats {
  total_tools: number;
  active_tools: number;
  featured_tools: number;
  premium_tools: number;
  categories_count: number;
}

interface RecentActivity {
  id: string;
  type: "note_added" | "tool_added" | "note_approved" | "topic_created";
  title: string;
  category: string;
  created_at: string;
  user_name?: string;
}

export default function CommonResourcesOverview() {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [aiToolStats, setAiToolStats] = useState<AIToolStats>({
    total_tools: 0,
    active_tools: 0,
    featured_tools: 0,
    premium_tools: 0,
    categories_count: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [overallStats, setOverallStats] = useState({
    totalTopics: 0,
    totalResources: 0,
    approvedResources: 0,
    totalViews: 0,
    weeklyGrowth: 0
  });

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategoryStats(),
        loadAIToolStats(),
        loadRecentActivity(),
        loadPendingApprovals(),
        loadOverallStats()
      ]);
    } catch (error) {
      console.error("Error loading overview data:", error);
      toast({
        title: "Error",
        description: "Failed to load overview data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    // Load categories
    const { data: categories } = await supabase.from("common_categories").select("*").order("sort_order");

    if (!categories) return;

    // Get stats for each category
    const statsPromises = categories.map(async (category) => {
      // Count topics
      const { count: topicsCount } = await supabase
        .from("common_topics")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id)
        .eq("is_active", true);

      // Count notes
      const { count: notesCount } = await supabase
        .from("common_notes")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id);

      // Count active/approved notes
      const { count: activeNotesCount } = await supabase
        .from("common_notes")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id)
        .eq("is_approved", true);

      // Sum downloads
      const { data: downloadData } = await supabase
        .from("common_notes")
        .select("downloads")
        .eq("category_id", category.id);

      const downloads = downloadData?.reduce((sum, note) => sum + (note.downloads || 0), 0) || 0;

      const iconMap: { [key: string]: any } = {
        dsa: Code,
        development: Grid3X3,
        placement: Target,
      };

      return {
        id: category.id,
        title: category.title,
        icon: iconMap[category.id] || FileText,
        color: category.color || "#1890ff",
        topics_count: topicsCount || 0,
        notes_count: notesCount || 0,
        downloads,
        active_notes: activeNotesCount || 0,
      };
    });

    const stats = await Promise.all(statsPromises);
    setCategoryStats(stats);
    setTotalDownloads(stats.reduce((sum, stat) => sum + stat.downloads, 0));
  };

  const loadAIToolStats = async () => {
    // Count total tools
    const { count: totalTools } = await supabase.from("ai_tools").select("*", { count: "exact", head: true });

    // Count active tools
    const { count: activeTools } = await supabase
      .from("ai_tools")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Count featured tools
    const { count: featuredTools } = await supabase
      .from("ai_tools")
      .select("*", { count: "exact", head: true })
      .eq("is_featured", true);

    // Count premium tools
    const { count: premiumTools } = await supabase
      .from("ai_tools")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true);

    // Count categories
    const { count: categoriesCount } = await supabase
      .from("ai_tool_categories")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    setAiToolStats({
      total_tools: totalTools || 0,
      active_tools: activeTools || 0,
      featured_tools: featuredTools || 0,
      premium_tools: premiumTools || 0,
      categories_count: categoriesCount || 0,
    });
  };

  const loadRecentActivity = async () => {
    // Load recent notes
    const { data: recentNotes } = await supabase
      .from("common_notes")
      .select(
        `
        id,
        title,
        category_id,
        created_at,
        is_approved,
        users:uploaded_by(name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5);

    // Load recent AI tools
    const { data: recentTools } = await supabase
      .from("ai_tools")
      .select(
        `
        id,
        name,
        category_id,
        created_at
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5);

    const activity: RecentActivity[] = [];

    // Process recent notes
    recentNotes?.forEach((note) => {
      activity.push({
        id: note.id,
        type: note.is_approved ? "note_approved" : "note_added",
        title: note.title,
        category: note.category_id,
        created_at: note.created_at,
        user_name: (note.users as any)?.name,
      });
    });

    // Process recent tools
    recentTools?.forEach((tool) => {
      activity.push({
        id: tool.id,
        type: "tool_added",
        title: tool.name,
        category: "ai-tools",
        created_at: tool.created_at,
      });
    });

    // Sort by date and limit
    activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentActivity(activity.slice(0, 8));
  };

  const loadPendingApprovals = async () => {
    const { count } = await supabase
      .from("common_notes")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", false);

    setPendingApprovals(count || 0);
  };

  const loadOverallStats = async () => {
    try {
      // Total topics across all categories
      const { count: totalTopics } = await supabase
        .from("common_topics")
        .select("*", { count: "exact", head: true });

      // Total resources
      const { count: totalResources } = await supabase
        .from("common_notes")
        .select("*", { count: "exact", head: true });

      // Approved resources
      const { count: approvedResources } = await supabase
        .from("common_notes")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);

      // Calculate total views (sum of all downloads + views)
      const { data: viewsData } = await supabase
        .from("common_notes")
        .select("downloads, views");

      const totalViews = viewsData?.reduce((sum, item) =>
        sum + (item.downloads || 0) + (item.views || 0), 0) || 0;

      // Calculate weekly growth (simplified - resources added in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: weeklyNew } = await supabase
        .from("common_notes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      const weeklyGrowth = (totalResources || 0) > 0 ? Math.round((weeklyNew || 0) / (totalResources || 0) * 100) : 0;

      setOverallStats({
        totalTopics: totalTopics || 0,
        totalResources: totalResources || 0,
        approvedResources: approvedResources || 0,
        totalViews,
        weeklyGrowth
      });
    } catch (error) {
      console.error("Error loading overall stats:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "note_added":
        return <FileText className="h-4 w-4" />;
      case "note_approved":
        return <Star className="h-4 w-4" />;
      case "tool_added":
        return <Bot className="h-4 w-4" />;
      case "topic_created":
        return <Plus className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "note_added":
        return "text-blue-500";
      case "note_approved":
        return "text-green-500";
      case "tool_added":
        return "text-purple-500";
      case "topic_created":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading overview...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                
                Common Resources Hub
              </h1>
              <p className="text-gray-600 mt-3">Comprehensive management of educational resources across all categories</p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {overallStats.approvedResources} Approved
                </Badge>
                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                  <Eye className="h-3 w-3 mr-1" />
                  {overallStats.totalViews.toLocaleString()} Views
                </Badge>
                <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {overallStats.weeklyGrowth}% Growth
                </Badge>
              </div>
            </div>
            
          </div>
        </div>

        {/* Alert for pending approvals */}
        {pendingApprovals > 0 && (
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-900">Pending Reviews</h3>
                    <p className="text-orange-700">
                      <strong>{pendingApprovals}</strong> notes awaiting approval
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  asChild
                >
                  <Link href="/dashboard/common-resources/pending">
                    Review All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Downloads</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{totalDownloads.toLocaleString()}</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <p className="text-xs text-green-600 font-medium">+12% this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Resources</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalResources}</div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <p className="text-xs text-gray-600">{overallStats.approvedResources} approved</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Topics</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalTopics}</div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-gray-600">{categoryStats.length} categories</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">AI Tools</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{aiToolStats.total_tools}</div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <p className="text-xs text-gray-600">{aiToolStats.featured_tools} featured</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Views</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalViews.toLocaleString()}</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <p className="text-xs text-green-600 font-medium">+{overallStats.weeklyGrowth}% weekly</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Category Overview */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Resource Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryStats.map((category) => (
                <div key={category.id} className="p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: category.color }}
                      >
                        <category.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{category.title}</h4>
                        <p className="text-sm text-gray-600">
                          {category.topics_count} topics • {category.notes_count} resources
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Download className="h-4 w-4" />
                        <span className="font-bold text-lg">{category.downloads.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500">downloads</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Approval Rate</span>
                      <span className="text-sm font-medium">
                        {category.notes_count > 0
                          ? Math.round((category.active_notes / category.notes_count) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={category.notes_count > 0 ? (category.active_notes / category.notes_count) * 100 : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600 font-medium">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        {category.active_notes} approved
                      </span>
                      <span className="text-orange-600 font-medium">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {category.notes_count - category.active_notes} pending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enhanced Recent Activity */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No recent activity</p>
                    <p className="text-gray-400 text-sm">Activities will appear here when users interact with resources</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)} bg-opacity-10 flex-shrink-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Badge variant="outline" className="text-xs py-0">
                            {activity.category}
                          </Badge>
                          {activity.user_name && (
                            <>
                              <span>•</span>
                              <span className="font-medium">by {activity.user_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(activity.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {recentActivity.length > 0 && (
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Activity
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Resource Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">DSA Resources</h3>
                    <p className="text-sm text-gray-600">Data Structures & Algorithms</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  {categoryStats.find((c) => c.id === "dsa")?.topics_count || 0} topics
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-gray-600 leading-relaxed">Comprehensive collection of data structures, algorithms, and coding practice resources.</p>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {categoryStats.find((c) => c.id === "dsa")?.notes_count || 0} Resources
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Download className="h-4 w-4" />
                  {categoryStats.find((c) => c.id === "dsa")?.downloads || 0} downloads
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group-hover:shadow-md transition-all" asChild>
                <Link href="/dashboard/common-resources/dsa">
                  Manage DSA Resources
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Grid3X3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Development</h3>
                    <p className="text-sm text-gray-600">Web, Mobile & Backend</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                  {categoryStats.find((c) => c.id === "development")?.topics_count || 0} topics
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-gray-600 leading-relaxed">Modern development frameworks, tools, and best practices for building applications.</p>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-900">
                    {categoryStats.find((c) => c.id === "development")?.notes_count || 0} Resources
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Download className="h-4 w-4" />
                  {categoryStats.find((c) => c.id === "development")?.downloads || 0} downloads
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 group-hover:shadow-md transition-all" asChild>
                <Link href="/dashboard/common-resources/development">
                  Manage Development Resources
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Placement Prep</h3>
                    <p className="text-sm text-gray-600">Interview & Career</p>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                  {categoryStats.find((c) => c.id === "placement")?.topics_count || 0} topics
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-gray-600 leading-relaxed">Interview preparation, resume building, and career guidance resources.</p>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">
                    {categoryStats.find((c) => c.id === "placement")?.notes_count || 0} Resources
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Download className="h-4 w-4" />
                  {categoryStats.find((c) => c.id === "placement")?.downloads || 0} downloads
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 group-hover:shadow-md transition-all" asChild>
                <Link href="/dashboard/common-resources/placement">
                  Manage Placement Resources
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Showcase */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
          <CardHeader className="pb-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full blur-3xl opacity-30 -translate-y-16 translate-x-16"></div>
            <CardTitle className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Tools Hub</h2>
                  <p className="text-gray-600 font-normal">Productivity & Learning Tools</p>
                </div>
              </div>
              <Button className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg group-hover:shadow-xl transition-all" asChild>
                <Link href="/dashboard/common-resources/ai-tools">
                  Manage AI Tools
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="group/stat hover:scale-105 transition-transform">
                <div className="text-center p-4 bg-white rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">{aiToolStats.total_tools}</div>
                  <div className="text-sm text-purple-700 font-medium">Total Tools</div>
                </div>
              </div>
              <div className="group/stat hover:scale-105 transition-transform">
                <div className="text-center p-4 bg-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">{aiToolStats.active_tools}</div>
                  <div className="text-sm text-green-700 font-medium">Active</div>
                </div>
              </div>
              <div className="group/stat hover:scale-105 transition-transform">
                <div className="text-center p-4 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-2">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{aiToolStats.featured_tools}</div>
                  <div className="text-sm text-blue-700 font-medium">Featured</div>
                </div>
              </div>
              <div className="group/stat hover:scale-105 transition-transform">
                <div className="text-center p-4 bg-white rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-2">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">{aiToolStats.premium_tools}</div>
                  <div className="text-sm text-orange-700 font-medium">Premium</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Categories Available</p>
                    <p className="text-sm text-gray-600">{aiToolStats.categories_count} different tool categories</p>
                  </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                  {aiToolStats.categories_count} Categories
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
