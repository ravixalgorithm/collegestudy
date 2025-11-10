-- ============================================
-- SIMPLE DOWNLOAD TRACKING SETUP
-- ============================================
-- Corrected version without SQL syntax errors

BEGIN;

-- ============================================
-- 1. CREATE NOTE DOWNLOADS TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS note_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_date DATE DEFAULT CURRENT_DATE
);

-- Add unique constraint separately to avoid syntax issues
ALTER TABLE note_downloads
ADD CONSTRAINT unique_download_per_day
UNIQUE (note_id, user_id, download_date);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_note_downloads_note_id ON note_downloads(note_id);
CREATE INDEX IF NOT EXISTS idx_note_downloads_user_id ON note_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_note_downloads_date ON note_downloads(download_date);

-- ============================================
-- 3. ENSURE DOWNLOAD COUNT COLUMN EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
END $$;

UPDATE notes SET download_count = 0 WHERE download_count IS NULL;

-- ============================================
-- 4. CREATE DOWNLOAD TRACKING FUNCTION
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
        VALUES (p_note_id, p_user_id, CURRENT_DATE);

        -- Increment download count
        UPDATE notes
        SET download_count = COALESCE(download_count, 0) + 1
        WHERE id = p_note_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END $$;

-- ============================================
-- 5. CREATE USER ACTIVITY SUMMARY FUNCTION
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
-- 6. CREATE ADMIN ANALYTICS FUNCTION
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
-- 7. CREATE POPULAR NOTES FUNCTION
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
        s.name as subject_name,
        s.code as subject_code
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.is_verified = TRUE
    ORDER BY COALESCE(n.download_count, 0) DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 8. SETUP SECURITY
-- ============================================
ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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
-- 9. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON note_downloads TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;

-- ============================================
-- 10. VERIFICATION
-- ============================================
SELECT 'DOWNLOAD TRACKING SETUP COMPLETE' as status;

-- Verify table exists
SELECT
    'note_downloads table' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_downloads')
        THEN '✓ CREATED'
        ELSE '✗ FAILED'
    END as status;

-- Verify functions exist
SELECT
    'Functions' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'track_note_download')
        THEN '✓ ALL CREATED'
        ELSE '✗ SOME MISSING'
    END as status;

COMMIT;

-- ============================================
-- USAGE:
-- ============================================
-- Track download: SELECT track_note_download('note-uuid', auth.uid());
-- Get user stats: SELECT * FROM get_user_activity_summary(auth.uid());
-- Get analytics: SELECT * FROM get_download_analytics();
-- Get popular: SELECT * FROM get_popular_notes(5);
