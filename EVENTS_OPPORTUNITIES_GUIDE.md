# Events & Opportunities System Guide

## Overview

This guide explains the new combined Events & Opportunities system that replaces the old events-only screen. The system automatically manages expiration and cleanup to save database space while providing a unified view of campus events and career opportunities.

## Key Changes

### ✅ **What's New**
- **Combined View**: Events and opportunities in one screen
- **Auto-Expiration**: Automatic cleanup of expired items
- **No Past Events**: Past events are automatically deleted
- **Smart Filtering**: Filter by events, opportunities, or view all
- **Bookmark System**: Save opportunities for later
- **Expiration Warnings**: Visual indicators for deadlines

### ❌ **What's Removed**
- Past events section (deleted from database)
- Separate opportunities screen
- Manual past event management
- RSVP system (replaced with direct registration links)

## Database Schema Changes

### Events Table
```sql
-- Added auto-expiration column
ALTER TABLE events ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Auto-set expiration to 7 days after event date
CREATE TRIGGER trigger_set_event_expiration
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_expiration();
```

### Automatic Cleanup
```sql
-- Function to delete expired items
CREATE FUNCTION cleanup_expired_events() RETURNS void AS $$
BEGIN
    -- Delete expired events
    DELETE FROM events
    WHERE expires_at < NOW() AND event_date < CURRENT_DATE;
    
    -- Delete expired opportunities
    DELETE FROM opportunities
    WHERE deadline < NOW();
END;
$$;
```

### Combined View
```sql
-- View that combines events and opportunities
CREATE VIEW active_events_and_opportunities AS
SELECT 
    id, title, description, 'event' as item_type,
    event_date as date, location, ...
FROM events
WHERE is_published = true 
    AND event_date >= CURRENT_DATE
    AND (expires_at IS NULL OR expires_at > NOW())
UNION ALL
SELECT 
    id, title, description, 'opportunity' as item_type,
    deadline::DATE as date, location, ...
FROM opportunities
WHERE is_published = true 
    AND (deadline IS NULL OR deadline > NOW());
```

## Screen Features

### 1. **Tab Navigation**
- **All**: Shows both events and opportunities
- **Events**: Campus events, workshops, fests
- **Opportunities**: Jobs, internships, scholarships

### 2. **Smart Item Cards**
Each item displays:
- **Type Badge**: Visual indicator (Event/Internship/Job/etc.)
- **Title & Description**: Clear, concise information
- **Date/Deadline**: When it happens or expires
- **Location**: Physical or remote
- **Company/Organizer**: Who's hosting
- **Action Button**: Direct registration/application link

### 3. **Expiration Management**
- **Urgent Badge**: Shows "Today!" or "3d left" for expiring items
- **Auto-cleanup**: Expired items deleted automatically
- **Visual Priority**: Expiring items highlighted in red

### 4. **Bookmark System**
- **Save for Later**: Bookmark opportunities to review
- **Visual Indicator**: Filled bookmark icon for saved items
- **Quick Toggle**: Tap to bookmark/unbookmark

## Component Structure

```
events.tsx (Combined Screen)
├── Tab Navigation (All/Events/Opportunities)
├── Item Cards
│   ├── Type Badge
│   ├── Bookmark Button (opportunities only)
│   ├── Content Area
│   │   ├── Title & Description
│   │   ├── Company/Organizer Info
│   │   ├── Date/Deadline Info
│   │   ├── Location Info
│   │   └── Action Button
│   └── Urgent Indicator (if expiring soon)
└── Empty States
```

## Data Flow

### Loading Data
1. Fetch active events (future dates, not expired)
2. Fetch active opportunities (not past deadline)
3. Transform and combine into unified format
4. Sort by date (earliest first)
5. Load user bookmarks

### Filtering
- **All**: Show combined list
- **Events**: Filter `item_type === "event"`
- **Opportunities**: Filter `item_type === "opportunity"`

### Bookmarking
- Only available for opportunities
- Stored in `opportunity_bookmarks` table
- Real-time toggle functionality

## Automatic Cleanup System

