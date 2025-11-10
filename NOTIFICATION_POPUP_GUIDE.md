# Notification Popup System Guide

## Overview

This guide explains the new notification popup system implemented for the College Study app. The system provides in-app popup notifications that appear over other screens within the safe area, similar to system notifications, with a clean and streamlined interface that focuses only on unread notifications.

## Features

### ✅ Popup Notifications
- **In-app overlays**: Notifications appear as popups over the current screen
- **Smart stacking**: Multiple notifications stack vertically with proper spacing
- **Auto-dismiss**: Non-urgent notifications auto-dismiss after 8 seconds
- **Gesture support**: Swipe right to dismiss notifications
- **Priority-based styling**: Different colors and behaviors based on priority

### ✅ Streamlined Interface
- **No "recent notifications"**: Only shows unread notifications to save space
- **Unread-only focus**: Notifications screen shows only unread items
- **Clean badges**: Simple notification badges with count indicators
- **Real-time updates**: Live notification count updates across the app

### ✅ Smart Notification Management
- **Context-based**: Global notification state management
- **Real-time sync**: Supabase real-time subscriptions for instant updates
- **Automatic polling**: Checks for new notifications every 30 seconds
- **Read state sync**: Marking as read removes from unread list instantly

## Architecture

### Components Structure
```
src/
├── contexts/
│   └── NotificationContext.tsx    # Global notification state
└── components/
    ├── NotificationPopup.tsx      # Individual popup component
    ├── NotificationOverlay.tsx    # Popup container/manager
    └── NotificationBadge.tsx      # Reusable badge component
```

### Key Components

#### 1. NotificationContext
Global context that manages:
- Unread notification count
- Popup notification queue
- Real-time updates from Supabase
- Auto-polling for new notifications

#### 2. NotificationPopup
Individual popup notification with:
- Smooth entrance/exit animations
- Swipe-to-dismiss gesture handling
- Priority-based visual styling
- Auto-dismiss timers for non-urgent items

#### 3. NotificationOverlay
Container that manages multiple popups:
- Stacks notifications vertically
- Handles z-index and positioning
- Manages popup lifecycle

#### 4. NotificationBadge
Reusable badge component for:
- Tab bars, headers, buttons
- Shows unread count or simple dot
- Configurable size and styling

## Usage Examples

### Basic Integration

```tsx
// In your main layout (_layout.tsx)
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { NotificationOverlay } from '../src/components/NotificationOverlay';

export default function RootLayout() {
  return (
    <NotificationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Your screens */}
      </Stack>
      <NotificationOverlay />
    </NotificationProvider>
  );
}
```

### Using Notification Badge

```tsx
import { NotificationBadge } from '../src/components/NotificationBadge';

// In header or tab bar
<NotificationBadge 
  onPress={() => router.push('/notifications')}
  size="medium"
  showCount={true}
/>
```

### Accessing Notification Context

```tsx
import { useNotifications } from '../src/contexts/NotificationContext';

function MyComponent() {
  const { 
    unreadCount, 
    refreshUnreadCount,
    showNotificationPopup 
  } = useNotifications();

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      <Button onPress={refreshUnreadCount} title="Refresh" />
    </View>
  );
}
```

## Home Screen Integration

The home screen now shows a clean unread message indicator instead of a detailed notification list:

```tsx
{/* Unread Messages Indicator */}
{unreadCount > 0 && (
  <TouchableOpacity style={styles.unreadIndicator} onPress={() => router.push("/notifications")}>
    <View style={styles.unreadContent}>
      <Bell color="#3B82F6" size={24} />
      <View style={styles.unreadTextContainer}>
        <Text style={styles.unreadTitle}>You have unread messages</Text>
        <Text style={styles.unreadSubtitle}>
          {unreadCount} unread notification{unreadCount > 1 ? "s" : ""} • Tap to view
        </Text>
      </View>
      <ChevronRight color="#3B82F6" size={20} />
    </View>
  </TouchableOpacity>
)}
```

### Safe Area Integration

All popup notifications appear within the safe area boundaries to avoid conflicts with system UI elements like the status bar and notch.

