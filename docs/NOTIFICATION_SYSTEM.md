# Notification System Documentation

## Overview

The HBTU College Study App now includes a comprehensive notification system that replaces the forum functionality. This system allows admins to send custom notifications and automatically generates notifications for important events like exam reminders, new opportunities, events, and timetable updates.

## Database Schema

### Core Tables

#### 1. `notifications` Table
Stores all notification content and targeting information:

```sql
- id: UUID (Primary Key)
- title: VARCHAR(255) - Notification title
- message: TEXT - Notification content
- type: VARCHAR(50) - Notification category
- priority: VARCHAR(20) - Urgency level (low, normal, high, urgent)
- target_all_users: BOOLEAN - Send to all users flag
- target_branches: UUID[] - Specific branches to target
- target_semesters: INTEGER[] - Specific semesters to target
- target_years: INTEGER[] - Specific years to target
- target_specific_users: UUID[] - Specific user IDs to target
- scheduled_for: TIMESTAMP - When to send notification
- expires_at: TIMESTAMP - When notification becomes irrelevant
- related_resource_type: VARCHAR(50) - Type of related resource
- related_resource_id: UUID - ID of related resource
- metadata: JSONB - Additional data
- is_sent: BOOLEAN - Delivery status
- send_count: INTEGER - Number of recipients
- created_by: UUID - Admin who created notification
- is_published: BOOLEAN - Publication status
```

#### 2. `user_notifications` Table
Tracks delivery and read status for each user:

```sql
- id: UUID (Primary Key)
- notification_id: UUID - Reference to notification
- user_id: UUID - Reference to user
- is_read: BOOLEAN - Read status
- read_at: TIMESTAMP - When notification was read
- is_dismissed: BOOLEAN - Dismissal status
- dismissed_at: TIMESTAMP - When notification was dismissed
- delivered_via: TEXT[] - Delivery methods used
```

#### 3. `notification_preferences` Table
User preferences for notification types:

```sql
- id: UUID (Primary Key)
- user_id: UUID - Reference to user
- enable_exam_reminders: BOOLEAN
- enable_event_notifications: BOOLEAN
- enable_opportunity_notifications: BOOLEAN
- enable_timetable_updates: BOOLEAN
- enable_announcement_notifications: BOOLEAN
- enable_admin_messages: BOOLEAN
- exam_reminder_1_week: BOOLEAN
- exam_reminder_3_days: BOOLEAN
- exam_reminder_1_day: BOOLEAN
- exam_reminder_on_day: BOOLEAN
```

## Notification Types

### 1. Custom Messages (`custom`)
- Manual notifications sent by admins
- Can be targeted to specific groups
- Customizable priority levels

### 2. Announcements (`announcement`)
- Official college announcements
- Usually high priority
- Often sent to all users

### 3. Exam Reminders (`exam_reminder`)
- Automatically generated based on exam schedule
- Sent at 1 week, 3 days, 1 day, and 2 hours before exams
- Priority increases as exam approaches

### 4. Event Notifications (`event`)
- Automatically sent when new events are published
- Targeted based on event's target audience
- Includes event details and dates

### 5. Opportunity Alerts (`opportunity`)
- Automatically sent when new opportunities are posted
- Targeted based on opportunity requirements
- Includes deadline information

### 6. Timetable Updates (`timetable_update`)
- Automatically sent when timetables are modified
- Targeted to affected branch and semester
- Helps students stay updated on schedule changes

## Priority Levels

1. **Low** - General information, non-urgent updates
2. **Normal** - Standard notifications, most common
3. **High** - Important information requiring attention
4. **Urgent** - Critical information requiring immediate action

## Key Functions

### Administrative Functions

#### `create_and_deliver_notification()`
Creates and delivers notifications to target users:
```sql
SELECT create_and_deliver_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'custom',
    p_priority TEXT DEFAULT 'normal',
    p_target_all_users BOOLEAN DEFAULT FALSE,
    p_target_branches UUID[] DEFAULT NULL,
    p_target_semesters INTEGER[] DEFAULT NULL,
    p_target_years INTEGER[] DEFAULT NULL,
    p_target_specific_users UUID[] DEFAULT NULL,
    p_scheduled_for TIMESTAMP DEFAULT NOW(),
    p_expires_at TIMESTAMP DEFAULT NULL,
    p_related_resource_type TEXT DEFAULT NULL,
    p_related_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
);
```

### User Functions

#### `get_user_notifications()`
Retrieves notifications for a specific user:
```sql
SELECT * FROM get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
);
```

#### `get_unread_notification_count()`
Returns count of unread notifications for a user:
```sql
SELECT get_unread_notification_count(p_user_id UUID);
```

#### `mark_notification_read()`
Marks a notification as read for a user:
```sql
SELECT mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
);
```

### Automatic Notification Triggers

#### New Events
When an event is published:
```sql
CREATE TRIGGER trigger_notify_new_event
    AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION notify_new_event();
```

#### New Opportunities
When an opportunity is published:
```sql
CREATE TRIGGER trigger_notify_new_opportunity
    AFTER INSERT ON opportunities
    FOR EACH ROW EXECUTE FUNCTION notify_new_opportunity();
```

#### Timetable Updates
When timetable is modified:
```sql
CREATE TRIGGER trigger_notify_timetable_update
    AFTER UPDATE ON timetable
    FOR EACH ROW EXECUTE FUNCTION notify_timetable_update();
```

