import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { Calendar, Clock, MapPin, User, GraduationCap, AlertCircle } from "lucide-react-native";

interface UserProfile {
  branch_id: string;
  semester: number;
  branches?:
    | {
        name: string;
      }
    | {
        name: string;
      }[];
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  faculty_name?: string;
  class_type?: string;
  subjects?: {
    name: string;
    code: string;
  };
}

interface ExamSchedule {
  id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  exam_type: string;
  room_number?: string;
  total_marks?: number;
  instructions?: string;
  subjects?: {
    name: string;
    code: string;
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Timetable() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"timetable" | "exams">("timetable");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);

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
        .select("branch_id, semester, branches(name)")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          ...profileData,
          branches: Array.isArray(profileData.branches) ? profileData.branches[0] : profileData.branches,
        } as UserProfile);

        // Load timetable
        const { data: timetableData } = await supabase
          .from("timetable")
          .select("*, subjects(name, code)")
          .eq("branch_id", profileData.branch_id)
          .eq("semester", profileData.semester)
          .order("day_of_week")
          .order("start_time");

        if (timetableData) {
          setTimetableEntries(timetableData);
        }

        // Load exam schedules
        const today = new Date().toISOString().split("T")[0];
        const { data: examsData } = await supabase
          .from("exam_schedule")
          .select("*, subjects(name, code)")
          .eq("branch_id", profileData.branch_id)
          .eq("semester", profileData.semester)
          .gte("exam_date", today)
          .order("exam_date")
          .order("start_time");

        if (examsData) {
          setExamSchedules(examsData);
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

  function getDaysUntilExam(dateString: string): number {
    const examDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getClassTypeColor(classType?: string): string {
    switch (classType?.toLowerCase()) {
      case "lecture":
        return "#0066cc";
      case "lab":
        return "#52c41a";
      case "tutorial":
        return "#fa8c16";
      case "practical":
        return "#722ed1";
      default:
        return "#666";
    }
  }

  const todayClasses = timetableEntries.filter((entry) => entry.day_of_week === selectedDay);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        {profile && (
          <Text style={styles.headerSubtitle}>
            {Array.isArray(profile.branches) ? profile.branches[0]?.name : profile.branches?.name} • Semester{" "}
            {profile.semester}
          </Text>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "timetable" && styles.tabActive]}
          onPress={() => setActiveTab("timetable")}
        >
          <Calendar color={activeTab === "timetable" ? "#0066cc" : "#666"} size={20} />
          <Text style={[styles.tabText, activeTab === "timetable" && styles.tabTextActive]}>Timetable</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "exams" && styles.tabActive]}
          onPress={() => setActiveTab("exams")}
        >
          <GraduationCap color={activeTab === "exams" ? "#0066cc" : "#666"} size={20} />
          <Text style={[styles.tabText, activeTab === "exams" && styles.tabTextActive]}>
            Exams ({examSchedules.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0066cc"]} />}
      >
        {activeTab === "timetable" ? (
          <>
            {/* Day Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daySelector}
              contentContainerStyle={styles.daySelectorContent}
            >
              {DAYS.map((day, index) => {
                const isToday = index === new Date().getDay();
                const isSelected = index === selectedDay;
                const dayClasses = timetableEntries.filter((entry) => entry.day_of_week === index);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonActive,
                      isToday && !isSelected && styles.dayButtonToday,
                    ]}
                    onPress={() => setSelectedDay(index)}
                  >
                    <Text style={[styles.dayShort, isSelected && styles.dayShortActive]}>{SHORT_DAYS[index]}</Text>
                    <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{day}</Text>
                    {dayClasses.length > 0 && (
                      <View style={styles.dayClassCount}>
                        <Text style={styles.dayClassCountText}>{dayClasses.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Timetable for Selected Day */}
            <View style={styles.classesContainer}>
              {todayClasses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Calendar color="#ccc" size={64} />
                  <Text style={styles.emptyStateTitle}>No classes scheduled</Text>
                  <Text style={styles.emptyStateText}>Enjoy your free day! 🎉</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>
                    {selectedDay === new Date().getDay() ? "Today's Classes" : `${DAYS[selectedDay]}'s Classes`}
                  </Text>

                  {todayClasses.map((classItem, index) => {
                    const classColor = getClassTypeColor(classItem.class_type);
                    return (
                      <View key={classItem.id} style={styles.classCard}>
                        <View style={[styles.classColorBar, { backgroundColor: classColor }]} />

                        <View style={styles.classContent}>
                          {/* Time */}
                          <View style={styles.classTimeContainer}>
                            <Clock color="#666" size={16} />
                            <Text style={styles.classTime}>
                              {classItem.start_time.slice(0, 5)} - {classItem.end_time.slice(0, 5)}
                            </Text>
                          </View>

                          {/* Subject */}
                          <Text style={styles.classSubject}>{classItem.subjects?.name}</Text>
                          <Text style={styles.classCode}>{classItem.subjects?.code}</Text>

                          {/* Details */}
                          <View style={styles.classDetails}>
                            {classItem.class_type && (
                              <View style={[styles.classTypeBadge, { backgroundColor: classColor + "20" }]}>
                                <Text style={[styles.classTypeBadgeText, { color: classColor }]}>
                                  {classItem.class_type}
                                </Text>
                              </View>
                            )}

                            {classItem.room_number && (
                              <View style={styles.classDetail}>
                                <MapPin color="#666" size={14} />
                                <Text style={styles.classDetailText}>{classItem.room_number}</Text>
                              </View>
                            )}

                            {classItem.faculty_name && (
                              <View style={styles.classDetail}>
                                <User color="#666" size={14} />
                                <Text style={styles.classDetailText}>{classItem.faculty_name}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </>
        ) : (
          /* Exam Schedule */
          <View style={styles.examsContainer}>
            {examSchedules.length === 0 ? (
              <View style={styles.emptyState}>
                <GraduationCap color="#ccc" size={64} />
                <Text style={styles.emptyStateTitle}>No upcoming exams</Text>
                <Text style={styles.emptyStateText}>You're all caught up! 📚</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Upcoming Exams</Text>

                {examSchedules.map((exam) => {
                  const daysUntil = getDaysUntilExam(exam.exam_date);
                  const isUrgent = daysUntil <= 3;
                  const isVeryUrgent = daysUntil <= 1;

                  return (
                    <View key={exam.id} style={styles.examCard}>
                      {/* Urgency Badge */}
                      <View
                        style={[
                          styles.examDateBadge,
                          isUrgent && styles.examDateBadgeUrgent,
                          isVeryUrgent && styles.examDateBadgeVeryUrgent,
                        ]}
                      >
                        <Text
                          style={[
                            styles.examDays,
                            isUrgent && styles.examDaysUrgent,
                            isVeryUrgent && styles.examDaysVeryUrgent,
                          ]}
                        >
                          {daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : `${daysUntil} DAYS`}
                        </Text>
                      </View>

                      {/* Exam Details */}
                      <View style={styles.examContent}>
                        {/* Exam Type Badge */}
                        <View style={styles.examTypeBadge}>
                          <Text style={styles.examTypeBadgeText}>{exam.exam_type}</Text>
                        </View>

                        {/* Subject */}
                        <Text style={styles.examSubject}>{exam.subjects?.name}</Text>
                        <Text style={styles.examCode}>{exam.subjects?.code}</Text>

                        {/* Date and Time */}
                        <View style={styles.examInfo}>
                          <View style={styles.examInfoRow}>
                            <Calendar color="#666" size={14} />
                            <Text style={styles.examInfoText}>
                              {new Date(exam.exam_date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Text>
                          </View>

                          <View style={styles.examInfoRow}>
                            <Clock color="#666" size={14} />
                            <Text style={styles.examInfoText}>
                              {exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}
                            </Text>
                          </View>

                          {exam.room_number && (
                            <View style={styles.examInfoRow}>
                              <MapPin color="#666" size={14} />
                              <Text style={styles.examInfoText}>{exam.room_number}</Text>
                            </View>
                          )}

                          {exam.total_marks && (
                            <View style={styles.examInfoRow}>
                              <GraduationCap color="#666" size={14} />
                              <Text style={styles.examInfoText}>{exam.total_marks} marks</Text>
                            </View>
                          )}
                        </View>

                        {/* Instructions */}
                        {exam.instructions && (
                          <View style={styles.examInstructions}>
                            <AlertCircle color="#fa8c16" size={16} />
                            <Text style={styles.examInstructionsText}>{exam.instructions}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
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
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
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
  content: {
    flex: 1,
  },
  daySelector: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  daySelectorContent: {
    padding: 16,
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    minWidth: 80,
    alignItems: "center",
    position: "relative",
  },
  dayButtonActive: {
    backgroundColor: "#0066cc",
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: "#0066cc",
  },
  dayShort: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  dayShortActive: {
    color: "#fff",
  },
  dayName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginTop: 4,
  },
  dayNameActive: {
    color: "#fff",
  },
  dayClassCount: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ff4d4f",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dayClassCountText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  classesContainer: {
    padding: 16,
  },
  examsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  classCard: {
    flexDirection: "row",
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
  classColorBar: {
    width: 4,
  },
  classContent: {
    flex: 1,
    padding: 16,
  },
  classTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  classTime: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  classSubject: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  classCode: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  classDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  classTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  classDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  classDetailText: {
    fontSize: 12,
    color: "#666",
  },
  examCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  examDateBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e6f4ff",
    marginBottom: 12,
  },
  examDateBadgeUrgent: {
    backgroundColor: "#fff7e6",
  },
  examDateBadgeVeryUrgent: {
    backgroundColor: "#fff1f0",
  },
  examDays: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0066cc",
  },
  examDaysUrgent: {
    color: "#fa8c16",
  },
  examDaysVeryUrgent: {
    color: "#ff4d4f",
  },
  examContent: {
    gap: 8,
  },
  examTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f0f5ff",
  },
  examTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0066cc",
    textTransform: "uppercase",
  },
  examSubject: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  examCode: {
    fontSize: 12,
    color: "#666",
  },
  examInfo: {
    gap: 6,
    marginTop: 4,
  },
  examInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  examInfoText: {
    fontSize: 13,
    color: "#666",
  },
  examInstructions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: "#fffbf0",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#fa8c16",
  },
  examInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
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
  },
  bottomSpacing: {
    height: 20,
  },
});
