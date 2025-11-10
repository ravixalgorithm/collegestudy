"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Search, Filter, UserCheck, UserX, Shield, Download, Crown, AlertTriangle, Trash2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  branch_id: string;
  year: number;
  semester: number;
  roll_number: string;
  role: "student" | "admin" | "owner";
  is_admin: boolean;
  last_login: string;
  created_at: string;
  branch_name?: string;
}

interface CurrentUserRole {
  role: "student" | "admin" | "owner";
  canManageUsers: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<CurrentUserRole>({ role: "student", canManageUsers: false });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  useEffect(() => {
    checkUserRole();
    loadUsers();
  }, []);

  async function checkUserRole() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData, error } = await supabase.rpc("get_user_role", { user_id: user.id });
      if (error) throw error;

      const { data: canManage, error: canManageError } = await supabase.rpc("is_owner", { user_id: user.id });
      if (canManageError) throw canManageError;

      setCurrentUserRole({
        role: roleData || "student",
        canManageUsers: canManage || false,
      });
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      // Use the special function for owners, regular query for others
      if (currentUserRole.canManageUsers) {
        const { data, error } = await supabase.rpc("get_users_for_management");
        if (error) throw error;
        setUsers(data || []);
      } else {
        // Regular users can only see basic user list
        const { data, error } = await supabase
          .from("users")
          .select(
            `
            id, email, name, role, is_admin, created_at,
            branches(name)
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        const mappedUsers = (data || []).map((user) => ({
          ...user,
          branch_name: (user.branches as any)?.name,
        })) as unknown as User[];
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function promoteToAdmin(userId: string) {
    if (!confirm("Are you sure you want to promote this user to admin?")) return;

    try {
      const { error } = await supabase.rpc("promote_to_admin", { target_user_id: userId });
      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error("Error promoting user:", error);
      alert("Failed to promote user. You may not have permission.");
    }
  }

  async function demoteToStudent(userId: string) {
    if (!confirm("Are you sure you want to demote this user to student?")) return;

    try {
      const { error } = await supabase.rpc("demote_to_student", { target_user_id: userId });
      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error("Error demoting user:", error);
      alert("Failed to demote user. You may not have permission.");
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.rpc("remove_user", { target_user_id: userId });
      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      alert("Failed to remove user. You may not have permission.");
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "admin":
        return <Shield className="w-3 h-3" />;
      default:
        return <UserCheck className="w-3 h-3" />;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesBranch = filterBranch === "all" || user.branch_id === filterBranch;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const stats = {
    total: users.length,
    owners: users.filter((u) => u.role === "owner").length,
    admins: users.filter((u) => u.role === "admin").length,
    students: users.filter((u) => u.role === "student").length,
    newThisWeek: users.filter((u) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(u.created_at) > weekAgo;
    }).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              {currentUserRole.canManageUsers
                ? "Manage students, admins, and their permissions"
                : "View user accounts and basic information"}
            </p>
            {currentUserRole.role === "owner" && (
              <div className="flex items-center space-x-2 mt-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg w-fit">
                <Crown className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Owner Access</span>
              </div>
            )}
          </div>
          <button className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
            <Download className="w-5 h-5" />
            <span>Export Users</span>
          </button>
        </div>

        {/* Role Hierarchy Info */}
        {currentUserRole.canManageUsers && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Role Hierarchy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-yellow-600" />
                <div>
                  <span className="font-medium text-yellow-800">Owner:</span>
                  <p className="text-yellow-700">Ultimate control, can manage all users</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="font-medium text-purple-800">Admin:</span>
                  <p className="text-purple-700">Can post content, cannot manage users</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-gray-600" />
                <div>
                  <span className="font-medium text-gray-800">Student:</span>
                  <p className="text-gray-700">Basic app access only</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Owners</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.owners}</p>
              </div>
              <Crown className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.admins}</p>
              </div>
              <Shield className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Students</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.students}</p>
              </div>
              <UserCheck className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New This Week</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.newThisWeek}</p>
              </div>
              <UserCheck className="w-10 h-10 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owners</option>
                <option value="admin">Admins</option>
                <option value="student">Students</option>
              </select>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Branches</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch / Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  {currentUserRole.canManageUsers && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={currentUserRole.canManageUsers ? 6 : 5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentUserRole.canManageUsers ? 6 : 5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || "N/A"}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{user.branch_name || "N/A"}</p>
                          <p className="text-sm text-gray-500">
                            {user.year ? `Year ${user.year}` : "N/A"} • {user.semester ? `Sem ${user.semester}` : "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.roll_number || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                      </td>
                      {currentUserRole.canManageUsers && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {user.role === "student" && (
                              <button
                                onClick={() => promoteToAdmin(user.id)}
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                              >
                                Make Admin
                              </button>
                            )}
                            {user.role === "admin" && (
                              <button
                                onClick={() => demoteToStudent(user.id)}
                                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                              >
                                Remove Admin
                              </button>
                            )}
                            {user.role !== "owner" && (
                              <button
                                onClick={() => removeUser(user.id)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
                                title="Remove User"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            )}
                            {user.role === "owner" && <span className="text-sm text-gray-400 italic">Protected</span>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Owner Instructions */}
        {currentUserRole.role === "owner" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Owner Notes</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Owners can only be created via database using the create_owner_account() function</li>
              <li>• You can promote students to admins and demote admins back to students</li>
              <li>• You can remove any user except other owners</li>
              <li>• Admins can post content but cannot manage users</li>
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
