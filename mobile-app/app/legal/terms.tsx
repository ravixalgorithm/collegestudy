import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0066cc" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using College Study mobile application, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.text}>
            College Study is an educational platform designed to help college students organize their academic life, access study materials, manage schedules, and stay connected with campus activities.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.text}>
            To access certain features of the app, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.text}>
            You agree to use the app only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the app. You shall not:
          </Text>
          <Text style={styles.bulletText}>• Upload or share inappropriate content</Text>
          <Text style={styles.bulletText}>• Violate any applicable laws or regulations</Text>
          <Text style={styles.bulletText}>• Attempt to gain unauthorized access to the app</Text>
          <Text style={styles.bulletText}>• Interfere with the app's functionality</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Content and Intellectual Property</Text>
          <Text style={styles.text}>
            All content provided on College Study, including study materials, notes, and app features, is for educational purposes only. Users retain ownership of content they upload but grant College Study a license to use such content for app functionality.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Privacy</Text>
          <Text style={styles.text}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the app, to understand our practices.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Disclaimers</Text>
          <Text style={styles.text}>
            College Study is provided "as is" without any representations or warranties, express or implied. We do not warrant that the app will be uninterrupted, secure, or error-free.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.text}>
            In no event shall College Study, its developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Modifications</Text>
          <Text style={styles.text}>
            We reserve the right to modify these terms at any time. Changes will be effective when posted on the app. Your continued use of the app after changes are posted constitutes your acceptance of the modified terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Information</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactText}>Email: support@collegestudy.in</Text>
          <Text style={styles.contactText}>Website: collegestudy.in</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using College Study, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  lastUpdated: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 4,
    marginLeft: 16,
  },
  contactText: {
    fontSize: 16,
    color: "#0066cc",
    lineHeight: 24,
    marginBottom: 4,
    marginTop: 8,
  },
  footer: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
});
