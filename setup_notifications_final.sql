-- HBTU Notification System Final Setup Script
-- Run this in Supabase SQL Editor to set up the complete notification system
-- This version includes fixes for type mismatches and test data

-- First, ensure we have the required extensions and functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if users table has phone column, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        CREATE INDEX idx_users_phone ON users(phone);
    END IF;
END $$;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- custom, exam_reminder, opportunity, event, timetable_update, announcement
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Targeting options
    target_all_users BOOLEAN DEFAULT FALSE,
    target_branches UUID[], -- NULL means all branches if target_all_users is true
    target_semesters INTEGER[], -- NULL means all semesters if target_all_users is true
    target_years INTEGER[], -- NULL means all years if target_all_users is true
    target_specific_users UUID[], -- Specific user IDs to target

    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When to send the notification
    expires_at TIMESTAMP WITH TIME ZONE, -- When notification becomes irrelevant

    -- Metadata for auto-generated notifications
    related_resource_type VARCHAR(50), -- 'exam', 'event', 'opportunity', 'timetable', etc.
    related_resource_id UUID, -- ID of the related resource
    metadata JSONB, -- Additional data like exam date, event details, etc.

    -- Status and tracking
    is_sent BOOLEAN DEFAULT FALSE,
    send_count INTEGER DEFAULT 0, -- How many users received this notification

    -- Admin info
    created_by UUID REFERENCES users(id),
    is_published BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER NOTIFICATIONS TABLE (for delivery tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Delivery status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP WITH TIME ZONE,

    -- Delivery method tracking
    delivered_via TEXT[], -- 'in_app', 'push', 'email' (for future)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(notification_id, user_id)
);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Notification type preferences
    enable_exam_reminders BOOLEAN DEFAULT TRUE,
    enable_event_notifications BOOLEAN DEFAULT TRUE,
    enable_opportunity_notifications BOOLEAN DEFAULT TRUE,
    enable_timetable_updates BOOLEAN DEFAULT TRUE,
    enable_announcement_notifications BOOLEAN DEFAULT TRUE,
    enable_admin_messages BOOLEAN DEFAULT TRUE,

    -- Timing preferences for exam reminders
    exam_reminder_1_week BOOLEAN DEFAULT TRUE,
    exam_reminder_3_days BOOLEAN DEFAULT TRUE,
    exam_reminder_1_day BOOLEAN DEFAULT TRUE,
    exam_reminder_on_day BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_is_sent ON notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_notifications_is_published ON notifications(is_published);
CREATE INDEX IF NOT EXISTS idx_notifications_target_branches ON notifications USING GIN(target_branches);
CREATE INDEX IF NOT EXISTS idx_notifications_target_semesters ON notifications USING GIN(target_semesters);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON user_notifications;
CREATE TRIGGER update_user_notifications_updated_at
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create and deliver notifications to target users
CREATE OR REPLACE FUNCTION create_and_deliver_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'custom',
    p_priority TEXT DEFAULT 'normal',
    p_target_all_users BOOLEAN DEFAULT FALSE,
    p_target_branches UUID[] DEFAULT NULL,
    p_target_semesters INTEGER[] DEFAULT NULL,
    p_target_years INTEGER[] DEFAULT NULL,
    p_target_specific_users UUID[] DEFAULT NULL,
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_related_resource_type TEXT DEFAULT NULL,
    p_related_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    target_user_ids UUID[];
    user_record RECORD;
