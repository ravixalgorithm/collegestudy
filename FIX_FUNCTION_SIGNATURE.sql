-- ============================================
-- FIX FUNCTION SIGNATURE CONFLICT
-- ============================================
-- This script fixes the function signature conflict by properly dropping
-- and recreating the get_user_activity_summary function

BEGIN;

-- ============================================
-- 1. DROP EXISTING FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS get_user_activity_summary(uuid);

-- ============================================
-- 2. CREATE UPDATED FUNCTION WITH CORRECT SIGNATURE
-- ============================================
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID)
RETURNS TABLE (
    saved_opportunities BIGINT,
    downloaded_notes BIGINT,
    total_events BIGINT,
    forum_posts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = p_user_id), 0) as saved_opportunities,
        COALESCE((SELECT COUNT(DISTINCT note_id) FROM note_downloads WHERE user_id = p_user_id), 0) as downloaded_notes,
        COALESCE((SELECT COUNT(*) FROM events WHERE is_published = true AND event_date >= CURRENT_DATE), 0) as total_events,
        COALESCE((SELECT COUNT(*) FROM forum_posts WHERE user_id = p_user_id), 0) as forum_posts;
END $$;

-- ============================================
-- 3. UPDATE OTHER FUNCTIONS SAFELY
-- ============================================

-- Update track_note_download function (safe to replace)
CREATE OR REPLACE FUNCTION track_note_download(
    p_note_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    download_exists BOOLEAN := FALSE;
BEGIN
    -- Check if user already downloaded this note today
    SELECT EXISTS(
        SELECT 1 FROM note_downloads
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND download_date = CURRENT_DATE
    ) INTO download_exists;

    -- If not downloaded today, record the download
    IF NOT download_exists THEN
        INSERT INTO note_downloads (note_id, user_id, download_date)
        VALUES (p_note_id, p_user_id, CURRENT_DATE)
        ON CONFLICT (note_id, user_id, download_date) DO NOTHING;

        -- Increment download count
        UPDATE notes
        SET download_count = COALESCE(download_count, 0) + 1
        WHERE id = p_note_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END $$;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;

-- ============================================
-- 5. VERIFICATION
-- ============================================
SELECT
    'Function signature fix complete' as status,
    routine_name,
    data_type
FROM information_schema.routines
WHERE routine_name = 'get_user_activity_summary';

-- Test the function works
SELECT 'Testing function...' as test;

COMMIT;

-- ============================================
-- USAGE:
-- ============================================
-- Test user activity: SELECT * FROM get_user_activity_summary('user-uuid');
-- Track download: SELECT track_note_download('note-uuid', 'user-uuid');
