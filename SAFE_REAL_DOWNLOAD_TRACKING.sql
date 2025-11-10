-- ============================================
-- SAFE REAL DOWNLOAD TRACKING SETUP
-- ============================================
-- This script sets up real download tracking with proper error handling
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- 1. DROP EXISTING CONFLICTING FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT, TEXT, BIGINT);
DROP FUNCTION IF EXISTS get_download_analytics();
DROP FUNCTION IF EXISTS get_user_activity_summary(UUID);
DROP FUNCTION IF EXISTS get_popular_notes(INTEGER);
DROP FUNCTION IF EXISTS get_daily_activity(INTEGER);

-- ============================================
-- 2. ENSURE REQUIRED COLUMNS EXIST
-- ============================================
-- Check and add created_at to tables that might not have it
DO $$
BEGIN
    -- Add created_at to users table if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
    END IF;

    -- Add created_at to notes table if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE notes SET created_at = NOW() WHERE created_at IS NULL;
    END IF;

    -- Add created_at to events table if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE events SET created_at = NOW() WHERE created_at IS NULL;
    END IF;

    -- Ensure download_count column exists in notes table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;

    -- Ensure updated_at column exists in notes table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Reset fake download counts
UPDATE notes SET download_count = 0 WHERE download_count IS NOT NULL;

-- ============================================
-- 3. CREATE DOWNLOAD TRACKING TABLE
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

-- Create unique constraint safely
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

-- Create indexes
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

    -- If already downloaded today, return existing info
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
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::INET ELSE NULL END,
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
-- 5. CREATE ANALYTICS FUNCTIONS
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
        COALESCE(COUNT(*), 0)::BIGINT as total_downloads,
        COALESCE(COUNT(DISTINCT user_id), 0)::BIGINT as unique_users,
        COALESCE(COUNT(DISTINCT note_id), 0)::BIGINT as unique_notes,
        COALESCE(COUNT(*) FILTER (WHERE download_date = CURRENT_DATE), 0)::BIGINT as downloads_today,
        COALESCE(COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '7 days'), 0)::BIGINT as downloads_this_week,
        COALESCE(COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '30 days'), 0)::BIGINT as downloads_this_month
    FROM note_downloads;
END $$;

-- ============================================
-- 6. CREATE POPULAR NOTES FUNCTION
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
-- 7. CREATE USER ACTIVITY FUNCTION
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
            WHERE is_published = true
            AND event_date >= CURRENT_DATE
        ), 0)::BIGINT as total_events,
        COALESCE((
            SELECT CASE
                WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts')
                THEN (SELECT COUNT(*) FROM forum_posts WHERE user_id = p_user_id)
                ELSE 0
            END
        ), 0)::BIGINT as forum_posts;
END $$;

-- ============================================
-- 8. CREATE DAILY ACTIVITY FUNCTION
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
-- 9. SETUP SECURITY
-- ============================================
-- Enable RLS
ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Users can track own downloads" ON note_downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON note_downloads;

-- Create policies
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
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;

-- ============================================
-- 11. VERIFICATION
-- ============================================
-- Show current state
SELECT 'Real download tracking setup completed!' as status;

-- Test the analytics function
SELECT 'Current Analytics (should be all zeros):' as info;
SELECT * FROM get_download_analytics();

-- Show empty popular notes
SELECT 'Popular Notes (should be empty):' as info;
SELECT * FROM get_popular_notes(3);

-- Show table exists
SELECT
    'note_downloads table created' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_downloads')
        THEN 'YES' ELSE 'NO' END as exists;

-- Show functions exist
SELECT
    'Required functions' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'track_note_download')
        THEN 'ALL CREATED' ELSE 'MISSING' END as status;

COMMIT;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
/*
MOBILE APP INTEGRATION:

When user downloads a note, call:
const result = await supabase.rpc('track_note_download', {
  p_note_id: 'note-uuid-here',
  p_user_id: 'user-uuid-here',
  p_user_agent: 'College Study Mobile App',
});

Response will be JSON like:
{
  "success": true,
  "already_downloaded": false,
  "download_id": "uuid",
  "note_title": "Note Title",
  "message": "Download tracked successfully"
}

TESTING:
1. Run this script in Supabase SQL Editor
2. Update mobile app (already done)
3. Test downloading a note in the mobile app
4. Check admin dashboard analytics - should show real data
5. Download same note again - should show "already downloaded today"

CURRENT STATUS:
- All analytics start at 0 (real data)
- Mobile app will track real downloads
- Admin dashboard shows real statistics
- Download counts increment only for actual user downloads
*/
