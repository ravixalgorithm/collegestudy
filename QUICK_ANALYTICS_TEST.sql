-- ============================================
-- QUICK ANALYTICS TEST SCRIPT
-- ============================================
-- Run this script to quickly test if analytics are working
-- This provides a minimal setup to get analytics functional

BEGIN;

-- ============================================
-- 1. ENSURE DOWNLOAD_COUNT COLUMN EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE notes ADD COLUMN download_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added download_count column to notes table';
    ELSE
        RAISE NOTICE 'download_count column already exists';
    END IF;
END $$;

-- Update any NULL values to 0
UPDATE notes SET download_count = 0 WHERE download_count IS NULL;

-- ============================================
-- 2. CREATE MINIMAL ANALYTICS FUNCTION
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
        COALESCE(SUM(n.download_count), 0)::BIGINT as total_downloads,
        COALESCE(COUNT(DISTINCT CASE WHEN n.download_count > 0 THEN n.created_by END), 0)::BIGINT as unique_users,
        COALESCE(COUNT(DISTINCT CASE WHEN n.download_count > 0 THEN n.id END), 0)::BIGINT as unique_notes,
        0::BIGINT as downloads_today,
        0::BIGINT as downloads_this_week,
        0::BIGINT as downloads_this_month
    FROM notes n
    WHERE n.is_verified = true;
END $$;

-- ============================================
-- 3. CREATE POPULAR NOTES FUNCTION
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
-- 4. CREATE BRANCH ANALYTICS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_branch_analytics()
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    user_count BIGINT,
    notes_count BIGINT,
    download_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.code,
        COALESCE((SELECT COUNT(*) FROM users WHERE branch_id = b.id), 0) as user_count,
        COALESCE((
            SELECT COUNT(n.*)
            FROM subjects s
            LEFT JOIN notes n ON s.id = n.subject_id AND n.is_verified = true
            WHERE s.branch_id = b.id
        ), 0) as notes_count,
        COALESCE((
            SELECT SUM(n.download_count)
            FROM subjects s
            LEFT JOIN notes n ON s.id = n.subject_id
            WHERE s.branch_id = b.id
        ), 0) as download_count
    FROM branches b
    ORDER BY b.name;
END $$;

-- ============================================
-- 5. CREATE USER ACTIVITY FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_most_active_users(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    email TEXT,
    branch_name TEXT,
    semester INTEGER,
    total_downloads BIGINT,
    saved_opportunities BIGINT,
    last_login TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        COALESCE(u.name, 'Unknown') as name,
        u.email,
        COALESCE(b.name, 'Unknown') as branch_name,
        COALESCE(u.semester, 0) as semester,
        0::BIGINT as total_downloads, -- Placeholder
        COALESCE((SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = u.id), 0) as saved_opportunities,
        u.last_login,
        COALESCE(u.is_admin, false) as is_admin
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY saved_opportunities DESC, u.created_at DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 6. CREATE DAILY ACTIVITY FUNCTION
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
        0::BIGINT as downloads, -- Placeholder
        COALESCE((SELECT COUNT(*) FROM users WHERE DATE(created_at) = ds.date), 0) as new_users,
        COALESCE((SELECT COUNT(*) FROM notes WHERE DATE(created_at) = ds.date), 0) as notes_uploaded
    FROM date_series ds
    ORDER BY ds.date;
END $$;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_branch_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;

-- ============================================
-- 8. ADD SOME SAMPLE DATA FOR TESTING
-- ============================================
-- Add download counts to existing notes
DO $$
DECLARE
    note_record RECORD;
    random_downloads INTEGER;
BEGIN
    FOR note_record IN SELECT id FROM notes WHERE is_verified = true LIMIT 10 LOOP
        random_downloads := floor(random() * 50 + 1)::INTEGER;
        UPDATE notes SET download_count = random_downloads WHERE id = note_record.id;
    END LOOP;

    RAISE NOTICE 'Added sample download counts to 10 notes';
END $$;

-- ============================================
-- 9. TEST ALL FUNCTIONS
-- ============================================
-- Test download analytics
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM get_download_analytics() LIMIT 1;
    RAISE NOTICE 'Download Analytics Test: Total Downloads = %', result.total_downloads;
END $$;

-- Test popular notes
DO $$
DECLARE
    note_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO note_count FROM get_popular_notes(5);
    RAISE NOTICE 'Popular Notes Test: Found % popular notes', note_count;
END $$;

-- Test branch analytics
DO $$
DECLARE
    branch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO branch_count FROM get_branch_analytics();
    RAISE NOTICE 'Branch Analytics Test: Found % branches', branch_count;
END $$;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================
SELECT 'QUICK ANALYTICS TEST COMPLETED' as status;

-- Show sample results
SELECT '=== DOWNLOAD ANALYTICS ===' as section;
SELECT * FROM get_download_analytics();

SELECT '=== TOP 5 POPULAR NOTES ===' as section;
SELECT title, download_count, subject_name FROM get_popular_notes(5);

SELECT '=== BRANCH PERFORMANCE ===' as section;
SELECT name, user_count, notes_count, download_count FROM get_branch_analytics() LIMIT 5;

SELECT '=== FUNCTIONS AVAILABLE ===' as section;
SELECT routine_name as function_name
FROM information_schema.routines
WHERE routine_name IN (
    'get_download_analytics',
    'get_popular_notes',
    'get_branch_analytics',
    'get_most_active_users',
    'get_daily_activity'
)
ORDER BY routine_name;

COMMIT;

-- ============================================
-- QUICK USAGE GUIDE
-- ============================================
/*
After running this script:

1. Your admin dashboard analytics page should work
2. You'll see sample download data
3. All analytics functions are available

To test in your app:
- Go to admin dashboard
- Click "Analytics" in sidebar
- Should see cards with real data

To add more test data:
UPDATE notes SET download_count = floor(random() * 100)::INTEGER
WHERE is_verified = true AND id IN (SELECT id FROM notes LIMIT 20);
*/
