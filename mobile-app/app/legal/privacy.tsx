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

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0066cc" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to College Study. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.text}>
            We may collect the following types of information:
          </Text>
          <Text style={styles.subHeading}>Personal Information:</Text>
          <Text style={styles.bulletText}>• Email address for account creation and verification</Text>
          <Text style={styles.bulletText}>• Name and profile information you choose to provide</Text>
          <Text style={styles.bulletText}>• Academic information (college, branch, semester)</Text>

          <Text style={styles.subHeading}>Usage Information:</Text>
          <Text style={styles.bulletText}>• App usage patterns and preferences</Text>
          <Text style={styles.bulletText}>• Device information and operating system</Text>
          <Text style={styles.bulletText}>• Log files and analytics data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use your information to:
          </Text>
          <Text style={styles.bulletText}>• Provide and maintain our app services</Text>
          <Text style={styles.bulletText}>• Authenticate your account and ensure security</Text>
          <Text style={styles.bulletText}>• Personalize your experience with relevant content</Text>
          <Text style={styles.bulletText}>• Send important notifications about app updates</Text>
          <Text style={styles.bulletText}>• Improve our app features and functionality</Text>
          <Text style={styles.bulletText}>• Respond to your support requests</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
          <Text style={styles.text}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </Text>
          <Text style={styles.bulletText}>• With your explicit consent</Text>
          <Text style={styles.bulletText}>• To comply with legal obligations</Text>
          <Text style={styles.bulletText}>• To protect our rights and prevent fraud</Text>
          <Text style={styles.bulletText}>• With trusted service providers who assist in app functionality</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
          </Text>
          <Text style={styles.bulletText}>• Encryption of sensitive data</Text>
          <Text style={styles.bulletText}>• Secure authentication methods</Text>
          <Text style={styles.bulletText}>• Regular security audits and updates</Text>
          <Text style={styles.bulletText}>• Limited access to personal data by authorized personnel</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.text}>
            We retain your personal information only for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law. You may request deletion of your account and associated data at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights</Text>
          <Text style={styles.text}>
            You have the following rights regarding your personal data:
          </Text>
          <Text style={styles.bulletText}>• Access your personal information</Text>
          <Text style={styles.bulletText}>• Correct inaccurate or incomplete data</Text>
          <Text style={styles.bulletText}>• Delete your account and associated data</Text>
          <Text style={styles.bulletText}>• Opt-out of non-essential communications</Text>
          <Text style={styles.bulletText}>• Export your data in a portable format</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies and Tracking</Text>
          <Text style={styles.text}>
            Our app may use cookies and similar tracking technologies to enhance your experience. These help us understand app usage patterns and improve functionality. You can manage cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.text}>
            Our app may integrate with third-party services for enhanced functionality. These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third-party services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.text}>
            College Study is designed for college students and individuals over 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information promptly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this privacy policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes through the app or via email. Your continued use of the app constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions, concerns, or requests regarding this privacy policy or your personal data, please contact us:
          </Text>
          <Text style={styles.contactText}>Email: privacy@collegestudy.in</Text>
          <Text style={styles.contactText}>Support: support@collegestudy.in</Text>
          <Text style={styles.contactText}>Website: collegestudy.in</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your privacy is important to us. We are committed to protecting your personal information and being transparent about our data practices. Thank you for trusting College Study with your academic journey.
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
  subHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
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
