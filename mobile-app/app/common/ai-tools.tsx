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
import { ArrowLeft, Bot, Search, Star, ExternalLink, Globe, Zap, Sparkles } from "lucide-react-native";

interface AIToolCategory {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
}

interface AITool {
  id: string;
  name: string;
  description: string;
  category_id: string;
  url: string;
  is_premium: boolean;
  price?: string;
  rating: number;
  features: string[];
  logo_url?: string;
  is_featured: boolean;
  is_active: boolean;
  popularity_score: number;
  category?: {
    title: string;
  };
}

const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case "writing":
      return Bot;
    case "research":
      return Search;
    case "coding":
      return Bot;
    case "creative":
      return Sparkles;
    case "productivity":
      return Zap;
    default:
      return Bot;
  }
};

const AIToolsPage = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<AIToolCategory[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [filteredTools, setFilteredTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("ai_tool_categories")
        .select("id, title, description, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("title");

      if (categoriesError) throw categoriesError;

      // Load tools with categories
      const { data: toolsData, error: toolsError } = await supabase
        .from("ai_tools")
        .select(
          `
          id, name, description, category_id, url, is_premium, price, rating, features, logo_url, screenshot_urls, tags, popularity_score, is_featured, is_active, meta_data, created_by, created_at, updated_at,
          ai_tool_categories!inner(title)
        `,
        )
        .eq("is_active", true)
        .order("popularity_score", { ascending: false });

      if (toolsError) throw toolsError;

      const processedTools = (toolsData || []).map((tool) => ({
        ...tool,
        features: tool.features || [],
        category: Array.isArray(tool.ai_tool_categories) ? tool.ai_tool_categories[0] : tool.ai_tool_categories,
      }));

      setCategories(categoriesData || []);
      setTools(processedTools);
      setFilteredTools(processedTools);
    } catch (error) {
      console.error("Error loading AI tools:", error);
      Alert.alert("Error", "Failed to load AI tools. Please try again.");
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
  }, [selectedCategory, searchQuery, tools]);

  const filterTools = () => {
    let filtered = tools;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((tool) => tool.category_id === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query) ||
          tool.features.some((feature) => feature.toLowerCase().includes(query)),
      );
    }

    setFilteredTools(filtered);
  };

  const openTool = async (tool: AITool) => {
    try {
      const canOpen = await Linking.canOpenURL(tool.url);
      if (canOpen) {
        await Linking.openURL(tool.url);
      } else {
        Alert.alert("Error", "Unable to open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open the tool");
    }
  };

  const renderCategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
      <TouchableOpacity
        style={[styles.categoryButton, selectedCategory === "all" && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory("all")}
      >
        <Globe size={20} color={selectedCategory === "all" ? "#fff" : "#6B7280"} />
        <Text style={[styles.categoryButtonText, selectedCategory === "all" && styles.categoryButtonTextActive]}>
          All Tools
        </Text>
      </TouchableOpacity>

      {categories.map((category) => {
        const IconComponent = getCategoryIcon(category.id);
        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <IconComponent size={20} color={selectedCategory === category.id ? "#fff" : "#6B7280"} />
            <Text
              style={[styles.categoryButtonText, selectedCategory === category.id && styles.categoryButtonTextActive]}
            >
              {category.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderToolCard = (tool: AITool) => (
    <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => openTool(tool)}>
      <View style={styles.toolHeader}>
        <View style={styles.toolInfo}>
          <View style={styles.toolTitleRow}>
            <Text style={styles.toolName}>{tool.name}</Text>
            {tool.is_premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
            {tool.is_featured && (
              <View style={styles.featuredBadge}>
                <Star size={12} color="#FFD700" fill="#FFD700" />
              </View>
            )}
          </View>
          <Text style={styles.toolCategory}>{tool.category?.title}</Text>
        </View>
        <View style={styles.toolRating}>
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Text style={styles.ratingText}>{tool.rating.toFixed(1)}</Text>
        </View>
      </View>

      <Text style={styles.toolDescription} numberOfLines={2}>
        {tool.description}
      </Text>

      {tool.features && tool.features.length > 0 && (
        <View style={styles.featuresContainer}>
          {tool.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {tool.features.length > 3 && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>+{tool.features.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.toolFooter}>
        {tool.price && <Text style={styles.priceText}>{tool.price}</Text>}
        <View style={styles.openButton}>
          <ExternalLink size={16} color="#3B82F6" />
          <Text style={styles.openButtonText}>Open Tool</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading AI Tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>AI Tools</Text>
          <Text style={styles.subtitle}>Discover powerful AI tools for productivity</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search AI tools..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Tools List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""} available
          </Text>
        </View>

        <View style={styles.toolsContainer}>{filteredTools.map(renderToolCard)}</View>

        {filteredTools.length === 0 && (
          <View style={styles.emptyContainer}>
            <Bot size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No tools found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or category filter</Text>
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
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    maxHeight: 64,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    height: 48,
  },
  categoryButtonActive: {
    backgroundColor: "#3B82F6",
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
    color: "#6B7280",
  },
  toolsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  toolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  toolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginRight: 8,
  },
  premiumBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  featuredBadge: {
    backgroundColor: "#FEF3C7",
    padding: 4,
    borderRadius: 4,
  },
  toolCategory: {
    fontSize: 14,
    color: "#6B7280",
  },
  toolRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  toolDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  featureTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: "#3730A3",
  },
  toolFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#3B82F6",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});

export default AIToolsPage;
