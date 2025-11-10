"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, BookOpen, GraduationCap, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface Branch {
  id: string;
  code: string;
  name: string;
  full_name: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

interface BranchYear {
  id: string;
  branch_id: string;
  year_number: number;
  academic_year?: string;
  is_active: boolean;
  display_order: number;
}

interface BranchSemester {
  id: string;
  branch_year_id: string;
  branch_id: string;
  year_number: number;
  semester_number: number;
  semester_label: string;
  is_active: boolean;
  is_current: boolean;
  starts_at?: string;
  ends_at?: string;
}

interface BranchHierarchy {
  branch_id: string;
  branch_code: string;
  branch_name: string;
  branch_is_active: boolean;
  year_id: string;
  year_number: number;
  year_is_active: boolean;
  semester_id: string;
  semester_number: number;
  semester_label: string;
  semester_is_active: boolean;
  semester_is_current: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  credits: number;
  syllabus_url?: string;
  description?: string;
  branch_names?: string[];
  branch_codes?: string[];
  branch_ids?: string[];
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchHierarchy, setBranchHierarchy] = useState<BranchHierarchy[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"branches" | "subjects">("branches");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    branch_ids: [] as string[],
    semester: "",
    credits: "3",
    syllabus_url: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [branchesRes, hierarchyRes, subjectsRes] = await Promise.all([
        supabase.from("branches").select("*").order("display_order", { ascending: true }).order("name"),
        supabase.rpc("get_branch_hierarchy"),
        supabase.from("subjects_with_branches").select("*").order("name"),
      ]);

      if (branchesRes.data) setBranches(branchesRes.data);
      if (hierarchyRes.data) setBranchHierarchy(hierarchyRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
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
      // Validate that at least one branch is selected
      if (formData.branch_ids.length === 0) {
        alert("Please select at least one branch for this subject.");
        setSaving(false);
        return;
      }

      const subjectData = {
        name: formData.name,
        code: formData.code,
        semester: parseInt(formData.semester),
        credits: parseInt(formData.credits),
        syllabus_url: formData.syllabus_url || null,
        description: formData.description || null,
      };

      if (editingSubject) {
        // Update existing subject
        const { error: updateError } = await supabase.from("subjects").update(subjectData).eq("id", editingSubject.id);

        if (updateError) throw updateError;

        // Delete existing branch associations
        const { error: deleteError } = await supabase
          .from("subject_branches")
          .delete()
          .eq("subject_id", editingSubject.id);

        if (deleteError) throw deleteError;

        // Insert new branch associations
        const branchAssociations = formData.branch_ids.map((branchId) => ({
          subject_id: editingSubject.id,
          branch_id: branchId,
        }));

        const { error: insertError } = await supabase.from("subject_branches").insert(branchAssociations);

        if (insertError) throw insertError;

        alert(`Subject "${formData.name}" updated successfully with ${formData.branch_ids.length} branch(es)!`);
      } else {
        // Create new subject
        const { data: subjectResult, error: subjectError } = await supabase
          .from("subjects")
          .insert(subjectData)
          .select("id")
          .single();

        if (subjectError) throw subjectError;

        // Insert branch associations for new subject
        const branchAssociations = formData.branch_ids.map((branchId) => ({
          subject_id: subjectResult.id,
          branch_id: branchId,
        }));

        const { error: insertError } = await supabase.from("subject_branches").insert(branchAssociations);

        if (insertError) throw insertError;

        alert(`Subject "${formData.name}" added successfully to ${formData.branch_ids.length} branch(es)!`);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error saving subject:", error);
      if (error.message.includes("unique")) {
        alert(`Error: Subject code "${formData.code}" already exists. Please use a different code.`);
      } else if (error.message.includes("foreign key")) {
        alert("Error: Invalid branch selection. Please refresh the page and try again.");
      } else {
        alert(`Error saving subject: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subjectId: string) {
    try {
      // Get the user's authentication token for pre-check
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("You must be logged in to delete subjects.");
        return;
      }

      // Check for related notes first
      const { data: relatedNotes, error: notesError } = await supabase
        .from("notes")
        .select("id, title")
        .eq("subject_id", subjectId);

      if (notesError) {
        console.error("Error checking related notes:", notesError);
        alert("Error checking related notes. Please try again.");
        return;
      }

      // Show appropriate confirmation message
      let confirmMessage = "Are you sure you want to delete this subject?";
      if (relatedNotes && relatedNotes.length > 0) {
        confirmMessage += ` This will also delete ${relatedNotes.length} related notes.`;
      }

      if (!confirm(confirmMessage)) return;
      console.log("Attempting to delete subject with ID:", subjectId);

      // Call the API route to delete the subject
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete subject");
      }

      console.log("Subject deleted successfully:", result);

      // Show success message with details
      let successMessage = "Subject deleted successfully!";
      const deletedItems = [];

      if (result.deleted_notes_count > 0) {
        deletedItems.push(`${result.deleted_notes_count} notes`);
      }
      if (result.deleted_timetable_count > 0) {
        deletedItems.push(`${result.deleted_timetable_count} timetable entries`);
      }
      if (result.deleted_exam_schedule_count > 0) {
        deletedItems.push(`${result.deleted_exam_schedule_count} exam schedules`);
      }
      if (result.deleted_subject_branches_count > 0) {
        deletedItems.push(`${result.deleted_subject_branches_count} branch associations`);
      }

      const unlinkedItems = [];
      if (result.unlinked_forum_posts_count > 0) {
        unlinkedItems.push(`${result.unlinked_forum_posts_count} forum posts`);
      }
      if (result.unlinked_cgpa_records_count > 0) {
        unlinkedItems.push(`${result.unlinked_cgpa_records_count} CGPA records`);
      }

      if (deletedItems.length > 0) {
        successMessage += ` Deleted: ${deletedItems.join(", ")}.`;
      }
      if (unlinkedItems.length > 0) {
        successMessage += ` Unlinked: ${unlinkedItems.join(", ")}.`;
      }

      alert(successMessage);
      loadData();
    } catch (error: any) {
      console.error("Error deleting subject:", error);

      let errorMessage = "Error deleting subject: ";

      if (error?.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Unknown error occurred.";
      }

      alert(errorMessage);
    }
  }

  function openEditModal(subject: Subject) {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      branch_ids: subject.branch_ids || [],
      semester: subject.semester.toString(),
      credits: subject.credits.toString(),
      syllabus_url: subject.syllabus_url || "",
      description: subject.description || "",
    });
    setShowModal(true);
  }

  function resetForm() {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      branch_ids: [],
      semester: "",
      credits: "3",
      syllabus_url: "",
      description: "",
    });
  }

  async function toggleStatus(entityType: "branch" | "year" | "semester", entityId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase.rpc("toggle_branch_status", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_is_active: !currentStatus,
      });

      if (error) throw error;

      // Reload data to reflect changes
      await loadData();

      const statusText = !currentStatus ? "activated" : "deactivated";
      alert(`Successfully ${statusText} the ${entityType}!`);
    } catch (error: any) {
      console.error(`Error toggling ${entityType} status:`, error);
      alert(`Error: ${error.message}`);
    }
  }

  function toggleBranchExpansion(branchId: string) {
    setExpandedBranches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
      }
      return newSet;
    });
  }

  function toggleYearExpansion(yearId: string) {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(yearId)) {
        newSet.delete(yearId);
      } else {
        newSet.add(yearId);
      }
      return newSet;
    });
  }

  // Group hierarchy by branch
  const groupedHierarchy = branchHierarchy.reduce((acc, item) => {
    if (!acc[item.branch_id]) {
      acc[item.branch_id] = {
        branch: {
          id: item.branch_id,
          code: item.branch_code,
          name: item.branch_name,
          is_active: item.branch_is_active,
        },
        years: {},
      };
    }

    if (item.year_id && !acc[item.branch_id].years[item.year_id]) {
      acc[item.branch_id].years[item.year_id] = {
        id: item.year_id,
        year_number: item.year_number,
        is_active: item.year_is_active,
        semesters: [],
      };
    }

    if (item.semester_id && item.year_id) {
      acc[item.branch_id].years[item.year_id].semesters.push({
        id: item.semester_id,
        semester_number: item.semester_number,
        semester_label: item.semester_label,
        is_active: item.semester_is_active,
        is_current: item.semester_is_current,
      });
    }

    return acc;
  }, {} as any);

  const subjectsBySemester = subjects.reduce(
    (acc, subject) => {
      const key = subject.semester;
      if (!acc[key]) acc[key] = [];
      acc[key].push(subject);
      return acc;
    },
    {} as Record<number, Subject[]>,
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches & Subjects Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage academic branches, years, semesters and course subjects</p>
          </div>
          {activeTab === "subjects" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Subject</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Branches</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{branches.length}</p>
                <p className="text-xs text-gray-500">{branches.filter((b) => b.is_active).length} active</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Years</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {Object.values(groupedHierarchy).reduce(
                    (acc: number, branch: any) => acc + Object.keys(branch.years).length,
                    0,
                  )}
                </p>
                <p className="text-xs text-gray-500">4 per branch</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Semesters</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {Object.values(groupedHierarchy).reduce(
                    (acc: number, branch: any) =>
                      acc +
                      Object.values(branch.years).reduce(
                        (yearAcc: number, year: any) => yearAcc + year.semesters.length,
                        0,
                      ),
                    0,
                  )}
                </p>
                <p className="text-xs text-gray-500">8 per branch</p>
              </div>
              <BookOpen className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Subjects</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{subjects.length}</p>
                <p className="text-xs text-gray-500">Multi-branch supported</p>
              </div>
              <BookOpen className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("branches")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "branches"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Branches ({branches.length})
              </button>
              <button
                onClick={() => setActiveTab("subjects")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "subjects"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Subjects ({subjects.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "branches" ? (
              <div className="space-y-4">
                {Object.values(groupedHierarchy).map((branchGroup: any) => {
                  const branch = branchGroup.branch;
                  const isExpanded = expandedBranches.has(branch.id);

                  return (
                    <div key={branch.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Branch Header */}
                      <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => toggleBranchExpansion(branch.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-gray-900">{branch.code}</h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    branch.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {branch.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{branch.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleStatus("branch", branch.id, branch.is_active)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                branch.is_active
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {branch.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Years and Semesters */}
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          {Object.values(branchGroup.years).map((year: any) => {
                            const isYearExpanded = expandedYears.has(year.id);

                            return (
                              <div key={year.id} className="border border-gray-100 rounded-lg">
                                {/* Year Header */}
                                <div className="p-3 bg-gray-25 border-b border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => toggleYearExpansion(year.id)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        {isYearExpanded ? (
                                          <ChevronDown className="w-3 h-3 text-gray-600" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-gray-600" />
                                        )}
                                      </button>
                                      <span className="font-medium text-gray-900">Year {year.year_number}</span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          year.is_active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {year.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => toggleStatus("year", year.id, year.is_active)}
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        year.is_active
                                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                                          : "bg-green-50 text-green-600 hover:bg-green-100"
                                      }`}
                                    >
                                      {year.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                  </div>
                                </div>

                                {/* Semesters */}
                                {isYearExpanded && (
                                  <div className="p-3 grid grid-cols-2 gap-2">
                                    {year.semesters.map((semester: any) => (
                                      <div
                                        key={semester.id}
                                        className={`p-2 rounded border ${
                                          semester.is_active
                                            ? "border-green-200 bg-green-50"
                                            : "border-gray-200 bg-gray-50"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium text-gray-900">
                                            Sem {semester.semester_number}
                                          </span>
                                          <div className="flex items-center space-x-1">
                                            {semester.is_current && (
                                              <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                                Current
                                              </span>
                                            )}
                                            <button
                                              onClick={() => toggleStatus("semester", semester.id, semester.is_active)}
                                              className={`px-1 py-0.5 rounded text-xs ${
                                                semester.is_active
                                                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                                                  : "bg-green-100 text-green-600 hover:bg-green-200"
                                              }`}
                                            >
                                              {semester.is_active ? "✕" : "✓"}
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-600">{semester.semester_label}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(groupedHierarchy).length === 0 && (
                  <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branches Found</h3>
                    <p className="text-gray-600">No branches are configured in the system yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-gray-500">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Yet</h3>
                    <p className="text-gray-600 mb-4">Get started by adding your first subject</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Subject</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Subject Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branches</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {subjects.map((subject) => (
                          <tr key={subject.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {subject.code}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{subject.name}</p>
                                {subject.description && (
                                  <p className="text-xs text-gray-500 line-clamp-1">{subject.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {subject.branch_codes?.map((branchCode, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                                  >
                                    {branchCode}
                                  </span>
                                )) || <span className="text-xs text-gray-500">No branches</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Sem {subject.semester}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{subject.credits}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openEditModal(subject)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSubject(subject.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingSubject ? "Edit Subject" : "Add New Subject"}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., CS101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Data Structures and Algorithms"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branches *
                    {formData.branch_ids.length === 0 && <span className="text-red-500 text-xs ml-1">(Required)</span>}
                  </label>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, branch_ids: branches.map((b) => b.id) })}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, branch_ids: [] })}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div
                    className={`space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 ${
                      formData.branch_ids.length === 0 ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  >
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.branch_ids.includes(branch.id)}
                          onChange={(e) => {
                            const newBranchIds = e.target.checked
                              ? [...formData.branch_ids, branch.id]
                              : formData.branch_ids.filter((id) => id !== branch.id);
                            setFormData({ ...formData, branch_ids: newBranchIds });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {branch.code} - {branch.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            branch.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {branch.is_active ? "Active" : "Inactive"}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${formData.branch_ids.length === 0 ? "text-red-500" : "text-gray-500"}`}>
                    {formData.branch_ids.length === 0
                      ? "Please select at least one branch"
                      : `Selected: ${formData.branch_ids.length} of ${branches.length} branches`}
                  </p>
                  {formData.branch_ids.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-1">Selected Branches:</p>
                      <div className="flex flex-wrap gap-1">
                        {formData.branch_ids.map((branchId) => {
                          const branch = branches.find((b) => b.id === branchId);
                          return branch ? (
                            <span
                              key={branchId}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                            >
                              {branch.code}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                  <select
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Brief description of the subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus URL</label>
                <input
                  type="url"
                  value={formData.syllabus_url}
                  onChange={(e) => setFormData({ ...formData, syllabus_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Link to syllabus document</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || formData.branch_ids.length === 0}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingSubject ? "Update Subject" : "Add Subject"}</span>
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
