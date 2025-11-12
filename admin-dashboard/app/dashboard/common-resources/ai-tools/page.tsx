"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, Search, Download, Star, Eye, ExternalLink, Bot, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// Updated interfaces for unified schema
interface AITool {
  id: string;
  category_id: string;
  title: string;
  description: string;
  resource_type: 'ai_tool';
  tool_url: string;
  pricing_type: 'free' | 'premium' | 'freemium';
  tags: string[];
  thumbnail_url?: string;
  downloads: number;
  views: number;
  rating: number;
  rating_count: number;
  is_featured: boolean;
  is_approved: boolean;
  is_active: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export default function AIToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pricingFilter, setPricingFilter] = useState<string>("all");
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);

  // Form state
  const [toolForm, setToolForm] = useState({
    title: "",
    description: "",
    tool_url: "",
    pricing_type: "free" as "free" | "premium" | "freemium",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("resources")
        .select("*")
        .eq("category_id", "ai-tools")
        .eq("resource_type", "ai_tool")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (pricingFilter !== "all") {
        query = query.eq("pricing_type", pricingFilter);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTools(data || []);
    } catch (error) {
      console.error("Error fetching AI tools:", error);
      toast.error("Failed to load AI tools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [pricingFilter, searchTerm]);

  const handleCreateTool = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("resources").insert([
        {
          category_id: "ai-tools",
          topic_id: null, // AI tools don't have topics
          title: toolForm.title,
          description: toolForm.description,
          resource_type: "ai_tool",
          tool_url: toolForm.tool_url,
          pricing_type: toolForm.pricing_type,
          tags: toolForm.tags,
          downloads: 0,
          views: 0,
          rating: 0.0,
          rating_count: 0,
          is_featured: false,
          is_approved: false,
          is_active: true,
          uploaded_by: user.data.user?.id,
        },
      ]);

      if (error) throw error;

      toast.success("AI tool created successfully");
      setShowToolModal(false);
      resetToolForm();
      fetchTools();
    } catch (error) {
      console.error("Error creating AI tool:", error);
      toast.error("Failed to create AI tool");
    }
  };

  const handleUpdateTool = async () => {
    if (!editingTool) return;

    try {
      const { error } = await supabase.from("resources")
        .update({
          title: toolForm.title,
          description: toolForm.description,
          tool_url: toolForm.tool_url,
          pricing_type: toolForm.pricing_type,
          tags: toolForm.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTool.id);

      if (error) throw error;

      toast.success("AI tool updated successfully");
      setShowToolModal(false);
      setEditingTool(null);
      resetToolForm();
      fetchTools();
    } catch (error) {
      console.error("Error updating AI tool:", error);
      toast.error("Failed to update AI tool");
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this AI tool?")) return;

    try {
      const { error } = await supabase.from("resources").delete().eq("id", toolId);

      if (error) throw error;

      toast.success("AI tool deleted successfully");
      fetchTools();
    } catch (error) {
      console.error("Error deleting AI tool:", error);
      toast.error("Failed to delete AI tool");
    }
  };

  const toggleToolStatus = async (toolId: string, field: "is_active" | "is_featured" | "is_approved", value: boolean) => {
    try {
      const { error } = await supabase
        .from("resources")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", toolId);

      if (error) throw error;

      const statusText = field === "is_active" ? "activation" : field === "is_featured" ? "featured" : "approval";
      toast.success(`Tool ${statusText} updated successfully`);
      fetchTools();
    } catch (error) {
      console.error(`Error updating tool ${field}:`, error);
      toast.error(`Failed to update tool ${field}`);
    }
  };

  const resetToolForm = () => {
    setToolForm({
      title: "",
      description: "",
      tool_url: "",
      pricing_type: "free",
      tags: [],
    });
  };

  const openEditToolModal = (tool: AITool) => {
    setEditingTool(tool);
    setToolForm({
      title: tool.title,
      description: tool.description,
      tool_url: tool.tool_url,
      pricing_type: tool.pricing_type,
      tags: tool.tags || [],
    });
    setShowToolModal(true);
  };

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case "free": return "bg-green-100 text-green-800";
      case "premium": return "bg-red-100 text-red-800";
      case "freemium": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleVisitTool = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="h-8 w-8 text-purple-600" />
              AI Tools
            </h1>
            <p className="text-gray-600 mt-1">Manage AI tools and productivity resources</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showToolModal} onOpenChange={setShowToolModal}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetToolForm(); setEditingTool(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add AI Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTool ? "Edit AI Tool" : "Add New AI Tool"}</DialogTitle>
                  <DialogDescription>
                    {editingTool ? "Update the AI tool details" : "Add a new AI tool to the collection"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Tool name"
                    value={toolForm.title}
                    onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Tool description"
                    value={toolForm.description}
                    onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  />
                  <Input
                    placeholder="Tool URL (https://...)"
                    value={toolForm.tool_url}
                    onChange={(e) => setToolForm({ ...toolForm, tool_url: e.target.value })}
                  />
                  <Select value={toolForm.pricing_type} onValueChange={(value: "free" | "premium" | "freemium") => setToolForm({ ...toolForm, pricing_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="freemium">Freemium</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Tags (comma-separated)"
                    value={toolForm.tags.join(", ")}
                    onChange={(e) => setToolForm({ ...toolForm, tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })}
                  />
                  <div className="flex gap-2">
                    <Button onClick={editingTool ? handleUpdateTool : handleCreateTool} className="flex-1">
                      {editingTool ? "Update Tool" : "Create Tool"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowToolModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tools.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Tools</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.filter(tool => tool.pricing_type === "free").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured Tools</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.filter(tool => tool.is_featured).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.reduce((sum, tool) => sum + tool.views, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tools Grid View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Tools Collection</CardTitle>
                <CardDescription>Browse and manage AI tools for productivity and development</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={pricingFilter} onValueChange={setPricingFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pricing</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading AI tools...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                  <Card key={tool.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Bot className="h-5 w-5 text-purple-600" />
                            {tool.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge className={getPricingColor(tool.pricing_type)}>
                              {tool.pricing_type}
                            </Badge>
                            {tool.is_featured && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {!tool.is_approved && (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="text-sm mt-2">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Tags */}
                        {tool.tags && tool.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tool.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {tool.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{tool.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {tool.views} views
                          </div>
                          {tool.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {tool.rating.toFixed(1)}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleVisitTool(tool.tool_url)}
                            className="flex-1"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Visit Tool
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditToolModal(tool)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteTool(tool.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex gap-1 pt-2 border-t">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => toggleToolStatus(tool.id, "is_approved", !tool.is_approved)}
                            className="text-xs"
                          >
                            {tool.is_approved ? "Unapprove" : "Approve"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => toggleToolStatus(tool.id, "is_featured", !tool.is_featured)}
                            className="text-xs"
                          >
                            {tool.is_featured ? "Unfeature" : "Feature"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => toggleToolStatus(tool.id, "is_active", !tool.is_active)}
                            className="text-xs"
                          >
                            {tool.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tools.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No AI tools found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table View (Alternative) */}
        <Card>
          <CardHeader>
            <CardTitle>Tools Management</CardTitle>
            <CardDescription>Detailed view for managing AI tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tool.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {tool.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPricingColor(tool.pricing_type)}>
                        {tool.pricing_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {tool.views}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {tool.is_approved && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
                        {tool.is_featured && <Badge className="bg-blue-100 text-blue-800">Featured</Badge>}
                        {!tool.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleVisitTool(tool.tool_url)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditToolModal(tool)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteTool(tool.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tools.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No AI tools found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
