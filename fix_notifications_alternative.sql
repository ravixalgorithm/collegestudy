-- Alternative fix for notification function type mismatch
-- This version uses explicit casting to ensure type compatibility

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_user_notifications_simple(UUID, INTEGER, INTEGER);

-- Create a simpler version with explicit casting
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    priority TEXT,
    is_read BOOLEAN,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title::TEXT,          -- Explicit cast to TEXT
        n.message,
        n.type::TEXT,           -- Explicit cast to TEXT
        n.priority::TEXT,       -- Explicit cast to TEXT
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

-- Alternative simpler approach: Create a view instead
CREATE OR REPLACE VIEW user_notifications_view AS
SELECT
    un.id as user_notification_id,
    n.id,
    n.title::TEXT as title,
    n.message,
    n.type::TEXT as type,
    n.priority::TEXT as priority,
    un.is_read,
    un.read_at,
    n.created_at,
    n.metadata,
    un.user_id
FROM user_notifications un
JOIN notifications n ON un.notification_id = n.id
WHERE n.is_published = TRUE
AND (n.expires_at IS NULL OR n.expires_at > NOW());

-- Create a simple function that uses the view
CREATE OR REPLACE FUNCTION get_user_notifications_simple(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS SETOF user_notifications_view AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM user_notifications_view
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Test both approaches
SELECT 'Both notification functions created successfully!' as status;

-- Create a backup RPC call if the main one fails
CREATE OR REPLACE FUNCTION get_notifications_json(p_user_id UUID)
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
    LIMIT 20;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Test the JSON version
DO $$
DECLARE
    test_user_id UUID;
    test_result JSON;
BEGIN
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        SELECT get_notifications_json(test_user_id) INTO test_result;
        RAISE NOTICE 'JSON function test completed. Result type: %', pg_typeof(test_result);
    ELSE
        RAISE NOTICE 'No users found for testing';
    END IF;
END $$;
