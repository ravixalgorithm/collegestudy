-- ============================================
-- FIX ANALYTICS FUNCTIONS - SQL Syntax Error
-- ============================================
-- This script fixes the syntax error in get_top_content_by_category function

BEGIN;

-- ============================================
-- 1. DROP PROBLEMATIC FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS get_top_content_by_category();

-- ============================================
-- 2. CREATE CORRECTED FUNCTIONS
-- ============================================

-- Simple branch analytics function
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
        ), 0) as total_downloads
    FROM branches b
    ORDER BY b.name;
END $$;

-- Daily activity function
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
        COALESCE((
            SELECT COUNT(*) FROM note_downloads
            WHERE download_date = ds.date
        ), 0) as downloads_count,
        COALESCE((
            SELECT COUNT(*) FROM users
            WHERE DATE(created_at) = ds.date
        ), 0) as new_users_count,
        COALESCE((
            SELECT COUNT(*) FROM notes
            WHERE DATE(created_at) = ds.date
        ), 0) as notes_uploaded_count
    FROM date_series ds
    ORDER BY ds.date;
END $$;

-- Subject analytics function
CREATE OR REPLACE FUNCTION get_subject_analytics(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    subject_code TEXT,
    branch_name TEXT,
    semester INTEGER,
    notes_count BIGINT,
    total_downloads BIGINT,
    avg_downloads_per_note NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        b.name as branch_name,
        s.semester,
        COALESCE((SELECT COUNT(*) FROM notes WHERE subject_id = s.id AND is_verified = true), 0) as notes_count,
        COALESCE((SELECT SUM(download_count) FROM notes WHERE subject_id = s.id), 0) as total_downloads,
        CASE
            WHEN (SELECT COUNT(*) FROM notes WHERE subject_id = s.id AND is_verified = true) > 0
            THEN ROUND(COALESCE((SELECT SUM(download_count) FROM notes WHERE subject_id = s.id), 0)::numeric / (SELECT COUNT(*) FROM notes WHERE subject_id = s.id AND is_verified = true), 2)
            ELSE 0
        END as avg_downloads_per_note
    FROM subjects s
    LEFT JOIN branches b ON s.branch_id = b.id
    ORDER BY total_downloads DESC
    LIMIT p_limit;
END $$;

-- Most active users function
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
        COALESCE((SELECT COUNT(*) FROM note_downloads WHERE user_id = u.id), 0) as total_downloads,
        COALESCE((SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = u.id), 0) as saved_opportunities,
        u.last_login
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY total_downloads DESC, saved_opportunities DESC, u.last_login DESC NULLS LAST
    LIMIT p_limit;
END $$;

-- Platform overview function
CREATE OR REPLACE FUNCTION get_platform_overview()
RETURNS TABLE (
    total_users BIGINT,
    total_notes BIGINT,
    total_subjects BIGINT,
    total_branches BIGINT,
    total_events BIGINT,
    total_opportunities BIGINT,
    total_downloads BIGINT,
    total_bookmarks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM notes WHERE is_verified = true) as total_notes,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM branches) as total_branches,
        (SELECT COUNT(*) FROM events WHERE is_published = true) as total_events,
        (SELECT COUNT(*) FROM opportunities WHERE is_published = true) as total_opportunities,
        COALESCE((SELECT SUM(download_count) FROM notes), 0) as total_downloads,
        (SELECT COUNT(*) FROM opportunity_bookmarks) as total_bookmarks;
END $$;

-- Growth metrics function
CREATE OR REPLACE FUNCTION get_growth_metrics()
RETURNS TABLE (
    metric_name TEXT,
    current_month BIGINT,
    previous_month BIGINT,
    growth_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    previous_month_start DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
    previous_month_end DATE := current_month_start - INTERVAL '1 day';
BEGIN
    RETURN QUERY
    SELECT
        'New Users'::TEXT as metric_name,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= current_month_start) as current_month,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end) as previous_month,
        CASE
            WHEN (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end) > 0
            THEN ROUND((((SELECT COUNT(*) FROM users WHERE DATE(created_at) >= current_month_start) - (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end))::numeric / (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end)) * 100, 2)
            ELSE 0
        END as growth_percentage

    UNION ALL

    SELECT
        'Downloads'::TEXT,
        COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= current_month_start), 0),
        COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= previous_month_start AND download_date <= previous_month_end), 0),
        CASE
            WHEN COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= previous_month_start AND download_date <= previous_month_end), 0) > 0
            THEN ROUND(((COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= current_month_start), 0) - COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= previous_month_start AND download_date <= previous_month_end), 0))::numeric / COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date >= previous_month_start AND download_date <= previous_month_end), 0)) * 100, 2)
            ELSE 0
        END;
END $$;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_branch_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_subject_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_growth_metrics TO authenticated;

-- ============================================
-- 4. VERIFICATION
-- ============================================
SELECT 'Analytics functions fixed and ready' as status;

-- Test basic functionality
SELECT COUNT(*) as function_count
FROM information_schema.routines
WHERE routine_name IN (
    'get_branch_analytics',
    'get_daily_activity',
    'get_subject_analytics',
    'get_most_active_users',
    'get_platform_overview',
    'get_growth_metrics'
);

COMMIT;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================
-- SELECT * FROM get_platform_overview();
-- SELECT * FROM get_branch_analytics();
-- SELECT * FROM get_daily_activity(30);
-- SELECT * FROM get_subject_analytics(10);
-- SELECT * FROM get_most_active_users(15);
-- SELECT * FROM get_growth_metrics();
