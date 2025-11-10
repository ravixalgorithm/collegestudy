import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

interface LogoProps {
  size?: "small" | "medium" | "large";
  variant?: "default" | "white" | "minimal";
  showText?: boolean;
  style?: any;
}

export default function Logo({ size = "medium", variant = "default", showText = true, style }: LogoProps) {
  const sizeConfig = {
    small: {
      container: 60,
      image: 50,
      text: 16,
      subtext: 12,
    },
    medium: {
      container: 80,
      image: 70,
      text: 20,
      subtext: 14,
    },
    large: {
      container: 120,
      image: 200,
      text: 28,
      subtext: 16,
    },
  };

  const config = sizeConfig[size];

  const getColors = () => {
    switch (variant) {
      case "white":
        return {
          text: "#ffffff",
          subtext: "#e6f4ff",
          containerBg: "rgba(255, 255, 255, 0.1)",
        };
      case "minimal":
        return {
          text: "#333333",
          subtext: "#666666",
          containerBg: "transparent",
        };
      default:
        return {
          text: "#333333",
          subtext: "#666666",
          containerBg: "#f0f8ff",
        };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, style]}>
      {/* Logo Image Container */}
      {variant === "minimal" ? (
        <Image
          source={require("../../assets/images/logo.png")}
          style={[
            styles.logoImage,
            {
              width: config.image,
              height: config.image,
            },
          ]}
          resizeMode="contain"
        />
      ) : (
        <View
          style={[
            styles.logoContainer,
            {
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
            variant === "default" && {
              backgroundColor: colors.containerBg,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 6,
            },
            variant === "white" && {
              backgroundColor: colors.containerBg,
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.3)",
            },
          ]}
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={[
              styles.logoImage,
              {
                width: config.image,
                height: config.image,
                borderRadius: config.image / 2,
              },
            ]}
            resizeMode="contain"
          />
        </View>
      )}

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  logoImage: {
    // Image styles will be applied via props
  },
  textContainer: {
    marginTop: 4,
    alignItems: "center",
  },
  title: {
    letterSpacing: 1,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.8,
  },
});
