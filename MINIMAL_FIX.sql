-- ============================================
-- MINIMAL FIX: User Activity Function Update
-- ============================================
-- This script fixes the function signature and ensures basic functionality

BEGIN;

-- ============================================
-- 1. DROP AND RECREATE USER ACTIVITY FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS get_user_activity_summary(uuid);

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
-- 2. ENSURE DOWNLOAD TRACKING FUNCTION EXISTS
-- ============================================
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
-- 3. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;

-- ============================================
-- 4. VERIFICATION
-- ============================================
SELECT 'User activity function updated successfully' as status;
SELECT 'Download tracking function ready' as status;

COMMIT;
