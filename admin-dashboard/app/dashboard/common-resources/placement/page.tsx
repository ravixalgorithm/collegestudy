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
import { Plus, Edit, Trash2, Search, Download, Star, Eye, FileText, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// Updated interfaces for unified schema
interface Topic {
  id: string;
  category_id: string;
  title: string;
  description: string;
  difficulty: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  note_count?: number;
  total_downloads?: number;
}

interface Resource {
  id: string;
  category_id: string;
  topic_id: string;
  title: string;
  description: string;
  resource_type: 'note' | 'ai_tool';
  file_url?: string;
  file_type?: string;
  file_size?: string;
  tool_url?: string;
  pricing_type?: string;
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

export default function PlacementResourcesPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Form states
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    difficulty: "Beginner",
  });

  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    topic_id: "",
    file_url: "",
    file_type: "pdf",
    file_size: "",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchTopics();
    fetchResources();
  }, []);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("category_id", "placement")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      // Get stats for each topic
      const topicsWithStats = await Promise.all(
        (data || []).map(async (topic) => {
          const { data: stats } = await supabase
            .from("resources")
            .select("downloads, id")
            .eq("topic_id", topic.id)
            .eq("resource_type", "note")
            .eq("is_approved", true);

          return {
            ...topic,
            note_count: stats?.length || 0,
            total_downloads: stats?.reduce((sum, note) => sum + (note.downloads || 0), 0) || 0,
          };
        })
      );

      setTopics(topicsWithStats);
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load topics");
    }
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("resources")
        .select("*")
        .eq("category_id", "placement")
        .eq("resource_type", "note")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (selectedTopic !== "all") {
        query = query.eq("topic_id", selectedTopic);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedTopic, searchTerm]);

  const handleCreateTopic = async () => {
    try {
      const { error } = await supabase.from("topics").insert([
        {
          id: topicForm.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          category_id: "placement",
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          sort_order: topics.length + 1,
          is_active: true,
        },
      ]);

      if (error) throw error;

      toast.success("Topic created successfully");
      setShowTopicModal(false);
      resetTopicForm();
      fetchTopics();
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error("Failed to create topic");
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic) return;

    try {
      const { error } = await supabase.from("topics")
        .update({
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTopic.id);

      if (error) throw error;

      toast.success("Topic updated successfully");
      setShowTopicModal(false);
      setEditingTopic(null);
      resetTopicForm();
      fetchTopics();
    } catch (error) {
      console.error("Error updating topic:", error);
      toast.error("Failed to update topic");
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm("Are you sure? This will delete all resources in this topic.")) return;

    try {
      const { error } = await supabase.from("topics").delete().eq("id", topicId);

      if (error) throw error;

      toast.success("Topic deleted successfully");
      fetchTopics();
      if (selectedTopic === topicId) {
        setSelectedTopic("all");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic");
    }
  };

  const handleCreateResource = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("resources").insert([
        {
          category_id: "placement",
          topic_id: resourceForm.topic_id,
          title: resourceForm.title,
          description: resourceForm.description,
          resource_type: "note",
          file_url: resourceForm.file_url,
          file_type: resourceForm.file_type,
          file_size: resourceForm.file_size,
          tags: resourceForm.tags,
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

      toast.success("Resource created successfully");
      setShowResourceModal(false);
      resetResourceForm();
      fetchResources();
      fetchTopics(); // Refresh topic stats
    } catch (error) {
      console.error("Error creating resource:", error);
      toast.error("Failed to create resource");
    }
  };

  const handleUpdateResource = async () => {
    if (!editingResource) return;

    try {
      const { error } = await supabase.from("resources")
        .update({
          title: resourceForm.title,
          description: resourceForm.description,
          topic_id: resourceForm.topic_id,
          file_url: resourceForm.file_url,
          file_type: resourceForm.file_type,
          file_size: resourceForm.file_size,
          tags: resourceForm.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingResource.id);

      if (error) throw error;

      toast.success("Resource updated successfully");
      setShowResourceModal(false);
      setEditingResource(null);
      resetResourceForm();
      fetchResources();
      fetchTopics(); // Refresh topic stats
    } catch (error) {
      console.error("Error updating resource:", error);
      toast.error("Failed to update resource");
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const { error } = await supabase.from("resources").delete().eq("id", resourceId);

      if (error) throw error;

      toast.success("Resource deleted successfully");
      fetchResources();
      fetchTopics(); // Refresh topic stats
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    }
  };

  const toggleResourceStatus = async (resourceId: string, field: "is_active" | "is_featured" | "is_approved", value: boolean) => {
    try {
      const { error } = await supabase
        .from("resources")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", resourceId);

      if (error) throw error;

      const statusText = field === "is_active" ? "activation" : field === "is_featured" ? "featured" : "approval";
      toast.success(`Resource ${statusText} updated successfully`);
      fetchResources();
    } catch (error) {
      console.error(`Error updating resource ${field}:`, error);
      toast.error(`Failed to update resource ${field}`);
    }
  };

  const resetTopicForm = () => {
    setTopicForm({
      title: "",
      description: "",
      difficulty: "Beginner",
    });
  };

  const resetResourceForm = () => {
    setResourceForm({
      title: "",
      description: "",
      topic_id: "",
      file_url: "",
      file_type: "pdf",
      file_size: "",
      tags: [],
    });
  };

  const openEditTopicModal = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description,
      difficulty: topic.difficulty,
    });
    setShowTopicModal(true);
  };

  const openEditResourceModal = (resource: Resource) => {
    setEditingResource(resource);
    setResourceForm({
      title: resource.title,
      description: resource.description,
      topic_id: resource.topic_id,
      file_url: resource.file_url || "",
      file_type: resource.file_type || "pdf",
      file_size: resource.file_size || "",
      tags: resource.tags || [],
    });
    setShowResourceModal(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Easy": return "bg-blue-100 text-blue-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-8 w-8 text-orange-600" />
              Placement Preparation
            </h1>
            <p className="text-gray-600 mt-1">Manage placement topics and resources</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showTopicModal} onOpenChange={setShowTopicModal}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetTopicForm(); setEditingTopic(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTopic ? "Edit Topic" : "Add New Topic"}</DialogTitle>
                  <DialogDescription>
                    {editingTopic ? "Update the topic details" : "Create a new placement topic"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Topic title"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Topic description"
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  />
                  <Select value={topicForm.difficulty} onValueChange={(value) => setTopicForm({ ...topicForm, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={editingTopic ? handleUpdateTopic : handleCreateTopic} className="flex-1">
                      {editingTopic ? "Update Topic" : "Create Topic"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowTopicModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showResourceModal} onOpenChange={setShowResourceModal}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { resetResourceForm(); setEditingResource(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingResource ? "Edit Resource" : "Add New Resource"}</DialogTitle>
                  <DialogDescription>
                    {editingResource ? "Update the resource details" : "Upload a new placement resource"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Resource title"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Resource description"
                    value={resourceForm.description}
                    onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  />
                  <Select value={resourceForm.topic_id} onValueChange={(value) => setResourceForm({ ...resourceForm, topic_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="File URL (Google Drive link)"
                    value={resourceForm.file_url}
                    onChange={(e) => setResourceForm({ ...resourceForm, file_url: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={resourceForm.file_type} onValueChange={(value) => setResourceForm({ ...resourceForm, file_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="File type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="doc">DOC</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="ppt">PPT</SelectItem>
                        <SelectItem value="pptx">PPTX</SelectItem>
                        <SelectItem value="zip">ZIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="File size (e.g., 2.5 MB)"
                      value={resourceForm.file_size}
                      onChange={(e) => setResourceForm({ ...resourceForm, file_size: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Tags (comma-separated)"
                    value={resourceForm.tags.join(", ")}
                    onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })}
                  />
                  <div className="flex gap-2">
                    <Button onClick={editingResource ? handleUpdateResource : handleCreateResource} className="flex-1">
                      {editingResource ? "Update Resource" : "Create Resource"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowResourceModal(false)}>
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
              <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resources.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resources.reduce((sum, resource) => sum + resource.downloads, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Resources</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resources.filter(resource => resource.is_approved).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardDescription>Manage placement topics and their resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic) => (
                <Card key={topic.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{topic.title}</CardTitle>
                      <Badge className={getDifficultyColor(topic.difficulty)}>
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {topic.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span>{topic.note_count} resources</span>
                      <span>{topic.total_downloads} downloads</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditTopicModal(topic)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteTopic(topic.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" onClick={() => setSelectedTopic(topic.id)} className="flex-1">
                        View Resources
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resources</CardTitle>
                <CardDescription>
                  {selectedTopic === "all" ? "All placement resources" : `Resources for ${topics.find(t => t.id === selectedTopic)?.title}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading resources...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{resource.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {resource.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {topics.find(t => t.id === resource.topic_id)?.title || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resource.file_type?.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {resource.downloads}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {resource.is_approved && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
                          {resource.is_featured && <Badge className="bg-blue-100 text-blue-800">Featured</Badge>}
                          {!resource.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditResourceModal(resource)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(resource.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => toggleResourceStatus(resource.id, "is_approved", !resource.is_approved)}
                          >
                            {resource.is_approved ? "Unapprove" : "Approve"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {resources.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No resources found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
