"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  Crown, 
  Shield, 
  AlertTriangle,
  Mail,
  ExternalLink,
  Users,
  Calendar
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  credits: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  branch_count?: number;
}

interface UserRole {
  role: "student" | "admin" | "owner";
  canManageSubjects: boolean;
}

interface OwnerContact {
  name: string;
  email: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userRole, setUserRole] = useState<UserRole>({ role: "student", canManageSubjects: false });
  const [owners, setOwners] = useState<OwnerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    semester: 1,
    credits: 4,
    description: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Check user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.rpc("get_user_role", { user_id: user.id });
        const { data: canManage } = await supabase.rpc("can_manage_subjects");
        
        setUserRole({
          role: roleData || "student",
          canManageSubjects: canManage || false
        });
      }

      // Load subjects
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select(`
          *,
          subject_branches(count)
        `)
        .eq("is_active", true)
        .order("semester", { ascending: true })
        .order("name", { ascending: true });

      if (subjectsData) {
        const processedSubjects = subjectsData.map(subject => ({
          ...subject,
          branch_count: subject.subject_branches?.length || 0
        }));
        setSubjects(processedSubjects);
      }

      // Load owner contacts for non-owners
      if (!userRole.canManageSubjects) {
        const { data: ownerData } = await supabase.rpc("get_owner_contacts");
        if (ownerData) {
          setOwners(ownerData);
        }
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubject() {
    if (!userRole.canManageSubjects) return;

    try {
      const { data } = await supabase.rpc("create_subject", {
        subject_name: newSubject.name,
        subject_code: newSubject.code,
        subject_semester: newSubject.semester,
        subject_credits: newSubject.credits,
        subject_description: newSubject.description || null
      });

      if (data?.success) {
        alert("Subject created successfully!");
        setShowAddModal(false);
        setNewSubject({ name: "", code: "", semester: 1, credits: 4, description: "" });
        loadData();
      } else {
        alert(data?.message || "Failed to create subject");
      }
    } catch (error) {
      console.error("Error creating subject:", error);
      alert("Failed to create subject");
    }
  }

  async function handleDeleteSubject(subjectId: string) {
    if (!userRole.canManageSubjects) return;
    if (!confirm("Are you sure you want to delete this subject? This will also delete all related notes and records.")) return;

    try {
      const { data } = await supabase.rpc("delete_subject", { subject_id: subjectId });

      if (data?.success) {
        alert("Subject deleted successfully!");
        loadData();
      } else {
        alert(data?.message || "Failed to delete subject");
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Failed to delete subject");
    }
  }

  const subjectsBySemester = subjects.reduce((acc, subject) => {
    if (!acc[subject.semester]) {
      acc[subject.semester] = [];
    }
    acc[subject.semester].push(subject);
    return acc;
  }, {} as Record<number, Subject[]>);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subjects Management</h1>
            <p className="text-gray-600 mt-1">
              {userRole.canManageSubjects 
                ? "Create and manage academic subjects across all semesters"
                : "View academic subjects and their details"
              }
            </p>
          </div>
          {userRole.canManageSubjects && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-5 h-5" />
              <span>Add Subject</span>
            </button>
          )}
        </div>

        {/* Permission Notice for Non-Owners */}
        {!userRole.canManageSubjects && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="bg-yellow-100 p-2 rounded-lg mr-4 flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  {userRole.role === "admin" ? "Admin Notice" : "Access Restricted"}
                </h3>
                <p className="text-yellow-800 mb-4">
                  {userRole.role === "admin" 
                    ? "As an admin, you can view subjects but cannot create or delete them. Only platform owners can manage subjects to maintain academic structure integrity."
                    : "You can view subjects but cannot modify them. Contact an admin or owner for changes."
                  }
                </p>
                
                {userRole.role === "admin" && owners.length > 0 && (
                  <div>
                    <p className="text-yellow-800 font-medium mb-3">Need a new subject added? Contact the platform owners:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {owners.map((owner, index) => (
                        <a
                          key={index}
                          href={`mailto:${owner.email}?subject=Subject Addition Request&body=Hi ${owner.name},%0D%0A%0D%0AI need to add a new subject:%0D%0A%0D%0ASubject Name: [Enter subject name]%0D%0ASubject Code: [Enter subject code]%0D%0ASemester: [Enter semester]%0D%0ACredits: [Enter credits]%0D%0ABranches: [List applicable branches]%0D%0ADescription: [Optional description]%0D%0A%0D%0AThank you!`}
                          className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-300 hover:border-yellow-400 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Crown className="w-4 h-4 text-yellow-600 mr-2" />
                            <div>
                              <div className="font-medium text-yellow-900">{owner.name}</div>
                              <div className="text-sm text-yellow-700">{owner.email}</div>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-yellow-600 group-hover:text-yellow-700" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{subjects.length}</p>
              </div>
              <BookOpen className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Semesters</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(subjectsBySemester).length}</p>
              </div>
              <Calendar className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Credits</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {subjects.length > 0 ? Math.round(subjects.reduce((sum, s) => sum + s.credits, 0) / subjects.length) : 0}
                </p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Your Role</p>
                <p className="text-lg font-bold text-gray-900 mt-1 capitalize flex items-center">
                  {userRole.role === "owner" && <Crown className="w-4 h-4 text-yellow-500 mr-1" />}
                  {userRole.role === "admin" && <Shield className="w-4 h-4 text-purple-500 mr-1" />}
                  {userRole.role}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects by Semester */}
        <div className="space-y-6">
          {Object.keys(subjectsBySemester)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(semester => (
              <div key={semester} className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                  Semester {semester}
                  <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {subjectsBySemester[parseInt(semester)].length} subjects
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectsBySemester[parseInt(semester)].map(subject => (
                    <div key={subject.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                          <p className="text-sm text-gray-600">{subject.code}</p>
                        </div>
                        {userRole.canManageSubjects && (
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Credits:</span>
                          <span className="font-medium">{subject.credits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Branches:</span>
                          <span className="font-medium">{subject.branch_count || 0}</span>
                        </div>
                        {subject.description && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">{subject.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {subjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
            <p className="text-gray-600">
              {userRole.canManageSubjects 
                ? "Get started by adding your first subject"
                : "Subjects will appear here once they are added by the platform owners"
              }
            </p>
          </div>
        )}

        {/* Add Subject Modal */}
        {showAddModal && userRole.canManageSubjects && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Subject</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Data Structures and Algorithms"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CS301"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      value={newSubject.semester}
                      onChange={(e) => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSubject.credits}
                      onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={newSubject.description}
                    onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Brief description of the subject..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubject}
                  disabled={!newSubject.name || !newSubject.code}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
