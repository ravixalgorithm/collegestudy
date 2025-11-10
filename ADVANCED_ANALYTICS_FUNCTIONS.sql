-- ============================================
-- ADVANCED ANALYTICS FUNCTIONS
-- ============================================
-- Additional functions to support comprehensive admin dashboard
-- Run this after the basic download tracking setup

BEGIN;

-- ============================================
-- 1. GET BRANCH STATISTICS WITH USER COUNTS
-- ============================================
CREATE OR REPLACE FUNCTION get_branch_analytics()
RETURNS TABLE (
    branch_id UUID,
    branch_name TEXT,
    branch_code TEXT,
    user_count BIGINT,
    notes_count BIGINT,
    subjects_count BIGINT,
    total_downloads BIGINT,
    active_users_count BIGINT
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
        COALESCE(user_counts.count, 0) as user_count,
        COALESCE(notes_counts.count, 0) as notes_count,
        COALESCE(subjects_counts.count, 0) as subjects_count,
        COALESCE(download_counts.total, 0) as total_downloads,
        COALESCE(active_counts.count, 0) as active_users_count
    FROM branches b
    LEFT JOIN (
        SELECT branch_id, COUNT(*) as count
        FROM users
        GROUP BY branch_id
    ) user_counts ON b.id = user_counts.branch_id
    LEFT JOIN (
        SELECT s.branch_id, COUNT(n.*) as count
        FROM subjects s
        LEFT JOIN notes n ON s.id = n.subject_id AND n.is_verified = true
        GROUP BY s.branch_id
    ) notes_counts ON b.id = notes_counts.branch_id
    LEFT JOIN (
        SELECT branch_id, COUNT(*) as count
        FROM subjects
        GROUP BY branch_id
    ) subjects_counts ON b.id = subjects_counts.branch_id
    LEFT JOIN (
        SELECT s.branch_id, SUM(COALESCE(n.download_count, 0)) as total
        FROM subjects s
        LEFT JOIN notes n ON s.id = n.subject_id
        GROUP BY s.branch_id
    ) download_counts ON b.id = download_counts.branch_id
    LEFT JOIN (
        SELECT branch_id, COUNT(*) as count
        FROM users
        WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY branch_id
    ) active_counts ON b.id = active_counts.branch_id
    ORDER BY branch_name;
END $$;

-- ============================================
-- 2. GET DAILY ACTIVITY FOR TIME RANGE
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_activity(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    activity_date DATE,
    downloads_count BIGINT,
    new_users_count BIGINT,
    notes_uploaded_count BIGINT,
    events_created_count BIGINT
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
        COALESCE(downloads.count, 0) as downloads_count,
        COALESCE(users.count, 0) as new_users_count,
        COALESCE(notes.count, 0) as notes_uploaded_count,
        COALESCE(events.count, 0) as events_created_count
    FROM date_series ds
    LEFT JOIN (
        SELECT download_date, COUNT(*) as count
        FROM note_downloads
        WHERE download_date >= CURRENT_DATE - (p_days - 1)
        GROUP BY download_date
    ) downloads ON ds.date = downloads.download_date
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE DATE(created_at) >= CURRENT_DATE - (p_days - 1)
        GROUP BY DATE(created_at)
    ) users ON ds.date = users.date
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM notes
        WHERE DATE(created_at) >= CURRENT_DATE - (p_days - 1)
        GROUP BY DATE(created_at)
    ) notes ON ds.date = notes.date
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM events
        WHERE DATE(created_at) >= CURRENT_DATE - (p_days - 1)
        GROUP BY DATE(created_at)
    ) events ON ds.date = events.date
    ORDER BY ds.date;
END $$;

