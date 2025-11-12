import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, StatusBar, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  BookOpen,
  Calendar,
  Bell,
  Users,
  TrendingUp,
  Heart,
  Target,
  Download,
  Star,
  ArrowRight,
} from "lucide-react-native";
import Logo from "../../src/components/Logo";

const { width: screenWidth } = Dimensions.get("window");

const slides = [
  {
    id: 0,
    title: "College Study",
    subtitle: "Your Academic Journey Starts Here",
    description: "Everything you need for academic success, designed by students for students.",
    color: "#1E3A8A",
    showLogo: true,
    showStats: true,
  },
  {
    id: 1,
    title: "Smart Resources",
    subtitle: "Quality Notes & Study Materials",
    description: "Access verified curated study materials organized by branch's and semester's.",
    color: "#2e5339",
    features: [
      { icon: BookOpen, title: "Verified Notes", desc: "Quality assured" },
      { icon: Download, title: "Offline Access", desc: "Study anywhere" },
      { icon: Star, title: "Top Rated", desc: "Student approved" },
    ],
  },
  {
    id: 2,
    title: "Stay Organized",
    subtitle: "Never Miss Important Dates",
    description: "Smart timetable management and exam reminders to keep you ahead.",
    color: "#37718e",
    features: [
      { icon: Calendar, title: "Smart Schedule", desc: "Auto-sync classes" },
      { icon: Bell, title: "Reminders", desc: "Never miss any updates " },
      { icon: Target, title: "Exam Tracking", desc: "Never miss exams" },
    ],
  },
  {
    id: 3,
    title: "Campus Connect",
    subtitle: "Stay Connected & Informed",
    description: "Discover opportunities and connect with your college community.",
    color: "#1E3A8A",
    features: [
      { icon: Users, title: "Events", desc: "Campus activities" },
      { icon: TrendingUp, title: "Opportunities", desc: "Career growth" },
      { icon: Heart, title: "Community", desc: "Peer network" },
    ],
  },
  {
    id: 4,
    title: "The Core Team",
    subtitle: "Built by Students, For Students",
    description:
      "It started with our struggle to find the right notes, now it’s a mission to make sure no student faces the same.",
    color: "#374151",
    showTeam: true,
  },
];

export default function Welcome() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(offsetX / screenWidth);
    if (slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentSlide(slideIndex);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      router.push("/(auth)/login");
    }
  };

  const handleSkip = () => {
    router.push("/(auth)/login");
  };

  const handleImageError = (key) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  const renderFeatures = (features, color) => {
    return (
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <IconComponent size={16} color={color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderStats = () => {
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>1500+</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>550+</Text>
          <Text style={styles.statLabel}>Resources</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>100%</Text>
          <Text style={styles.statLabel}>Verified Notes </Text>
        </View>
      </View>
    );
  };

  const renderAvatar = (source, initials, key) => {
    if (imageErrors[key]) {
      return (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      );
    }
    return <Image source={source} style={styles.avatarImage} onError={() => handleImageError(key)} />;
  };

  const renderTeam = () => {
    return (
      <View style={styles.teamContainer}>
        <View style={styles.teamMembers}>
          <View style={styles.teamMember}>
            {renderAvatar(require("../../assets/images/team/priyal.jpg"), "PK", "priyal")}
            <Text style={styles.memberName}>Priyal Kumar</Text>
            <Text style={styles.memberRole}>Founder</Text>
            <Text style={styles.memberDesc}>CSE'27, HBTU</Text>
          </View>
          <View style={styles.teamMember}>
            {renderAvatar(require("../../assets/images/team/ravi.jpg"), "RPS", "ravi")}
            <Text style={styles.memberName}>Ravi Pratap Singh</Text>
            <Text style={styles.memberRole}>Co-Founder</Text>
            <Text style={styles.memberDesc}>CSE'27, HBTU </Text>
          </View>
        </View>
        <View style={styles.teamFooter}>
          <Text style={styles.teamCollege}>Harcourt Butler Technical University</Text>
          <Text style={styles.teamDepartment}>College Study</Text>
          <Text style={styles.teamVersion}>Version 1.0.0</Text>
        </View>
      </View>
    );
  };

  const renderSlide = (slide) => {
    return (
      <View style={[styles.slide, { width: screenWidth }]} key={slide.id}>
        <View style={styles.slideContent}>
          {/* Header */}
          <View style={styles.header}>
            {slide.showLogo && (
              <View style={styles.logoContainer}>
                <Logo size="large" variant="minimal" style={{ width: 250, height: 220}}/>
              </View>
            )}
            <Text style={[styles.title, { color: slide.color }]}>{slide.title}</Text>
            <Text style={[styles.subtitle, { color: slide.color }]}>{slide.subtitle}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{slide.description}</Text>

          {/* Content */}
          <View style={styles.content}>
            {slide.features && renderFeatures(slide.features, slide.color)}
            {slide.showStats && renderStats()}
            {slide.showTeam && renderTeam()}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Skip Button */}
      {currentSlide < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        style={styles.scrollView}
      >
        {slides.map(renderSlide)}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity key={index} onPress={() => goToSlide(index)} style={styles.dotContainer}>
              <View
                style={[
                  styles.dot,
                  currentSlide === index
                    ? [styles.activeDot, { backgroundColor: slides[currentSlide].color }]
                    : styles.inactiveDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: slides[currentSlide].color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>{currentSlide === slides.length - 1 ? "Get Started" : "Continue"}</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 16,
  },
  skipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  logoContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafb",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f2f5",
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f2f5",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0066cc",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 12,
  },
  teamContainer: {
    backgroundColor: "#f8fafb",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#f0f2f5",
    marginTop: 16,
  },
  teamMembers: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    marginTop: 16,
  },
  teamMember: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#374151",
    marginBottom: 8,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 50,
    backgroundColor: "#fef7f7",
    borderWidth: 2,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: "#0066cc",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  memberDesc: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  teamFooter: {
    alignItems: "center",
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f2f5",
  },
  teamCollege: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
  },
  teamDepartment: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  teamVersion: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: "#ffffff",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  dotContainer: {
    padding: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "#e5e7eb",
  },
  nextButton: {
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
