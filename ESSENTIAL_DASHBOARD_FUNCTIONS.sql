-- ============================================
-- ESSENTIAL DASHBOARD FUNCTIONS
-- ============================================
-- Minimal functions needed for admin analytics dashboard
-- Run this script to enable basic dashboard functionality

BEGIN;

-- ============================================
-- 1. ENSURE BASIC TABLES EXIST
-- ============================================
-- Check and create note_downloads table if needed
CREATE TABLE IF NOT EXISTS note_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_date DATE DEFAULT CURRENT_DATE
);

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'note_downloads'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'unique_download_per_day'
    ) THEN
        ALTER TABLE note_downloads ADD CONSTRAINT unique_download_per_day UNIQUE (note_id, user_id, download_date);
    END IF;
END $$;

-- ============================================
-- 2. CORE DOWNLOAD TRACKING
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
    SELECT EXISTS(
        SELECT 1 FROM note_downloads
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND download_date = CURRENT_DATE
    ) INTO download_exists;

    IF NOT download_exists THEN
        INSERT INTO note_downloads (note_id, user_id, download_date)
        VALUES (p_note_id, p_user_id, CURRENT_DATE)
        ON CONFLICT (note_id, user_id, download_date) DO NOTHING;

        UPDATE notes
        SET download_count = COALESCE(download_count, 0) + 1
        WHERE id = p_note_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END $$;

-- ============================================
-- 3. USER ACTIVITY SUMMARY
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
-- 4. DOWNLOAD ANALYTICS
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
        COUNT(*) as total_downloads,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT note_id) as unique_notes,
        COUNT(*) FILTER (WHERE download_date = CURRENT_DATE) as downloads_today,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '7 days') as downloads_this_week,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '30 days') as downloads_this_month
    FROM note_downloads;
END $$;

-- ============================================
-- 5. POPULAR NOTES
-- ============================================
CREATE OR REPLACE FUNCTION get_popular_notes(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    note_id UUID,
    title TEXT,
    download_count BIGINT,
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
        COALESCE(n.download_count, 0)::BIGINT as download_count,
        COALESCE(s.name, 'Unknown') as subject_name,
        COALESCE(s.code, 'N/A') as subject_code
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.is_verified = true
    ORDER BY COALESCE(n.download_count, 0) DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 6. BRANCH ANALYTICS
-- ============================================
CREATE OR REPLACE FUNCTION get_branch_analytics()
RETURNS TABLE (
    branch_id UUID,
    branch_name TEXT,
    branch_code TEXT,
    user_count BIGINT,
    notes_count BIGINT,
    total_downloads BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        (SELECT COUNT(*) FROM users WHERE branch_id = b.id) as user_count,
        (
            SELECT COUNT(n.*)
            FROM subjects s
            LEFT JOIN notes n ON s.id = n.subject_id AND n.is_verified = true
            WHERE s.branch_id = b.id
        ) as notes_count,
        COALESCE((
            SELECT SUM(n.download_count)
            FROM subjects s
            LEFT JOIN notes n ON s.id = n.subject_id
            WHERE s.branch_id = b.id
        ), 0) as total_downloads
    FROM branches b
    ORDER BY b.name;
END $$;

-- ============================================
-- 7. MOST ACTIVE USERS
-- ============================================
CREATE OR REPLACE FUNCTION get_most_active_users(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    branch_name TEXT,
    semester INTEGER,
    is_admin BOOLEAN,
    total_downloads BIGINT,
    saved_opportunities BIGINT,
    last_login TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        COALESCE(u.name, 'Unknown') as user_name,
        u.email as user_email,
        COALESCE(b.name, 'Unknown') as branch_name,
        COALESCE(u.semester, 0) as semester,
        COALESCE(u.is_admin, false) as is_admin,
        (SELECT COUNT(*) FROM note_downloads WHERE user_id = u.id) as total_downloads,
        (SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = u.id) as saved_opportunities,
        u.last_login
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY total_downloads DESC, saved_opportunities DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 8. DAILY ACTIVITY
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_activity(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    activity_date DATE,
    downloads_count BIGINT,
    new_users_count BIGINT,
    notes_uploaded_count BIGINT
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
        ds.date as activity_date,
        COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date = ds.date), 0) as downloads_count,
        COALESCE((SELECT COUNT(*) FROM users WHERE DATE(created_at) = ds.date), 0) as new_users_count,
        COALESCE((SELECT COUNT(*) FROM notes WHERE DATE(created_at) = ds.date), 0) as notes_uploaded_count
    FROM date_series ds
    ORDER BY ds.date;
END $$;

-- ============================================
-- 9. SETUP SECURITY
-- ============================================
-- Enable RLS if not already enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_downloads') THEN
        ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if already enabled
END $$;

-- Create policies
DROP POLICY IF EXISTS "Users can view own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Users can track own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON note_downloads;

CREATE POLICY "Users can view own downloads" ON note_downloads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track own downloads" ON note_downloads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all downloads" ON note_downloads
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON note_downloads TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_branch_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;

-- ============================================
-- 11. VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ESSENTIAL DASHBOARD FUNCTIONS SETUP COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Available:';
    RAISE NOTICE '  ✓ track_note_download(note_id, user_id)';
    RAISE NOTICE '  ✓ get_user_activity_summary(user_id)';
    RAISE NOTICE '  ✓ get_download_analytics()';
    RAISE NOTICE '  ✓ get_popular_notes(limit)';
    RAISE NOTICE '  ✓ get_branch_analytics()';
    RAISE NOTICE '  ✓ get_most_active_users(limit)';
    RAISE NOTICE '  ✓ get_daily_activity(days)';
    RAISE NOTICE '';
    RAISE NOTICE 'Dashboard should now work with:';
    RAISE NOTICE '  • Real-time download tracking';
    RAISE NOTICE '  • User activity metrics';
    RAISE NOTICE '  • Branch performance data';
    RAISE NOTICE '  • Popular content analytics';
    RAISE NOTICE '  • Daily activity trends';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- QUICK TEST QUERIES
-- ============================================
-- Uncomment to test:
-- SELECT * FROM get_download_analytics();
-- SELECT * FROM get_popular_notes(5);
-- SELECT * FROM get_branch_analytics();
