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
import { Plus, Edit, Trash2, Search, Download, Star, Eye, FileText, Code, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface DSATopic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  technologies: string[];
  is_active: boolean;
  note_count?: number;
  total_downloads?: number;
}

interface DSANote {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: string;
  thumbnail_url?: string;
  downloads: number;
  views: number;
  rating: number;
  rating_count: number;
  is_verified: boolean;
  is_featured: boolean;
  is_approved: boolean;
  tags: string[];
  uploaded_by: string;
  approved_by?: string;
  meta_data?: any;
  created_at: string;
  updated_at?: string;
  uploader_name?: string;
}

export default function DSANotesManagement() {
  const [topics, setTopics] = useState<DSATopic[]>([]);
  const [notes, setNotes] = useState<DSANote[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DSATopic | null>(null);



  // Form states
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    technologies: [] as string[],
    is_active: true,
  });

  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<DSANote | null>(null);
  const [noteForm, setNoteForm] = useState({
    topic_id: "",
    title: "",
    description: "",
    file_url: "",
    file_type: "pdf",
    file_size: "",
    thumbnail_url: "",
    downloads: 0,
    views: 0,
    rating: 0,
    rating_count: 0,
    is_featured: false,
    is_approved: false,
    is_verified: false,
    tags: [] as string[],
    meta_data: {},
  });




  useEffect(() => {
    fetchTopics();
    fetchNotes();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [selectedTopic]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from("common_topics")
        .select("id, category_id, title, description, difficulty, technologies, is_active, created_at, updated_at")
        .eq("category_id", "dsa")
        .order("title");

      if (error) throw error;

      // Get note counts for each topic
      const topicsWithStats = await Promise.all(
        (data || []).map(async (topic) => {
          const { data: stats } = await supabase
            .from("common_notes")
            .select("downloads, id")
            .eq("topic_id", topic.id)
            .eq("is_approved", true);

          return {
            ...topic,
            technologies: topic.technologies || [],
            note_count: stats?.length || 0,
            total_downloads: stats?.reduce((sum, note) => sum + (note.downloads || 0), 0) || 0,
          };
        }),
      );

      setTopics(topicsWithStats);
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load DSA topics");
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("common_notes")
        .select("*")
        .eq("category_id", "dsa")
        .order("created_at", { ascending: false });

      if (selectedTopic !== "all") {
        query = query.eq("topic_id", selectedTopic);
      }

      const { data, error } = await query;
      if (error) throw error;

      const notesWithUploader = (data || []).map((note) => ({
        ...note,
        tags: note.tags || [],
        uploader_name: "Anonymous", // TODO: Fetch user details separately if needed
      }));

      setNotes(notesWithUploader);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    try {
      const { error } = await supabase.from("common_topics").insert([
        {
          id: topicForm.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          category_id: "dsa",
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          technologies: topicForm.technologies,
          is_active: topicForm.is_active,
        },
      ]);

      if (error) throw error;

      toast.success("DSA topic created successfully");
      setShowTopicDialog(false);
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
      const { error } = await supabase.from("common_topics")
        .update({
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          technologies: topicForm.technologies,
          is_active: topicForm.is_active,
        })
        .eq("id", editingTopic.id);

      if (error) throw error;

      toast.success("Topic updated successfully");
      setShowTopicDialog(false);
      resetTopicForm();
      setEditingTopic(null);
      fetchTopics();
    } catch (error) {
      console.error("Error updating topic:", error);
      toast.error("Failed to update topic");
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm("Are you sure? This will delete all notes in this topic.")) return;

    try {
      const { error } = await supabase.from("common_topics").delete().eq("id", topicId);

      if (error) throw error;

      toast.success("Topic deleted successfully");
      fetchTopics();
      fetchNotes();
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic");
    }
  };





  const resetTopicForm = () => {
    setTopicForm({
      title: "",
      description: "",
      difficulty: "Easy",
      technologies: [],
      is_active: true,
    });
  };



  const openEditTopic = (topic: DSATopic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description,
      difficulty: topic.difficulty,
      technologies: topic.technologies || [],
      is_active: topic.is_active,
    });
    setShowTopicDialog(true);
  };

  const handleCreateNote = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("common_notes").insert([
        {
          title: noteForm.title,
          description: noteForm.description,
          category_id: "dsa",
          topic_id: noteForm.topic_id,
          file_url: noteForm.file_url,
          file_type: noteForm.file_type,
          file_size: noteForm.file_size || null,
          thumbnail_url: noteForm.thumbnail_url || null,
          uploaded_by: user.data.user?.id || null,
          downloads: noteForm.downloads || 0,
          views: noteForm.views || 0,
          rating: noteForm.rating || 0,
          rating_count: noteForm.rating_count || 0,
          is_featured: noteForm.is_featured,
          is_approved: noteForm.is_approved,
          is_verified: noteForm.is_verified,
          tags: noteForm.tags,
          meta_data: noteForm.meta_data || {},
        },
      ]);

      if (error) throw error;

      toast.success("DSA note created successfully");
      setShowNoteDialog(false);
      resetNoteForm();
      fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    try {
      const { error } = await supabase.from("common_notes")
        .update({
          title: noteForm.title,
          description: noteForm.description,
          topic_id: noteForm.topic_id,
          file_url: noteForm.file_url,
          file_type: noteForm.file_type,
          file_size: noteForm.file_size,
          thumbnail_url: noteForm.thumbnail_url,
          downloads: noteForm.downloads,
          views: noteForm.views,
          rating: noteForm.rating,
          rating_count: noteForm.rating_count,
          is_featured: noteForm.is_featured,
          is_approved: noteForm.is_approved,
          is_verified: noteForm.is_verified,
          tags: noteForm.tags,
          meta_data: noteForm.meta_data,
        })
        .eq("id", editingNote.id);

      if (error) throw error;

      toast.success("Note updated successfully");
      setShowNoteDialog(false);
      resetNoteForm();
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error } = await supabase.from("common_notes").delete().eq("id", noteId);

      if (error) throw error;

      toast.success("Note deleted successfully");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const resetNoteForm = () => {
    setNoteForm({
      topic_id: "",
      title: "",
      description: "",
      file_url: "",
      file_type: "pdf",
      file_size: "",
      thumbnail_url: "",
      downloads: 0,
      views: 0,
      rating: 0,
      rating_count: 0,
      is_featured: false,
      is_approved: false,
      is_verified: false,
      tags: [],
      meta_data: {},
    });
  };

  const openEditNote = (note: DSANote) => {
    setEditingNote(note);
    setNoteForm({
      topic_id: note.topic_id,
      title: note.title,
      description: note.description,
      file_url: note.file_url,
      file_type: note.file_type,
      file_size: note.file_size || "",
      thumbnail_url: note.thumbnail_url || "",
      downloads: note.downloads || 0,
      views: note.views || 0,
      rating: note.rating || 0,
      rating_count: note.rating_count || 0,
      is_featured: note.is_featured,
      is_approved: note.is_approved,
      is_verified: note.is_verified,
      tags: note.tags || [],
      meta_data: note.meta_data || {},
    });
    setShowNoteDialog(true);
  };



  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Medium":
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Hard":
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Code className="h-6 w-6 text-blue-600" />
                </div>
                DSA Notes Management
              </h1>
              <p className="text-gray-600 mt-2">Manage Data Structures & Algorithms topics and notes</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetTopicForm();
                      setEditingTopic(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Topic
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-2xl bg-white border border-gray-200 shadow-lg !bg-white"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  <DialogHeader>
                    <DialogTitle>{editingTopic ? "Edit Topic" : "Create New DSA Topic"}</DialogTitle>
                    <DialogDescription>
                      {editingTopic ? "Update topic information" : "Add a new topic to DSA category"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={topicForm.title}
                        onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                        placeholder="e.g., Arrays & Strings"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Difficulty</label>
                      <Select
                        value={topicForm.difficulty}
                        onValueChange={(value) => setTopicForm({ ...topicForm, difficulty: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={topicForm.description}
                        onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                        placeholder="Brief description of the topic"
                        rows={3}
                      />
                    </div>

                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowTopicDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}>
                      {editingTopic ? "Update" : "Create"} Topic
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetNoteForm();
                      setEditingNote(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-2xl bg-white border border-gray-200 shadow-lg !bg-white"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  <DialogHeader>
                    <DialogTitle>{editingNote ? "Edit Note" : "Add New DSA Note"}</DialogTitle>
                    <DialogDescription>
                      {editingNote ? "Update note information" : "Add a new note to DSA resources"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Topic</label>
                      <Select
                        value={noteForm.topic_id}
                        onValueChange={(value) => setNoteForm({ ...noteForm, topic_id: value })}
                      >
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">File Type</label>
                      <Select
                        value={noteForm.file_type}
                        onValueChange={(value) => setNoteForm({ ...noteForm, file_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="doc">Document</SelectItem>
                          <SelectItem value="ppt">Presentation</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                        placeholder="Enter note title"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={noteForm.description}
                        onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                        placeholder="Brief description of the note"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">File URL</label>
                      <Input
                        value={noteForm.file_url}
                        onChange={(e) => setNoteForm({ ...noteForm, file_url: e.target.value })}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">File Size</label>
                      <Input
                        value={noteForm.file_size}
                        onChange={(e) => setNoteForm({ ...noteForm, file_size: e.target.value })}
                        placeholder="e.g., 2.5 MB"
                      />
                    </div>
                    <div className="flex items-center space-x-4 pt-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={noteForm.is_featured}
                          onChange={(e) => setNoteForm({ ...noteForm, is_featured: e.target.checked })}
                          className="mr-2"
                        />
                        Featured
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={noteForm.is_approved}
                          onChange={(e) => setNoteForm({ ...noteForm, is_approved: e.target.checked })}
                          className="mr-2"
                        />
                        Approved
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={noteForm.is_verified}
                          onChange={(e) => setNoteForm({ ...noteForm, is_verified: e.target.checked })}
                          className="mr-2"
                        />
                        Verified
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingNote ? handleUpdateNote : handleCreateNote}>
                      {editingNote ? "Update" : "Create"} Note
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
                  <p className="text-sm font-medium text-gray-600">Total Topics</p>
                  <p className="text-2xl font-bold">{topics.length}</p>
                </div>
                <Code className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Notes</p>
                  <p className="text-2xl font-bold">{notes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Downloads</p>
                  <p className="text-2xl font-bold">
                    {topics.reduce((sum, topic) => sum + (topic.total_downloads || 0), 0)}
                  </p>
                </div>
                <Download className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved Notes</p>
                  <p className="text-2xl font-bold">{notes.filter((note) => note.is_approved).length}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              DSA Topics
            </CardTitle>
            <CardDescription>Manage topics within the DSA category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic) => (
                <Card key={topic.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">

                        <div>
                          <h3 className="font-semibold">{topic.title}</h3>
                          <Badge variant="secondary" className={getDifficultyColor(topic.difficulty)}>
                            {topic.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditTopic(topic)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTopic(topic.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Notes:</span> {topic.note_count || 0}
                      </div>
                      <div>
                        <span className="text-gray-500">Downloads:</span> {topic.total_downloads || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>DSA Notes</CardTitle>
                <CardDescription>Manage notes and resources for DSA topics</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{note.title}</p>
                        <p className="text-sm text-gray-500">{note.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{topics.find((t) => t.id === note.topic_id)?.title || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{note.file_type?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={note.is_approved ? "default" : "secondary"}>
                          {note.is_approved ? "Approved" : "Pending"}
                        </Badge>
                        {note.is_featured && <Badge variant="default">Featured</Badge>}
                        {note.is_verified && <Badge variant="default">Verified</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {note.downloads}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {note.rating.toFixed(1)} ({note.rating_count})
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditNote(note)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note.id)}>
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
