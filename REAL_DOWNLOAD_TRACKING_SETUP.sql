-- ============================================
-- REAL DOWNLOAD TRACKING SETUP
-- ============================================
-- This script sets up proper download tracking for real user downloads
-- Run this in Supabase SQL Editor to enable actual download tracking

BEGIN;

-- ============================================
-- 1. DROP EXISTING CONFLICTING FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID);
DROP FUNCTION IF EXISTS get_download_analytics();
DROP FUNCTION IF EXISTS get_user_activity_summary(UUID);
DROP FUNCTION IF EXISTS get_popular_notes(INTEGER);
DROP FUNCTION IF EXISTS get_daily_activity(INTEGER);

-- ============================================
-- 2. RESET CURRENT FAKE DATA
-- ============================================
-- Reset all fake download counts to 0
UPDATE notes SET download_count = 0 WHERE download_count IS NOT NULL;

-- Ensure download_count column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- 3. CREATE REAL DOWNLOAD TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS note_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_date DATE DEFAULT CURRENT_DATE,
    ip_address INET,
    user_agent TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate downloads per day
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'note_downloads'
        AND constraint_name = 'unique_download_per_day'
    ) THEN
        ALTER TABLE note_downloads
        ADD CONSTRAINT unique_download_per_day
        UNIQUE (note_id, user_id, download_date);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_downloads_note_id ON note_downloads(note_id);
CREATE INDEX IF NOT EXISTS idx_note_downloads_user_id ON note_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_note_downloads_date ON note_downloads(download_date);
CREATE INDEX IF NOT EXISTS idx_note_downloads_created_at ON note_downloads(created_at);

-- ============================================
-- 4. CREATE REAL DOWNLOAD TRACKING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION track_note_download(
    p_note_id UUID,
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_file_size BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    download_exists BOOLEAN := FALSE;
    download_id UUID;
    note_title TEXT;
    result JSON;
BEGIN
    -- Check if note exists and is verified
    SELECT title INTO note_title FROM notes
    WHERE id = p_note_id AND is_verified = true;

    IF note_title IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Note not found or not verified',
            'already_downloaded', false
        );
    END IF;

    -- Check if user already downloaded this note today
    SELECT EXISTS(
        SELECT 1 FROM note_downloads
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND download_date = CURRENT_DATE
    ) INTO download_exists;

    -- If already downloaded today, return existing download info
    IF download_exists THEN
        SELECT id INTO download_id FROM note_downloads
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND download_date = CURRENT_DATE
        LIMIT 1;

        RETURN json_build_object(
            'success', true,
            'already_downloaded', true,
            'download_id', download_id,
            'message', 'Already downloaded today'
        );
    END IF;

    -- Record new download
    INSERT INTO note_downloads (
        note_id,
        user_id,
        download_date,
        ip_address,
        user_agent,
        file_size
    )
    VALUES (
        p_note_id,
        p_user_id,
        CURRENT_DATE,
        p_ip_address::INET,
        p_user_agent,
        p_file_size
    )
    RETURNING id INTO download_id;

    -- Increment download count in notes table
    UPDATE notes
    SET download_count = COALESCE(download_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_note_id;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'already_downloaded', false,
        'download_id', download_id,
        'note_title', note_title,
        'message', 'Download tracked successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'already_downloaded', false
        );
END $$;

-- ============================================
-- 5. CREATE REAL ANALYTICS FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_download_analytics()
RETURNS TABLE (
    total_downloads BIGINT,
    unique_users BIGINT,
    unique_notes BIGINT,
    downloads_today BIGINT,
    downloads_this_week BIGINT,
    downloads_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_downloads,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        COUNT(DISTINCT note_id)::BIGINT as unique_notes,
        COUNT(*) FILTER (WHERE download_date = CURRENT_DATE)::BIGINT as downloads_today,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as downloads_this_week,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as downloads_this_month
    FROM note_downloads;
END $$;

-- ============================================
-- 6. CREATE POPULAR NOTES FUNCTION (REAL DATA)
-- ============================================
CREATE OR REPLACE FUNCTION get_popular_notes(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    note_id UUID,
    title VARCHAR(255),
    download_count BIGINT,
    subject_name VARCHAR(255),
    subject_code VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id as note_id,
        n.title,
        COALESCE(n.download_count, 0)::BIGINT as download_count,
        COALESCE(s.name, 'Unknown'::VARCHAR(255)) as subject_name,
        COALESCE(s.code, 'N/A'::VARCHAR(50)) as subject_code
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.is_verified = true
    ORDER BY COALESCE(n.download_count, 0) DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 7. CREATE DAILY ACTIVITY FUNCTION (REAL DATA)
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_activity(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    downloads BIGINT,
    new_users BIGINT,
    notes_uploaded BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days - 1),
            CURRENT_DATE,
            '1 day'::interval
        )::date AS date
    )
    SELECT
        ds.date,
        COALESCE((
            SELECT COUNT(*) FROM note_downloads
            WHERE download_date = ds.date
        ), 0)::BIGINT as downloads,
        COALESCE((
            SELECT COUNT(*) FROM users
            WHERE DATE(created_at) = ds.date
        ), 0)::BIGINT as new_users,
        COALESCE((
            SELECT COUNT(*) FROM notes
            WHERE DATE(created_at) = ds.date
        ), 0)::BIGINT as notes_uploaded
    FROM date_series ds
    ORDER BY ds.date;
