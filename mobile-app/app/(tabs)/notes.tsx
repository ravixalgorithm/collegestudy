import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { BookOpen, Download, Search, ChevronDown, ChevronRight, FileText, Calendar } from "lucide-react-native";

interface UserProfile {
  branch_id: string;
  semester: number;
  year: number;
  branches?:
    | {
        name: string;
        code: string;
      }
    | {
        name: string;
        code: string;
      }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

interface Note {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  is_verified: boolean;
  download_count: number;
  module_number?: number;
  is_pyq: boolean;
  academic_year?: string;
  exam_type?: string;
  created_at: string;
}

interface NotesByCategory {
  pyq: Note[];
  modules: {
    [key: number]: Note[];
  };
}

interface SubjectWithNotes extends Subject {
  notes: NotesByCategory;
  expanded: boolean;
  expandedCategories: {
    pyq: boolean;
    [key: number]: boolean;
  };
}

export default function Notes() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithNotes[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Load user profile
      const { data: profileData } = await supabase
        .from("users")
        .select("branch_id, semester, year, branches(name, code)")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          ...profileData,
          branches: Array.isArray(profileData.branches) ? profileData.branches[0] : profileData.branches,
        } as UserProfile);

        // Load subjects for user's branch and semester
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("*")
          .eq("branch_id", profileData.branch_id)
          .eq("semester", profileData.semester)
          .order("name");

        if (subjectsData) {
          // Load notes for each subject
          const subjectsWithNotes = await Promise.all(
            subjectsData.map(async (subject) => {
              const { data: notesData } = await supabase
                .from("notes")
                .select("*")
                .eq("subject_id", subject.id)
                .eq("is_verified", true)
                .order("created_at", { ascending: false });

              // Organize notes by category
              const notesByCategory: NotesByCategory = {
                pyq: [],
                modules: {
                  1: [],
                  2: [],
                  3: [],
                  4: [],
                  5: [],
                },
              };

              if (notesData) {
                notesData.forEach((note) => {
                  if (note.is_pyq) {
                    notesByCategory.pyq.push(note);
                  } else if (note.module_number) {
                    notesByCategory.modules[note.module_number].push(note);
                  }
                });
              }

              return {
                ...subject,
                notes: notesByCategory,
                expanded: false,
                expandedCategories: {
                  pyq: false,
                  1: false,
                  2: false,
                  3: false,
                  4: false,
                  5: false,
                },
              } as SubjectWithNotes;
            }),
          );

          setSubjects(subjectsWithNotes);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleSubject(subjectId: string) {
    setSubjects((prev) =>
      prev.map((subject) => (subject.id === subjectId ? { ...subject, expanded: !subject.expanded } : subject)),
    );
  }

  function toggleCategory(subjectId: string, category: string) {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              expandedCategories: {
                ...subject.expandedCategories,
                [category]: !subject.expandedCategories[category as keyof typeof subject.expandedCategories],
              },
            }
          : subject,
      ),
    );
  }

  function extractGoogleDriveId(url: string): string | null {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]{25,})/,
      /id=([a-zA-Z0-9_-]{25,})/,
      /\/d\/([a-zA-Z0-9_-]{25,})/,
      /\/open\?id=([a-zA-Z0-9_-]{25,})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  function generateDirectDownloadUrl(fileId: string, fileType?: string): string {
    // Use the most reliable direct download format based on file type
    if (fileType === "PDF" || fileType === "pdf") {
      return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    }
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  }

  function generateFallbackUrls(fileId: string): string[] {
    return [
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${fileId}`,
      `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    ];
  }

  async function downloadNote(note: Note) {
    try {
      setDownloading(note.id);

      // Get current user for download tracking
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const trackDownload = async () => {
        if (user) {
          try {
            const trackingResult = await supabase.rpc("track_note_download", {
              p_note_id: note.id,
              p_user_id: user.id,
              p_ip_address: null,
              p_user_agent: "College Study Mobile App",
              p_file_size: null,
            });

            if (trackingResult?.data?.success) {
              console.log("Download tracked:", trackingResult.data.message);
              if (trackingResult.data.already_downloaded) {
                Alert.alert("Already Downloaded", "You've already downloaded this note today!");
              }
            }
          } catch (trackError) {
            console.log("Real download tracking failed:", trackError);
            // Fallback to old increment method
            try {
              await supabase.rpc("increment_download_count", { note_id: note.id });
            } catch (fallbackError) {
              console.log("Fallback tracking also failed:", fallbackError);
            }
          }
        }
      };

      const fileId = extractGoogleDriveId(note.file_url);

      if (fileId) {
        // Try direct download first, fallback to options
        try {
          const directUrl = generateDirectDownloadUrl(fileId, note.file_type);
          await Linking.openURL(directUrl);
          await trackDownload();
          setDownloading(null);
        } catch (error) {
          setDownloading(null);
          // Show options if direct download fails
          Alert.alert("Download Options", "Choose how to access this file:", [
            {
              text: "Try Alternative Download",
              onPress: async () => {
                const fallbackUrls = generateFallbackUrls(fileId);
                let success = false;

                for (const url of fallbackUrls) {
                  try {
                    await Linking.openURL(url);
                    await trackDownload();
                    success = true;
                    break;
                  } catch (err) {
                    continue;
                  }
                }

                if (!success) {
                  Alert.alert("Download Failed", "Unable to download. Please try opening in browser.");
                }
              },
            },
            {
              text: "Open in Browser",
              onPress: async () => {
                try {
                  const driveViewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
                  await Linking.openURL(driveViewUrl);
                  await trackDownload();
                } catch (error) {
                  Alert.alert("Error", "Unable to open link");
                }
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]);
        }
      } else {
        // Not a Google Drive link, open directly
        const supported = await Linking.canOpenURL(note.file_url);
        if (supported) {
          await Linking.openURL(note.file_url);
          await trackDownload();
        } else {
          Alert.alert("Error", "Unable to open file link");
        }
        setDownloading(null);
      }
    } catch (error) {
      console.error("Error downloading note:", error);
      Alert.alert("Error", "Failed to process download");
      setDownloading(null);
    }
  }

  function getFileTypeIcon(fileType?: string): string {
    if (!fileType) return "📄";
    const type = fileType.toLowerCase();
    if (type.includes("pdf")) return "📕";
    if (type.includes("doc")) return "📘";
    if (type.includes("ppt")) return "📙";
    if (type.includes("sheet") || type.includes("xls")) return "📊";
    return "📄";
  }

  function getCategoryNotesCount(notes: NotesByCategory): number {
    let count = notes.pyq.length;
    Object.values(notes.modules).forEach((moduleNotes) => {
      count += moduleNotes.length;
    });
    return count;
  }

  function filterSubjects(subjects: SubjectWithNotes[]): SubjectWithNotes[] {
    if (!searchQuery.trim()) return subjects;

    const query = searchQuery.toLowerCase();
    return subjects
      .map((subject) => {
        // Check if subject name or code matches
        const subjectMatches = subject.name.toLowerCase().includes(query) || subject.code.toLowerCase().includes(query);

        // Filter notes within the subject
        const filteredNotes: NotesByCategory = {
          pyq: subject.notes.pyq.filter(
            (note) =>
              note.title.toLowerCase().includes(query) ||
              note.description?.toLowerCase().includes(query) ||
              note.academic_year?.toLowerCase().includes(query),
          ),
          modules: {
            1: subject.notes.modules[1].filter(
              (note) => note.title.toLowerCase().includes(query) || note.description?.toLowerCase().includes(query),
            ),
            2: subject.notes.modules[2].filter(
              (note) => note.title.toLowerCase().includes(query) || note.description?.toLowerCase().includes(query),
            ),
            3: subject.notes.modules[3].filter(
              (note) => note.title.toLowerCase().includes(query) || note.description?.toLowerCase().includes(query),
            ),
            4: subject.notes.modules[4].filter(
              (note) => note.title.toLowerCase().includes(query) || note.description?.toLowerCase().includes(query),
            ),
            5: subject.notes.modules[5].filter(
              (note) => note.title.toLowerCase().includes(query) || note.description?.toLowerCase().includes(query),
            ),
          },
        };

        const hasMatchingNotes = getCategoryNotesCount(filteredNotes) > 0;

        if (subjectMatches || hasMatchingNotes) {
          return {
            ...subject,
            notes: subjectMatches ? subject.notes : filteredNotes,
          };
        }
        return null;
      })
      .filter((subject): subject is SubjectWithNotes => subject !== null);
  }

  function renderNoteItem(note: Note) {
    const handleQuickDownload = async () => {
      try {
        setDownloading(note.id);
        const fileId = extractGoogleDriveId(note.file_url);
        if (fileId) {
          const directUrl = generateDirectDownloadUrl(fileId, note.file_type);
          await Linking.openURL(directUrl);

          // Track real download
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            try {
              await supabase.rpc("track_note_download", {
                p_note_id: note.id,
                p_user_id: user.id,
                p_ip_address: null,
                p_user_agent: "College Study Mobile App",
                p_file_size: null,
              });
            } catch (trackError) {
              await supabase.rpc("increment_download_count", { note_id: note.id });
            }
          }
        } else {
          await Linking.openURL(note.file_url);

          // Track real download
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            try {
              await supabase.rpc("track_note_download", {
                p_note_id: note.id,
                p_user_id: user.id,
                p_ip_address: null,
                p_user_agent: "College Study Mobile App",
                p_file_size: null,
              });
            } catch (trackError) {
              await supabase.rpc("increment_download_count", { note_id: note.id });
            }
          }
        }
        setDownloading(null);
      } catch (error) {
        setDownloading(null);
        // Fallback to options menu
        downloadNote(note);
      }
    };

    return (
      <TouchableOpacity
        key={note.id}
        style={styles.noteItem}
        onPress={handleQuickDownload}
        onLongPress={() => downloadNote(note)}
      >
        <View style={styles.noteIconContainer}>
          <Text style={styles.noteIcon}>{getFileTypeIcon(note.file_type)}</Text>
        </View>

        <View style={styles.noteContent}>
          <Text style={styles.noteTitle} numberOfLines={2}>
            {note.title}
          </Text>

          {note.description && (
            <Text style={styles.noteDescription} numberOfLines={1}>
              {note.description}
            </Text>
          )}

          <View style={styles.noteMetadata}>
            {note.is_pyq && note.academic_year && (
              <View style={styles.noteBadge}>
                <Text style={styles.noteBadgeText}>{note.academic_year}</Text>
              </View>
            )}
            {note.is_pyq && note.exam_type && (
              <View style={styles.noteBadge}>
                <Text style={styles.noteBadgeText}>{note.exam_type}</Text>
              </View>
            )}
            <View style={styles.noteStats}>
              <Download color="#999" size={10} />
              <Text style={styles.noteStatsText}>{note.download_count}</Text>
            </View>
          </View>
        </View>

        <View style={styles.downloadButtonContainer}>
          <Download color="#0066cc" size={20} />
          <Text style={styles.downloadHint}>Tap: Download</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderCategory(subject: SubjectWithNotes, categoryKey: string, categoryName: string, notes: Note[]) {
    if (notes.length === 0) return null;

    const isExpanded = subject.expandedCategories[categoryKey as keyof typeof subject.expandedCategories];

    return (
      <View key={categoryKey} style={styles.categoryContainer}>
        <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(subject.id, categoryKey)}>
          {isExpanded ? <ChevronDown color="#666" size={20} /> : <ChevronRight color="#666" size={20} />}
          <Text style={styles.categoryName}>{categoryName}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{notes.length}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && <View style={styles.notesContainer}>{notes.map((note) => renderNoteItem(note))}</View>}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  const filteredSubjects = filterSubjects(subjects);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notes & Resources</Text>
          {profile && (
            <Text style={styles.headerSubtitle}>
              {Array.isArray(profile.branches) ? profile.branches[0]?.name : profile.branches?.name} • Semester{" "}
              {profile.semester}
            </Text>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#999" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects or notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredSubjects.length} {filteredSubjects.length === 1 ? "subject" : "subjects"}
        </Text>
      </View>

      {/* Subjects List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0066cc"]} />}
      >
        {filteredSubjects.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen color="#ccc" size={64} />
            <Text style={styles.emptyStateTitle}>No subjects found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? "Try a different search term" : "Subjects will appear here once they're added"}
            </Text>
          </View>
        ) : (
          <>
            {filteredSubjects.map((subject) => {
              const totalNotes = getCategoryNotesCount(subject.notes);
              const hasPYQ = subject.notes.pyq.length > 0;
              const hasModules = Object.values(subject.notes.modules).some((notes) => notes.length > 0);

              return (
                <View key={subject.id} style={styles.subjectCard}>
                  {/* Subject Header */}
                  <TouchableOpacity style={styles.subjectHeader} onPress={() => toggleSubject(subject.id)}>
                    <View style={styles.subjectIconContainer}>
                      <BookOpen color="#0066cc" size={24} />
                    </View>

                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </View>

                    <View style={styles.subjectRight}>
                      {totalNotes > 0 && (
                        <View style={styles.notesCountBadge}>
                          <FileText color="#0066cc" size={14} />
                          <Text style={styles.notesCountText}>{totalNotes}</Text>
                        </View>
                      )}
                      {subject.expanded ? (
                        <ChevronDown color="#333" size={24} />
                      ) : (
                        <ChevronRight color="#333" size={24} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Subject Content */}
                  {subject.expanded && (
                    <View style={styles.subjectContent}>
                      {totalNotes === 0 ? (
                        <View style={styles.noNotesContainer}>
                          <Text style={styles.noNotesText}>No notes available for this subject yet</Text>
                        </View>
                      ) : (
                        <>
                          {/* PYQ Section */}
                          {hasPYQ && renderCategory(subject, "pyq", "📝 Previous Year Questions", subject.notes.pyq)}

                          {/* Modules */}
                          {hasModules && (
                            <>
                              {[1, 2, 3, 4, 5].map((moduleNum) =>
                                renderCategory(
                                  subject,
                                  moduleNum.toString(),
                                  `📚 Module ${moduleNum}`,
                                  subject.notes.modules[moduleNum],
                                ),
                              )}
                            </>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  statsBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subjectCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  subjectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f0f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 13,
    color: "#666",
  },
  subjectRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notesCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#e6f4ff",
  },
  notesCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0066cc",
  },
  subjectContent: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  noNotesContainer: {
    padding: 24,
    alignItems: "center",
  },
  noNotesText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingLeft: 16,
    backgroundColor: "#fafafa",
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  categoryBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e6f4ff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0066cc",
  },
  notesContainer: {
    backgroundColor: "#fff",
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  noteIcon: {
    fontSize: 20,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  noteDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  noteMetadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  noteBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#fff4e6",
  },
  noteBadgeText: {
    fontSize: 10,
    color: "#d46b08",
    fontWeight: "600",
  },
  noteStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  noteStatsText: {
    fontSize: 10,
    color: "#999",
    marginLeft: 2,
  },
  downloadButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 8,
  },
  downloadHint: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
    width: 50,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  bottomSpacing: {
    height: 20,
  },
});
