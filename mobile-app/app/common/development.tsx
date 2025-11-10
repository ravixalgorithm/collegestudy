import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  ArrowLeft,
  Globe,
  Smartphone,
  Server,
  Database,
  Code,
  FileText,
  Download,
  ExternalLink,
  Plus,
  Search,
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  Star,
  Users,
  Monitor,
  Cloud,
} from "lucide-react-native";

interface DevelopmentTrack {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  notes: DevelopmentNote[];
  technologies: string[];
}

interface DevelopmentNote {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size?: string;
  is_featured: boolean;
  is_approved: boolean;
  is_verified: boolean;
  uploaded_by: string;
  created_at: string;
  downloads: number;
  rating: number;
  rating_count: number;
  views: number;
  tags: string[];
}

export default function DevelopmentNotes() {
  const router = useRouter();
  const [tracks, setTracks] = useState<DevelopmentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTracksAndNotes();
  }, []);

  const loadTracksAndNotes = async () => {
    try {
      setLoading(true);

      // Load topics for Development category
      const { data: topicsData, error: topicsError } = await supabase
        .from("common_topics")
        .select("id, title, description, difficulty, technologies, is_active, created_at, updated_at")
        .eq("category_id", "development")
        .eq("is_active", true)
        .order("title");

      if (topicsError) throw topicsError;

      // Load notes for each topic
      const tracksWithNotes = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { data: notesData, error: notesError } = await supabase
            .from("common_notes")
            .select("*")
            .eq("topic_id", topic.id)
            .eq("is_approved", true)
            .order("created_at", { ascending: false });

          if (notesError) {
            console.error("Error loading notes for topic:", topic.title, notesError);
          }

          // Map to DevelopmentTrack interface
          return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            level: topic.difficulty || "Intermediate",
            notes: notesData || [],
            technologies: topic.technologies || [],
          };
        }),
      );

      setTracks(tracksWithNotes);
    } catch (error) {
      console.error("Error loading development tracks and notes:", error);
      Alert.alert("Error", "Failed to load tracks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTracksAndNotes();
    setRefreshing(false);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "#52c41a";
      case "Intermediate":
        return "#fa8c16";
      case "Advanced":
        return "#ff4d4f";
      default:
        return "#666";
    }
  };

  const handleTrackPress = (track: DevelopmentTrack) => {
    router.push({
      pathname: "/common/notes/[category]",
      params: {
        category: "development",
        topicId: track.id,
        topicTitle: track.title,
        topicDescription: track.description,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#52c41a" />
          <Text style={styles.loadingText}>Loading development tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Development Notes</Text>
          <Text style={styles.headerSubtitle}>Web, Mobile & Backend</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Code color="#52c41a" size={32} />
          </View>
          <Text style={styles.heroTitle}>Master Modern Development</Text>
          <Text style={styles.heroDescription}>
            Comprehensive resources covering frontend, backend, mobile, and full-stack development with the latest
            technologies and best practices.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>6</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>80+</Text>
              <Text style={styles.statLabel}>Resources</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1000+</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
          </View>
        </View>

        {/* Development Tracks */}
        <View style={styles.tracksSection}>
          <Text style={styles.sectionTitle}>Development Tracks</Text>
          <Text style={styles.sectionSubtitle}>Choose your learning path and build real-world projects</Text>

          {tracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Code color="#ccc" size={48} />
              <Text style={styles.emptyTitle}>No Tracks Available</Text>
              <Text style={styles.emptyDescription}>
                Development tracks will appear here once they are added by administrators.
              </Text>
            </View>
          ) : (
            <View style={styles.tracksGrid}>
              {tracks.map((track) => (
                <TouchableOpacity key={track.id} style={styles.trackCard} onPress={() => handleTrackPress(track)}>
                  

                  <View style={styles.trackContent}>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                    
                    <Text style={styles.trackDescription}>{track.description}</Text>

                    <View style={styles.technologiesContainer}>
                      {Array.isArray(track.technologies) &&
                        track.technologies.slice(0, 3).map((tech, index) => (
                          <View key={index} style={styles.techBadge}>
                            <Text style={styles.techText}>{tech}</Text>
                          </View>
                        ))}
                      {Array.isArray(track.technologies) && track.technologies.length > 3 && (
                        <View style={styles.techBadge}>
                          <Text style={styles.techText}>+{track.technologies.length - 3}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={[styles.levelBadge, { backgroundColor: getLevelColor(track.level) }]}>
                      <Text style={styles.levelText}>{track.level}</Text>
                    </View>

                    <View style={styles.trackStats}>
                      <View style={styles.trackStat}>
                        <FileText color="#666" size={14} />
                        <Text style={styles.trackStatText}>{track.notes.length} Resources</Text>
                      </View>
                      <View style={styles.trackStat}>
                        <Users color="#666" size={14} />
                        <Text style={styles.trackStatText}>{track.notes.length > 0 ? "Active" : "Coming Soon"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.trackFooter}>
                    <Text style={styles.exploreText}>Start Learning</Text>
                    <ExternalLink color="#1890ff" size={16} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Learning Path Section */}
        <View style={styles.pathSection}>
          <Text style={styles.sectionTitle}>Recommended Learning Path</Text>

          <View style={styles.pathSteps}>
            <View style={styles.pathStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Frontend Basics</Text>
                <Text style={styles.stepDescription}>Start with HTML, CSS, and JavaScript fundamentals</Text>
              </View>
            </View>

            <View style={styles.pathConnector} />

            <View style={styles.pathStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Framework Mastery</Text>
                <Text style={styles.stepDescription}>Learn React or Vue.js for modern frontend development</Text>
              </View>
            </View>

            <View style={styles.pathConnector} />

            <View style={styles.pathStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Backend Development</Text>
                <Text style={styles.stepDescription}>Build APIs with Node.js, Python, or Java</Text>
              </View>
            </View>

            <View style={styles.pathConnector} />

            <View style={styles.pathStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Full Stack Projects</Text>
                <Text style={styles.stepDescription}>Combine frontend and backend to build complete applications</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: "#ffffff",
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f6ffed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#52c41a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  tracksSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  tracksGrid: {
    gap: 16,
  },
  trackCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  trackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#1890ff15",
  },
  trackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1890ff",
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    width: "fit-content",
    minWidth: 40,
    maxWidth: 80,
    marginBottom: 10
  },
  levelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    
  },
  trackContent: {
    padding: 16,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  trackDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  technologiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  techBadge: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  techText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
  },
  trackStats: {
    flexDirection: "row",
    gap: 16,
  },
  trackStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackStatText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  trackFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  exploreText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7e6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  featuredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fa8c16",
  },
  pathSection: {
    margin: 16,
    marginTop: 8,
  },
  pathSteps: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pathStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#52c41a",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  pathConnector: {
    width: 2,
    height: 24,
    backgroundColor: "#e5e7eb",
    marginLeft: 15,
    marginVertical: 8,
  },
  bottomSpacing: {
    height: 32,
  },
});
