import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { X, Bell, Shield, Globe, ChevronRight } from "lucide-react-native";

interface SettingsState {
  notifications: {
    general: boolean;
    notes: boolean;
    events: boolean;
    announcements: boolean;
  };
}

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      general: true,
      notes: true,
      events: true,
      announcements: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Load user preferences from database
      const { data, error } = await supabase.rpc("get_user_preferences", {
        user_uuid: user.id,
      });

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      if (data && data.notifications) {
        setSettings({
          notifications: data.notifications,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettingsToDatabase(section: string, sectionSettings: any) {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.rpc("update_user_preferences", {
        user_uuid: user.id,
        section: section,
        settings: sectionSettings,
      });

      if (error) {
        console.error(`Error saving ${section} settings:`, error);
        Alert.alert("Error", `Failed to save ${section} settings. Please try again.`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateNotificationSetting(key: keyof SettingsState["notifications"], value: boolean) {
    const newNotifications = {
      ...settings.notifications,
      [key]: value,
    };

    setSettings((prev) => ({
      ...prev,
      notifications: newNotifications,
    }));

    await saveSettingsToDatabase("notifications", newNotifications);
  }

  async function handleResetSettings() {
    Alert.alert("Reset Settings", "This will reset all settings to default values. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            // Reset settings in database
            const { error } = await supabase.rpc("reset_user_preferences", {
              user_uuid: user.id,
            });

            if (error) {
              console.error("Error resetting settings:", error);
              Alert.alert("Error", "Failed to reset settings. Please try again.");
              return;
            }

            // Reset local state
            setSettings({
              notifications: {
                general: true,
                notes: true,
                events: true,
                announcements: true,
              },
            });

            Alert.alert("Success", "Settings reset to default values!");
          } catch (error) {
            console.error("Error resetting settings:", error);
            Alert.alert("Error", "Failed to reset settings. Please try again.");
          }
        },
      },
    ]);
  }

  function handlePrivacyPolicy() {
    Alert.alert(
      "Privacy Policy",
      "Your privacy is important to us. We collect minimal data and never share your personal information with third parties.\n\nFor full privacy policy, visit: https://college-study.netlify.app/privacy-policy",
    );
  }

  function handleAbout() {
    Alert.alert(
      "About College Study",
      "Version 1.0.0\nBuild 2024.12.07\n\nA comprehensive study companion app for HBTU students.\n\n© 2024 College Study. All rights reserved.",
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <X color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell color="#0066cc" size={20} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>General Notifications</Text>
              <Switch
                value={settings.notifications.general}
                onValueChange={(value) => updateNotificationSetting("general", value)}
                thumbColor={settings.notifications.general ? "#0066cc" : "#f4f4f4"}
                trackColor={{ false: "#d9d9d9", true: "#bae7ff" }}
                disabled={saving}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>New Notes Available</Text>
              <Switch
                value={settings.notifications.notes}
                onValueChange={(value) => updateNotificationSetting("notes", value)}
                thumbColor={settings.notifications.notes ? "#0066cc" : "#f4f4f4"}
                trackColor={{ false: "#d9d9d9", true: "#bae7ff" }}
                disabled={saving}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Event Reminders</Text>
              <Switch
                value={settings.notifications.events}
                onValueChange={(value) => updateNotificationSetting("events", value)}
                thumbColor={settings.notifications.events ? "#0066cc" : "#f4f4f4"}
                trackColor={{ false: "#d9d9d9", true: "#bae7ff" }}
                disabled={saving}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Announcements</Text>
              <Switch
                value={settings.notifications.announcements}
                onValueChange={(value) => updateNotificationSetting("announcements", value)}
                thumbColor={settings.notifications.announcements ? "#0066cc" : "#f4f4f4"}
                trackColor={{ false: "#d9d9d9", true: "#bae7ff" }}
                disabled={saving}
              />
            </View>
          </View>
        </View>

        {/* Other Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe color="#0066cc" size={20} />
            <Text style={styles.sectionTitle}>Other</Text>
          </View>

          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.actionItem} onPress={handlePrivacyPolicy}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleAbout}>
              <Text style={styles.settingLabel}>About</Text>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleResetSettings}>
              <Text style={[styles.settingLabel, styles.dangerText]}>Reset All Settings</Text>
              <ChevronRight color="#ff4d4f" size={20} />
            </TouchableOpacity>
          </View>
        </View>

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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  settingsGroup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  dangerText: {
    color: "#ff4d4f",
  },
  bottomSpacing: {
    height: 40,
  },
});
