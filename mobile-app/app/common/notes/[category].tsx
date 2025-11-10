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
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../src/lib/supabase";
import {
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  Search,
  Star,
  Clock,
  Users,
  Eye,
  Shield,
  Award,
} from "lucide-react-native";

interface Note {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type?: string;
  file_size?: string;
  uploaded_by: string;
  uploaded_at: string;
  downloads: number;
  rating: number;
  rating_count: number;
  views: number;
  is_featured: boolean;
  is_approved: boolean;
  is_verified: boolean;
  tags: string[];
}

interface User {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function CategoryNotes() {
  const router = useRouter();
  const { category, topicId, topicTitle, topicDescription } = useLocalSearchParams();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploaders, setUploaders] = useState<{ [key: string]: User }>({});

  useEffect(() => {
    loadNotes();
  }, [category, topicId]);

  const loadNotes = async () => {
    try {
      setLoading(true);

      // Load notes from database
      const { data: notesData, error } = await supabase
        .from("common_notes")
        .select("*")
        .eq("category_id", category)
        .eq("topic_id", topicId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedNotes = notesData?.map(note => ({
        ...note,
        uploaded_at: note.created_at,
      })) || [];

      setNotes(formattedNotes);

      // Load uploader information
      if (notesData && notesData.length > 0) {
        const uploaderIds = [...new Set(notesData.map(note => note.uploaded_by))];
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, avatar_url")
          .in("id", uploaderIds);

        if (usersData) {
          const uploadersMap = usersData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as { [key: string]: User });
          setUploaders(uploadersMap);
        }
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleDownload = async (note: Note) => {
    try {
      // Update download count
      await supabase
        .from("common_notes")
        .update({ downloads: (note.downloads || 0) + 1 })
        .eq("id", note.id);

      // Open file URL
      const supported = await Linking.canOpenURL(note.file_url);
      if (supported) {
        await Linking.openURL(note.file_url);
      } else {
        Alert.alert("Error", "Unable to open this file");
      }

      // Update local state
      setNotes(prev => prev.map(n =>
        n.id === note.id
          ? { ...n, downloads: (n.downloads || 0) + 1 }
          : n
      ));
    } catch (error) {
      console.error("Error downloading file:", error);
      Alert.alert("Error", "Failed to download file");
    }
  };

  const handleViewNote = async (note: Note) => {
    try {
      // Update view count
      await supabase
        .from("common_notes")
        .update({ views: (note.views || 0) + 1 })
        .eq("id", note.id);

      // Update local state
      setNotes(prev => prev.map(n =>
        n.id === note.id
          ? { ...n, views: (n.views || 0) + 1 }
          : n
      ));
    } catch (error) {
      console.error("Error updating view count:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return '#ff4d4f';
      case 'doc':
      case 'docx': return '#1890ff';
      case 'ppt':
      case 'pptx': return '#fa8c16';
      case 'video': return '#722ed1';
      case 'txt': return '#52c41a';
      default: return '#666';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'ppt':
      case 'pptx': return '📊';
      case 'video': return '🎥';
      default: return '📄';
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={12}
          color={i < fullStars ? "#faad14" : "#d9d9d9"}
          fill={i < fullStars ? "#faad14" : "transparent"}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>{topicTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {notes.length} {notes.length === 1 ? 'Resource' : 'Resources'} Available
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.qualityBadge}>
            <Shield color="#52c41a" size={16} />
            <Text style={styles.qualityText}>Verified</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Topic Info */}
        <View style={styles.topicInfo}>
          <Text style={styles.topicTitle}>{topicTitle}</Text>
          <Text style={styles.topicDescription}>{topicDescription}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <FileText color="#1890ff" size={16} />
              <Text style={styles.statText}>{notes.length} Resources</Text>
            </View>
            <View style={styles.stat}>
              <Download color="#52c41a" size={16} />
              <Text style={styles.statText}>
                {notes.reduce((sum, note) => sum + (note.downloads || 0), 0)} Downloads
              </Text>
            </View>
            <View style={styles.stat}>
              <Eye color="#722ed1" size={16} />
              <Text style={styles.statText}>
                {notes.reduce((sum, note) => sum + (note.views || 0), 0)} Views
              </Text>
            </View>
            <View style={styles.stat}>
              <Star color="#faad14" size={16} />
              <Text style={styles.statText}>
                {notes.length > 0 ? (notes.reduce((sum, note) => sum + note.rating, 0) / notes.length).toFixed(1) : '0'} Rating
              </Text>
            </View>
          </View>
        </View>

        {/* Notes List */}
        <View style={styles.notesSection}>
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText color="#ccc" size={48} />
              <Text style={styles.emptyTitle}>No Resources Available</Text>
              <Text style={styles.emptyDescription}>
                Resources for this topic will be available soon. Check back later for updates!
              </Text>
            </View>
          ) : (
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Filter by Type</Text>
              <View style={styles.filterTags}>
                <TouchableOpacity style={styles.filterTag}>
                  <Text style={styles.filterTagText}>All ({notes.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterTag}>
                  <Text style={styles.filterTagText}>PDF ({notes.filter(n => n.file_type === 'pdf').length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Videos ({notes.filter(n => n.file_type === 'video').length})</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {notes.length > 0 && (
            notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onPress={() => handleViewNote(note)}
                activeOpacity={0.7}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.noteIconContainer}>
                    <Text style={styles.noteIcon}>{getFileTypeIcon(note.file_type || '')}</Text>
                  </View>
                  <View style={styles.noteInfo}>
                    <View style={styles.noteTitleRow}>
                      <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                      {note.is_featured && (
                        <View style={styles.featuredBadge}>
                          <Award color="#faad14" size={12} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.noteDescription} numberOfLines={2}>{note.description}</Text>
                  </View>
                  {note.file_type && (
                    <View style={[
                      styles.fileTypeBadge,
                      { backgroundColor: getFileTypeColor(note.file_type) }
                    ]}>
                      <Text style={styles.fileTypeText}>
                        {note.file_type.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.noteStats}>
                  <View style={styles.noteStat}>
                    <View style={styles.starsContainer}>
                      {renderStars(note.rating || 4.0)}
                    </View>
                    <Text style={styles.ratingText}>{(note.rating || 4.0).toFixed(1)} ({note.rating_count || 0})</Text>
                  </View>

                  <View style={styles.noteStat}>
                    <Download color="#52c41a" size={14} />
                    <Text style={styles.noteStatText}>{note.downloads || 0}</Text>
                  </View>

                  <View style={styles.noteStat}>
                    <Eye color="#722ed1" size={14} />
                    <Text style={styles.noteStatText}>{note.views || 0}</Text>
                  </View>

                  <View style={styles.noteStat}>
                    <Clock color="#666" size={14} />
                    <Text style={styles.noteStatText}>{formatDate(note.uploaded_at)}</Text>
                  </View>
                </View>

                {(note.is_verified || note.is_approved) && (
                  <View style={styles.verificationRow}>
                    {note.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Shield color="#52c41a" size={12} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    {note.is_approved && (
                      <View style={styles.approvedBadge}>
                        <Text style={styles.approvedText}>✓ Approved</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.noteFooter}>
                  <View style={styles.uploaderInfo}>
                    <Text style={styles.uploaderText}>
                      By {uploaders[note.uploaded_by]?.name || "Administrator"}
                    </Text>
                    {note.file_size && (
                      <Text style={styles.fileSizeText}>• {note.file_size}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(note)}
                  >
                    <Download color="#ffffff" size={16} />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  headerActions: {
    alignItems: "flex-end",
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f6ffed",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#52c41a",
  },
  scrollView: {
    flex: 1,
  },
  topicInfo: {
    backgroundColor: "#ffffff",
    margin: 16,
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
  topicTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  topicDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  notesSection: {
    marginHorizontal: 16,
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
  filterSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  noteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  noteIcon: {
    fontSize: 18,
  },
  noteInfo: {
    flex: 1,
    marginRight: 12,
  },
  noteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  featuredBadge: {
    marginLeft: 8,
  },
  noteDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  fileTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fileTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  noteStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  noteStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  noteStatText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  verificationRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f6ffed",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#52c41a",
  },
  approvedBadge: {
    backgroundColor: "#e6f4ff",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  approvedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1890ff",
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  uploaderInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploaderText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  fileSizeText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 4,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1890ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  bottomSpacing: {
    height: 32,
  },
});
