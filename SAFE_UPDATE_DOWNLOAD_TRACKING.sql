-- ============================================
-- SAFE UPDATE: Download Tracking System
-- ============================================
-- This script safely updates the download tracking system
-- Handles existing tables and only creates missing components

BEGIN;

-- ============================================
-- 1. SAFELY CREATE OR UPDATE note_downloads TABLE
-- ============================================
DO $$
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_downloads') THEN
        CREATE TABLE note_downloads (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            download_date DATE DEFAULT CURRENT_DATE
        );
        RAISE NOTICE 'Created note_downloads table';
    ELSE
        RAISE NOTICE 'note_downloads table already exists';

        -- Add download_date column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'note_downloads' AND column_name = 'download_date'
        ) THEN
            ALTER TABLE note_downloads ADD COLUMN download_date DATE DEFAULT CURRENT_DATE;
            UPDATE note_downloads SET download_date = DATE(downloaded_at) WHERE download_date IS NULL;
            RAISE NOTICE 'Added download_date column';
        END IF;
    END IF;
END $$;

-- ============================================
-- 2. SAFELY ADD UNIQUE CONSTRAINT
-- ============================================
DO $$
BEGIN
    -- Drop existing constraint if it exists (might have different name)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'note_downloads'
        AND constraint_name = 'unique_download_per_day'
    ) THEN
        ALTER TABLE note_downloads DROP CONSTRAINT unique_download_per_day;
    END IF;

    -- Add the unique constraint
    ALTER TABLE note_downloads ADD CONSTRAINT unique_download_per_day UNIQUE (note_id, user_id, download_date);
    RAISE NOTICE 'Added unique constraint for downloads per day';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Unique constraint already exists';
END $$;

-- ============================================
-- 3. SAFELY CREATE INDEXES
-- ============================================
DO $$
BEGIN
    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_note_downloads_note_id') THEN
        CREATE INDEX idx_note_downloads_note_id ON note_downloads(note_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_note_downloads_user_id') THEN
        CREATE INDEX idx_note_downloads_user_id ON note_downloads(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_note_downloads_date') THEN
        CREATE INDEX idx_note_downloads_date ON note_downloads(download_date);
    END IF;

    RAISE NOTICE 'Ensured all indexes exist';
END $$;

-- ============================================
-- 4. ENSURE DOWNLOAD COUNT COLUMN IN NOTES TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added download_count column to notes table';
    END IF;

    -- Update NULL values to 0
    UPDATE notes SET download_count = 0 WHERE download_count IS NULL;
    RAISE NOTICE 'Ensured download_count has no NULL values';
END $$;

-- ============================================
-- 5. CREATE/UPDATE DOWNLOAD TRACKING FUNCTION
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
EXCEPTION
    WHEN unique_violation THEN
        -- Handle race condition - another process already inserted
        RETURN FALSE;
END $$;

-- ============================================
-- 6. CREATE/UPDATE USER ACTIVITY SUMMARY FUNCTION
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
-- 7. CREATE/UPDATE ADMIN ANALYTICS FUNCTION
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
-- 8. CREATE/UPDATE POPULAR NOTES FUNCTION
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
-- 9. SAFELY SETUP SECURITY (RLS)
-- ============================================
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'note_downloads'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on note_downloads table';
    END IF;
END $$;

-- Drop existing policies if they exist (to recreate with correct definitions)
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
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;

-- ============================================
-- 11. VERIFICATION AND STATUS REPORT
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== DOWNLOAD TRACKING UPDATE COMPLETE ===';
    RAISE NOTICE '';

    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_downloads') THEN
        RAISE NOTICE '✓ note_downloads table: EXISTS';
    ELSE
        RAISE NOTICE '✗ note_downloads table: MISSING';
    END IF;

    -- Check functions exist
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'track_note_download') THEN
        RAISE NOTICE '✓ track_note_download function: EXISTS';
    ELSE
        RAISE NOTICE '✗ track_note_download function: MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_activity_summary') THEN
        RAISE NOTICE '✓ get_user_activity_summary function: EXISTS';
    ELSE
        RAISE NOTICE '✗ get_user_activity_summary function: MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_download_analytics') THEN
        RAISE NOTICE '✓ get_download_analytics function: EXISTS';
    ELSE
        RAISE NOTICE '✗ get_download_analytics function: MISSING';
    END IF;

    -- Report current data
    RAISE NOTICE '';
    RAISE NOTICE 'Current Status:';
    RAISE NOTICE '  • Download records: %', (SELECT COUNT(*) FROM note_downloads);
    RAISE NOTICE '  • Notes with downloads: %', (SELECT COUNT(*) FROM notes WHERE download_count > 0);
    RAISE NOTICE '  • Active events: %', (SELECT COUNT(*) FROM events WHERE is_published = true AND event_date >= CURRENT_DATE);
    RAISE NOTICE '';
    RAISE NOTICE 'Profile Activity Metrics:';
    RAISE NOTICE '  ✓ Saved Opportunities (from opportunity_bookmarks)';
    RAISE NOTICE '  ✓ Downloaded Notes (from note_downloads)';
    RAISE NOTICE '  ✓ Total Events (current active events)';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================
-- Track a download:
-- SELECT track_note_download('note-uuid-here', auth.uid());

-- Get user activity summary (for profile):
-- SELECT * FROM get_user_activity_summary(auth.uid());

-- Get download analytics (for admin):
-- SELECT * FROM get_download_analytics();

-- Get popular notes:
-- SELECT * FROM get_popular_notes(10);

-- ============================================
-- TESTING QUERIES:
-- ============================================
-- Test user activity function:
-- SELECT * FROM get_user_activity_summary('user-uuid-here');

-- Test download analytics:
-- SELECT * FROM get_download_analytics();

-- Check download tracking works:
-- SELECT track_note_download('note-uuid-here', 'user-uuid-here');