#### Welcome Notifications
When new user registers:
```sql
CREATE TRIGGER trigger_welcome_new_user
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_welcome_notification();
```

### Exam Reminder System

The `send_exam_reminders()` function should be called by a cron job to automatically send exam reminders:

```sql
-- Call this function daily via cron job
SELECT send_exam_reminders();
```

This function automatically:
- Sends 1-week reminders for exams 7 days away
- Sends 1-day reminders for exams tomorrow
- Sends 2-hour reminders for exams starting soon

## Admin Dashboard Features

### Notification Management
- **Create Custom Notifications**: Send targeted messages to specific groups
- **View All Notifications**: Monitor sent and pending notifications
- **Delivery Statistics**: Track notification reach and engagement
- **Priority Management**: Set appropriate urgency levels

### Targeting Options
- **All Users**: Broadcast to entire user base
- **Branch Filtering**: Target specific branches (CSE, IT, ECE, etc.)
- **Semester Filtering**: Target specific semesters (1-8)
- **Year Filtering**: Target specific years (1-4)
- **Individual Users**: Send to specific user IDs

### Scheduling
- **Immediate Delivery**: Send notifications right away
- **Scheduled Delivery**: Send at specific date/time
- **Expiration**: Set when notifications become irrelevant

## Mobile App Integration

### Home Screen
- Shows unread notification count in bell icon
- Displays recent notifications with read/unread status
- Quick access to notification details

### Notifications Screen
- Complete list of user's notifications
- Mark as read functionality
- Filter by type and priority
- Pull-to-refresh support

### Notification Display
- Type-specific icons and colors
- Priority indicators
- Timestamps (relative and absolute)
- Read/unread visual distinction

## Implementation Status

### ✅ Completed Features
1. Database schema with all tables and indexes
2. Core notification functions (create, deliver, read, count)
3. Automatic triggers for events, opportunities, and timetable updates
4. Admin dashboard for notification management
5. Mobile app notification display and interaction
6. Exam reminder system
7. User preference tracking
8. Welcome notifications for new users

### 📋 Migration Steps
1. Run the notification system migration:
   ```sql
   -- Execute: supabase/migrations/003_add_notifications.sql
   ```

2. Update admin dashboard navigation (completed)
3. Update mobile app to display notifications (completed)
4. Set up cron job for exam reminders (pending)

### 🔄 Automatic Notifications

The system automatically generates notifications for:
- **New Events**: When events are published
- **New Opportunities**: When opportunities are posted
- **Timetable Changes**: When schedules are updated
- **Exam Reminders**: Based on exam schedule (requires cron job)
- **Welcome Messages**: When users register

### 🎯 Targeting Examples

#### Send to All CSE Students
```sql
SELECT create_and_deliver_notification(
    'Important CSE Announcement',
    'All Computer Science students must attend the department meeting tomorrow.',
    'announcement',
    'high',
    FALSE, -- not all users
    ARRAY[(SELECT id FROM branches WHERE code = 'CSE')], -- target branches
    NULL, -- all semesters
    NULL, -- all years
    NULL -- no specific users
);
```

#### Send to Final Year Students
```sql
SELECT create_and_deliver_notification(
    'Placement Drive Starting Soon',
    'Final year students can register for the upcoming placement drive.',
    'opportunity',
    'high',
    FALSE, -- not all users
    NULL, -- all branches
    ARRAY[7, 8], -- semesters 7-8
    ARRAY[4], -- 4th year
    NULL -- no specific users
);
```

### 📱 Mobile App Usage

1. **View Notifications**: Tap bell icon on home screen
2. **Read Notifications**: Tap any notification to mark as read
3. **Mark All Read**: Use bulk action in notifications screen
4. **Notification Preferences**: Access via profile settings (future feature)

### 🔧 Maintenance

#### Regular Tasks
1. **Clean Old Notifications**: Remove expired notifications periodically
2. **Monitor Performance**: Check notification delivery success rates
3. **Update Preferences**: Ensure user preferences are respected
4. **Cron Job Status**: Verify exam reminders are being sent

#### Performance Considerations
1. **Pagination**: Large notification lists are paginated
2. **Indexing**: Database indexes optimize query performance
3. **Targeting**: Efficient user targeting reduces processing load
4. **Cleanup**: Automatic cleanup of old notification records

## Security & Permissions

### Admin Access
- Only users with `is_admin = true` can create custom notifications
- All notification creation is logged with creator ID
- Targeting validation prevents unauthorized access

### User Privacy
- Users only see notifications intended for them
- Read status is private to each user
- Notification preferences control delivery (future enhancement)

### Data Protection
- Sensitive information is not stored in notification metadata
- Personal data is handled according to privacy policies
- Notifications expire automatically to reduce data retention

## Future Enhancements

### Planned Features
1. **Push Notifications**: Mobile push notification support
2. **Email Notifications**: Optional email delivery
3. **Rich Content**: Support for images and formatting
4. **Notification Templates**: Pre-built message templates
5. **Analytics**: Detailed engagement metrics
6. **User Preferences**: Granular notification control

### Integration Opportunities
1. **Calendar Integration**: Link exam reminders to calendar apps
2. **SMS Notifications**: Critical notifications via SMS
3. **Third-party Services**: Integration with external notification services
4. **Chatbot Integration**: Automated response capabilities

This notification system provides a robust foundation for keeping students informed about important academic and extracurricular activities while giving administrators powerful tools to communicate effectively with their audience.