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
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { ArrowLeft, Bot, Search, Star, ExternalLink, Globe, Zap, Sparkles, Eye, TrendingUp } from "lucide-react-native";

// Updated interfaces for unified schema
interface AITool {
  id: string;
  category_id: string;
  title: string;
  description: string;
  resource_type: 'ai_tool';
  tool_url: string;
  pricing_type: 'free' | 'premium' | 'freemium';
  tags: string[];
  thumbnail_url?: string;
  downloads: number;
  views: number;
  rating: number;
  rating_count: number;
  is_featured: boolean;
  is_approved: boolean;
  is_active: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

const getPricingColor = (pricing: string) => {
  switch (pricing) {
    case "free":
      return "#10B981"; // Green
    case "premium":
      return "#EF4444"; // Red
    case "freemium":
      return "#3B82F6"; // Blue
    default:
      return "#6B7280"; // Gray
  }
};

const getPricingBgColor = (pricing: string) => {
  switch (pricing) {
    case "free":
      return "#ECFDF5"; // Light Green
    case "premium":
      return "#FEF2F2"; // Light Red
    case "freemium":
      return "#EBF4FF"; // Light Blue
    default:
      return "#F3F4F6"; // Light Gray
  }
};

const AIToolsPage = () => {
  const router = useRouter();
  const [tools, setTools] = useState<AITool[]>([]);
  const [filteredTools, setFilteredTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load AI tools using unified schema
      const { data: toolsData, error: toolsError } = await supabase
        .from("resources")
        .select("*")
        .eq("category_id", "ai-tools")
        .eq("resource_type", "ai_tool")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (toolsError) throw toolsError;

      setTools(toolsData || []);
      setFilteredTools(toolsData || []);
    } catch (error) {
      console.log("No AI tools found or permission denied");
      // Don't show alert for empty data - just show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTools();
  }, [searchQuery, selectedPricing, tools]);

  const filterTools = () => {
    let filtered = tools;

    // Filter by pricing
    if (selectedPricing !== "all") {
      filtered = filtered.filter(tool => tool.pricing_type === selectedPricing);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        tool =>
          tool.title.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query) ||
          tool.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTools(filtered);
  };

  const onRefresh = async () => {
    await loadData(true);
  };

  const handleToolPress = async (tool: AITool) => {
    try {
      // Update view count
      await supabase
        .from("resources")
        .update({ views: (tool.views || 0) + 1 })
        .eq("id", tool.id);

      // Open the tool URL
      await Linking.openURL(tool.tool_url);
      
      // Refresh data to show updated view count
      loadData();
    } catch (error) {
      console.error("Error opening tool:", error);
      Alert.alert("Error", "Failed to open tool. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading AI tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Bot size={28} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Tools</Text>
            <Text style={styles.headerSubtitle}>{filteredTools.length} tools available</Text>
          </View>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search AI tools..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Pricing Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContainer}>
          {["all", "free", "freemium", "premium"].map((pricing) => (
            <TouchableOpacity
              key={pricing}
              style={[
                styles.filterButton,
                selectedPricing === pricing && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPricing(pricing)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedPricing === pricing && styles.filterButtonTextActive,
                ]}
              >
                {pricing === "all" ? "All" : pricing.charAt(0).toUpperCase() + pricing.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredTools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolCard}
            onPress={() => handleToolPress(tool)}
          >
            <View style={styles.toolHeader}>
              <View style={styles.toolInfo}>
                <View style={styles.toolTitleRow}>
                  <Bot size={20} color="#8B5CF6" />
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  {tool.is_featured && (
                    <View style={styles.featuredBadge}>
                      <Star size={12} color="#F59E0B" />
                    </View>
                  )}
                </View>
                <Text style={styles.toolDescription} numberOfLines={3}>
                  {tool.description}
                </Text>
              </View>
              <View style={[styles.pricingBadge, { backgroundColor: getPricingBgColor(tool.pricing_type) }]}>
                <Text style={[styles.pricingText, { color: getPricingColor(tool.pricing_type) }]}>
                  {tool.pricing_type}
                </Text>
              </View>
            </View>

            {tool.tags && tool.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tool.tags.slice(0, 4).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {tool.tags.length > 4 && (
                  <Text style={styles.moreTagsText}>+{tool.tags.length - 4} more</Text>
                )}
              </View>
            )}

            <View style={styles.toolStats}>
              <View style={styles.statItem}>
                <Eye size={14} color="#6B7280" />
                <Text style={styles.statText}>{tool.views} views</Text>
              </View>
              {tool.rating > 0 && (
                <View style={styles.statItem}>
                  <Star size={14} color="#F59E0B" />
                  <Text style={styles.statText}>{tool.rating.toFixed(1)}</Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Text style={styles.dateText}>Added {formatDate(tool.created_at)}</Text>
              </View>
            </View>

            <View style={styles.visitButton}>
              <ExternalLink size={16} color="#8B5CF6" />
              <Text style={styles.visitButtonText}>Visit Tool</Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredTools.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bot size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery || selectedPricing !== "all" ? "No Tools Found" : "No AI Tools Available"}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedPricing !== "all"
                ? "Try adjusting your search or filters"
                : "Check back later for new AI tools"}
            </Text>
            {(searchQuery || selectedPricing !== "all") && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedPricing("all");
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#8B5CF6",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  toolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  toolInfo: {
    flex: 1,
    marginRight: 12,
  },
  toolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
    flex: 1,
  },
  featuredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  toolDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  pricingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 12,
    color: "#6B7280",
    alignSelf: "center",
    fontStyle: "italic",
  },
  toolStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  visitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
    paddingVertical: 10,
    borderRadius: 8,
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8B5CF6",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});

export default AIToolsPage;