-- ============================================
-- 3. GET SUBJECT ANALYTICS WITH PERFORMANCE METRICS
-- ============================================
CREATE OR REPLACE FUNCTION get_subject_analytics(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    subject_code TEXT,
    branch_name TEXT,
    semester INTEGER,
    notes_count BIGINT,
    total_downloads BIGINT,
    avg_downloads_per_note NUMERIC,
    last_note_uploaded TIMESTAMP WITH TIME ZONE
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
        COUNT(n.id) as notes_count,
        COALESCE(SUM(n.download_count), 0) as total_downloads,
        CASE
            WHEN COUNT(n.id) > 0 THEN ROUND(COALESCE(SUM(n.download_count), 0)::numeric / COUNT(n.id), 2)
            ELSE 0
        END as avg_downloads_per_note,
        MAX(n.created_at) as last_note_uploaded
    FROM subjects s
    LEFT JOIN branches b ON s.branch_id = b.id
    LEFT JOIN notes n ON s.id = n.subject_id AND n.is_verified = true
    GROUP BY s.id, s.name, s.code, b.name, s.semester
    ORDER BY total_downloads DESC, notes_count DESC
    LIMIT p_limit;
END $$;

-- ============================================
-- 4. GET MOST ACTIVE USERS WITH DETAILED METRICS
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
    unique_notes_downloaded BIGINT,
    saved_opportunities BIGINT,
    last_login TIMESTAMP WITH TIME ZONE,
    account_age_days INTEGER
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
        COALESCE(downloads.total_count, 0) as total_downloads,
        COALESCE(downloads.unique_notes, 0) as unique_notes_downloaded,
        COALESCE(bookmarks.count, 0) as saved_opportunities,
        u.last_login,
        EXTRACT(DAYS FROM NOW() - u.created_at)::INTEGER as account_age_days
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN (
        SELECT
            user_id,
            COUNT(*) as total_count,
            COUNT(DISTINCT note_id) as unique_notes
        FROM note_downloads
        GROUP BY user_id
    ) downloads ON u.id = downloads.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM opportunity_bookmarks
        GROUP BY user_id
    ) bookmarks ON u.id = bookmarks.user_id
    ORDER BY
        COALESCE(downloads.total_count, 0) DESC,
        COALESCE(bookmarks.count, 0) DESC,
        u.last_login DESC NULLS LAST
    LIMIT p_limit;
END $$;

-- ============================================
-- 5. GET COMPREHENSIVE PLATFORM STATISTICS
-- ============================================
CREATE OR REPLACE FUNCTION get_platform_overview()
RETURNS TABLE (
    total_users BIGINT,
    active_users_30d BIGINT,
    total_notes BIGINT,
    verified_notes BIGINT,
    total_subjects BIGINT,
    total_branches BIGINT,
    total_events BIGINT,
    active_events BIGINT,
    total_opportunities BIGINT,
    active_opportunities BIGINT,
    total_downloads BIGINT,
    total_bookmarks BIGINT,
    avg_downloads_per_user NUMERIC,
    avg_notes_per_subject NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login >= CURRENT_DATE - INTERVAL '30 days') as active_users_30d,
        (SELECT COUNT(*) FROM notes) as total_notes,
        (SELECT COUNT(*) FROM notes WHERE is_verified = true) as verified_notes,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM branches) as total_branches,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM events WHERE is_published = true AND event_date >= CURRENT_DATE) as active_events,
        (SELECT COUNT(*) FROM opportunities) as total_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE is_published = true) as active_opportunities,
        (SELECT COALESCE(SUM(download_count), 0) FROM notes) as total_downloads,
        (SELECT COUNT(*) FROM opportunity_bookmarks) as total_bookmarks,
        (
            SELECT CASE
                WHEN COUNT(DISTINCT user_id) > 0 THEN
                    ROUND((SELECT COALESCE(SUM(download_count), 0) FROM notes)::numeric / COUNT(DISTINCT user_id), 2)
                ELSE 0
            END
            FROM note_downloads
        ) as avg_downloads_per_user,
        (
            SELECT CASE
                WHEN COUNT(*) > 0 THEN
                    ROUND((SELECT COUNT(*) FROM notes WHERE is_verified = true)::numeric / COUNT(*), 2)
                ELSE 0
            END
            FROM subjects
        ) as avg_notes_per_subject;
END $$;

