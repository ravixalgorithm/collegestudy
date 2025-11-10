-- Fix type mismatch in get_user_notifications function
-- This script corrects the return type mismatch error

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, INTEGER);

-- Recreate the function with correct return types matching the actual database column types
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    title VARCHAR(255),  -- Changed from TEXT to VARCHAR(255) to match notifications table
    message TEXT,
    type VARCHAR(50),    -- Changed from TEXT to VARCHAR(50) to match notifications table
    priority VARCHAR(20), -- Changed from TEXT to VARCHAR(20) to match notifications table
    is_read BOOLEAN,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.message,
        n.type,
        n.priority,
        un.is_read,
        un.read_at,
        n.created_at,
        n.metadata
    FROM user_notifications un
    JOIN notifications n ON un.notification_id = n.id
    WHERE un.user_id = p_user_id
      AND n.is_published = TRUE
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Test the function to ensure it works
SELECT 'Function fixed successfully! Testing...' as status;

-- Run a test query (this will return empty if no users exist, but won't error)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a sample user ID for testing
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Test the function
        PERFORM * FROM get_user_notifications(test_user_id, 5, 0);
        RAISE NOTICE 'Function test completed successfully for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found for testing, but function structure is fixed';
    END IF;
END $$;
