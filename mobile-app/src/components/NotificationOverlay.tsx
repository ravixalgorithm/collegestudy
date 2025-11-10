import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationPopup } from "./NotificationPopup";
import { useNotifications } from "../contexts/NotificationContext";

export function NotificationOverlay() {
  const { popupNotifications, dismissPopup, markAsReadAndDismiss } = useNotifications();
  const insets = useSafeAreaInsets();

  if (popupNotifications.length === 0) {
    return null;
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
      {popupNotifications.map((notification, index) => (
        <NotificationPopup
          key={notification.id}
          notification={notification}
          index={index}
          onDismiss={() => dismissPopup(notification.id)}
          onMarkAsRead={() => markAsReadAndDismiss(notification.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    paddingHorizontal: 16,
  },
});