## Notification Types & Priorities

### Types
- `exam_reminder` 📚 - Exam-related notifications
- `event` 🎉 - Events and activities
- `opportunity` 💼 - Job/internship opportunities
- `timetable_update` 📅 - Schedule changes
- `announcement` 📢 - General announcements
- `custom` 📬 - Custom notifications

### Priorities
- `urgent` 🔴 - Red indicator, no auto-dismiss, prominent styling
- `high` 🟡 - Orange indicator, 8s auto-dismiss
- `normal` 🔵 - Blue indicator, 8s auto-dismiss  
- `low` ⚪ - Gray indicator, 8s auto-dismiss

## Styling & Customization

### Popup Appearance
- **Urgent notifications**: Red border, light red background
- **Normal notifications**: Clean white background with colored left border
- **Animation**: Smooth slide-in from top with spring physics
- **Gesture**: Swipe right to dismiss with haptic feedback

### Badge Styling
- **Active state**: Blue background when notifications present
- **Count display**: Shows number or "99+" for large counts
- **Dot mode**: Simple red dot for minimal display

## Key UI Changes

### Home Screen Simplification
- **Removed**: Detailed "Recent Notifications" section that took up significant space
- **Added**: Simple unread indicator that only appears when there are unread messages
- **Benefit**: More space for other important content while keeping users informed

### Safe Area Compliance
- All popup notifications respect device safe areas
- Content appears below status bar and above home indicator
- Proper padding applied for all device types

## Database Schema

The system works with existing Supabase tables:

```sql
-- Main notifications table
notifications (
  id, title, message, type, priority, 
  is_published, expires_at, metadata, created_at
)

-- User-specific notification states
user_notifications (
  user_id, notification_id, is_read, 
  read_at, created_at
)
```

## Best Practices

### 1. Notification Management
- Keep notification messages concise (2-3 lines max)
- Use appropriate priority levels
- Set reasonable expiration dates
- Include relevant metadata for context

### 2. User Experience
- Don't overwhelm users with too many popups
- Use urgent priority sparingly
- Provide clear action instructions
- Ensure notifications are actionable

### 3. Performance
- The system automatically manages popup limits (max 3 visible)
- Real-time subscriptions are cleaned up properly
- Polling is optimized for battery life

## Migration from Old System

If upgrading from the previous notification system:

1. **Remove old notification components** - Delete legacy notification UI
2. **Update notification screens** - Replace with new streamlined version
3. **Add context provider** - Wrap app in NotificationProvider
4. **Update notification badges** - Replace with new NotificationBadge component
5. **Update home screen** - Replace detailed notification list with simple unread indicator
6. **Ensure safe area compliance** - Verify popups appear within safe boundaries

## Troubleshooting

### Common Issues

**Popups not appearing:**
- Check if NotificationProvider wraps your app
- Verify NotificationOverlay is included in layout
- Ensure user is authenticated

**Notification count not updating:**
- Check Supabase real-time subscriptions
- Verify user permissions on notification tables
- Check network connectivity

**Animations not smooth:**
- Ensure useNativeDriver is enabled
- Check for other animation conflicts
- Verify React Native version compatibility

### Debug Mode

Enable additional logging by setting:
```tsx
const DEBUG_NOTIFICATIONS = __DEV__;
```

This will log notification events, subscription status, and popup lifecycle events to the console.

## Design Philosophy

The system follows these key principles:

- **Minimal interference** - Popups don't block user workflow
- **Space efficiency** - No permanent notification lists taking up home screen space
- **User-focused** - Only show what needs attention (unread items)
- **Safe area compliance** - Respects device boundaries and system UI
- **Progressive disclosure** - Simple indicator leads to detailed notification screen

## Future Enhancements

Potential improvements for future versions:

- **Sound notifications** - Audio alerts for urgent notifications
- **Notification scheduling** - Delayed delivery for specific times
- **Custom actions** - Actionable buttons within popups
- **Rich media** - Images and links in notifications
- **Notification categories** - User-customizable notification preferences
- **Offline queuing** - Queue notifications when offline

---

For more technical details, refer to the component source code and inline documentation.