### Cleanup Service (`cleanupService.ts`)
```typescript
// Manual cleanup
CleanupService.cleanupExpiredItems()

// Startup cleanup (runs once per day)
CleanupService.performStartupCleanup()

// Get expiration warnings
CleanupService.getExpirationWarnings(3) // 3 days ahead
```

### When Cleanup Runs
1. **App Startup**: Once per day automatically
2. **User Login**: When user signs in
3. **Manual**: Admin can trigger manually
4. **Scheduled**: Optional periodic cleanup

### What Gets Deleted
- **Events**: Past event date AND past expiration date
- **Opportunities**: Past deadline
- **Related Data**: RSVPs, bookmarks (cascade delete)

## Admin Management

### Creating Events
```typescript
// New event with auto-expiration
{
  title: "Tech Fest 2024",
  event_date: "2024-03-15",
  expires_at: "2024-03-22", // Auto-set to event_date + 7 days
  // ... other fields
}
```

### Creating Opportunities
```typescript
// Opportunity with deadline
{
  title: "Summer Internship",
  deadline: "2024-03-01T23:59:59Z", // Used as expiration
  type: "internship",
  // ... other fields
}
```

### Manual Cleanup
```typescript
// In admin panel or settings
const result = await CleanupService.manualCleanup();
console.log(result); // "Deleted 5 events and 3 opportunities"
```

## User Experience

### Before (Old System)
- Separate events screen
- Past events taking up space
- Manual management required
- No opportunities integration

### After (New System)
- Combined events and opportunities
- Clean, current content only
- Automatic space management
- Unified user experience

## Migration Steps

### 1. **Database Migration**
```bash
# Run the migration script
psql -f add_auto_expiration.sql
```

### 2. **Update App Code**
- Replace old events screen with new combined screen
- Update tab navigation labels
- Test filtering and bookmarking

### 3. **Data Cleanup**
```sql
-- Initial cleanup of old data
SELECT cleanup_expired_events();
```

### 4. **Admin Training**
- Show admins the new combined system
- Explain auto-expiration for events
- Update content creation guidelines

## Performance Optimizations

### Database Indexes
```sql
-- Optimized queries
CREATE INDEX idx_events_active ON events(event_date, is_published, expires_at);
CREATE INDEX idx_opportunities_active ON opportunities(deadline, is_published);
```

### Efficient Queries
- Combined view reduces multiple API calls
- Filtered queries by publication status
- Automatic cleanup reduces data size

## Monitoring & Analytics

### Cleanup Statistics
```typescript
const stats = await CleanupService.getExpirationStats();
// {
//   eventsExpiringToday: 2,
//   eventsExpiringThisWeek: 8,
//   opportunitiesExpiringToday: 1,
//   opportunitiesExpiringThisWeek: 5
// }
```

### Usage Metrics
- Track bookmark usage
- Monitor filter preferences
- Analyze cleanup effectiveness

## Best Practices

### ✅ **Do**
- Set realistic event expiration dates
- Use clear, descriptive titles
- Include direct registration/application links
- Set appropriate deadlines for opportunities

### ❌ **Don't**
- Create events without expiration dates
- Use vague descriptions
- Forget to publish items
- Set deadlines too far in the future

## Troubleshooting

### Common Issues

**Items Not Appearing**
- Check `is_published = true`
- Verify dates are in the future
- Ensure not expired

**Cleanup Not Working**
- Check database permissions
- Verify cleanup functions exist
- Monitor error logs

**Bookmarks Not Saving**
- Check user authentication
- Verify table permissions
- Check network connectivity

### Debug Tools
```typescript
// Check what would be cleaned up
const warnings = await CleanupService.getExpirationWarnings(0);
console.log('Items expiring today:', warnings);

// Manual cleanup test
const result = await CleanupService.cleanupExpiredItems();
console.log('Cleanup result:', result);
```

## Future Enhancements

### Planned Features
- **Push Notifications**: Alert users about deadlines
- **Calendar Integration**: Add events to device calendar
- **Advanced Filtering**: By type, location, date range
- **Recommendation System**: Suggest relevant opportunities

### Admin Features
- **Bulk Operations**: Mass create/update events
- **Analytics Dashboard**: View engagement metrics
- **Template System**: Reusable event templates
- **Approval Workflow**: Review before publishing

---

For technical implementation details, see the component source code and database migration scripts.