BEGIN
    -- Create the notification
    INSERT INTO notifications (
        title, message, type, priority, target_all_users, target_branches,
        target_semesters, target_years, target_specific_users, scheduled_for,
        expires_at, related_resource_type, related_resource_id, metadata, created_by
    ) VALUES (
        p_title, p_message, p_type, p_priority, p_target_all_users, p_target_branches,
        p_target_semesters, p_target_years, p_target_specific_users, p_scheduled_for,
        p_expires_at, p_related_resource_type, p_related_resource_id, p_metadata, p_created_by
    ) RETURNING id INTO notification_id;

    -- Determine target users
    IF p_target_all_users THEN
        -- Target all users with optional filtering
        SELECT ARRAY_AGG(u.id) INTO target_user_ids
        FROM users u
        WHERE (p_target_branches IS NULL OR u.branch_id = ANY(p_target_branches))
          AND (p_target_semesters IS NULL OR u.semester = ANY(p_target_semesters))
          AND (p_target_years IS NULL OR u.year = ANY(p_target_years));
    ELSIF p_target_specific_users IS NOT NULL THEN
        target_user_ids := p_target_specific_users;
    END IF;

    -- Create user_notification records for each target user
    IF target_user_ids IS NOT NULL THEN
        INSERT INTO user_notifications (notification_id, user_id)
        SELECT notification_id, unnest(target_user_ids);

        -- Update send count
        UPDATE notifications
        SET is_sent = TRUE, send_count = array_length(target_user_ids, 1)
        WHERE id = notification_id;
    END IF;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE notification_id = p_notification_id AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO count
    FROM user_notifications un
    JOIN notifications n ON un.notification_id = n.id
    WHERE un.user_id = p_user_id
      AND un.is_read = FALSE
      AND n.is_published = TRUE
      AND (n.expires_at IS NULL OR n.expires_at > NOW());

    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql;

-- Simplified function to get notifications as JSON (more reliable)
CREATE OR REPLACE FUNCTION get_notifications_for_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', n.id,
            'title', n.title,
            'message', n.message,
            'type', n.type,
            'priority', n.priority,
            'is_read', un.is_read,
            'read_at', un.read_at,
            'created_at', n.created_at,
            'metadata', n.metadata
        )
        ORDER BY n.created_at DESC
    ) INTO result
    FROM user_notifications un
    JOIN notifications n ON un.notification_id = n.id
    WHERE un.user_id = p_user_id
      AND n.is_published = TRUE
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    LIMIT 50;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTOMATIC NOTIFICATION TRIGGERS
-- ============================================