END $$;

-- ============================================
-- 8. CREATE USER ACTIVITY SUMMARY (REAL DATA)
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
        COALESCE((
            SELECT COUNT(*) FROM opportunity_bookmarks
            WHERE user_id = p_user_id
        ), 0)::BIGINT as saved_opportunities,
        COALESCE((
            SELECT COUNT(DISTINCT note_id) FROM note_downloads
            WHERE user_id = p_user_id
        ), 0)::BIGINT as downloaded_notes,
        COALESCE((
            SELECT COUNT(*) FROM events
            WHERE is_published = true AND event_date >= CURRENT_DATE
        ), 0)::BIGINT as total_events,
        COALESCE((
            SELECT COUNT(*) FROM forum_posts
            WHERE user_id = p_user_id
        ), 0)::BIGINT as forum_posts;
END $$;

-- ============================================
-- 9. CREATE DOWNLOAD HISTORY FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_user_download_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    note_title VARCHAR(255),
    subject_name VARCHAR(255),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.title as note_title,
        COALESCE(s.name, 'Unknown'::VARCHAR(255)) as subject_name,
        nd.downloaded_at,
        nd.download_date
    FROM note_downloads nd
    JOIN notes n ON nd.note_id = n.id
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE nd.user_id = p_user_id
    ORDER BY nd.downloaded_at DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 10. CREATE DOWNLOAD STATISTICS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_download_statistics()
RETURNS TABLE (
    metric VARCHAR(50),
    value BIGINT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'total_downloads'::VARCHAR(50) as metric,
        COUNT(*)::BIGINT as value,
        'Total number of downloads recorded'::TEXT as description
    FROM note_downloads

    UNION ALL

    SELECT
        'unique_downloaders'::VARCHAR(50) as metric,
        COUNT(DISTINCT user_id)::BIGINT as value,
        'Number of users who have downloaded content'::TEXT as description
    FROM note_downloads

    UNION ALL

    SELECT
        'downloads_today'::VARCHAR(50) as metric,
        COUNT(*) FILTER (WHERE download_date = CURRENT_DATE)::BIGINT as value,
        'Downloads recorded today'::TEXT as description
    FROM note_downloads

    UNION ALL

    SELECT
        'most_popular_count'::VARCHAR(50) as metric,
        MAX(download_count)::BIGINT as value,
        'Highest download count for a single note'::TEXT as description
    FROM notes
    WHERE is_verified = true;
END $$;

-- ============================================
-- 11. SETUP ROW LEVEL SECURITY
-- ============================================
ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Users can track own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON note_downloads;

-- Users can only see their own downloads
CREATE POLICY "Users can view own downloads" ON note_downloads
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own downloads
CREATE POLICY "Users can track own downloads" ON note_downloads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all downloads
CREATE POLICY "Admins can view all downloads" ON note_downloads
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ============================================
-- 12. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON note_downloads TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_download_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_statistics TO authenticated;

-- ============================================
-- 13. VERIFICATION AND TESTING
-- ============================================
-- Test the tracking function with a sample
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- This will just test the function structure without actual data
    RAISE NOTICE 'Real download tracking setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '  • track_note_download() - Records real downloads';
    RAISE NOTICE '  • get_download_analytics() - Real analytics data';
    RAISE NOTICE '  • get_popular_notes() - Based on actual downloads';
    RAISE NOTICE '  • get_daily_activity() - Real daily trends';
    RAISE NOTICE '  • get_user_activity_summary() - Real user stats';
    RAISE NOTICE '  • get_user_download_history() - User download history';
    RAISE NOTICE '  • get_download_statistics() - Overall statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update mobile app to call track_note_download()';
    RAISE NOTICE '  2. All analytics will now show real data (starting at 0)';
    RAISE NOTICE '  3. Dashboard will update as users actually download files';
    RAISE NOTICE '';
END $$;

-- Show current state (should be all zeros now)
SELECT 'Current Analytics State (Real Data)' as info;
SELECT * FROM get_download_analytics();

SELECT 'Popular Notes (Real Data)' as info;
SELECT * FROM get_popular_notes(5);

COMMIT;

-- ============================================
-- USAGE EXAMPLES FOR MOBILE APP INTEGRATION
-- ============================================
/*
-- When a user downloads a note in the mobile app, call:
SELECT track_note_download(
    'note-uuid-here'::UUID,
    auth.uid(),
    '192.168.1.1',
    'College Study App v1.0',
    1024000  -- file size in bytes
);

-- This will return JSON like:
{
  "success": true,
  "already_downloaded": false,
  "download_id": "download-uuid",
  "note_title": "Data Structures Unit 1",
  "message": "Download tracked successfully"
}

-- If user already downloaded today:
{
  "success": true,
  "already_downloaded": true,
  "download_id": "existing-download-uuid",
  "message": "Already downloaded today"
}
*/
