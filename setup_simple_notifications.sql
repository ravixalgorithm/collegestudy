-- ============================================
-- SIMPLE NOTIFICATION SYSTEM SETUP
-- ============================================

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'custom',
    priority VARCHAR(20) DEFAULT 'normal',
    is_published BOOLEAN DEFAULT TRUE,
    is_sent BOOLEAN DEFAULT FALSE,
    send_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_notifications table exists
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

-- Ensure notification_preferences table exists (for user preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    general BOOLEAN DEFAULT TRUE,
    notes BOOLEAN DEFAULT TRUE,
    events BOOLEAN DEFAULT TRUE,
    announcements BOOLEAN DEFAULT TRUE,
    opportunities BOOLEAN DEFAULT TRUE,
    exam_reminders BOOLEAN DEFAULT TRUE,
    timetable_updates BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_published ON notifications(is_published);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at);

-- Create simple function to create notification and send to users
CREATE OR REPLACE FUNCTION create_simple_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'custom',
    p_priority TEXT DEFAULT 'normal',
    p_target_all_users BOOLEAN DEFAULT TRUE,
    p_target_branches UUID[] DEFAULT NULL,
    p_target_semesters INTEGER[] DEFAULT NULL,
    p_target_years INTEGER[] DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    target_user_id UUID;
    user_count INTEGER := 0;
BEGIN
    -- Create the notification
    INSERT INTO notifications (
        title,
        message,
        type,
        priority,
        expires_at,
        is_published,
        created_by
    ) VALUES (
        p_title,
        p_message,
        p_type,
        p_priority,
        p_expires_at,
        TRUE,
        p_created_by
    ) RETURNING id INTO notification_id;

    -- Determine target users
    IF p_target_all_users THEN
        -- Send to all active users
        FOR target_user_id IN
            SELECT id FROM users WHERE TRUE
        LOOP
            INSERT INTO user_notifications (user_id, notification_id)
            VALUES (target_user_id, notification_id)
            ON CONFLICT (user_id, notification_id) DO NOTHING;
            user_count := user_count + 1;
        END LOOP;
    ELSE
        -- Send to specific users based on criteria
        FOR target_user_id IN
            SELECT DISTINCT u.id
            FROM users u
            WHERE TRUE
            AND (
                p_target_branches IS NULL
                OR u.branch_id = ANY(p_target_branches)
            )
            AND (
                p_target_semesters IS NULL
                OR u.semester = ANY(p_target_semesters)
            )
            AND (
                p_target_years IS NULL
                OR u.year = ANY(p_target_years)
            )
        LOOP
            INSERT INTO user_notifications (user_id, notification_id)
            VALUES (target_user_id, notification_id)
            ON CONFLICT (user_id, notification_id) DO NOTHING;
            user_count := user_count + 1;
        END LOOP;
    END IF;

    -- Update notification with send count
    UPDATE notifications
    SET send_count = user_count, is_sent = TRUE
    WHERE id = notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired notifications and their user notifications (cascade)
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cleanup (optional)
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Cleanup expired notifications periodically
    PERFORM cleanup_expired_notifications();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Set up RLS policies for security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Public can view published notifications" ON notifications;
CREATE POLICY "Public can view published notifications" ON notifications
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- User notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
CREATE POLICY "Users can update their own notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all user notifications" ON user_notifications;
CREATE POLICY "Admins can manage all user notifications" ON user_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

GRANT EXECUTE ON FUNCTION create_simple_notification TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications TO authenticated;

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to add preferences for new users
CREATE OR REPLACE FUNCTION create_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_notification_preferences();

-- Test the system by creating a welcome notification function
CREATE OR REPLACE FUNCTION send_test_notification()
RETURNS UUID AS $$
DECLARE
    test_notification_id UUID;
BEGIN
    SELECT create_simple_notification(
        'System Test Notification',
        'This is a test notification to verify the system is working correctly.',
        'custom',
        'normal',
        TRUE,  -- send to all users
        NULL,  -- no specific branches
        NULL,  -- no specific semesters
        NULL,  -- no specific years
        NOW() + INTERVAL '7 days',  -- expires in 7 days
        NULL   -- system generated
    ) INTO test_notification_id;

    RETURN test_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Log successful setup
DO $$
BEGIN
    RAISE NOTICE 'Simple notification system setup completed successfully at %', NOW();
END $$;

COMMIT;