-- ============================================
-- 6. GET GROWTH METRICS COMPARISON
-- ============================================
CREATE OR REPLACE FUNCTION get_growth_metrics()
RETURNS TABLE (
    metric_name TEXT,
    current_period BIGINT,
    previous_period BIGINT,
    growth_rate NUMERIC,
    growth_direction TEXT
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
    WITH metrics AS (
        SELECT
            'New Users' as name,
            (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= current_month_start) as current_val,
            (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end) as previous_val
        UNION ALL
        SELECT
            'Downloads',
            (SELECT COUNT(*) FROM note_downloads WHERE download_date >= current_month_start),
            (SELECT COUNT(*) FROM note_downloads WHERE download_date >= previous_month_start AND download_date <= previous_month_end)
        UNION ALL
        SELECT
            'Notes Uploaded',
            (SELECT COUNT(*) FROM notes WHERE DATE(created_at) >= current_month_start),
            (SELECT COUNT(*) FROM notes WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end)
        UNION ALL
        SELECT
            'Events Created',
            (SELECT COUNT(*) FROM events WHERE DATE(created_at) >= current_month_start),
            (SELECT COUNT(*) FROM events WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end)
        UNION ALL
        SELECT
            'Opportunities Posted',
            (SELECT COUNT(*) FROM opportunities WHERE DATE(created_at) >= current_month_start),
            (SELECT COUNT(*) FROM opportunities WHERE DATE(created_at) >= previous_month_start AND DATE(created_at) <= previous_month_end)
    )
    SELECT
        m.name as metric_name,
        m.current_val as current_period,
        m.previous_val as previous_period,
        CASE
            WHEN m.previous_val > 0 THEN
                ROUND(((m.current_val - m.previous_val)::numeric / m.previous_val) * 100, 2)
            WHEN m.current_val > 0 THEN 100.00
            ELSE 0.00
        END as growth_rate,
        CASE
            WHEN m.current_val > m.previous_val THEN 'up'
            WHEN m.current_val < m.previous_val THEN 'down'
            ELSE 'stable'
        END as growth_direction
    FROM metrics m;
END $$;

-- ============================================
-- 7. GET TOP PERFORMING CONTENT BY CATEGORY
-- ============================================
CREATE OR REPLACE FUNCTION get_top_content_by_category()
RETURNS TABLE (
    category TEXT,
    item_id UUID,
    title TEXT,
    metric_value BIGINT,
    additional_info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Top downloaded notes
    SELECT
        'Most Downloaded Notes' as category,
        n.id as item_id,
        n.title,
        COALESCE(n.download_count, 0)::BIGINT as metric_value,
        COALESCE(s.code || ' - ' || b.name, 'Unknown') as additional_info
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE n.is_verified = true
    ORDER BY n.download_count DESC NULLS LAST
    LIMIT 5

    UNION ALL

    -- Most popular events
    SELECT
        'Most Popular Events' as category,
        e.id as item_id,
        e.title,
        0::BIGINT as metric_value, -- Could add RSVP count if available
        CASE
            WHEN e.event_date >= CURRENT_DATE THEN 'Upcoming'
            ELSE 'Past'
        END as additional_info
    FROM events e
    WHERE e.is_published = true
    ORDER BY e.created_at DESC
    LIMIT 5

    UNION ALL

    -- Most bookmarked opportunities
    SELECT
        'Most Bookmarked Opportunities' as category,
        o.id as item_id,
        o.title,
        COALESCE(bookmark_counts.count, 0)::BIGINT as metric_value,
        o.type as additional_info
    FROM opportunities o
    LEFT JOIN (
        SELECT opportunity_id, COUNT(*) as count
        FROM opportunity_bookmarks
        GROUP BY opportunity_id
    ) bookmark_counts ON o.id = bookmark_counts.opportunity_id
    WHERE o.is_published = true
    ORDER BY bookmark_counts.count DESC NULLS LAST, o.created_at DESC
    LIMIT 5;
END $$;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_branch_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_subject_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_growth_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_content_by_category TO authenticated;

-- ============================================
-- 9. VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ADVANCED ANALYTICS FUNCTIONS CREATED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  ✓ get_branch_analytics() - Branch performance metrics';
    RAISE NOTICE '  ✓ get_daily_activity(days) - Daily activity trends';
    RAISE NOTICE '  ✓ get_subject_analytics(limit) - Subject-wise performance';
    RAISE NOTICE '  ✓ get_most_active_users(limit) - Most engaged users';
    RAISE NOTICE '  ✓ get_platform_overview() - Overall platform stats';
    RAISE NOTICE '  ✓ get_growth_metrics() - Month-over-month growth';
    RAISE NOTICE '  ✓ get_top_content_by_category() - Top performing content';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage Examples:';
    RAISE NOTICE '  SELECT * FROM get_platform_overview();';
    RAISE NOTICE '  SELECT * FROM get_daily_activity(30);';
    RAISE NOTICE '  SELECT * FROM get_branch_analytics();';
    RAISE NOTICE '  SELECT * FROM get_growth_metrics();';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================
-- Get overall platform statistics:
-- SELECT * FROM get_platform_overview();

-- Get daily activity for last 30 days:
-- SELECT * FROM get_daily_activity(30);

-- Get branch performance analytics:
-- SELECT * FROM get_branch_analytics();

-- Get top 10 subjects by downloads:
-- SELECT * FROM get_subject_analytics(10);

-- Get most active users:
-- SELECT * FROM get_most_active_users(15);

-- Get growth metrics comparison:
-- SELECT * FROM get_growth_metrics();

-- Get top performing content:
-- SELECT * FROM get_top_content_by_category();
