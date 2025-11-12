"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { 
  Mail, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Shield, 
  Crown, 
  Heart,
  Code,
  Database,
  Smartphone,
  Globe,
  MessageCircle,
  ExternalLink
} from "lucide-react";

interface OwnerContact {
  name: string;
  email: string;
  created_at: string;
}

interface AppStats {
  totalUsers: number;
  totalSubjects: number;
  totalNotes: number;
  totalBranches: number;
}

export default function AboutPage() {
  const [owners, setOwners] = useState<OwnerContact[]>([]);
  const [stats, setStats] = useState<AppStats>({
    totalUsers: 0,
    totalSubjects: 0,
    totalNotes: 0,
    totalBranches: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load owner contacts
      const { data: ownerData } = await supabase.rpc("get_owner_contacts");
      if (ownerData) {
        setOwners(ownerData);
      }

      // Load app statistics
      const [usersResult, subjectsResult, notesResult, branchesResult] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true })
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalSubjects: subjectsResult.count || 0,
        totalNotes: notesResult.count || 0,
        totalBranches: branchesResult.count || 0
      });
    } catch (error) {
      console.error("Error loading about data:", error);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Notes Management",
      description: "Upload, organize, and share study materials across subjects and semesters"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "User Management", 
      description: "Comprehensive user roles and permissions system for secure access control"
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Academic Structure",
      description: "Organized by branches, semesters, and subjects for easy navigation"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile App",
      description: "Cross-platform mobile application for students to access resources on-the-go"
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Secure Database",
      description: "Robust PostgreSQL database with Row Level Security and proper data protection"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Web Dashboard",
      description: "Powerful admin dashboard for content management and system administration"
    }
  ];

  const techStack = [
    { name: "Frontend", tech: "Next.js 14, React, TypeScript, Tailwind CSS" },
    { name: "Backend", tech: "Supabase, PostgreSQL, Row Level Security" },
    { name: "Mobile", tech: "React Native, Expo Router" },
    { name: "Authentication", tech: "Supabase Auth with JWT" },
    { name: "Storage", tech: "Supabase Storage for file uploads" },
    { name: "Deployment", tech: "Vercel (Web), Expo (Mobile)" }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">College Study Platform</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive digital learning platform designed to enhance the educational experience 
            for students and faculty through organized resource sharing and collaboration.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</div>
            <div className="text-sm text-gray-600">Subjects</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Database className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalNotes}</div>
            <div className="text-sm text-gray-600">Study Materials</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <GraduationCap className="w-8 h-8 text-orange-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalBranches}</div>
            <div className="text-sm text-gray-600">Academic Branches</div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Heart className="w-6 h-6 text-red-500 mr-3" />
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-50 p-2 rounded-lg mr-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Code className="w-6 h-6 text-blue-600 mr-3" />
            Technology Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techStack.map((item, index) => (
              <div key={index} className="flex items-start p-4 rounded-lg bg-gray-50">
                <div className="font-semibold text-gray-900 w-24 flex-shrink-0">{item.name}:</div>
                <div className="text-gray-600">{item.tech}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Information */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            User Roles & Permissions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-yellow-200">
              <div className="flex items-center mb-4">
                <Crown className="w-6 h-6 text-yellow-600 mr-3" />
                <h3 className="font-bold text-yellow-800">Owners</h3>
              </div>
              <ul className="text-sm text-yellow-700 space-y-2">
                <li>• Full system access and control</li>
                <li>• Create and delete subjects</li>
                <li>• Manage user roles and permissions</li>
                <li>• Access all administrative features</li>
                <li>• Database and system configuration</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="font-bold text-purple-800">Admins</h3>
              </div>
              <ul className="text-sm text-purple-700 space-y-2">
                <li>• Upload and manage study materials</li>
                <li>• Moderate user-generated content</li>
                <li>• Access analytics and reports</li>
                <li>• Manage notes and resources</li>
                <li>• Cannot create subjects or manage users</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-gray-600 mr-3" />
                <h3 className="font-bold text-gray-800">Students</h3>
              </div>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Access study materials and resources</li>
                <li>• Download notes and documents</li>
                <li>• Use mobile app features</li>
                <li>• View academic content</li>
                <li>• Basic profile management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <MessageCircle className="w-6 h-6 text-green-600 mr-3" />
            Need Help? Contact Platform Owners
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-lg mr-4 flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">For Admins: Need New Subjects or Branches?</h3>
                <p className="text-blue-800 text-sm mb-3">
                  As an admin, you have access to most features but cannot create subjects or branches. 
                  If you need new subjects added or branches configured, please contact the platform owners below.
                </p>
                <div className="bg-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-medium">
                    💡 Include in your message: Subject name, subject code, semester, credits, and which branches it belongs to.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading owner contacts...</p>
            </div>
          ) : owners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {owners.map((owner, index) => (
                <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-100 p-3 rounded-full mr-4">
                      <Crown className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-900">{owner.name}</h3>
                      <p className="text-sm text-yellow-700">Platform Owner</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <a 
                      href={`mailto:${owner.email}?subject=College Study Platform - Admin Request&body=Hi ${owner.name},%0D%0A%0D%0AI am an admin on the College Study Platform and need assistance with:%0D%0A%0D%0A[Please describe your request here]%0D%0A%0D%0AThank you!`}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-300 hover:border-yellow-400 transition-colors group"
                    >
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-yellow-600 mr-2" />
                        <span className="text-yellow-800 font-medium">{owner.email}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-yellow-600 group-hover:text-yellow-700" />
                    </a>
                    <div className="text-xs text-yellow-600">
                      Owner since {new Date(owner.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No owner contacts available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-600">
            Built with ❤️ for educational excellence • Powered by modern web technologies
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Secure • Scalable • Student-Focused
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
