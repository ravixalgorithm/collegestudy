import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { setStatusBarStyle } from "expo-status-bar";
import { supabase } from "../src/lib/supabase";
import { NotificationProvider } from "../src/contexts/NotificationContext";
import { NotificationOverlay } from "../src/components/NotificationOverlay";
import { CleanupService } from "../src/lib/cleanupService";

export default function RootLayout() {
  useEffect(() => {
    // Explicitly set status bar style on mount
    if (Platform.OS === "ios") {
      setStatusBarStyle("dark");
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      // Perform cleanup when user signs in
      if (event === "SIGNED_IN") {
        CleanupService.performStartupCleanup();
      }
    });

    // Perform initial cleanup on app startup
    CleanupService.performStartupCleanup();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <NotificationOverlay />
        </NotificationProvider>
      </SafeAreaView>
    </>
  );
}
