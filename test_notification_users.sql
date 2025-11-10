-- ============================================
-- TEST NOTIFICATION USERS QUERY
-- ============================================

-- Check total users in database
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
    COUNT(CASE WHEN is_admin = false OR is_admin IS NULL THEN 1 END) as regular_users
FROM users;

-- Show all users with their details
SELECT
    id,
    email,
    name,
    branch_id,
    year,
    semester,
    is_admin,
    created_at
FROM users
ORDER BY created_at DESC;

-- Test query that admin dashboard uses for "all users"
SELECT id FROM users;

-- Test query for specific branch targeting
SELECT DISTINCT u.id
FROM users u
WHERE TRUE
AND (
    u.branch_id = ANY(ARRAY['your-branch-uuid-here'::UUID]) -- Replace with actual branch UUID
);

-- Test query for specific semester targeting
SELECT DISTINCT u.id
FROM users u
WHERE TRUE
AND (
    u.semester = ANY(ARRAY[1, 2, 3, 4, 5, 6, 7, 8])
);

-- Check if any users have NULL values that might cause issues
SELECT
    COUNT(*) as users_with_null_branch,
    'branch_id IS NULL' as issue
FROM users
WHERE branch_id IS NULL
UNION ALL
SELECT
    COUNT(*) as users_with_null_semester,
    'semester IS NULL' as issue
FROM users
WHERE semester IS NULL;

-- Test notification creation simulation
DO $$
DECLARE
    target_user_id UUID;
    user_count INTEGER := 0;
BEGIN
    -- Simulate sending to all users
    FOR target_user_id IN
        SELECT id FROM users WHERE TRUE
    LOOP
        RAISE NOTICE 'Would send notification to user: %', target_user_id;
        user_count := user_count + 1;
    END LOOP;

    RAISE NOTICE 'Total users that would receive notification: %', user_count;
END $$;
