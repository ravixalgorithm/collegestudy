import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { User, Mail, Calendar, BookOpen, GraduationCap, Camera, Save, X, ChevronDown } from "lucide-react-native";

interface Branch {
  id: string;
  code: string;
  name: string;
  full_name: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  branch_id: string;
  year: number;
  semester: number;
  roll_number?: string;
  photo_url?: string;
  course?: string;
}

interface FormData {
  name: string;
  email: string;
  branch_id: string;
  year: string;
  semester: string;
  roll_number: string;
  course: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  branch_id?: string;
  year?: string;
  semester?: string;
}

export default function EditProfileBasic() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    branch_id: "",
    year: "",
    semester: "",
    roll_number: "",
    course: "B.Tech",
  });

  const [errors, setErrors] = useState<FormErrors>({});

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

      // Load branches
      const { data: branchesData } = await supabase.from("branches").select("*").order("name");
      setBranches(branchesData || []);

      // Load user profile
      const { data: profileData } = await supabase.from("users").select("*").eq("id", user.id).single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name || "",
          email: profileData.email || "",
          branch_id: profileData.branch_id || "",
          year: profileData.year?.toString() || "",
          semester: profileData.semester?.toString() || "",
          roll_number: profileData.roll_number || "",
          course: profileData.course || "B.Tech",
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Branch validation
    if (!formData.branch_id) {
      newErrors.branch_id = "Branch is required";
    }

    // Year validation
    if (!formData.year) {
      newErrors.year = "Year is required";
    } else if (![1, 2, 3, 4].includes(parseInt(formData.year))) {
      newErrors.year = "Year must be 1, 2, 3, or 4";
    }

    // Semester validation
    if (!formData.semester) {
      newErrors.semester = "Semester is required";
    } else {
      const sem = parseInt(formData.semester);
      const year = parseInt(formData.year);
      if (year) {
        const validSemesters = getValidSemesters(year);
        if (!validSemesters.includes(sem)) {
          newErrors.semester = `Year ${year} can only have semesters ${validSemesters.join(" or ")}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        branch_id: formData.branch_id,
        year: parseInt(formData.year),
        semester: parseInt(formData.semester),
        roll_number: formData.roll_number.trim() || null,
        course: formData.course,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("users").update(updateData).eq("id", profile?.id);

      if (error) throw error;

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // Helper function to get valid semesters for a given year
  function getValidSemesters(year: number): number[] {
    switch (year) {
      case 1:
        return [1, 2];
      case 2:
        return [3, 4];
      case 3:
        return [5, 6];
      case 4:
        return [7, 8];
      default:
        return [];
    }
  }

  // Helper function to get semester label
  function getSemesterLabel(year: number): string {
    switch (year) {
      case 1:
        return "1st or 2nd";
      case 2:
        return "3rd or 4th";
      case 3:
        return "5th or 6th";
      case 4:
        return "7th or 8th";
      default:
        return "";
    }
  }

  function getBranchName(branchId: string): string {
    const branch = branches.find((b) => b.id === branchId);
    return branch ? `${branch.code} - ${branch.name}` : "Select Branch";
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <X color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#0066cc" /> : <Save color="#0066cc" size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <User color="#0066cc" size={48} />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Camera color="#fff" size={16} />
            </View>
          </View>
          <Text style={styles.photoHint}>Photo upload coming soon</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <User color="#999" size={20} />
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Email Address <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Mail color="#999" size={20} />
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Course Field (Hard-coded) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Course</Text>
            <View style={styles.disabledInput}>
              <GraduationCap color="#999" size={20} />
              <Text style={styles.disabledInputText}>B.Tech (Bachelor of Technology)</Text>
            </View>
          </View>

          {/* Branch Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Branch <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.pickerContainer, errors.branch_id && styles.inputError]}
              onPress={() => setShowBranchPicker(true)}
            >
              <BookOpen color="#999" size={20} />
              <Text style={[styles.pickerText, !formData.branch_id && styles.pickerPlaceholder]}>
                {getBranchName(formData.branch_id)}
              </Text>
              <ChevronDown color="#999" size={20} />
            </TouchableOpacity>
            {errors.branch_id && <Text style={styles.errorText}>{errors.branch_id}</Text>}
          </View>

          {/* Year and Semester Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                Year <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.pickerContainer, errors.year && styles.inputError]}
                onPress={() => setShowYearPicker(true)}
              >
                <Calendar color="#999" size={20} />
                <Text style={[styles.pickerText, !formData.year && styles.pickerPlaceholder]}>
                  {formData.year ? `Year ${formData.year}` : "Select Year"}
                </Text>
                <ChevronDown color="#999" size={20} />
              </TouchableOpacity>
              {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
            </View>

            <View style={[styles.fieldGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                Semester <Text style={styles.required}>*</Text>
                {formData.year && (
                  <Text style={styles.semesterHint}> ({getSemesterLabel(parseInt(formData.year))})</Text>
                )}
              </Text>
              <TouchableOpacity
                style={[styles.pickerContainer, errors.semester && styles.inputError]}
                onPress={() => setShowSemesterPicker(true)}
              >
                <Calendar color="#999" size={20} />
                <Text style={[styles.pickerText, !formData.semester && styles.pickerPlaceholder]}>
                  {formData.semester ? `Sem ${formData.semester}` : "Select Sem"}
                </Text>
                <ChevronDown color="#999" size={20} />
              </TouchableOpacity>
              {errors.semester && <Text style={styles.errorText}>{errors.semester}</Text>}
            </View>
          </View>

          {/* Roll Number Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Roll Number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.rollIcon}>#</Text>
              <TextInput
                style={styles.textInput}
                value={formData.roll_number}
                onChangeText={(text) => setFormData({ ...formData, roll_number: text })}
                placeholder="Enter your roll number"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Branch Picker Modal */}
      {showBranchPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Branch</Text>
              <TouchableOpacity onPress={() => setShowBranchPicker(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerContent}>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({ ...formData, branch_id: branch.id });
                    setShowBranchPicker(false);
                    if (errors.branch_id) setErrors({ ...errors, branch_id: undefined });
                  }}
                >
                  <Text style={styles.pickerItemCode}>{branch.code}</Text>
                  <View style={styles.pickerItemContent}>
                    <Text style={styles.pickerItemName}>{branch.name}</Text>
                    <Text style={styles.pickerItemFullName}>{branch.full_name}</Text>
                  </View>
                  {formData.branch_id === branch.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Year Picker Modal */}
      {showYearPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContent}>
              {[1, 2, 3, 4].map((year) => (
                <TouchableOpacity
                  key={year}
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({ ...formData, year: year.toString(), semester: "" });
                    setShowYearPicker(false);
                    if (errors.year) setErrors({ ...errors, year: undefined });
                  }}
                >
                  <Text style={styles.pickerItemText}>Year {year}</Text>
                  {formData.year === year.toString() && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Semester Picker Modal */}
      {showSemesterPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Semester</Text>
              <TouchableOpacity onPress={() => setShowSemesterPicker(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContent}>
              {formData.year ? (
                getValidSemesters(parseInt(formData.year)).map((semester) => (
                  <TouchableOpacity
                    key={semester}
                    style={styles.pickerItem}
                    onPress={() => {
                      setFormData({ ...formData, semester: semester.toString() });
                      setShowSemesterPicker(false);
                      if (errors.semester) setErrors({ ...errors, semester: undefined });
                    }}
                  >
                    <Text style={styles.pickerItemText}>Semester {semester}</Text>
                    {formData.semester === semester.toString() && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>Select year first</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
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
  photoSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e6f4ff",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  photoHint: {
    fontSize: 14,
    color: "#666",
  },
  formSection: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#ff4d4f",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    gap: 12,
  },
  inputError: {
    borderColor: "#ff4d4f",
    backgroundColor: "#fff2f2",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  rollIcon: {
    fontSize: 20,
    color: "#999",
    fontWeight: "600",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    gap: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  pickerPlaceholder: {
    color: "#999",
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: 4,
  },
  semesterHint: {
    fontSize: 12,
    color: "#666",
    fontWeight: "normal",
  },
  placeholderContainer: {
    padding: 16,
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  disabledInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  disabledInputText: {
    fontSize: 16,
    color: "#666",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "80%",
    width: "100%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  pickerContent: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickerItemCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066cc",
    width: 50,
  },
  pickerItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  pickerItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  pickerItemFullName: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  checkMark: {
    fontSize: 18,
    color: "#0066cc",
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
});
