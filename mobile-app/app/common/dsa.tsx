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
import { ArrowLeft, Code, FileText, ExternalLink, TrendingUp, Target, Clock, Users, Star, Download, Eye } from "lucide-react-native";

interface DSATopic {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  notes: DSANote[];
}

interface DSANote {
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

export default function DSANotes() {
  const router = useRouter();
  const [topics, setTopics] = useState<DSATopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTopicsAndNotes();
  }, []);

  const loadTopicsAndNotes = async () => {
    try {
      setLoading(true);

      // Load topics for DSA category
      const { data: topicsData, error: topicsError } = await supabase
        .from("common_topics")
        .select("id, title, description, difficulty, technologies, is_active, created_at, updated_at")
        .eq("category_id", "dsa")
        .eq("is_active", true)
        .order("title");

      if (topicsError) throw topicsError;

      // Load notes for each topic
      const topicsWithNotes = await Promise.all(
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

          return {
            ...topic,
            notes: notesData || [],
          };
        }),
      );

      setTopics(topicsWithNotes);
    } catch (error) {
      console.error("Error loading DSA topics and notes:", error);
      Alert.alert("Error", "Failed to load topics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTopicsAndNotes();
    setRefreshing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "#52c41a";
      case "Medium":
        return "#fa8c16";
      case "Hard":
        return "#ff4d4f";
      default:
        return "#666";
    }
  };

  const handleTopicPress = (topic: DSATopic) => {
    router.push({
      pathname: "/common/notes/[category]",
      params: {
        category: "dsa",
        topicId: topic.id,
        topicTitle: topic.title,
        topicDescription: topic.description,
      },
    });
  };

  const renderDifficultyBadge = (difficulty: string) => {
    const colors = {
      Easy: { bg: "#f6ffed", text: "#52c41a", border: "#b7eb8f" },
      Medium: { bg: "#fff7e6", text: "#fa8c16", border: "#ffd591" },
      Hard: { bg: "#fff2f0", text: "#ff4d4f", border: "#ffb3b0" },
      Beginner: { bg: "#f0f9ff", text: "#0ea5e9", border: "#7dd3fc" },
      Intermediate: { bg: "#fefce8", text: "#eab308", border: "#fde047" },
      Advanced: { bg: "#fdf2f8", text: "#ec4899", border: "#f9a8d4" },
    };
    const color = colors[difficulty as keyof typeof colors] || colors.Medium;

    return {
      backgroundColor: color.bg,
      color: color.text,
      borderColor: color.border,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 11,
      fontWeight: "600" as any,
      maxWidth: 60,
      textAlign: "center",
      marginBottom: 10
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
          <Text style={styles.loadingText}>Loading DSA topics...</Text>
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
          <Text style={styles.headerTitle}>DSA Notes</Text>
          <Text style={styles.headerSubtitle}>Data Structures & Algorithms</Text>
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
            <Code color="#1890ff" size={32} />
          </View>
          <Text style={styles.heroTitle}>Master Data Structures & Algorithms</Text>
          <Text style={styles.heroDescription}>
            Comprehensive notes, practice problems, and solutions to help you excel in coding interviews and competitive
            programming.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Code color="#1890ff" size={18} />
              <Text style={styles.statNumber}>{topics.length}</Text>
              <Text style={styles.statLabel}>Topics</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <FileText color="#52c41a" size={18} />
              <Text style={styles.statNumber}>{topics.reduce((sum, topic) => sum + topic.notes.length, 0)}+</Text>
              <Text style={styles.statLabel}>Resources</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Download color="#722ed1" size={18} />
              <Text style={styles.statNumber}>
                {topics.reduce(
                  (sum, topic) => sum + topic.notes.reduce((noteSum, note) => noteSum + (note.downloads || 0), 0),
                  0,
                )}
                +
              </Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
          </View>
        </View>

        {/* Topics Grid */}
        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>Choose Your Topic</Text>
          <Text style={styles.sectionSubtitle}>Start with basics and progress to advanced concepts</Text>

          {topics.length === 0 ? (
            <View style={styles.emptyState}>
              <Code color="#ccc" size={48} />
              <Text style={styles.emptyTitle}>No Topics Available</Text>
              <Text style={styles.emptyDescription}>
                Topics will appear here once they are added by administrators.
              </Text>
            </View>
          ) : (
            <View style={styles.topicsGrid}>
              {topics.map((topic) => (
                <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => handleTopicPress(topic)}>
          

                  <View style={styles.topicContent}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDescription} numberOfLines={2}>{topic.description}</Text>
                    
                    <Text style={renderDifficultyBadge(topic.difficulty)}>
                      {topic.difficulty}
                    </Text>

                    <View style={styles.topicStats}>
                      <View style={styles.topicStat}>
                        <FileText color="#666" size={14} />
                        <Text style={styles.topicStatText}>{topic.notes.length} Resources</Text>
                      </View>
                      <View style={styles.topicStat}>
                        <Star color="#faad14" size={14} />
                        <Text style={styles.topicStatText}>
                          {topic.notes.length > 0 ?
                            (topic.notes.reduce((sum, note) => sum + note.rating, 0) / topic.notes.length).toFixed(1) :
                            "New"
                          }
                        </Text>
                      </View>
                      <View style={styles.topicStat}>
                        <Download color="#722ed1" size={14} />
                        <Text style={styles.topicStatText}>
                          {topic.notes.reduce((sum, note) => sum + (note.downloads || 0), 0)}
                        </Text>
                      </View>
                    </View>

                    {topic.notes.some(note => note.is_featured) && (
                      <View style={styles.featuredBadge}>
                        <Star color="#faad14" size={12} />
                        <Text style={styles.featuredText}>Featured Content</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.topicFooter}>
                    <Text style={styles.exploreText}>Explore {topic.notes.length} Resources</Text>
                    <ExternalLink color="#1890ff" size={16} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Study Tips</Text>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Target color="#52c41a" size={20} />
              <Text style={styles.tipTitle}>Start with Fundamentals</Text>
            </View>
            <Text style={styles.tipDescription}>
              Master basic data structures (Arrays, Linked Lists, Stacks, Queues) before moving to advanced topics.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <TrendingUp color="#1890ff" size={20} />
              <Text style={styles.tipTitle}>Practice Pattern Recognition</Text>
            </View>
            <Text style={styles.tipDescription}>
              Learn common problem patterns like Two Pointers, Sliding Window, and Dynamic Programming.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Clock color="#fa8c16" size={20} />
              <Text style={styles.tipTitle}>Code Interview Ready</Text>
            </View>
            <Text style={styles.tipDescription}>
              Focus on clean, readable code with optimal time and space complexity for technical interviews.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Code color="#722ed1" size={20} />
              <Text style={styles.tipTitle}>Review & Analyze</Text>
            </View>
            <Text style={styles.tipDescription}>
              After solving problems, review different approaches and understand trade-offs between solutions.
            </Text>
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
    backgroundColor: "#e6f4ff",
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
    color: "#1890ff",
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
  topicsSection: {
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
  topicsGrid: {
    gap: 16,
  },
  topicCard: {
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
  topicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#1890ff15",
  },
  topicIcon: {
    fontSize: 24,
  },
  topicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  difficultyText: {
    
    fontSize: 11,
    fontWeight: "600" as any,
  },
  topicContent: {
    padding: 16,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  topicStats: {
    flexDirection: "row",
    gap: 16,
  },
  topicStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topicStatText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  topicFooter: {
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
  tipsSection: {
    margin: 16,
    marginTop: 8,
  },
  tipCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tipDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 32,
  },
});
