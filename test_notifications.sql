-- Test Script for Notification System
-- Run this in Supabase SQL Editor to test the notification system

-- Display current setup status
SELECT 'Testing Notification System Setup...' as status;

-- Check if notification tables exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
    THEN '✅ notifications table exists'
    ELSE '❌ notifications table missing'
  END as notifications_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications')
    THEN '✅ user_notifications table exists'
    ELSE '❌ user_notifications table missing'
  END as user_notifications_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences')
    THEN '✅ notification_preferences table exists'
    ELSE '❌ notification_preferences table missing'
  END as preferences_table;

-- Check if functions exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_and_deliver_notification')
    THEN '✅ create_and_deliver_notification function exists'
    ELSE '❌ create_and_deliver_notification function missing'
  END as create_function,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'mark_notification_read')
    THEN '✅ mark_notification_read function exists'
    ELSE '❌ mark_notification_read function missing'
  END as mark_read_function;

-- Show current notification counts
SELECT
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_sent = true) as sent_notifications,
  COUNT(*) FILTER (WHERE is_published = true) as published_notifications
FROM notifications;

-- Show current user notification counts
SELECT
  COUNT(*) as total_user_notifications,
  COUNT(*) FILTER (WHERE is_read = true) as read_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_notifications
FROM user_notifications;

-- Test creating a notification (if admin user exists)
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
    notification_id UUID;
BEGIN
    -- Get admin user
    SELECT id INTO admin_user_id FROM users WHERE is_admin = true LIMIT 1;

    -- Get any user for testing
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF admin_user_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Create test notification
        SELECT create_and_deliver_notification(
            'Test Notification 📧',
            'This is a test notification to verify the system is working correctly. Created at ' || NOW()::TEXT,
            'custom',
            'normal',
            FALSE, -- not all users
            NULL, -- no branch filter
            NULL, -- no semester filter
            NULL, -- no year filter
            ARRAY[test_user_id], -- target specific user
            NOW(),
            NOW() + INTERVAL '1 hour', -- expires in 1 hour
            'test',
            NULL,
            jsonb_build_object('test', true, 'created_at', NOW()),
            admin_user_id
        ) INTO notification_id;

        RAISE NOTICE '✅ Test notification created with ID: %', notification_id;
        RAISE NOTICE '📊 Notification targeted to user: %', test_user_id;
        RAISE NOTICE '👤 Created by admin: %', admin_user_id;
    ELSE
        RAISE NOTICE '❌ No admin user or test user found for testing';
    END IF;
END $$;

-- Test notification queries
SELECT 'Testing notification queries...' as status;

-- Test direct query approach (used by mobile app)
SELECT
  un.id as user_notification_id,
  n.title,
  n.type,
  n.priority,
  un.is_read,
  n.created_at
FROM user_notifications un
JOIN notifications n ON un.notification_id = n.id
WHERE n.is_published = true
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
ORDER BY n.created_at DESC
LIMIT 5;

-- Test unread count query
SELECT
  u.name as user_name,
  COUNT(*) FILTER (WHERE un.is_read = false AND n.is_published = true AND (n.expires_at IS NULL OR n.expires_at > NOW())) as unread_count
FROM users u
LEFT JOIN user_notifications un ON u.id = un.user_id
LEFT JOIN notifications n ON un.notification_id = n.id
GROUP BY u.id, u.name
HAVING COUNT(*) FILTER (WHERE un.is_read = false AND n.is_published = true AND (n.expires_at IS NULL OR n.expires_at > NOW())) > 0
ORDER BY unread_count DESC
LIMIT 10;

-- Test notification preferences
SELECT
  COUNT(*) as users_with_preferences,
  COUNT(*) FILTER (WHERE enable_exam_reminders = true) as exam_reminders_enabled,
  COUNT(*) FILTER (WHERE enable_event_notifications = true) as event_notifications_enabled
FROM notification_preferences;

-- Show recent notifications with user info
SELECT
  n.title,
  n.type,
  n.priority,
  n.send_count,
  n.created_at,
  u.name as created_by
FROM notifications n
LEFT JOIN users u ON n.created_by = u.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Test trigger functionality by showing recent events/opportunities that should have triggered notifications
SELECT 'Checking automatic notification triggers...' as status;

-- Recent events that should have triggered notifications
SELECT
  e.title as event_title,
  e.event_date,
  e.is_published,
  EXISTS(
    SELECT 1 FROM notifications n
    WHERE n.related_resource_type = 'event'
    AND n.related_resource_id = e.id
  ) as notification_created
FROM events e
WHERE e.created_at > NOW() - INTERVAL '7 days'
ORDER BY e.created_at DESC
LIMIT 5;

-- Recent opportunities that should have triggered notifications
SELECT
  o.title as opportunity_title,
  o.type,
  o.is_published,
  EXISTS(
    SELECT 1 FROM notifications n
    WHERE n.related_resource_type = 'opportunity'
    AND n.related_resource_id = o.id
  ) as notification_created
FROM opportunities o
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 5;

-- Final summary
SELECT 'System Test Summary' as summary;

SELECT
  'Notifications' as component,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Working - ' || COUNT(*) || ' notifications exist'
    ELSE '⚠️ No notifications found'
  END as status
FROM notifications
UNION ALL
SELECT
  'User Notifications' as component,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Working - ' || COUNT(*) || ' user notifications exist'
    ELSE '⚠️ No user notifications found'
  END as status
FROM user_notifications
UNION ALL
SELECT
  'Preferences' as component,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Working - ' || COUNT(*) || ' preference records exist'
    ELSE '⚠️ No preference records found'
  END as status
FROM notification_preferences;

-- Cleanup test notifications
DELETE FROM notifications WHERE title LIKE 'Test Notification%' AND metadata->>'test' = 'true';

RAISE NOTICE '🧹 Cleaned up test notifications';
RAISE NOTICE '✅ Notification system test completed!';
RAISE NOTICE '';
RAISE NOTICE '📱 Next steps:';
RAISE NOTICE '  1. Test admin dashboard at /dashboard/notifications';
RAISE NOTICE '  2. Test mobile app notifications';
RAISE NOTICE '  3. Create real notifications for your users';
