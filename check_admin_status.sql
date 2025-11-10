-- ============================================
-- CHECK AND FIX ADMIN USER STATUS
-- ============================================
-- This script checks if you have admin access and can fix it if needed

-- ============================================
-- STEP 1: CHECK CURRENT USER AND ADMIN STATUS
-- ============================================

-- Check if you're authenticated
SELECT
    auth.uid() as current_user_id,
    CASE
        WHEN auth.uid() IS NULL THEN 'Not authenticated'
        ELSE 'Authenticated'
    END as auth_status;

-- Check your user record in the users table
SELECT
    id,
    email,
    name,
    is_admin,
    created_at
FROM users
WHERE id = auth.uid();

-- ============================================
-- STEP 2: CHECK ALL ADMIN USERS
-- ============================================

-- List all admin users in the system
SELECT
    id,
    email,
    name,
    is_admin,
    created_at
FROM users
WHERE is_admin = true
ORDER BY created_at;

-- ============================================
-- STEP 3: FIX ADMIN STATUS (if needed)
-- ============================================

-- If you don't have admin access, uncomment and run ONE of these options:

-- OPTION A: Make current user an admin (if you're authenticated)
-- UPDATE users
-- SET is_admin = true
-- WHERE id = auth.uid();

-- OPTION B: Make specific user an admin by email (replace with your email)
-- UPDATE users
-- SET is_admin = true
-- WHERE email = 'your-email@example.com';

-- OPTION C: Create admin user if doesn't exist (replace with your details)
-- INSERT INTO users (id, email, name, is_admin)
-- VALUES (
--     auth.uid(),
--     'your-email@example.com',
--     'Your Name',
--     true
-- )
-- ON CONFLICT (id) DO UPDATE SET
--     is_admin = true,
--     email = EXCLUDED.email,
--     name = EXCLUDED.name;

-- ============================================
-- STEP 4: VERIFY ADMIN ACCESS
-- ============================================

-- Check if current user now has admin access
SELECT
    CASE
        WHEN auth.uid() IS NULL THEN 'No user authenticated'
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN 'User not in users table'
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true) THEN 'User is admin ✓'
        ELSE 'User is not admin ✗'
    END as admin_status;

-- ============================================
-- STEP 5: DIAGNOSTIC INFORMATION
-- ============================================

DO $$
DECLARE
    current_uid UUID;
    user_exists BOOLEAN := FALSE;
    user_is_admin BOOLEAN := FALSE;
    total_users INTEGER;
    total_admins INTEGER;
BEGIN
    -- Get current user ID
    current_uid := auth.uid();

    -- Count users and admins
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO total_admins FROM users WHERE is_admin = true;

    -- Check if current user exists and is admin
    IF current_uid IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM users WHERE id = current_uid) INTO user_exists;
        SELECT EXISTS(SELECT 1 FROM users WHERE id = current_uid AND is_admin = true) INTO user_is_admin;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN STATUS DIAGNOSTIC';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current user ID: %', COALESCE(current_uid::text, 'NULL (not authenticated)');
    RAISE NOTICE 'User exists in database: %', user_exists;
    RAISE NOTICE 'User has admin privileges: %', user_is_admin;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'System Statistics:';
    RAISE NOTICE '  Total users: %', total_users;
    RAISE NOTICE '  Total admins: %', total_admins;
    RAISE NOTICE '========================================';

    IF current_uid IS NULL THEN
        RAISE NOTICE 'ACTION REQUIRED:';
        RAISE NOTICE '  1. Make sure you are logged into Supabase dashboard';
        RAISE NOTICE '  2. The SQL Editor should run as your authenticated user';

    ELSIF NOT user_exists THEN
        RAISE NOTICE 'ACTION REQUIRED:';
        RAISE NOTICE '  1. Your user ID exists but not in users table';
        RAISE NOTICE '  2. Uncomment and run OPTION C above with your details';

    ELSIF NOT user_is_admin THEN
        RAISE NOTICE 'ACTION REQUIRED:';
        RAISE NOTICE '  1. You exist in users table but are not admin';
        RAISE NOTICE '  2. Uncomment and run OPTION A above to make yourself admin';

    ELSE
        RAISE NOTICE 'STATUS: ✓ You have admin access!';
        RAISE NOTICE 'You can now create notes through the admin dashboard';

    END IF;

    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 6: TEST ADMIN FUNCTIONS
-- ============================================

-- Test if you can use admin-only functions
-- This should work if you're properly set up as admin
DO $$
DECLARE
    test_result INTEGER;
    sample_note_id UUID;
    sample_branch_id UUID;
BEGIN
    -- Get sample IDs
    SELECT id INTO sample_note_id FROM notes LIMIT 1;
    SELECT id INTO sample_branch_id FROM branches LIMIT 1;

    IF sample_note_id IS NOT NULL AND sample_branch_id IS NOT NULL THEN
        BEGIN
            -- Test the admin function
            SELECT create_note_branch_associations(sample_note_id, ARRAY[sample_branch_id]) INTO test_result;
            RAISE NOTICE 'Admin function test: SUCCESS (returned %)', test_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Admin function test: FAILED - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Admin function test: SKIPPED (no sample data available)';
    END IF;
END $$;
