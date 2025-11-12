import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Calendar,
  LogOut,
  ChevronRight,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  Info,
  Download,
  TrendingUp,
  Award,
  Edit,
  Bookmark,
} from "lucide-react-native";
import { useCallback } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  branch_id: string;
  year: number;
  semester: number;
  roll_number?: string;
  photo_url?: string;
  course?: string;
  last_login?: string;
  branches?: {
    name: string;
    code: string;
    full_name: string;
  };
}

interface Stats {
  savedOpportunities: number;
  downloadedNotes: number;
  totalEvents: number;
}

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ savedOpportunities: 0, downloadedNotes: 0, totalEvents: 0 });

  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile when screen comes into focus (after editing)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  async function loadProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/welcome");
        return;
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from("users")
        .select("*, branches(name, code, full_name)")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Load user activity stats using new function
        try {
          const { data: activityData, error: activityError } = await supabase.rpc("get_user_activity_summary", {
            p_user_id: user.id,
          });

          if (activityError) {
            console.error("Error loading activity stats:", activityError);
            // Fallback to manual queries if function doesn't exist yet
            const { count: savedOppsCount } = await supabase
              .from("opportunity_bookmarks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id);

            const { count: eventsCount } = await supabase
              .from("events")
              .select("*", { count: "exact", head: true })
              .eq("is_published", true)
              .gte("event_date", new Date().toISOString().split("T")[0]);

            setStats({
              savedOpportunities: savedOppsCount || 0,
              downloadedNotes: 0, // Will be 0 until download tracking is implemented
              totalEvents: eventsCount || 0,
            });
          } else if (activityData && activityData.length > 0) {
            const activity = activityData[0];
            // Load current active events count separately since it's not user-specific
            const { count: currentEventsCount } = await supabase
              .from("events")
              .select("*", { count: "exact", head: true })
              .eq("is_published", true)
              .gte("event_date", new Date().toISOString().split("T")[0]);

            setStats({
              savedOpportunities: Number(activity.saved_opportunities) || 0,
              downloadedNotes: Number(activity.downloaded_notes) || 0,
              totalEvents: currentEventsCount || 0,
            });
          }
        } catch (error) {
          console.error("Error with activity summary:", error);
          // Set default stats if there's an error
          setStats({
            savedOpportunities: 0,
            downloadedNotes: 0,
            totalEvents: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  }

  function handleEditProfile() {
    router.push("/profile/edit");
  }

  function handleSettings() {
    router.push("/profile/settings");
  }

  function handleHelp() {
    Alert.alert("Help & Support", "For help, please contact:\nravixalgorithm@gmail.com\npriyalkumar06@gmail.com");
  }

  async function handleAbout() {
    Alert.alert(
      "About College Study",
      "Version 1.0.0\n\nYour complete college companion app for students.\n\nDeveloped with ❤️ for the student community.",
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <User color="#0066cc" size={48} />
            </View>
          )}
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Edit color="#fff" size={16} />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        {profile.roll_number && <Text style={styles.rollNumber}>Roll No: {profile.roll_number}</Text>}
      </View>

      {/* Academic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <GraduationCap color="#0066cc" size={20} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{profile.course || "B.Tech"}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <BookOpen color="#0066cc" size={20} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Branch</Text>
              <Text style={styles.infoValue}>{profile.branches?.name}</Text>
              <Text style={styles.infoSubtext}>{profile.branches?.full_name}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar color="#0066cc" size={20} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Semester</Text>
              <Text style={styles.infoValue}>
                Year {profile.year} • Semester {profile.semester}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Activity</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#fff7e6" }]}>
              <Bookmark color="#fa8c16" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.savedOpportunities}</Text>
            <Text style={styles.statLabel}>Saved Opportunities</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#f0f5ff" }]}>
              <Download color="#0066cc" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.downloadedNotes}</Text>
            <Text style={styles.statLabel}>Downloaded Notes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#f6ffed" }]}>
              <Calendar color="#52c41a" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalEvents}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>
        </View>
      </View>

      {/* Settings Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <View style={styles.menuIconContainer}>
              <Edit color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <View style={styles.menuIconContainer}>
              <Settings color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>App Settings</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <View style={styles.menuIconContainer}>
              <Bell color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <View style={styles.menuIconContainer}>
              <Shield color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
            <View style={styles.menuIconContainer}>
              <HelpCircle color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuIconContainer}>
              <Info color="#666" size={20} />
            </View>
            <Text style={styles.menuText}>About</Text>
            <ChevronRight color="#ccc" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#ff4d4f" size={20} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>College Study • Version 1.0.0</Text>
        <Text style={styles.footerSubtext}>Made with ❤️ for HBTU Students</Text>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#0066cc",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e6f4ff",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0066cc",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  rollNumber: {
    fontSize: 14,
    color: "#999",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoSubtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4d4f",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4d4f",
  },
  footer: {
    alignItems: "center",
    padding: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#999",
  },
  bottomSpacing: {
    height: 20,
  },
});