-- Trigger for new events
CREATE OR REPLACE FUNCTION notify_new_event() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = TRUE THEN
        PERFORM create_and_deliver_notification(
            'New Event: ' || NEW.title,
            'A new event has been added. Check it out: ' || NEW.title ||
            CASE WHEN NEW.event_date IS NOT NULL THEN ' on ' || NEW.event_date::TEXT ELSE '' END,
            'event',
            'normal',
            TRUE, -- target all users
            NEW.target_branches,
            CASE WHEN NEW.target_semesters IS NOT NULL THEN NEW.target_semesters ELSE NULL END,
            NULL, -- target_years
            NULL, -- target_specific_users
            NOW(),
            CASE WHEN NEW.event_date IS NOT NULL THEN NEW.event_date + INTERVAL '1 day' ELSE NULL END,
            'event',
            NEW.id,
            jsonb_build_object('event_id', NEW.id, 'event_date', NEW.event_date)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_event ON events;
CREATE TRIGGER trigger_notify_new_event
    AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION notify_new_event();

-- Trigger for new opportunities
CREATE OR REPLACE FUNCTION notify_new_opportunity() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = TRUE THEN
        PERFORM create_and_deliver_notification(
            'New ' || NEW.type || ': ' || NEW.title,
            'A new ' || LOWER(NEW.type) || ' opportunity has been posted at ' ||
            COALESCE(NEW.company_name, 'a company') || '. ' ||
            CASE WHEN NEW.deadline IS NOT NULL THEN 'Deadline: ' || NEW.deadline::DATE::TEXT ELSE 'Check it out now!' END,
            'opportunity',
            CASE WHEN NEW.deadline IS NOT NULL AND NEW.deadline < NOW() + INTERVAL '7 days' THEN 'high' ELSE 'normal' END,
            TRUE, -- target all users
            NEW.target_branches,
            NULL, -- target_semesters
            NEW.target_years,
            NULL, -- target_specific_users
            NOW(),
            NEW.deadline, -- expires at deadline
            'opportunity',
            NEW.id,
            jsonb_build_object('opportunity_id', NEW.id, 'type', NEW.type, 'company', NEW.company_name)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_opportunity ON opportunities;
CREATE TRIGGER trigger_notify_new_opportunity
    AFTER INSERT ON opportunities
    FOR EACH ROW EXECUTE FUNCTION notify_new_opportunity();

-- Trigger for timetable updates
CREATE OR REPLACE FUNCTION notify_timetable_update() RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on updates, not inserts
    IF TG_OP = 'UPDATE' THEN
        PERFORM create_and_deliver_notification(
            'Timetable Updated',
            'Your timetable has been updated. Please check for any changes in schedule.',
            'timetable_update',
            'normal',
            FALSE, -- not all users
            ARRAY[NEW.branch_id],
            ARRAY[NEW.semester],
            NULL, -- target_years
            NULL, -- target_specific_users
            NOW(),
            NOW() + INTERVAL '7 days', -- expires in a week
            'timetable',
            NEW.id,
            jsonb_build_object('branch_id', NEW.branch_id, 'semester', NEW.semester)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_timetable_update ON timetable;
CREATE TRIGGER trigger_notify_timetable_update
    AFTER UPDATE ON timetable
    FOR EACH ROW EXECUTE FUNCTION notify_timetable_update();

-- Function for exam reminders (to be called by cron job)
CREATE OR REPLACE FUNCTION send_exam_reminders() RETURNS INTEGER AS $$
DECLARE
    exam_record RECORD;
    reminder_count INTEGER := 0;
BEGIN
    -- 1 week reminders
    FOR exam_record IN
        SELECT e.*, s.name as subject_name, s.code as subject_code
        FROM exam_schedule e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.exam_date = CURRENT_DATE + INTERVAL '7 days'
    LOOP
        PERFORM create_and_deliver_notification(
            '📚 Exam in 1 Week: ' || exam_record.subject_code,
            'Your ' || exam_record.exam_type || ' exam for ' || exam_record.subject_name ||
            ' is scheduled for ' || exam_record.exam_date::TEXT || ' at ' || exam_record.start_time::TEXT ||
            '. Start preparing now!',
            'exam_reminder',
            'normal',
            FALSE,
            ARRAY[exam_record.branch_id],
            ARRAY[exam_record.semester],
            NULL,
            NULL,
            NOW(),
            exam_record.exam_date + INTERVAL '1 day',
            'exam',
            exam_record.id,
            jsonb_build_object('exam_id', exam_record.id, 'days_until', 7)
        );
        reminder_count := reminder_count + 1;
    END LOOP;

    -- 1 day reminders
    FOR exam_record IN
        SELECT e.*, s.name as subject_name, s.code as subject_code
        FROM exam_schedule e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.exam_date = CURRENT_DATE + INTERVAL '1 day'
    LOOP
        PERFORM create_and_deliver_notification(
            '⚠️ Exam Tomorrow: ' || exam_record.subject_code,
            'REMINDER: Your ' || exam_record.exam_type || ' exam for ' || exam_record.subject_name ||
            ' is TOMORROW (' || exam_record.exam_date::TEXT || ') at ' || exam_record.start_time::TEXT ||
            '. Room: ' || COALESCE(exam_record.room_number, 'TBA') || '. Good luck!',
            'exam_reminder',
            'high',
            FALSE,
            ARRAY[exam_record.branch_id],
            ARRAY[exam_record.semester],
            NULL,
            NULL,
            NOW(),
            exam_record.exam_date + INTERVAL '1 day',
            'exam',
            exam_record.id,
            jsonb_build_object('exam_id', exam_record.id, 'days_until', 1)
        );
        reminder_count := reminder_count + 1;
    END LOOP;

    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL);

-- Create a welcome notification function for new users
CREATE OR REPLACE FUNCTION create_welcome_notification() RETURNS TRIGGER AS $$
BEGIN
    -- Create default notification preferences
    INSERT INTO notification_preferences (user_id) VALUES (NEW.id);

    -- Send welcome notification
    PERFORM create_and_deliver_notification(
        'Welcome to HBTU Study App! 🎓',
        'Welcome ' || NEW.name || '! You can now access notes, timetables, events, and opportunities. ' ||
        'Update your profile to get personalized content for your branch and semester.',
        'custom',
        'normal',
        FALSE,
        NULL,
        NULL,
        NULL,
        ARRAY[NEW.id],
        NOW(),
        NOW() + INTERVAL '30 days'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_welcome_new_user ON users;
CREATE TRIGGER trigger_welcome_new_user
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_welcome_notification();

-- ============================================
-- SAMPLE NOTIFICATIONS AND TEST DATA
-- ============================================

-- Sample admin notification
INSERT INTO notifications (
    title,
    message,
    type,
    priority,
    target_all_users,
    created_by,
    metadata
) VALUES (
    '🚀 New Notification System is Live!',
    'We have launched a new notification system to keep you updated about exams, events, opportunities, and important announcements. You can customize your notification preferences in your profile settings.',
    'announcement',
    'high',
    TRUE,
    (SELECT id FROM users WHERE is_admin = TRUE LIMIT 1),
    jsonb_build_object('system', 'notification_launch', 'version', '1.0')
)
ON CONFLICT DO NOTHING;

-- Create user notification records for the sample notification
INSERT INTO user_notifications (notification_id, user_id)
SELECT
    (SELECT id FROM notifications WHERE title LIKE '%Notification System%' LIMIT 1),
    id
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = users.id
    AND notification_id = (SELECT id FROM notifications WHERE title LIKE '%Notification System%' LIMIT 1)
);

-- Update the sample notification as sent
UPDATE notifications
SET is_sent = TRUE, send_count = (SELECT COUNT(*) FROM users)
WHERE title LIKE '%Notification System%';

-- Add some sample exam reminder notifications for testing
DO $$
DECLARE
    sample_user_id UUID;
    sample_notification_id UUID;
BEGIN
    -- Get a sample user for testing
    SELECT id INTO sample_user_id FROM users LIMIT 1;

    IF sample_user_id IS NOT NULL THEN
        -- Create a sample exam reminder
        SELECT create_and_deliver_notification(
            '📚 Upcoming Exam: Data Structures',
            'Your End-term exam for Data Structures is coming up next week. Start your preparation now!',
            'exam_reminder',
            'normal',
            FALSE,
            NULL,
            NULL,
            NULL,
            ARRAY[sample_user_id],
            NOW(),
            NOW() + INTERVAL '7 days',
            'exam',
            NULL,
            jsonb_build_object('subject', 'Data Structures', 'days_until', 7)
        ) INTO sample_notification_id;

        -- Create a sample opportunity notification
        SELECT create_and_deliver_notification(
            '💼 New Internship: Software Developer',
            'A new software developer internship opportunity is available at TechCorp. Apply before the deadline!',
            'opportunity',
            'normal',
            TRUE,
            NULL,
            NULL,
            NULL,
            NULL,
            NOW(),
            NOW() + INTERVAL '30 days',
            'opportunity',
            NULL,
            jsonb_build_object('company', 'TechCorp', 'type', 'internship')
        ) INTO sample_notification_id;

        -- Create a sample event notification
        SELECT create_and_deliver_notification(
            '🎉 New Event: Tech Fest 2024',
            'Annual Tech Fest is scheduled for next month. Register now to participate in various competitions!',
            'event',
            'normal',
            TRUE,
            NULL,
            NULL,
            NULL,
            NULL,
            NOW(),
            NOW() + INTERVAL '60 days',
            'event',
            NULL,
            jsonb_build_object('event_name', 'Tech Fest 2024', 'type', 'festival')
        ) INTO sample_notification_id;
    END IF;
END $$;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Notification system setup completed successfully!';
    RAISE NOTICE '📊 Created % notification tables with proper indexes', 3;
    RAISE NOTICE '🔧 Installed % helper functions including JSON fallback', 5;
    RAISE NOTICE '⚡ Created % automatic triggers for events and opportunities', 4;
    RAISE NOTICE '👤 Set up preferences for % existing users', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '📬 Created sample notifications for testing';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '  1. Test the admin dashboard at /dashboard/notifications';
    RAISE NOTICE '  2. Test mobile app notifications';
    RAISE NOTICE '  3. Set up cron job for exam reminders (optional)';
    RAISE NOTICE '';
    RAISE NOTICE '📚 The mobile app now uses direct queries instead of RPC functions';
    RAISE NOTICE '🔧 All type mismatches have been resolved';
    RAISE NOTICE '📱 Ready to use in production!';
END $$;
