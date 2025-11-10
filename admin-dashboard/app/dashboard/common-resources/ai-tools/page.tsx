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
import { Plus, Edit, Trash2, Search, Star, ExternalLink, Bot, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

interface AIToolCategory {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  tool_count?: number;
}

interface AITool {
  id: string;
  name: string;
  description: string;
  category_id: string;
  url: string;
  is_premium: boolean;
  price?: string;
  rating: number;
  features: string[];
  logo_url?: string;
  screenshot_urls: string[];
  tags: string[];
  popularity_score: number;
  is_featured: boolean;
  is_active: boolean;
  meta_data: any;
  created_by: string;
  created_at: string;
  category?: AIToolCategory | null;
}

export default function AIToolsManagement() {
  const [categories, setCategories] = useState<AIToolCategory[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AIToolCategory | null>(null);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    title: "",
    description: "",
  });

  const [toolForm, setToolForm] = useState({
    name: "",
    description: "",
    category_id: "",
    url: "",
    is_premium: false,
    price: "",
    rating: 0,
    features: [] as string[],
    logo_url: "",
    screenshot_urls: [] as string[],
    tags: [] as string[],
    popularity_score: 0,
    is_featured: false,
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchTools();
  }, []);

  useEffect(() => {
    fetchTools();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("ai_tool_categories").select("id, title, description, is_active, created_at, updated_at").order("title");

      if (error) throw error;

      // Get tool counts for each category
      const categoriesWithStats = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from("ai_tools")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id)
            .eq("is_active", true);

          return {
            ...category,
            tool_count: count || 0,
          };
        }),
      );

      setCategories(categoriesWithStats);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load AI tool categories");
    }
  };

  const fetchTools = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("ai_tools")
        .select(
          `
          id, name, description, category_id, url, is_premium, price, rating, features, logo_url, screenshot_urls, tags, popularity_score, is_featured, is_active, meta_data, created_by, created_at, updated_at,
          ai_tool_categories!inner(title)
        `,
        )
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      const toolsWithCategory = (data || []).map((tool) => ({
        ...tool,
        features: tool.features || [],
        tags: tool.tags || [],
        screenshot_urls: tool.screenshot_urls || [],
        category: tool.ai_tool_categories?.[0] ? {
          id: tool.category_id,
          title: tool.ai_tool_categories[0].title,
          description: '',
          is_active: true,
        } : null,
      }));

      setTools(toolsWithCategory);
    } catch (error) {
      console.error("Error fetching tools:", error);
      toast.error("Failed to load AI tools");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const { error } = await supabase.from("ai_tool_categories").insert([
        {
          ...categoryForm,
          id: categoryForm.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        },
      ]);

      if (error) throw error;

      toast.success("AI tool category created successfully");
      setShowCategoryDialog(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const { error } = await supabase.from("ai_tool_categories")
        .update({
          title: categoryForm.title,
          description: categoryForm.description,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      toast.success("Category updated successfully");
      setShowCategoryDialog(false);
      resetCategoryForm();
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure? This will delete all AI tools in this category.")) return;

    try {
      const { error } = await supabase.from("ai_tool_categories").delete().eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted successfully");
      fetchCategories();
      fetchTools();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleCreateTool = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("ai_tools").insert([
        {
          name: toolForm.name,
          description: toolForm.description,
          category_id: toolForm.category_id,
          url: toolForm.url,
          is_premium: toolForm.is_premium,
          price: toolForm.price || null,
          rating: toolForm.rating || 0,
          features: toolForm.features,
          logo_url: toolForm.logo_url || null,
          screenshot_urls: toolForm.screenshot_urls,
          tags: toolForm.tags,
          popularity_score: toolForm.popularity_score || 0,
          is_featured: toolForm.is_featured,
          is_active: toolForm.is_active,
          created_by: user.data.user?.id || null,
        },
      ]);

      if (error) throw error;

      toast.success("AI tool added successfully");
      setShowToolDialog(false);
      resetToolForm();
      fetchTools();
    } catch (error) {
      console.error("Error creating tool:", error);
      toast.error("Failed to create tool");
    }
  };

  const handleUpdateTool = async () => {
    if (!editingTool) return;

    try {
      const { error } = await supabase.from("ai_tools")
        .update({
          name: toolForm.name,
          description: toolForm.description,
          category_id: toolForm.category_id,
          url: toolForm.url,
          is_premium: toolForm.is_premium,
          price: toolForm.price,
          rating: toolForm.rating,
          features: toolForm.features,
          logo_url: toolForm.logo_url,
          screenshot_urls: toolForm.screenshot_urls,
          tags: toolForm.tags,
          popularity_score: toolForm.popularity_score,
          is_featured: toolForm.is_featured,
          is_active: toolForm.is_active,
        })
        .eq("id", editingTool.id);

      if (error) throw error;

      toast.success("AI tool updated successfully");
      setShowToolDialog(false);
      resetToolForm();
      setEditingTool(null);
      fetchTools();
    } catch (error) {
      console.error("Error updating tool:", error);
      toast.error("Failed to update tool");
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this AI tool?")) return;

    try {
      const { error } = await supabase.from("ai_tools").delete().eq("id", toolId);

      if (error) throw error;

      toast.success("AI tool deleted successfully");
      fetchTools();
    } catch (error) {
      console.error("Error deleting tool:", error);
      toast.error("Failed to delete tool");
    }
  };

  const toggleToolStatus = async (toolId: string, field: "is_active" | "is_featured", value: boolean) => {
    try {
      const { error } = await supabase
        .from("ai_tools")
        .update({ [field]: value })
        .eq("id", toolId);

      if (error) throw error;

      toast.success(`Tool ${field.replace("_", " ")} updated`);
      fetchTools();
    } catch (error) {
      console.error(`Error updating tool ${field}:`, error);
      toast.error(`Failed to update tool ${field.replace("_", " ")}`);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      title: "",
      description: "",
    });
  };

  const resetToolForm = () => {
    setToolForm({
      name: "",
      description: "",
      category_id: "",
      url: "",
      is_premium: false,
      price: "",
      rating: 0,
      features: [],
      logo_url: "",
      screenshot_urls: [],
      tags: [],
      popularity_score: 0,
      is_featured: false,
      is_active: true,
    });
  };

  const openEditCategory = (category: AIToolCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      title: category.title,
      description: category.description,
    });
    setShowCategoryDialog(true);
  };





  const openEditTool = (tool: AITool) => {
    setEditingTool(tool);
    setToolForm({
      name: tool.name,
      description: tool.description,
      url: tool.url,
      category_id: tool.category_id,
      is_premium: tool.is_premium,
      price: tool.price || "",
      rating: tool.rating,
      features: tool.features || [],
      logo_url: tool.logo_url || "",
      screenshot_urls: tool.screenshot_urls || [],
      tags: tool.tags || [],
      popularity_score: tool.popularity_score,
      is_featured: tool.is_featured,
      is_active: tool.is_active,
    });
    setShowToolDialog(true);
  };

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
                AI Tools Management
              </h1>
              <p className="text-gray-600 mt-2">Manage AI tools and categories for student productivity</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCategoryForm();
                      setEditingCategory(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                    </Button>
                  </DialogTrigger>
                <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        resetToolForm();
                        setEditingTool(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tool
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-w-4xl bg-white border border-gray-200 shadow-lg !bg-white"
                    style={{
                      backgroundColor: "white",
                      color: "black",
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">
                        {editingTool ? "Edit AI Tool" : "Add New AI Tool"}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        {editingTool ? "Update the AI tool information" : "Add a new AI tool to the platform"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Tool Name *</label>
                          <Input
                            value={toolForm.name}
                            onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                            placeholder="e.g., ChatGPT"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category *</label>
                          <Select value={toolForm.category_id} onValueChange={(value) => setToolForm({ ...toolForm, category_id: value })}>
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Description *</label>
                        <Textarea
                          value={toolForm.description}
                          onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                          placeholder="Brief description of the AI tool"
                          className="bg-white border-gray-300"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">URL *</label>
                        <Input
                          value={toolForm.url}
                          onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })}
                          placeholder="https://example.com"
                          className="bg-white border-gray-300"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Rating</label>
                          <Input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={toolForm.rating}
                            onChange={(e) => setToolForm({ ...toolForm, rating: parseFloat(e.target.value) || 0 })}
                            placeholder="4.5"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Popularity Score</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={toolForm.popularity_score}
                            onChange={(e) => setToolForm({ ...toolForm, popularity_score: parseInt(e.target.value) || 0 })}
                            placeholder="85"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Price (if premium)</label>
                          <Input
                            value={toolForm.price}
                            onChange={(e) => setToolForm({ ...toolForm, price: e.target.value })}
                            placeholder="$20/month"
                            className="bg-white border-gray-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Logo URL</label>
                        <Input
                          value={toolForm.logo_url}
                          onChange={(e) => setToolForm({ ...toolForm, logo_url: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="bg-white border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Features (one per line)</label>
                        <Textarea
                          value={toolForm.features.join('\n')}
                          onChange={(e) => setToolForm({ ...toolForm, features: e.target.value.split('\n').filter(f => f.trim()) })}
                          placeholder="AI Writing&#10;Grammar Check&#10;Content Generation"
                          className="bg-white border-gray-300"
                          rows={4}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Tags (comma separated)</label>
                        <Input
                          value={toolForm.tags.join(', ')}
                          onChange={(e) => setToolForm({ ...toolForm, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                          placeholder="writing, AI, productivity"
                          className="bg-white border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Screenshot URLs (one per line)</label>
                        <Textarea
                          value={toolForm.screenshot_urls.join('\n')}
                          onChange={(e) => setToolForm({ ...toolForm, screenshot_urls: e.target.value.split('\n').filter(s => s.trim()) })}
                          placeholder="https://example.com/screenshot1.png&#10;https://example.com/screenshot2.png"
                          className="bg-white border-gray-300"
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_premium"
                            checked={toolForm.is_premium}
                            onChange={(e) => setToolForm({ ...toolForm, is_premium: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="is_premium" className="text-sm font-medium text-gray-700">Premium Tool</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_featured"
                            checked={toolForm.is_featured}
                            onChange={(e) => setToolForm({ ...toolForm, is_featured: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">Featured</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={toolForm.is_active}
                            onChange={(e) => setToolForm({ ...toolForm, is_active: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowToolDialog(false)}
                        className="text-gray-700 border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={editingTool ? handleUpdateTool : handleCreateTool}
                        disabled={!toolForm.name || !toolForm.url || !toolForm.category_id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {editingTool ? "Update Tool" : "Add Tool"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                  <DialogContent
                    className="max-w-2xl bg-white border border-gray-200 shadow-lg !bg-white"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Edit Category" : "Create New AI Tool Category"}</DialogTitle>
                    <DialogDescription>
                      {editingCategory ? "Update category information" : "Add a new category for AI tools"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                        placeholder="e.g., Writing & Content"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        placeholder="Brief description of the category"
                        rows={3}
                      />
                    </div>

                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                      {editingCategory ? "Update" : "Create"} Category
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Categories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total AI Tools</p>
                  <p className="text-2xl font-bold">{tools.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Featured Tools</p>
                  <p className="text-2xl font-bold">{tools.filter((tool) => tool.is_featured).length}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Premium Tools</p>
                  <p className="text-2xl font-bold">{tools.filter((tool) => tool.is_premium).length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Tool Categories
            </CardTitle>
            <CardDescription>Manage categories for organizing AI tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">

                        <div>
                          <h3 className="font-semibold">{category.title}</h3>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    <div className="text-xs text-gray-500">
                      <span>Tools: {category.tool_count || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tools Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>AI Tools</CardTitle>
                <CardDescription>Manage AI tools and their information</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {tool.logo_url ? (
                          <img src={tool.logo_url} alt={tool.name} className="w-8 h-8 rounded" />
                        ) : (
                          <span className="text-2xl">🤖</span>
                        )}
                        <div>
                          <p className="font-medium">{tool.name}</p>
                          <p className="text-sm text-gray-500">{tool.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{tool.category?.title || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant={tool.is_premium ? "default" : "outline"}>
                        {tool.is_premium ? `Premium ${tool.price || ""}` : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={tool.is_active ? "default" : "secondary"}>
                          {tool.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {tool.is_featured && <Badge variant="default">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {tool.rating.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => window.open(tool.url, "_blank")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditTool(tool)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
