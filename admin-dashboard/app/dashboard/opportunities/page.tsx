"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter, Edit, Trash2, X, Loader2, Briefcase, Clock, MapPin, DollarSign } from "lucide-react";

interface Opportunity {
  id: string;
  title: string;
  type: string;
  company_name?: string;
  description: string;
  eligibility?: string;
  application_link?: string;
  deadline?: string;
  stipend?: string;
  location?: string;
  is_remote: boolean;
  is_published: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    type: "Internship",
    company_name: "",
    description: "",
    eligibility: "",
    application_link: "",
    deadline: "",
    stipend: "",
    location: "",
    is_remote: false,
    is_published: true,
    target_branches: [] as string[],
    target_years: [] as number[],
  });

  const opportunityTypes = ["Internship", "Job", "Scholarship", "Competition", "Workshop", "Hackathon"];

  useEffect(() => {
    loadData();
  }, [filterType]);

  async function loadData() {
    setLoading(true);
    try {
      let query = supabase.from("opportunities").select("*").order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("type", filterType);
      }

      const [opportunitiesRes, branchesRes] = await Promise.all([
        query,
        supabase.from("branches").select("*").order("name"),
      ]);

      if (opportunitiesRes.data) setOpportunities(opportunitiesRes.data);
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
      const opportunityData = {
        title: formData.title,
        type: formData.type,
        company_name: formData.company_name || null,
        description: formData.description,
        eligibility: formData.eligibility || null,
        application_link: formData.application_link || null,
        deadline: formData.deadline || null,
        stipend: formData.stipend || null,
        location: formData.location || null,
        is_remote: formData.is_remote,
        is_published: formData.is_published,
        target_branches: formData.target_branches.length > 0 ? formData.target_branches : null,
        target_years: formData.target_years.length > 0 ? formData.target_years : null,
      };

      if (editingOpportunity) {
        const { error } = await supabase.from("opportunities").update(opportunityData).eq("id", editingOpportunity.id);
        if (error) throw error;
        alert("Opportunity updated successfully!");
      } else {
        const { error } = await supabase.from("opportunities").insert(opportunityData);
        if (error) throw error;
        alert("Opportunity created successfully!");
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error saving opportunity:", error);
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOpportunity(opportunityId: string) {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      const { error } = await supabase.from("opportunities").delete().eq("id", opportunityId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      alert("Error deleting opportunity");
    }
  }

  function openEditModal(opportunity: Opportunity) {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      type: opportunity.type,
      company_name: opportunity.company_name || "",
      description: opportunity.description,
      eligibility: opportunity.eligibility || "",
      application_link: opportunity.application_link || "",
      deadline: opportunity.deadline || "",
      stipend: opportunity.stipend || "",
      location: opportunity.location || "",
      is_remote: opportunity.is_remote,
      is_published: opportunity.is_published,
      target_branches: [],
      target_years: [],
    });
    setShowModal(true);
  }

  function resetForm() {
    setEditingOpportunity(null);
    setFormData({
      title: "",
      type: "Internship",
      company_name: "",
      description: "",
      eligibility: "",
      application_link: "",
      deadline: "",
      stipend: "",
      location: "",
      is_remote: false,
      is_published: true,
      target_branches: [],
      target_years: [],
    });
  }

  function toggleYear(year: number) {
    setFormData((prev) => ({
      ...prev,
      target_years: prev.target_years.includes(year)
        ? prev.target_years.filter((y) => y !== year)
        : [...prev.target_years, year],
    }));
  }

  function toggleBranch(branchId: string) {
    setFormData((prev) => ({
      ...prev,
      target_branches: prev.target_branches.includes(branchId)
        ? prev.target_branches.filter((b) => b !== branchId)
        : [...prev.target_branches, branchId],
    }));
  }

  const filteredOpportunities = opportunities.filter(
    (opp) =>
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeOpportunities = opportunities.filter((o) => {
    if (!o.deadline) return true;
    return new Date(o.deadline) >= new Date();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opportunities Management</h1>
            <p className="text-sm text-gray-600 mt-1">Post jobs, internships, scholarships, and competitions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Post Opportunity</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Opportunities</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{opportunities.length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeOpportunities.length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Published</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {opportunities.filter((o) => o.is_published).length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Drafts</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {opportunities.filter((o) => !o.is_published).length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-amber-500" />
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
                placeholder="Search opportunities..."
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
                {opportunityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-gray-500">Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No opportunities found</div>
          ) : (
            filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${opportunity.type === "Internship" ? "bg-blue-100 text-blue-700" : opportunity.type === "Job" ? "bg-green-100 text-green-700" : opportunity.type === "Scholarship" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}
                      >
                        {opportunity.type}
                      </span>
                      {!opportunity.is_published && (
                        <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2">{opportunity.title}</h3>
                  {opportunity.company_name && <p className="text-sm text-gray-600 mb-2">{opportunity.company_name}</p>}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{opportunity.description}</p>

                  <div className="space-y-1.5 mb-4">
                    {opportunity.stipend && (
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{opportunity.stipend}</span>
                      </div>
                    )}
                    {opportunity.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {opportunity.location} {opportunity.is_remote && "• Remote"}
                        </span>
                      </div>
                    )}
                    {opportunity.deadline && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(opportunity)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteOpportunity(opportunity.id)}
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
              <h2 className="text-xl font-bold text-gray-900">
                {editingOpportunity ? "Edit Opportunity" : "Post New Opportunity"}
              </h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Software Developer Intern"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {opportunityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company/Organization</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Google"
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
                  placeholder="Describe the opportunity..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
                <textarea
                  value={formData.eligibility}
                  onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Who can apply..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stipend/Salary</label>
                  <input
                    type="text"
                    value={formData.stipend}
                    onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., $1000/month"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Bangalore, India"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Link</label>
                  <input
                    type="url"
                    value={formData.application_link}
                    onChange={(e) => setFormData({ ...formData, application_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Years (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => toggleYear(year)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.target_years.includes(year) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      Year {year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_remote}
                    onChange={(e) => setFormData({ ...formData, is_remote: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Remote opportunity</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Publish immediately</span>
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
                    <span>{editingOpportunity ? "Update Opportunity" : "Post Opportunity"}</span>
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
