"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import {
  BarChart3,
  Download,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Star,
  FileText,
  Code,
  Globe,
  Target,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Interfaces for the new unified schema
interface Category {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface CategoryStats {
  id: string;
  title: string;
  icon: any;
  color: string;
  topics_count: number;
  resources_count: number;
  notes_count: number;
  ai_tools_count: number;
  downloads: number;
  approved_resources: number;
}

interface OverallStats {
  totalResources: number;
  approvedResources: number;
  totalTopics: number;
  totalDownloads: number;
  totalViews: number;
  weeklyGrowth: number;
}

interface RecentActivity {
  id: string;
  title: string;
  type: 'note' | 'ai_tool';
  category_id: string;
  created_at: string;
  uploader?: string;
}

export default function CommonResourcesOverview() {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalResources: 0,
    approvedResources: 0,
    totalTopics: 0,
    totalDownloads: 0,
    totalViews: 0,
    weeklyGrowth: 0,
  });

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategoryStats(),
        loadRecentActivity(),
        loadPendingApprovals(),
        loadOverallStats()
      ]);
    } catch (error) {
      console.error("Error loading overview data:", error);
      toast.error("Failed to load overview data");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    try {
      console.log("Loading category stats from unified schema...");
      
      // Load categories
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError);
        return;
      }

      console.log("Categories loaded:", categories);

      if (!categories || categories.length === 0) {
        console.log("No categories found");
        setCategoryStats([]);
        return;
      }

      // Get stats for each category
      const statsPromises = categories.map(async (category: Category) => {
        console.log("Processing category:", category.id, category.title);
        
        // Count topics (only for note-based categories)
        const { count: topicsCount, error: topicsError } = await supabase
          .from("topics")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("is_active", true);

        if (topicsError) {
          console.error("Error loading topics for category:", category.id, topicsError);
        }

        // Count total resources
        const { count: totalResourcesCount, error: resourcesError } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("is_active", true);

        if (resourcesError) {
          console.error("Error loading resources for category:", category.id, resourcesError);
        }

        // Count notes specifically
        const { count: notesCount, error: notesError } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("resource_type", "note")
          .eq("is_active", true);

        if (notesError) {
          console.error("Error loading notes for category:", category.id, notesError);
        }

        // Count AI tools specifically
        const { count: aiToolsCount, error: aiToolsError } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("resource_type", "ai_tool")
          .eq("is_active", true);

        if (aiToolsError) {
          console.error("Error loading AI tools for category:", category.id, aiToolsError);
        }

        // Count approved resources
        const { count: approvedCount, error: approvedError } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("is_approved", true)
          .eq("is_active", true);

        if (approvedError) {
          console.error("Error loading approved resources for category:", category.id, approvedError);
        }

        // Sum downloads
        const { data: downloadData, error: downloadError } = await supabase
          .from("resources")
          .select("downloads")
          .eq("category_id", category.id)
          .eq("is_active", true);

        let downloads = 0;
        if (downloadError) {
          console.error("Error loading downloads for category:", category.id, downloadError);
        } else if (downloadData) {
          downloads = downloadData.reduce((sum, resource) => sum + (resource.downloads || 0), 0);
        }

        // Map icons
        const iconMap: { [key: string]: any } = {
          Code,
          Globe,
          Target,
          Bot,
          FileText,
        };

        console.log("Category stats for", category.id, ":", {
          topics_count: topicsCount || 0,
          resources_count: totalResourcesCount || 0,
          notes_count: notesCount || 0,
          ai_tools_count: aiToolsCount || 0,
          downloads,
          approved_resources: approvedCount || 0,
        });

        return {
          id: category.id,
          title: category.title,
          icon: iconMap[category.icon] || FileText,
          color: category.color,
          topics_count: topicsCount || 0,
          resources_count: totalResourcesCount || 0,
          notes_count: notesCount || 0,
          ai_tools_count: aiToolsCount || 0,
          downloads,
          approved_resources: approvedCount || 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      console.log("Category stats processed:", stats);
      setCategoryStats(stats);
      setTotalDownloads(stats.reduce((sum, stat) => sum + stat.downloads, 0));
    } catch (error) {
      console.error("Error in loadCategoryStats:", error);
      setCategoryStats([]);
    }
  };

  const loadRecentActivity = async () => {
    try {
      console.log("Loading recent activity...");
      
      const { data: recentResources, error } = await supabase
        .from("resources")
        .select(`
          id,
          title,
          resource_type,
          category_id,
          created_at,
          users:uploaded_by(name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading recent activity:", error);
        return;
      }

      const activities: RecentActivity[] = (recentResources || []).map((resource: any) => ({
        id: resource.id,
        title: resource.title,
        type: resource.resource_type,
        category_id: resource.category_id,
        created_at: resource.created_at,
        uploader: resource.users?.name || "Unknown",
      }));

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error in loadRecentActivity:", error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const { count, error } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false)
        .eq("is_active", true);

      if (error) {
        console.error("Error loading pending approvals:", error);
        return;
      }

      setPendingApprovals(count || 0);
    } catch (error) {
      console.error("Error in loadPendingApprovals:", error);
    }
  };

  const loadOverallStats = async () => {
    try {
      // Get total resources
      const { count: totalResources } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get approved resources
      const { count: approvedResources } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true)
        .eq("is_active", true);

      // Get total topics
      const { count: totalTopics } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total downloads and views
      const { data: statsData } = await supabase
        .from("resources")
        .select("downloads, views")
        .eq("is_active", true);

      const totalDownloads = statsData?.reduce((sum, item) => sum + (item.downloads || 0), 0) || 0;
      const totalViews = statsData?.reduce((sum, item) => sum + (item.views || 0), 0) || 0;

      setOverallStats({
        totalResources: totalResources || 0,
        approvedResources: approvedResources || 0,
        totalTopics: totalTopics || 0,
        totalDownloads,
        totalViews,
        weeklyGrowth: 12, // This would need to be calculated based on historical data
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
      case "note":
        return FileText;
      case "ai_tool":
        return Bot;
      default:
        return FileText;
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
              <h1 className="text-3xl font-bold text-gray-900">Common Resources</h1>
              <p className="mt-2 text-gray-600">
                Manage notes, AI tools, and educational resources for all students
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                <Download className="h-3 w-3 mr-1" />
                {totalDownloads.toLocaleString()} Downloads
              </Badge>
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
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
                      <strong>{pendingApprovals}</strong> resources awaiting approval
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
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

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{totalDownloads.toLocaleString()}</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <p className="text-xs text-green-600 font-medium">+12% this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalViews.toLocaleString()}</div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-gray-600">All time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resource Categories */}
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
                          {category.topics_count} topics • {category.notes_count} notes • {category.ai_tools_count} AI tools
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
                        {category.resources_count > 0
                          ? Math.round((category.approved_resources / category.resources_count) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={category.resources_count > 0 ? (category.approved_resources / category.resources_count) * 100 : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600 font-medium">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        {category.approved_resources} approved
                      </span>
                      <span className="text-gray-500">
                        {category.resources_count - category.approved_resources} pending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <ActivityIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {activity.type === 'note' ? 'Note' : 'AI Tool'} • {activity.category_id} • by {activity.uploader}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
