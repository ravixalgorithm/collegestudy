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
      // Load branches first
      const branchesRes = await supabase
        .from("branches")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name");

      if (branchesRes.data) setBranches(branchesRes.data);

      // Try to load hierarchy with RPC, fallback if not available
      let hierarchyData = [];
      try {
        const hierarchyRes = await supabase.rpc("get_branch_hierarchy");
        if (hierarchyRes.data) {
          hierarchyData = hierarchyRes.data;
        }
      } catch (rpcError) {
        console.warn("RPC function not available, using fallback hierarchy query");
        hierarchyData = await buildBranchHierarchyFallback();
      }
      setBranchHierarchy(hierarchyData);

      // Load subjects with branch relationships
      const subjectsRes = await supabase
        .from("subjects")
        .select(
          `
          *,
          subject_branches (
            branch_id,
            branches (
              id,
              name,
              code
            )
          )
        `,
        )
        .order("name");

      // Process subjects data to ensure branch_codes is always an array
      if (subjectsRes.data) {
        const processedSubjects = subjectsRes.data.map((subject) => {
          try {
            const branchData = subject.subject_branches || [];

            // Handle various data formats that might come from the database
            let branchCodes = [];
            let branchNames = [];
            let branchIds = [];

            if (Array.isArray(branchData)) {
              branchCodes = branchData.map((sb) => sb?.branches?.code || sb?.code).filter(Boolean);
              branchNames = branchData.map((sb) => sb?.branches?.name || sb?.name).filter(Boolean);
              branchIds = branchData.map((sb) => sb?.branch_id || sb?.id).filter(Boolean);
            } else if (branchData && typeof branchData === "object") {
              // Handle single object case
              if (branchData.branches?.code) branchCodes = [branchData.branches.code];
              if (branchData.branches?.name) branchNames = [branchData.branches.name];
              if (branchData.branch_id) branchIds = [branchData.branch_id];
            }

            return {
              ...subject,
              branch_codes: branchCodes,
              branch_names: branchNames,
              branch_ids: branchIds,
            };
          } catch (error) {
            console.warn("Error processing subject:", subject.id, error);
            return {
              ...subject,
              branch_codes: [],
              branch_names: [],
              branch_ids: [],
            };
          }
        });
        setSubjects(processedSubjects);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Set empty arrays to prevent crashes
      setBranches([]);
      setBranchHierarchy([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function buildBranchHierarchyFallback(): Promise<BranchHierarchy[]> {
    try {
      // Get all branches
      const { data: branches } = await supabase
        .from("branches")
        .select("*")
        .order("display_order", { ascending: true });

      // Get all branch years
      const { data: branchYears } = await supabase.from("branch_years").select("*").order("year_number");

      // Get all branch semesters
      const { data: branchSemesters } = await supabase.from("branch_semesters").select("*").order("semester_number");

      const hierarchy: BranchHierarchy[] = [];

      if (branches && branchYears && branchSemesters) {
        branches.forEach((branch) => {
          const years = branchYears.filter((year) => year.branch_id === branch.id);

          years.forEach((year) => {
            const semesters = branchSemesters.filter((sem) => sem.branch_year_id === year.id);

            if (semesters.length > 0) {
              semesters.forEach((semester) => {
                hierarchy.push({
                  branch_id: branch.id,
                  branch_code: branch.code,
                  branch_name: branch.name,
                  branch_is_active: branch.is_active,
                  year_id: year.id,
                  year_number: year.year_number,
                  year_is_active: year.is_active,
                  semester_id: semester.id,
                  semester_number: semester.semester_number,
                  semester_label: semester.semester_label,
                  semester_is_active: semester.is_active,
                  semester_is_current: semester.is_current,
                });
              });
            } else {
              // Year without semesters
              hierarchy.push({
                branch_id: branch.id,
                branch_code: branch.code,
                branch_name: branch.name,
                branch_is_active: branch.is_active,
                year_id: year.id,
                year_number: year.year_number,
                year_is_active: year.is_active,
                semester_id: "",
                semester_number: 0,
                semester_label: "",
                semester_is_active: false,
                semester_is_current: false,
              });
            }
          });
        });
      }

      return hierarchy;
    } catch (error) {
      console.error("Error building hierarchy fallback:", error);
      return [];
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
      } else if (error.message.includes("row-level security")) {
        alert("Error: Permission denied. Please check your access permissions and try again.");
      } else {
        alert(`Error saving subject: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subjectId: string) {
    if (!confirm("Are you sure you want to delete this subject? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", subjectId);

      if (error) throw error;

      alert("Subject deleted successfully!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting subject:", error);
      alert(`Error deleting subject: ${error.message}`);
    }
  }

  function openEditModal(subject: Subject) {
    setEditingSubject(subject);
    setFormData({
      name: subject.name || "",
      code: subject.code || "",
      branch_ids: Array.isArray(subject.branch_ids)
        ? subject.branch_ids
        : subject.branch_ids
          ? [subject.branch_ids]
          : [],
      semester: (subject.semester || 1).toString(),
      credits: (subject.credits || 3).toString(),
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
      // Try RPC function first
      const { error } = await supabase.rpc("toggle_branch_status", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_is_active: !currentStatus,
      });

      if (error) {
        // Fallback to direct table updates if RPC doesn't exist
        if (error.message?.includes("function") && error.message?.includes("does not exist")) {
          console.warn("toggle_branch_status function not found, using direct update");

          const tableName =
            entityType === "branch" ? "branches" : entityType === "year" ? "branch_years" : "branch_semesters";

          const { error: updateError } = await supabase
            .from(tableName)
            .update({ is_active: !currentStatus })
            .eq("id", entityId);

          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }

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
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" />
                      Loading branches...
                    </div>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
                    <p className="text-gray-600">No academic branches have been set up yet.</p>
                  </div>
                ) : (
                  // Display branches - either from hierarchy or fallback to basic branch list
                  (Object.keys(groupedHierarchy).length > 0
                    ? Object.values(groupedHierarchy)
                    : branches.map((branch) => ({
                        branch: branch,
                        years: {},
                      }))
                  ).map((branchGroup: any) => {
                    const branch = branchGroup.branch;
                    const isExpanded = expandedBranches.has(branch.id);
                    const hasYears = Object.keys(branchGroup.years || {}).length > 0;

                    return (
                      <div key={branch.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Branch Header */}
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleBranchExpansion(branch.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                disabled={!hasYears}
                              >
                                {hasYears ? (
                                  isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                  )
                                ) : (
                                  <div className="w-4 h-4" />
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
                                  {!hasYears && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      No Hierarchy
                                    </span>
                                  )}
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
                        {isExpanded && hasYears && (
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
                                                onClick={() =>
                                                  toggleStatus("semester", semester.id, semester.is_active)
                                                }
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

                        {/* Show message if branch has no hierarchy */}
                        {isExpanded && !hasYears && (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">No year/semester structure configured for this branch.</p>
                            <p className="text-xs mt-1">Run the database hierarchy setup to add years and semesters.</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Subjects Tab Content
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" />
                      Loading subjects...
                    </div>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
                    <p className="text-gray-600">No subjects have been configured yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branches
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Semester
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Credits
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subjects.map((subject) => (
                          <tr key={subject.id} className="hover:bg-gray-50">
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
                                {(() => {
                                  const branchCodes = Array.isArray(subject.branch_codes)
                                    ? subject.branch_codes
                                    : subject.branch_codes
                                      ? [subject.branch_codes]
                                      : [];

                                  return branchCodes.length > 0 ? (
                                    branchCodes.filter(Boolean).map((branchCode, index) => (
                                      <span
                                        key={`${subject.id}-${index}-${branchCode}`}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                                      >
                                        {branchCode}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-500">No branches</span>
                                  );
                                })()}
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
                                  title="Edit subject"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSubject(subject.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete subject"
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

        {/* Add/Edit Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
              {/* Fixed Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingSubject ? "Edit Subject" : "Add New Subject"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Data Structures and Algorithms"
                    />
                  </div>

                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Code *
                    </label>
                    <input
                      type="text"
                      id="code"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., CS201"
                    />
                  </div>

                  <div>
                    <label htmlFor="branches" className="block text-sm font-medium text-gray-700 mb-1">
                      Branches *
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                      {branches.map((branch) => (
                        <label key={branch.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.branch_ids.includes(branch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  branch_ids: [...formData.branch_ids, branch.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  branch_ids: formData.branch_ids.filter((id) => id !== branch.id),
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {branch.code} - {branch.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                        Semester *
                      </label>
                      <select
                        id="semester"
                        required
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-1">
                        Credits *
                      </label>
                      <input
                        type="number"
                        id="credits"
                        required
                        min="1"
                        max="6"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="3"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="syllabus_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Syllabus URL (Optional)
                    </label>
                    <input
                      type="url"
                      id="syllabus_url"
                      value={formData.syllabus_url}
                      onChange={(e) => setFormData({ ...formData, syllabus_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/syllabus.pdf"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of the subject"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center"
                  >
                    {saving && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                    {editingSubject ? "Update Subject" : "Add Subject"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
