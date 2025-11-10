import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  ExternalLink,
  User,
  Building,
  Tag,
  Info,
  Phone,
  Mail,
} from "lucide-react-native";

interface Event {
  id: string;
  title: string;
  description: string;
  poster_url?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  organizer?: string;
  categories?: string[];
  target_branches?: string[];
  target_semesters?: number[];
  max_participants?: number;
  registration_deadline?: string;
  is_published: boolean;
  created_at: string;
}

export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadEventDetails();
    }
  }, [id]);

  async function loadEventDetails() {
    try {
      setLoading(true);

      // Load user profile to check branch/semester eligibility
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("users")
          .select("*, branches(name, code)")
          .eq("id", user.id)
          .single();
        setUserProfile(profileData);
      }

      // Load event details
      const { data: eventData, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (!eventData) {
        Alert.alert("Error", "Event not found");
        router.back();
        return;
      }

      setEvent(eventData);
    } catch (error) {
      console.error("Error loading event details:", error);
      Alert.alert("Error", "Failed to load event details");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!event) return;

    try {
      const message = `Check out this event: ${event.title}\n\n${event.description}\n\nDate: ${new Date(
        event.event_date
      ).toLocaleDateString()}${event.start_time ? ` at ${event.start_time}` : ""}${
        event.location ? `\nLocation: ${event.location}` : ""
      }`;

      await Share.share({
        message,
        title: event.title,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
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
    }
  }

  function isEventPast(): boolean {
    if (!event) return false;
    const eventDate = new Date(event.event_date);
    const now = new Date();
    return eventDate < now;
  }

  function isRegistrationOpen(): boolean {
    if (!event || !event.registration_deadline) return true;
    const deadline = new Date(event.registration_deadline);
    const now = new Date();
    return deadline > now;
  }

  function isUserEligible(): boolean {
    if (!event || !userProfile) return true;

    // Check branch eligibility
    if (event.target_branches && event.target_branches.length > 0) {
      if (!event.target_branches.includes(userProfile.branch_id)) {
        return false;
      }
    }

    // Check semester eligibility
    if (event.target_semesters && event.target_semesters.length > 0) {
      if (!event.target_semesters.includes(userProfile.semester)) {
        return false;
      }
    }

    return true;
  }

  function getDaysUntil(dateString: string): number {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPast = isEventPast();
  const isRegOpen = isRegistrationOpen();
  const isEligible = isUserEligible();
  const daysUntil = getDaysUntil(event.event_date);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Share2 color="#333" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Poster */}
        {event.poster_url && (
          <View style={styles.posterContainer}>
            <Image source={{ uri: event.poster_url }} style={styles.poster} resizeMode="cover" />
          </View>
        )}

        {/* Event Status Badge */}
        <View style={styles.statusContainer}>
          {isPast ? (
            <View style={[styles.statusBadge, styles.pastBadge]}>
              <Text style={[styles.statusText, styles.pastText]}>Event Ended</Text>
            </View>
          ) : daysUntil === 0 ? (
            <View style={[styles.statusBadge, styles.todayBadge]}>
              <Text style={[styles.statusText, styles.todayText]}>Today</Text>
            </View>
          ) : daysUntil === 1 ? (
            <View style={[styles.statusBadge, styles.soonBadge]}>
              <Text style={[styles.statusText, styles.soonText]}>Tomorrow</Text>
            </View>
          ) : daysUntil <= 7 ? (
            <View style={[styles.statusBadge, styles.soonBadge]}>
              <Text style={[styles.statusText, styles.soonText]}>{daysUntil} days away</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.upcomingBadge]}>
              <Text style={[styles.statusText, styles.upcomingText]}>Upcoming</Text>
            </View>
          )}

          {!isEligible && (
            <View style={[styles.statusBadge, styles.notEligibleBadge]}>
              <Text style={[styles.statusText, styles.notEligibleText]}>Not Eligible</Text>
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Date and Time */}
          <View style={styles.infoRow}>
            <Calendar color="#0066cc" size={20} />
            <Text style={styles.infoText}>
              {new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          {/* Time */}
          {(event.start_time || event.end_time) && (
            <View style={styles.infoRow}>
              <Clock color="#0066cc" size={20} />
              <Text style={styles.infoText}>
                {event.start_time}
                {event.end_time && ` - ${event.end_time}`}
              </Text>
            </View>
          )}

          {/* Location */}
          {event.location && (
            <View style={styles.infoRow}>
              <MapPin color="#0066cc" size={20} />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}

          {/* Organizer */}
          {event.organizer && (
            <View style={styles.infoRow}>
              <Building color="#0066cc" size={20} />
              <Text style={styles.infoText}>Organized by {event.organizer}</Text>
            </View>
          )}

          {/* Max Participants */}
          {event.max_participants && (
            <View style={styles.infoRow}>
              <Users color="#0066cc" size={20} />
              <Text style={styles.infoText}>Limited to {event.max_participants} participants</Text>
            </View>
          )}

          {/* Registration Deadline */}
          {event.registration_deadline && (
            <View style={styles.infoRow}>
              <Clock color={isRegOpen ? "#0066cc" : "#ff4444"} size={20} />
              <Text style={[styles.infoText, !isRegOpen && styles.expiredText]}>
                Registration deadline: {new Date(event.registration_deadline).toLocaleDateString()}
                {!isRegOpen && " (Expired)"}
              </Text>
            </View>
          )}

          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <Tag color="#0066cc" size={20} />
              <View style={styles.categoriesWrapper}>
                {event.categories.map((category, index) => (
                  <View key={index} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Eligibility Info */}
          {!isEligible && (
            <View style={styles.eligibilityContainer}>
              <Info color="#ff6b6b" size={20} />
              <View style={styles.eligibilityContent}>
                <Text style={styles.eligibilityTitle}>Eligibility Requirements</Text>
                {event.target_branches && event.target_branches.length > 0 && (
                  <Text style={styles.eligibilityText}>
                    • Branches: {event.target_branches.join(", ")}
                  </Text>
                )}
                {event.target_semesters && event.target_semesters.length > 0 && (
                  <Text style={styles.eligibilityText}>
                    • Semesters: {event.target_semesters.join(", ")}
                  </Text>
                )}
                <Text style={styles.eligibilityNote}>
                  Your current profile doesn't meet the requirements for this event.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.description}</Text>
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
  },
  content: {
    flex: 1,
  },
  posterContainer: {
    backgroundColor: "#fff",
  },
  poster: {
    width: "100%",
    height: 250,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  pastBadge: {
    backgroundColor: "#f5f5f5",
    borderColor: "#d9d9d9",
  },
  todayBadge: {
    backgroundColor: "#fff2e8",
    borderColor: "#ff8c00",
  },
  soonBadge: {
    backgroundColor: "#e6f7ff",
    borderColor: "#1890ff",
  },
  upcomingBadge: {
    backgroundColor: "#f6ffed",
    borderColor: "#52c41a",
  },
  notEligibleBadge: {
    backgroundColor: "#fff1f0",
    borderColor: "#ff4d4f",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pastText: {
    color: "#8c8c8c",
  },
  todayText: {
    color: "#ff8c00",
  },
  soonText: {
    color: "#1890ff",
  },
  upcomingText: {
    color: "#52c41a",
  },
  notEligibleText: {
    color: "#ff4d4f",
  },
  infoContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#555",
    flex: 1,
  },
  expiredText: {
    color: "#ff4444",
  },
  categoriesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
  },
  categoriesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  categoryTag: {
    backgroundColor: "#f0f8ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6f4ff",
  },
  categoryText: {
    fontSize: 12,
    color: "#0066cc",
    fontWeight: "500",
  },
  eligibilityContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 16,
    backgroundColor: "#fff5f5",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffe6e6",
  },
  eligibilityContent: {
    flex: 1,
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#d73527",
    marginBottom: 8,
  },
  eligibilityText: {
    fontSize: 14,
    color: "#8b5a5a",
    marginBottom: 4,
  },
  eligibilityNote: {
    fontSize: 13,
    color: "#8b5a5a",
    fontStyle: "italic",
    marginTop: 4,
  },
  descriptionContainer: {
    backgroundColor: "#fff",
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 40,
  },
});
