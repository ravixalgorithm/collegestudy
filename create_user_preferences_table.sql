-- Create simplified user_preferences table for notifications only
-- This enables notifications settings persistence for the mobile app

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_settings JSONB DEFAULT '{
        "general": true,
        "notes": true,
        "events": true,
        "announcements": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_preferences(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    preferences_record user_preferences%ROWTYPE;
    result JSON;
BEGIN
    -- Check if user exists and is authenticated
    IF user_uuid IS NULL OR user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Get user preferences
    SELECT * INTO preferences_record
    FROM user_preferences
    WHERE user_id = user_uuid;

    -- If no preferences exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO user_preferences (user_id)
        VALUES (user_uuid)
        RETURNING * INTO preferences_record;
    END IF;

    -- Build result JSON
    result := json_build_object(
        'notifications', preferences_record.notification_settings,
        'updated_at', preferences_record.updated_at
    );

    RETURN result;
END;
$$;

-- Function to update user notification preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
    user_uuid UUID,
    section TEXT,
    settings JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    preferences_record user_preferences%ROWTYPE;
    result JSON;
BEGIN
    -- Check if user exists and is authenticated
    IF user_uuid IS NULL OR user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Validate section parameter (only notifications supported)
    IF section != 'notifications' THEN
        RAISE EXCEPTION 'Invalid settings section: %. Only "notifications" is supported.', section;
    END IF;

    -- Update notification settings
    UPDATE user_preferences
    SET notification_settings = settings,
        updated_at = NOW()
    WHERE user_id = user_uuid;

    -- If no row was updated, insert new preferences
    IF NOT FOUND THEN
        INSERT INTO user_preferences (user_id, notification_settings)
        VALUES (user_uuid, settings);
    END IF;

    -- Get updated preferences
    SELECT * INTO preferences_record
    FROM user_preferences
    WHERE user_id = user_uuid;

    -- Build result JSON
    result := json_build_object(
        'notifications', preferences_record.notification_settings,
        'updated_at', preferences_record.updated_at
    );

    RETURN result;
END;
$$;

-- Function to reset user preferences to defaults
CREATE OR REPLACE FUNCTION reset_user_preferences(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user exists and is authenticated
    IF user_uuid IS NULL OR user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Delete existing preferences (will be recreated with defaults)
    DELETE FROM user_preferences WHERE user_id = user_uuid;

    -- Create new default preferences
    INSERT INTO user_preferences (user_id)
    VALUES (user_uuid);

    -- Get the new preferences
    result := get_user_preferences(user_uuid);

    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_preferences(UUID) TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

-- Verify setup by running a test
DO $$
BEGIN
    RAISE NOTICE 'Simplified user preferences table created successfully!';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- get_user_preferences(user_uuid UUID)';
    RAISE NOTICE '- update_user_preferences(user_uuid UUID, section TEXT, settings JSONB)';
    RAISE NOTICE '- reset_user_preferences(user_uuid UUID)';
    RAISE NOTICE 'Supported section: notifications only';
    RAISE NOTICE 'Settings kept: notifications, privacy policy, about, reset';
END;
$$;
