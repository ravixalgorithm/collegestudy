import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CleanupResult {
  deletedEvents: number;
  deletedOpportunities: number;
  success: boolean;
  error?: string;
}

/**
 * Service for handling automatic cleanup of expired events and opportunities
 */
export class CleanupService {
  /**
   * Clean up expired events and opportunities from the database
   */
  static async cleanupExpiredItems(): Promise<CleanupResult> {
    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().split("T")[0];

      // First, try to check if expires_at column exists by doing a test query
      let hasExpiresAt = false;
      try {
        const testResult = await supabase.from("events").select("expires_at").limit(1);
        if (!testResult.error) {
          hasExpiresAt = true;
        }
      } catch (error: any) {
        console.log("expires_at column detection:", error.message);
        hasExpiresAt = false;
      }

      // Delete expired events with appropriate query based on column availability
      let deletedEvents;
      let eventsError;

      if (hasExpiresAt) {
        // Use expires_at column if available
        try {
          const result = await supabase
            .from("events")
            .delete()
            .lt("event_date", today)
            .lt("expires_at", now)
            .select("id");
          deletedEvents = result.data;
          eventsError = result.error;
        } catch (error: any) {
          console.error("Error with expires_at query, falling back to event_date only:", error);
          const result = await supabase.from("events").delete().lt("event_date", today).select("id");
          deletedEvents = result.data;
          eventsError = result.error;
        }
      } else {
        // Fallback to event_date only
        const result = await supabase.from("events").delete().lt("event_date", today).select("id");
        deletedEvents = result.data;
        eventsError = result.error;
      }

      if (eventsError) {
        console.error("Error deleting expired events:", eventsError);
        return {
          deletedEvents: 0,
          deletedOpportunities: 0,
          success: false,
          error: eventsError.message,
        };
      }

      // Delete expired opportunities (past their deadline)
      const { data: deletedOpportunities, error: opportunitiesError } = await supabase
        .from("opportunities")
        .delete()
        .lt("deadline", now)
        .select("id");

      if (opportunitiesError) {
        console.error("Error deleting expired opportunities:", opportunitiesError);
        return {
          deletedEvents: deletedEvents?.length || 0,
          deletedOpportunities: 0,
          success: false,
          error: opportunitiesError.message,
        };
      }

      const result = {
        deletedEvents: deletedEvents?.length || 0,
        deletedOpportunities: deletedOpportunities?.length || 0,
        success: true,
      };

      console.log("Cleanup completed:", result);
      return result;
    } catch (error) {
      console.error("Cleanup service error:", error);
      return {
        deletedEvents: 0,
        deletedOpportunities: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if an event is expired
   */
  static isEventExpired(eventDate: string, expiresAt?: string): boolean {
    const now = new Date();
    const eventDateObj = new Date(eventDate);

    // Event is expired if it's past the event date
    if (eventDateObj < now) {
      return true;
    }

    // Event is expired if it has an explicit expiration date that has passed
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      return expirationDate < now;
    }

    return false;
  }

  /**
   * Check if an opportunity is expired
   */
  static isOpportunityExpired(deadline?: string): boolean {
    if (!deadline) {
      return false; // No deadline means it doesn't expire
    }

    const now = new Date();
    const deadlineDate = new Date(deadline);
    return deadlineDate < now;
  }

  /**
   * Get upcoming expiration warnings
   */
  static async getExpirationWarnings(daysAhead: number = 3): Promise<{
    events: any[];
    opportunities: any[];
  }> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);

      // Check if expires_at column exists
      let hasExpiresAt = false;
      try {
        const testResult = await supabase.from("events").select("expires_at").limit(1);
        if (!testResult.error) {
          hasExpiresAt = true;
        }
      } catch (error: any) {
        hasExpiresAt = false;
      }

      // Get events expiring soon with appropriate query
      let events;
      if (hasExpiresAt) {
        try {
          const result = await supabase
            .from("events")
            .select("id, title, event_date, expires_at")
            .gte("event_date", now.toISOString().split("T")[0])
            .lt("expires_at", futureDate.toISOString())
            .eq("is_published", true);
          events = result.data;
        } catch (error: any) {
          console.error("Error with expires_at query in warnings, falling back:", error);
          const result = await supabase
            .from("events")
            .select("id, title, event_date")
            .gte("event_date", now.toISOString().split("T")[0])
            .lt("event_date", futureDate.toISOString().split("T")[0])
            .eq("is_published", true);
          events = result.data;
        }
      } else {
        const result = await supabase
          .from("events")
          .select("id, title, event_date")
          .gte("event_date", now.toISOString().split("T")[0])
          .lt("event_date", futureDate.toISOString().split("T")[0])
          .eq("is_published", true);
        events = result.data;
      }

