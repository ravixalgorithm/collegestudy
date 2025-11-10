import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building,
  Share2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Tag,
  Info,
  MapPin,
  DollarSign,
  Users,
  GraduationCap,
  User,
  Globe,
  Home,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  company_name?: string;
  location?: string;
  deadline?: string;
  application_link?: string;
  eligibility?: string;
  target_branches?: string[];
  target_years?: number[];
  stipend?: string;
  is_remote: boolean;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  full_name: string;
}

interface User {
  id: string;
  full_name?: string;
  email: string;
}

export default function OpportunityDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [targetBranches, setTargetBranches] = useState<Branch[]>([]);
  const [creator, setCreator] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      loadOpportunityDetails();
    }
  }, [id]);

  async function loadOpportunityDetails() {
    try {
      setLoading(true);

      // Get user ID for bookmark status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }

      // Load opportunity details with all fields
      const { data: opportunityData, error } = await supabase
        .from("opportunities")
        .select(
          `
          *
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (!opportunityData) {
        Alert.alert("Error", "Opportunity not found");
        router.back();
        return;
      }

      setOpportunity(opportunityData);

      // Load target branches if they exist
      if (opportunityData.target_branches && opportunityData.target_branches.length > 0) {
        const { data: branchesData } = await supabase
          .from("branches")
          .select("id, code, name, full_name")
          .in("id", opportunityData.target_branches);

        if (branchesData) {
          setTargetBranches(branchesData);
        }
      }

      // Load creator information
      if (opportunityData.created_by) {
        const { data: creatorData } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", opportunityData.created_by)
          .single();

        if (creatorData) {
          setCreator(creatorData);
        }
      }

      // Check bookmark status
      if (user) {
        const { data: bookmarkData } = await supabase
          .from("opportunity_bookmarks")
          .select("id")
          .eq("opportunity_id", id)
          .eq("user_id", user.id)
          .single();

        setIsBookmarked(!!bookmarkData);
      }
    } catch (error) {
      console.error("Error loading opportunity details:", error);
      Alert.alert("Error", "Failed to load opportunity details");
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark() {
    if (!userId || !opportunity) return;

    try {
      if (isBookmarked) {
        await supabase
          .from("opportunity_bookmarks")
          .delete()
          .eq("opportunity_id", opportunity.id)
          .eq("user_id", userId);
        setIsBookmarked(false);
      } else {
        await supabase.from("opportunity_bookmarks").insert({
          opportunity_id: opportunity.id,
          user_id: userId,
        });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to update bookmark");
    }
  }

  async function handleShare() {
    if (!opportunity) return;

    try {
      const targetInfo = [];

      if (targetBranches.length > 0) {
        targetInfo.push(`Target Branches: ${targetBranches.map((b) => b.name).join(", ")}`);
      }

      if (opportunity.target_years && opportunity.target_years.length > 0) {
        targetInfo.push(`Target Years: ${opportunity.target_years.join(", ")}`);
      }

      const message = `Check out this ${opportunity.type.toLowerCase()}: ${opportunity.title}\n\n${opportunity.description}\n\n${
        opportunity.company_name ? `Company: ${opportunity.company_name}\n` : ""
      }${opportunity.location ? `Location: ${opportunity.location}${opportunity.is_remote ? " (Remote)" : ""}\n` : ""}${
        opportunity.stipend ? `Stipend: ${opportunity.stipend}\n` : ""
      }${opportunity.deadline ? `Deadline: ${new Date(opportunity.deadline).toLocaleDateString()}\n` : ""}${
        targetInfo.length > 0 ? `\n${targetInfo.join("\n")}\n` : ""
      }${opportunity.application_link ? `\nApply: ${opportunity.application_link}` : ""}`;

      await Share.share({
        message,
        title: opportunity.title,
      });
    } catch (error) {
      console.error("Error sharing opportunity:", error);
    }
  }

  async function openApplicationLink() {
    if (!opportunity?.application_link) return;

    try {
      const supported = await Linking.canOpenURL(opportunity.application_link);
      if (supported) {
        await Linking.openURL(opportunity.application_link);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      console.error("Error opening application link:", error);
    }
  }

  function getTypeColor(type: string): string {
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

  function isExpired(): boolean {
    if (!opportunity?.deadline) return false;
    const deadline = new Date(opportunity.deadline);
    const now = new Date();
    return deadline < now;
  }

  function getDaysUntil(dateString: string): number {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading opportunity details...</Text>
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Opportunity not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const expired = isExpired();
  const daysUntil = opportunity.deadline ? getDaysUntil(opportunity.deadline) : null;
  const typeColor = getTypeColor(opportunity.type);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opportunity Details</Text>
        <View style={styles.headerActions}>
          {userId && (
            <TouchableOpacity style={styles.headerButton} onPress={toggleBookmark}>
              {isBookmarked ? <BookmarkCheck color="#0066cc" size={24} /> : <Bookmark color="#333" size={24} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Share2 color="#333" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status and Type */}
        <View style={styles.statusContainer}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{opportunity.type}</Text>
          </View>

          {opportunity.is_remote && (
            <View style={[styles.statusBadge, styles.remoteBadge]}>
              <Globe color="#0066cc" size={12} />
              <Text style={[styles.statusText, styles.remoteText]}>Remote</Text>
            </View>
          )}

          {expired ? (
            <View style={[styles.statusBadge, styles.expiredBadge]}>
              <Text style={[styles.statusText, styles.expiredText]}>Expired</Text>
            </View>
          ) : daysUntil !== null ? (
            daysUntil === 0 ? (
              <View style={[styles.statusBadge, styles.todayBadge]}>
                <Text style={[styles.statusText, styles.todayText]}>Last Day</Text>
              </View>
            ) : daysUntil <= 7 ? (
              <View style={[styles.statusBadge, styles.soonBadge]}>
                <Text style={[styles.statusText, styles.soonText]}>{daysUntil} days left</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.openBadge]}>
                <Text style={[styles.statusText, styles.openText]}>Open</Text>
              </View>
            )
          ) : null}
        </View>

        {/* Title and Basic Info */}
        <View style={styles.mainInfoContainer}>
          <Text style={styles.title}>{opportunity.title}</Text>

          <View style={styles.infoGrid}>
            {opportunity.company_name && (
              <View style={styles.infoRow}>
                <Building color="#0066cc" size={20} />
                <Text style={styles.infoText}>{opportunity.company_name}</Text>
              </View>
            )}

            {opportunity.location && (
              <View style={styles.infoRow}>
                <MapPin color="#0066cc" size={20} />
                <Text style={styles.infoText}>
                  {opportunity.location}
                  {opportunity.is_remote && " (Remote options available)"}
                </Text>
              </View>
            )}

            {opportunity.stipend && (
              <View style={styles.infoRow}>
                <DollarSign color="#0066cc" size={20} />
                <Text style={styles.infoText}>{opportunity.stipend}</Text>
              </View>
            )}

            {opportunity.deadline && (
              <View style={styles.infoRow}>
                <Calendar color={expired ? "#ff4444" : "#0066cc"} size={20} />
                <Text style={[styles.infoText, expired && styles.expiredText]}>
                  Deadline: {formatDate(opportunity.deadline)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Target Audience */}
        {(targetBranches.length > 0 || (opportunity.target_years && opportunity.target_years.length > 0)) && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Users color="#0066cc" size={20} />
              <Text style={styles.sectionTitle}>Target Audience</Text>
            </View>

            {targetBranches.length > 0 ? (
              <View style={styles.targetInfo}>
                <Text style={styles.targetLabel}>Target Branches:</Text>
                <View style={styles.branchContainer}>
                  {targetBranches.map((branch) => (
                    <View key={branch.id} style={styles.branchBadge}>
                      <Text style={styles.branchText}>{branch.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.targetInfo}>
                <CheckCircle color="#10B981" size={16} />
                <Text style={[styles.targetLabel, { color: "#10B981", marginLeft: 8 }]}>Open to all branches</Text>
              </View>
            )}

            {opportunity.target_years && opportunity.target_years.length > 0 ? (
              <View style={styles.targetInfo}>
                <Text style={styles.targetLabel}>Target Years:</Text>
                <View style={styles.yearContainer}>
                  {opportunity.target_years.map((year) => (
                    <View key={year} style={styles.yearBadge}>
                      <GraduationCap color="#0066cc" size={14} />
                      <Text style={styles.yearText}>
                        {year}
                        {"" + (year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th")} Year
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.targetInfo}>
                <CheckCircle color="#10B981" size={16} />
                <Text style={[styles.targetLabel, { color: "#10B981", marginLeft: 8 }]}>Open to all years</Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Info color="#0066cc" size={20} />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.description}>{opportunity.description}</Text>
        </View>

        {/* Eligibility */}
        {opportunity.eligibility && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <CheckCircle color="#0066cc" size={20} />
              <Text style={styles.sectionTitle}>Eligibility & Requirements</Text>
            </View>
            <Text style={styles.description}>{opportunity.eligibility}</Text>
          </View>
        )}

        {/* Additional Information */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <AlertCircle color="#0066cc" size={20} />
            <Text style={styles.sectionTitle}>Additional Information</Text>
          </View>

          <View style={styles.metadataGrid}>
            {creator && (
              <View style={styles.metadataRow}>
                <User color="#666" size={16} />
                <View style={styles.metadataContent}>
                  <Text style={styles.metadataLabel}>Posted by</Text>
                  <Text style={styles.metadataValue}>{creator.full_name || creator.email}</Text>
                </View>
              </View>
            )}

            <View style={styles.metadataRow}>
              <Calendar color="#666" size={16} />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Posted on</Text>
                <Text style={styles.metadataValue}>{formatDate(opportunity.created_at)}</Text>
              </View>
            </View>

            {opportunity.updated_at !== opportunity.created_at && (
              <View style={styles.metadataRow}>
                <Clock color="#666" size={16} />
                <View style={styles.metadataContent}>
                  <Text style={styles.metadataLabel}>Last updated</Text>
                  <Text style={styles.metadataValue}>{formatDateTime(opportunity.updated_at)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Apply Button */}
        {opportunity.application_link && (
          <View style={styles.applyContainer}>
            <TouchableOpacity
              style={[styles.applyButton, expired && styles.applyButtonDisabled]}
              onPress={openApplicationLink}
              disabled={expired}
            >
              <ExternalLink color={expired ? "#999" : "#fff"} size={20} />
              <Text style={[styles.applyButtonText, expired && styles.applyButtonTextDisabled]}>
                {expired ? "Application Closed" : "Apply Now"}
              </Text>
            </TouchableOpacity>
            {expired && (
              <Text style={styles.expiredNote}>
                This opportunity has expired and is no longer accepting applications.
              </Text>
            )}
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  remoteBadge: {
    backgroundColor: "#e8f4ff",
    borderColor: "#0066cc",
  },
  expiredBadge: {
    backgroundColor: "#f5f5f5",
    borderColor: "#d9d9d9",
  },
  todayBadge: {
    backgroundColor: "#fff2e8",
    borderColor: "#ff8c00",
  },
  soonBadge: {
    backgroundColor: "#fff1f0",
    borderColor: "#ff4d4f",
  },
  openBadge: {
    backgroundColor: "#f6ffed",
    borderColor: "#52c41a",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  remoteText: {
    color: "#0066cc",
  },
  expiredText: {
    color: "#8c8c8c",
  },
  todayText: {
    color: "#ff8c00",
  },
  soonText: {
    color: "#ff4d4f",
  },
  openText: {
    color: "#52c41a",
  },
  mainInfoContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
    lineHeight: 34,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#555",
    flex: 1,
  },
  sectionContainer: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  description: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  targetInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  targetLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginRight: 12,
    minWidth: 80,
  },
  branchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  branchBadge: {
    backgroundColor: "#e8f4ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0066cc",
  },
  branchText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0066cc",
  },
  yearContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0066cc",
    gap: 4,
  },
  yearText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0066cc",
  },
  metadataGrid: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  metadataContent: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  applyContainer: {
    padding: 20,
    margin: 16,
    marginTop: 0,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0066cc",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  applyButtonDisabled: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#d9d9d9",
    elevation: 0,
    shadowOpacity: 0,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  applyButtonTextDisabled: {
    color: "#999",
  },
  expiredNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  bottomSpacing: {
    height: 40,
  },
});
