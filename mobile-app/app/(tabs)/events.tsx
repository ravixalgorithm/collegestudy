import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  Building,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
} from "lucide-react-native";

interface CombinedItem {
  id: string;
  title: string;
  description?: string;
  item_type: "event" | "opportunity";
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  company_name?: string;
  type?: string;
  application_link?: string;
  deadline?: string;
  expires_at?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Bookmark {
  item_id: string;
  item_type: string;
}

export default function EventsAndOpportunities() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "opportunities">("events");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/welcome");
        return;
      }

      setUserId(user.id);

      // Load combined events and opportunities
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .gte("event_date", new Date().toISOString().split("T")[0])
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("event_date", { ascending: true });

      const { data: opportunitiesData } = await supabase
        .from("opportunities")
        .select("*")
        .eq("is_published", true)
        .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
        .order("deadline", { ascending: true });

      // Transform and combine data
      const transformedEvents: CombinedItem[] = (eventsData || []).map((event) => ({
        ...event,
        item_type: "event" as const,
        date: event.event_date,
      }));

      const transformedOpportunities: CombinedItem[] = (opportunitiesData || []).map((opp) => ({
        ...opp,
        item_type: "opportunity" as const,
        date: opp.deadline ? opp.deadline.split("T")[0] : opp.created_at.split("T")[0],
      }));

      // Combine and sort by date
      const combinedItems = [...transformedEvents, ...transformedOpportunities].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      setItems(combinedItems);

      // Load user bookmarks
      const { data: bookmarksData } = await supabase
        .from("opportunity_bookmarks")
        .select("opportunity_id")
        .eq("user_id", user.id);

      const bookmarkList: Bookmark[] = (bookmarksData || []).map((b) => ({
        item_id: b.opportunity_id,
        item_type: "opportunity",
      }));

      setBookmarks(bookmarkList);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load events and opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function toggleBookmark(itemId: string, itemType: string) {
    if (!userId || itemType !== "opportunity") return;

    try {
      const isBookmarked = bookmarks.some((b) => b.item_id === itemId);

      if (isBookmarked) {
        await supabase.from("opportunity_bookmarks").delete().eq("opportunity_id", itemId).eq("user_id", userId);

        setBookmarks((prev) => prev.filter((b) => b.item_id !== itemId));
      } else {
        await supabase.from("opportunity_bookmarks").insert({
          opportunity_id: itemId,
          user_id: userId,
        });

        setBookmarks((prev) => [...prev, { item_id: itemId, item_type: itemType }]);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to update bookmark");
    }
  }

  async function openLink(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Error", "Failed to open link");
    }
  }

  function getDaysUntil(dateString: string): number {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getItemTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case "internship":
        return "#3B82F6";
      case "job":
        return "#10B981";
      case "scholarship":
        return "#F59E0B";
      case "competition":
        return "#EF4444";
      case "workshop":
        return "#8B5CF6";
      default:
        return "#6B7280";
    }
  }

  function getItemTypeIcon(itemType: string, type?: string) {
    if (itemType === "event") {
      return <Calendar color="#3B82F6" size={20} />;
    }

    switch (type?.toLowerCase()) {
      case "internship":
        return <Briefcase color="#3B82F6" size={20} />;
      case "job":
        return <Building color="#10B981" size={20} />;
      case "scholarship":
        return <GraduationCap color="#F59E0B" size={20} />;
      case "competition":
        return <Award color="#EF4444" size={20} />;
      case "workshop":
        return <Users color="#8B5CF6" size={20} />;
      default:
        return <Briefcase color="#6B7280" size={20} />;
    }
  }

  function isBookmarked(itemId: string): boolean {
    return bookmarks.some((b) => b.item_id === itemId);
  }

  const filteredItems = items.filter((item) => {
    if (activeTab === "events") return item.item_type === "event";
    if (activeTab === "opportunities") return item.item_type === "opportunity";
    return false;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events & Opportunities</Text>
        <Text style={styles.headerSubtitle}>Latest events & opportunities</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "events" && styles.tabActive]}
          onPress={() => setActiveTab("events")}
        >
          <Calendar color={activeTab === "events" ? "#0066cc" : "#666"} size={20} />
          <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>
            Events ({items.filter((i) => i.item_type === "event").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "opportunities" && styles.tabActive]}
          onPress={() => setActiveTab("opportunities")}
        >
          <Briefcase color={activeTab === "opportunities" ? "#0066cc" : "#666"} size={20} />
          <Text style={[styles.tabText, activeTab === "opportunities" && styles.tabTextActive]}>
            Opportunities ({items.filter((i) => i.item_type === "opportunity").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar color="#D1D5DB" size={64} />
            <Text style={styles.emptyTitle}>No {activeTab} found</Text>
            <Text style={styles.emptySubtitle}>
              No {activeTab} are currently available. Check back later for updates.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {filteredItems.map((item) => {
              const daysUntil = getDaysUntil(item.date);
              const isExpiringSoon = daysUntil <= 3 && daysUntil >= 0;
              const isEvent = item.item_type === "event";

              return (
                <TouchableOpacity
                  key={`${item.item_type}-${item.id}`}
                  style={[styles.itemCard, styles.clickableCard]}
                  onPress={() => {
                    if (isEvent) {
                      router.push(`/event/${item.id}`);
                    } else {
                      router.push(`/opportunity/${item.id}`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {/* Item Type Badge */}
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: isEvent ? "#EBF8FF" : getItemTypeColor(item.type || "") + "20" },
                    ]}
                  >
                    {getItemTypeIcon(item.item_type, item.type)}
                    <Text style={[styles.typeText, { color: isEvent ? "#3B82F6" : getItemTypeColor(item.type || "") }]}>
                      {isEvent ? "Event" : item.type || "Opportunity"}
                    </Text>
                  </View>

                  {/* Bookmark Button (for opportunities only) */}
                  {!isEvent && (
                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={() => toggleBookmark(item.id, item.item_type)}
                    >
                      {isBookmarked(item.id) ? (
                        <BookmarkCheck color="#3B82F6" size={20} />
                      ) : (
                        <Bookmark color="#9CA3AF" size={20} />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Content */}
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {item.description && (
                      <Text style={styles.itemDescription} numberOfLines={3}>
                        {item.description}
                      </Text>
                    )}

                    {/* Company/Organizer */}
                    {item.company_name && (
                      <View style={styles.infoRow}>
                        <Building color="#6B7280" size={16} />
                        <Text style={styles.infoText}>{item.company_name}</Text>
                      </View>
                    )}

                    {/* Date/Time Info */}
                    <View style={styles.infoRow}>
                      <Clock color="#6B7280" size={16} />
                      <Text style={styles.infoText}>
                        {isEvent ? (
                          <>
                            {new Date(item.date).toLocaleDateString()}
                            {item.start_time && ` • ${item.start_time}`}
                          </>
                        ) : item.deadline ? (
                          `Deadline: ${new Date(item.deadline).toLocaleDateString()}`
                        ) : (
                          "No deadline specified"
                        )}
                      </Text>
                      {isExpiringSoon && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentText}>{daysUntil === 0 ? "Today!" : `${daysUntil}d left`}</Text>
                        </View>
                      )}
                    </View>

                    {/* Location */}
                    {item.location && (
                      <View style={styles.infoRow}>
                        <MapPin color="#6B7280" size={16} />
                        <Text style={styles.infoText}>{item.location}</Text>
                      </View>
                    )}

                    {/* Action Button or Click to View */}
                    {item.application_link ? (
                      <TouchableOpacity style={styles.actionButton} onPress={() => openLink(item.application_link!)}>
                        <ExternalLink color="#3B82F6" size={16} />
                        <Text style={styles.actionButtonText}>{isEvent ? "Register" : "Apply Now"}</Text>
                        <ChevronRight color="#3B82F6" size={16} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.tapToViewHint}>
                        <Text style={styles.tapToViewText}>Tap to view details</Text>
                        <ChevronRight color="#9CA3AF" size={16} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#0066cc",
  },
  tabText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#0066cc",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  itemsList: {
    padding: 20,
    gap: 16,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  bookmarkButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    lineHeight: 24,
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EBF8FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginHorizontal: 8,
  },
  clickableCard: {
    borderColor: "#e6f4ff",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tapToViewHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingVertical: 8,
  },
  tapToViewText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginRight: 4,
  },
  bottomSpacing: {
    height: 20,
  },
});
