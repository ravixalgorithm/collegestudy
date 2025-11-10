"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Calendar, MapPin, Users, Eye, Edit, Trash2, X, Loader2, Upload } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  poster_url?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  organizer?: string;
  categories?: string[];
  max_participants?: number;
  registration_deadline?: string;
  is_published: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    organizer: "",
    categories: [] as string[],
    max_participants: "",
    registration_deadline: "",
    is_published: true,
    poster_file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [eventsRes, branchesRes] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("branches").select("*").order("name"),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let posterUrl = editingEvent?.poster_url;

      // Upload poster if new file selected
      if (formData.poster_file) {
        const fileExt = formData.poster_file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("posters").upload(filePath, formData.poster_file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("posters").getPublicUrl(filePath);
        posterUrl = publicUrl;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        location: formData.location || null,
        organizer: formData.organizer || null,
        categories: formData.categories.length > 0 ? formData.categories : null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        registration_deadline: formData.registration_deadline || null,
        is_published: formData.is_published,
        poster_url: posterUrl,
      };

      if (editingEvent) {
        const { error } = await supabase.from("events").update(eventData).eq("id", editingEvent.id);
        if (error) throw error;
        alert("Event updated successfully!");
      } else {
        const { error } = await supabase.from("events").insert(eventData);
        if (error) throw error;
        alert("Event created successfully!");
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error saving event:", error);
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string, posterUrl?: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      // Delete poster from storage if exists
      if (posterUrl) {
        const filePath = posterUrl.split("/posters/")[1];
        if (filePath) {
          await supabase.storage.from("posters").remove([`posters/${filePath}`]);
        }
      }

      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;

      loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Error deleting event");
    }
  }

  function openEditModal(event: Event) {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      location: event.location || "",
      organizer: event.organizer || "",
      categories: event.categories || [],
      max_participants: event.max_participants?.toString() || "",
      registration_deadline: event.registration_deadline || "",
      is_published: event.is_published,
      poster_file: null,
    });
    setShowModal(true);
  }

  function resetForm() {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      organizer: "",
      categories: [],
      max_participants: "",
      registration_deadline: "",
      is_published: true,
      poster_file: null,
    });
  }

  function toggleCategory(category: string) {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }

  const filteredEvents = events.filter((event) => event.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const upcomingEvents = events.filter((e) => new Date(e.event_date) >= new Date());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
            <p className="text-sm text-gray-600 mt-1">Create and manage college events</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Event</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Events</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{events.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Upcoming</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{upcomingEvents.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Published</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{events.filter((e) => e.is_published).length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Drafts</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{events.filter((e) => !e.is_published).length}</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-gray-500">Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No events found</div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {event.poster_url ? (
                  <img src={event.poster_url} alt={event.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{event.title}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        event.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {event.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{new Date(event.event_date).toLocaleDateString()}</span>
                      {event.start_time && <span className="ml-1">• {event.start_time}</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    {event.max_participants && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Max: {event.max_participants}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(event)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id, event.poster_url)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingEvent ? "Edit Event" : "Create Event"}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Tech Fest 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Describe the event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Main Auditorium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organizer</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., CSE Department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {["Technical", "Cultural", "Sports", "Workshop", "Competition", "Seminar"].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.categories.includes(category)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poster Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, poster_file: e.target.files?.[0] || null })}
                    className="hidden"
                    id="poster-upload"
                  />
                  <label htmlFor="poster-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {formData.poster_file ? formData.poster_file.name : "Click to upload poster"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG (Max 5MB)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                  Publish event immediately
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingEvent ? "Update Event" : "Create Event"}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
