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
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  ArrowLeft,
  Target,
  Briefcase,
  FileText,
  MessageCircle,
  TrendingUp,
  Star,
  Clock,
  Users,
  Download,
  ExternalLink,
  BookOpen,
  Award,
  CheckCircle,
  ArrowRight,
} from "lucide-react-native";

interface PlacementCategory {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  notes: PlacementNote[];
  topics: string[];
}

interface PlacementNote {
  id: string;
  title: string;
  description: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  downloads: number;
  rating: number;
}

const PLACEMENT_CATEGORIES: PlacementCategory[] = [
  {
    id: "resume-cv",
    title: "Resume & CV",
    description: "Create compelling resumes that get noticed by recruiters",
    difficulty: "Beginner",
    notes: [],
    topics: ["Format", "Content", "Keywords", "ATS Optimization"],
  },
  {
    id: "technical-interviews",
    title: "Technical Interviews",
    description: "Master coding interviews and technical assessments",
    difficulty: "Intermediate",
    notes: [],
    topics: ["Coding", "System Design", "Algorithms", "Data Structures"],
  },
  {
    id: "hr-interviews",
    title: "HR & Behavioral",
    description: "Excel in behavioral and HR interview rounds",
    difficulty: "Beginner",
    notes: [],
    topics: ["Communication", "Leadership", "STAR Method", "Questions"],
  },
  {
    id: "company-specific",
    title: "Company-Specific Prep",
    description: "Target preparation for top tech companies",
    difficulty: "Advanced",
    notes: [],
    topics: ["FAANG", "Startups", "Culture Fit", "Company Research"],
  },
  {
    id: "mock-interviews",
    title: "Mock Interview Tips",
    description: "Practice sessions and feedback strategies",
    difficulty: "Intermediate",
    notes: [],
    topics: ["Practice", "Feedback", "Confidence", "Performance"],
  },
  {
    id: "salary-negotiation",
    title: "Salary Negotiation",
    description: "Get the best offer and negotiate effectively",
    difficulty: "Advanced",
    notes: [],
    topics: ["Research", "Negotiation", "Benefits", "Counter Offers"],
  },
];

const SUCCESS_TIPS = [
  {
    title: "Start Early",
    description: "Begin preparation at least 6 months before placement season",
  },
  {
    title: "Build Projects",
    description: "Create 2-3 impressive projects that demonstrate your skills",
  },
  {
    title: "Practice Daily",
    description: "Solve coding problems and practice interview questions daily",
  },
  {
    title: "Network Actively",
    description: "Connect with alumni and industry professionals on LinkedIn",
  },
];

export default function PlacementPreparation() {
  const router = useRouter();
  const [categories, setCategories] = useState<PlacementCategory[]>(PLACEMENT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      // Load notes from database
      const { data, error } = await supabase
        .from("common_notes")
        .select("id, title, description, category_id, topic_id, file_url, file_type, file_size, thumbnail_url, uploaded_by, approved_by, downloads, views, rating, rating_count, is_verified, is_featured, is_approved, tags, meta_data, created_at, updated_at")
        .eq("category_id", "placement")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group notes by category
      const updatedCategories = categories.map(category => ({
        ...category,
        notes: data?.filter(note => note.topic_id === category.id) || []
      }));

      setCategories(updatedCategories);
    } catch (error) {
      console.error("Error loading placement notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "#52c41a";
      case "Intermediate": return "#fa8c16";
      case "Advanced": return "#ff4d4f";
      default: return "#666";
    }
  };

  const handleCategoryPress = (category: PlacementCategory) => {
    router.push({
      pathname: "/common/notes/[category]",
      params: {
        category: "placement",
        topicId: category.id,
        topicTitle: category.title,
        topicDescription: category.description
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Placement Prep</Text>
          <Text style={styles.headerSubtitle}>Interview & Resume Tips</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Target color="#722ed1" size={32} />
          </View>
          <Text style={styles.heroTitle}>Land Your Dream Job</Text>
          <Text style={styles.heroDescription}>
            Comprehensive placement preparation covering resume building, technical interviews, HR rounds, and salary negotiation strategies.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>95%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Placed Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Companies</Text>
            </View>
          </View>
        </View>

        {/* Success Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Keys to Success</Text>
          <Text style={styles.sectionSubtitle}>
            Follow these proven strategies for placement success
          </Text>

          <View style={styles.tipsGrid}>
            {SUCCESS_TIPS.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <CheckCircle color="#1890ff" size={20} />
                </View>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Preparation Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Preparation Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Master every aspect of the placement process
          </Text>

          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
              >
                

                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>

                  <View style={styles.topicsContainer}>
                    {category.topics.slice(0, 3).map((topic, index) => (
                      <View key={index} style={styles.topicBadge}>
                        <Text style={styles.topicText}>{topic}</Text>
                      </View>
                    ))}
                    {category.topics.length > 3 && (
                      <View style={styles.topicBadge}>
                        <Text style={styles.topicText}>+{category.topics.length - 3}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(category.difficulty) }]}>
                    <Text style={styles.difficultyText}>{category.difficulty}</Text>
                  </View>

                  <View style={styles.categoryStats}>
                    <View style={styles.categoryStat}>
                      <FileText color="#666" size={14} />
                      <Text style={styles.categoryStatText}>{category.notes.length} Resources</Text>
                    </View>
                    <View style={styles.categoryStat}>
                      <Star color="#fa8c16" size={14} />
                      <Text style={styles.categoryStatText}>Popular</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.categoryFooter}>
                  <Text style={styles.exploreText}>Explore</Text>
                  <ArrowRight color="#1890ff" size={16} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Placement Timeline</Text>
          <Text style={styles.sectionSubtitle}>
            Plan your preparation with this comprehensive timeline
          </Text>

          <View style={styles.timeline}>
            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>6M</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Start Preparation</Text>
                <Text style={styles.stepDescription}>
                  Build fundamentals, create resume, start coding practice
                </Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>3M</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Intensive Practice</Text>
                <Text style={styles.stepDescription}>
                  Mock interviews, project completion, skill enhancement
                </Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>1M</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Final Preparation</Text>
                <Text style={styles.stepDescription}>
                  Company research, resume finalization, interview practice
                </Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineStep}>
              <View style={[styles.stepIndicator, { backgroundColor: "#52c41a" }]}>
                <Text style={[styles.stepNumber, { color: "#ffffff" }]}>GO!</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Placement Season</Text>
                <Text style={styles.stepDescription}>
                  Apply confidence, ace interviews, land your dream job
                </Text>
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
    backgroundColor: "#f9f0ff",
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
    color: "#722ed1",
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
  tipsSection: {
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
  tipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  tipCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1890ff15",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  categoriesSection: {
    margin: 16,
    marginTop: 8,
  },
  categoriesGrid: {
    gap: 16,
  },
  categoryCard: {
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
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#1890ff15",
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1890ff",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 80,
    marginBottom: 10
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  categoryContent: {
    padding: 16,
    
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  topicsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  topicBadge: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topicText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
  },
  categoryStats: {
    flexDirection: "row",
    gap: 16,
  },
  categoryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryStatText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  categoryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  exploreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  timelineSection: {
    margin: 16,
    marginTop: 8,
  },
  timeline: {
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
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
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
  timelineConnector: {
    width: 2,
    height: 24,
    backgroundColor: "#e5e7eb",
    marginLeft: 19,
    marginVertical: 12,
  },
  bottomSpacing: {
    height: 32,
  },
});