      // Get opportunities expiring soon
      const { data: opportunities } = await supabase
        .from("opportunities")
        .select("id, title, deadline")
        .gte("deadline", now.toISOString())
        .lt("deadline", futureDate.toISOString())
        .eq("is_published", true);

      return {
        events: events || [],
        opportunities: opportunities || [],
      };
    } catch (error) {
      console.error("Error getting expiration warnings:", error);
      return {
        events: [],
        opportunities: [],
      };
    }
  }

  /**
   * Auto-cleanup on app startup (call this when the app starts)
   */
  static async performStartupCleanup(): Promise<void> {
    try {
      // Only run cleanup once per day to avoid excessive database calls
      const lastCleanup = await AsyncStorage.getItem("lastCleanup");
      const today = new Date().toDateString();

      if (lastCleanup === today) {
        return; // Already cleaned up today
      }

      const result = await this.cleanupExpiredItems();

      if (result.success) {
        await AsyncStorage.setItem("lastCleanup", today);
        console.log(
          `Startup cleanup completed: ${result.deletedEvents} events, ${result.deletedOpportunities} opportunities removed`,
        );
      }
    } catch (error) {
      console.error("Startup cleanup failed:", error);
    }
  }

  /**
   * Schedule periodic cleanup (you can call this in a background task)
   */
  static schedulePeriodicCleanup(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.cleanupExpiredItems();
      } catch (error) {
        console.error("Periodic cleanup failed:", error);
      }
    }, intervalMs);
  }

  /**
   * Manual cleanup trigger (for admin use or settings)
   */
  static async manualCleanup(): Promise<string> {
    const result = await this.cleanupExpiredItems();

    if (result.success) {
      const message = `Cleanup completed successfully!\nDeleted ${result.deletedEvents} expired events and ${result.deletedOpportunities} expired opportunities.`;
      return message;
    } else {
      return `Cleanup failed: ${result.error}`;
    }
  }

  /**
   * Get statistics about upcoming expirations
   */
  static async getExpirationStats(): Promise<{
    eventsExpiringToday: number;
    eventsExpiringThisWeek: number;
    opportunitiesExpiringToday: number;
    opportunitiesExpiringThisWeek: number;
  }> {
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      // Events expiring today
      const { count: eventsToday } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_date", today)
        .eq("is_published", true);

      // Events expiring this week
      const { count: eventsWeek } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("event_date", today)
        .lte("event_date", nextWeekStr)
        .eq("is_published", true);

      // Opportunities expiring today
      const { count: opportunitiesToday } = await supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .gte("deadline", `${today}T00:00:00.000Z`)
        .lt("deadline", `${today}T23:59:59.999Z`)
        .eq("is_published", true);

      // Opportunities expiring this week
      const { count: opportunitiesWeek } = await supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .gte("deadline", `${today}T00:00:00.000Z`)
        .lt("deadline", `${nextWeekStr}T23:59:59.999Z`)
        .eq("is_published", true);

      return {
        eventsExpiringToday: eventsToday || 0,
        eventsExpiringThisWeek: eventsWeek || 0,
        opportunitiesExpiringToday: opportunitiesToday || 0,
        opportunitiesExpiringThisWeek: opportunitiesWeek || 0,
      };
    } catch (error) {
      console.error("Error getting expiration stats:", error);
      return {
        eventsExpiringToday: 0,
        eventsExpiringThisWeek: 0,
        opportunitiesExpiringToday: 0,
        opportunitiesExpiringThisWeek: 0,
      };
    }
  }
}

// Auto-cleanup helper functions
export const {
  cleanupExpiredItems,
  isEventExpired,
  isOpportunityExpired,
  getExpirationWarnings,
  performStartupCleanup,
  schedulePeriodicCleanup,
  manualCleanup,
  getExpirationStats,
} = CleanupService;

// Export default cleanup function for easy import
export default CleanupService.cleanupExpiredItems;
