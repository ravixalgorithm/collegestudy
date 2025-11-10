import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet, PanResponder } from "react-native";
import { X, Bell } from "lucide-react-native";
import { getNotificationIcon, getPriorityColor, formatRelativeTime } from "../lib/notifications";
import type { Notification } from "../lib/notifications";

interface NotificationPopupProps {
  notification: Notification;
  onDismiss: () => void;
  onMarkAsRead: () => void;
  index: number;
}

const { width: screenWidth } = Dimensions.get("window");

export function NotificationPopup({ notification, onDismiss, onMarkAsRead, index }: NotificationPopupProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, []);

  const dismissWithAnimation = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100 || gestureState.vx > 0.5) {
          // Swipe right to dismiss
          dismissWithAnimation();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const priorityColor = getPriorityColor(notification.priority);
  const isUrgent = notification.priority === "urgent";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
          top: 10 + index * 90, // Stack multiple notifications with safe area padding
          borderLeftColor: priorityColor,
          backgroundColor: isUrgent ? "#FEF2F2" : "#FFFFFF",
          borderColor: isUrgent ? "#FECACA" : "#E5E7EB",
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Priority indicator */}
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />

      {/* Main content */}
      <TouchableOpacity style={styles.content} onPress={onMarkAsRead} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{getNotificationIcon(notification.type)}</Text>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.timestamp}>{formatRelativeTime(notification.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismissWithAnimation}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>

        {/* Action hint */}
        <View style={styles.actionHint}>
          <Bell size={12} color="#9CA3AF" />
          <Text style={styles.actionText}>Tap to view • Swipe right to dismiss</Text>
        </View>
      </TouchableOpacity>

      {/* Unread indicator */}
      <View style={[styles.unreadDot, { backgroundColor: priorityColor }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  priorityIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    padding: 16,
    paddingLeft: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
  closeButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
  },
  message: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 4,
    fontStyle: "italic",
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
