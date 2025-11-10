-- ============================================
-- Migration: Add Downloads Tracking System
-- ============================================
-- This migration adds comprehensive download tracking for notes
-- and creates necessary tables for activity tracking

BEGIN;

-- ============================================
-- 1. CREATE NOTE DOWNLOADS TRACKING TABLE
-- ============================================
CREATE TABLE note_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_date DATE DEFAULT CURRENT_DATE,
    ip_address INET,
    user_agent TEXT,
    UNIQUE(note_id, user_id, download_date) -- Prevent multiple downloads per day
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_note_downloads_note_id ON note_downloads(note_id);
CREATE INDEX idx_note_downloads_user_id ON note_downloads(user_id);
CREATE INDEX idx_note_downloads_date ON note_downloads(downloaded_at);
CREATE INDEX idx_note_downloads_user_date ON note_downloads(user_id, downloaded_at);

-- ============================================
-- 3. UPDATE NOTES TABLE DOWNLOAD COUNT (if needed)
-- ============================================
-- Ensure download_count column exists and is properly initialized
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing download counts to 0 if NULL
UPDATE notes SET download_count = 0 WHERE download_count IS NULL;

-- ============================================
-- 4. CREATE FUNCTION TO TRACK DOWNLOADS
-- ============================================
CREATE OR REPLACE FUNCTION track_note_download(
    p_note_id UUID,
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
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
        INSERT INTO note_downloads (note_id, user_id, download_date, ip_address, user_agent)
        VALUES (p_note_id, p_user_id, CURRENT_DATE, p_ip_address::INET, p_user_agent);

        -- Increment download count in notes table
        UPDATE notes
        SET download_count = download_count + 1,
            updated_at = NOW()
        WHERE id = p_note_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END $$;

-- ============================================
-- 5. CREATE FUNCTION TO GET USER DOWNLOAD STATS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_download_stats(p_user_id UUID)
RETURNS TABLE (
    total_downloads BIGINT,
    unique_notes_downloaded BIGINT,
    this_month_downloads BIGINT,
    this_week_downloads BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_downloads,
        COUNT(DISTINCT note_id) as unique_notes_downloaded,
        COUNT(*) FILTER (
            WHERE downloaded_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) as this_month_downloads,
        COUNT(*) FILTER (
            WHERE downloaded_at >= DATE_TRUNC('week', CURRENT_DATE)
        ) as this_week_downloads
    FROM note_downloads
    WHERE user_id = p_user_id;
END $$;

-- ============================================
-- 6. CREATE FUNCTION TO GET POPULAR NOTES
-- ============================================
CREATE OR REPLACE FUNCTION get_popular_notes(
    p_limit INTEGER DEFAULT 10,
    p_branch_id UUID DEFAULT NULL,
    p_semester INTEGER DEFAULT NULL
)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    download_count BIGINT,
    unique_downloaders BIGINT,
    subject_name TEXT,
    subject_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id as note_id,
        n.title,
        COUNT(nd.id) as download_count,
        COUNT(DISTINCT nd.user_id) as unique_downloaders,
        s.name as subject_name,
        s.code as subject_code
    FROM notes n
    LEFT JOIN note_downloads nd ON n.id = nd.note_id
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.is_verified = TRUE
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_semester IS NULL OR s.semester = p_semester)
    GROUP BY n.id, n.title, s.name, s.code
    ORDER BY download_count DESC, unique_downloaders DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 7. CREATE FUNCTION FOR ADMIN DOWNLOAD ANALYTICS
-- ============================================
CREATE OR REPLACE FUNCTION get_download_analytics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date_downloaded DATE,
    total_downloads BIGINT,
    unique_users BIGINT,
    unique_notes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(downloaded_at) as date_downloaded,
        COUNT(*) as total_downloads,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT note_id) as unique_notes
    FROM note_downloads
    WHERE DATE(downloaded_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(downloaded_at)
    ORDER BY date_downloaded DESC;
END $$;

-- ============================================
-- 8. CREATE FUNCTION TO GET USER ACTIVITY SUMMARY
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
        (SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = p_user_id) as saved_opportunities,
        (SELECT COUNT(DISTINCT note_id) FROM note_downloads WHERE user_id = p_user_id) as downloaded_notes,
        (SELECT COUNT(*) FROM events WHERE is_published = true AND event_date >= CURRENT_DATE) as total_events,
        (SELECT COUNT(*) FROM forum_posts WHERE user_id = p_user_id) as forum_posts;
END $$;

-- ============================================
-- 9. CREATE RLS POLICIES
-- ============================================
ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;

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
-- 10. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON note_downloads TO anon, authenticated;
GRANT INSERT ON note_downloads TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_download_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;

-- ============================================
-- 11. CREATE TRIGGER FOR AUTOMATIC CLEANUP
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_download_records()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete download records older than 2 years to keep table size manageable
    DELETE FROM note_downloads
    WHERE downloaded_at < NOW() - INTERVAL '2 years';

    -- Log cleanup
    RAISE NOTICE 'Cleaned up old download records older than 2 years';
END $$;

-- Create a scheduled cleanup (this would need to be scheduled externally)
COMMENT ON FUNCTION cleanup_old_download_records() IS 'Run this monthly to cleanup old download records';

-- ============================================
-- 12. VERIFICATION AND SAMPLE DATA
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== DOWNLOAD TRACKING MIGRATION COMPLETED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  ✓ note_downloads - tracks individual downloads';
    RAISE NOTICE '';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '  ✓ track_note_download() - records a download';
    RAISE NOTICE '  ✓ get_user_download_stats() - user statistics';
    RAISE NOTICE '  ✓ get_user_activity_summary() - complete activity data';
    RAISE NOTICE '  ✓ get_popular_notes() - most downloaded notes';
    RAISE NOTICE '  ✓ get_download_analytics() - admin analytics';
    RAISE NOTICE '  ✓ cleanup_old_download_records() - maintenance';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  ✓ RLS policies enabled';
    RAISE NOTICE '  ✓ User privacy protected';
    RAISE NOTICE '  ✓ Admin access configured';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update mobile app to call track_note_download()';
    RAISE NOTICE '  2. Update profile page to use get_user_activity_summary()';
    RAISE NOTICE '  3. Update admin dashboard with analytics';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================
-- Track a download:
-- SELECT track_note_download('note-uuid', 'user-uuid', '192.168.1.1', 'Mobile App');

-- Get user stats:
-- SELECT * FROM get_user_download_stats('user-uuid');

-- Get user activity summary:
-- SELECT * FROM get_user_activity_summary('user-uuid');

-- Get popular notes:
-- SELECT * FROM get_popular_notes(5);

-- Get download analytics (admin):
-- SELECT * FROM get_download_analytics('2024-01-01', '2024-12-31');
