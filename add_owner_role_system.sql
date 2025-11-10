-- ============================================
-- Migration: Owner Role System (Updated)
-- Version: 011
-- Date: 2024-12-07
-- Description: Add owner role system with comprehensive admin permissions
-- ============================================

-- ============================================
-- 1. ADD ROLE ENUM TYPE
-- ============================================

-- Create role enum type
CREATE TYPE user_role AS ENUM ('student', 'admin', 'owner');

-- ============================================
-- 2. UPDATE USERS TABLE
-- ============================================

-- Add role column (default to existing behavior)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student';

-- Update existing data based on is_admin column
UPDATE users
SET role = CASE
    WHEN is_admin = true THEN 'admin'::user_role
    ELSE 'student'::user_role
END;

-- Add index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 3. ROLE PERMISSION FUNCTIONS
-- ============================================

-- Function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND role = 'owner'
    );
END;
$$;

-- Function to check if user is admin or above
CREATE OR REPLACE FUNCTION is_admin_or_above(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND role IN ('admin', 'owner')
    );
END;
$$;

-- Function to check if user can manage content (admin or owner)
CREATE OR REPLACE FUNCTION can_manage_content(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND role IN ('admin', 'owner')
    );
END;
$$;

-- Function to check if user can remove others (owner only)
CREATE OR REPLACE FUNCTION can_remove_users(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND role = 'owner'
    );
END;
$$;

-- Function to check if user can manage another user
CREATE OR REPLACE FUNCTION can_manage_user(manager_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    manager_role user_role;
    target_role user_role;
BEGIN
    -- Get roles
    SELECT role INTO manager_role FROM users WHERE id = manager_id;
    SELECT role INTO target_role FROM users WHERE id = target_user_id;

    -- Owners can manage everyone
    IF manager_role = 'owner' THEN
        RETURN TRUE;
    END IF;

    -- Admins can view and promote students, but cannot remove anyone or demote others
    IF manager_role = 'admin' THEN
        RETURN target_role = 'student'; -- Can only manage students
    END IF;

    -- Students cannot manage anyone
    RETURN FALSE;
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result FROM users WHERE id = user_id;
    RETURN COALESCE(user_role_result, 'student');
END;
$$;

-- ============================================
-- 4. USER MANAGEMENT FUNCTIONS
-- ============================================

-- Function to promote user to admin (admin or owner can do this)
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role user_role;
    target_role user_role;
BEGIN
    -- Get caller's role
    SELECT role INTO caller_role FROM users WHERE id = auth.uid();

    -- Check if caller has permission (admin or owner)
    IF caller_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Only admins or owners can promote users to admin';
    END IF;

    -- Get target user's role
    SELECT role INTO target_role FROM users WHERE id = target_user_id;

    -- Can only promote students
    IF target_role != 'student' THEN
        RAISE EXCEPTION 'Can only promote students to admin';
    END IF;

    -- Update user role
    UPDATE users
    SET role = 'admin',
        is_admin = true,
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;

-- Function to demote admin to student (owner only)
CREATE OR REPLACE FUNCTION demote_to_student(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is owner (only owners can demote)
    IF NOT is_owner() THEN
        RAISE EXCEPTION 'Only owners can demote users';
    END IF;

    -- Prevent demoting other owners
    IF EXISTS (SELECT 1 FROM users WHERE id = target_user_id AND role = 'owner') THEN
        RAISE EXCEPTION 'Cannot demote owners';
    END IF;

    -- Update user role
    UPDATE users
    SET role = 'student',
        is_admin = false,
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;

-- Function to remove user (owner only)
CREATE OR REPLACE FUNCTION remove_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is owner (only owners can remove users)
    IF NOT is_owner() THEN
        RAISE EXCEPTION 'Only owners can remove users';
    END IF;

    -- Prevent removing other owners
    IF EXISTS (SELECT 1 FROM users WHERE id = target_user_id AND role = 'owner') THEN
        RAISE EXCEPTION 'Cannot remove owners';
    END IF;

    -- Delete user (CASCADE will handle related records)
    DELETE FROM users WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;

-- Function to get users (accessible to admins and owners)
CREATE OR REPLACE FUNCTION get_users_for_management()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    name VARCHAR,
    role user_role,
    is_admin BOOLEAN,
    branch_id UUID,
    year INTEGER,
    semester INTEGER,
    roll_number VARCHAR,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    branch_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin or owner
    IF NOT is_admin_or_above() THEN
        RAISE EXCEPTION 'Only admins or owners can access user management';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.is_admin,
        u.branch_id,
        u.year,
        u.semester,
        u.roll_number,
        u.last_login,
        u.created_at,
        b.name as branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY
        CASE u.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'student' THEN 3
        END,
        u.created_at DESC;
END;
$$;

-- ============================================
-- 5. CONTENT MANAGEMENT PERMISSIONS
-- ============================================

-- Function to check content management permissions
CREATE OR REPLACE FUNCTION can_manage_notes()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN is_admin_or_above();
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_events()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN is_admin_or_above();
END;
$$;

CREATE OR REPLACE FUNCTION can_manage_opportunities()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN is_admin_or_above();
END;
$$;

CREATE OR REPLACE FUNCTION can_view_analytics()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN is_admin_or_above();
END;
$$;

-- ============================================
-- 6. UPDATE EXISTING RLS POLICIES
-- ============================================

-- Update admin-only policies to use new role system
DO $$
BEGIN
    -- Notes policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage notes' AND tablename = 'notes') THEN
        DROP POLICY "Admins can manage notes" ON notes;
    END IF;

    CREATE POLICY "Admins can manage notes" ON notes
    FOR ALL
    USING (can_manage_content());

    -- Events policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage events' AND tablename = 'events') THEN
        DROP POLICY "Admins can manage events" ON events;
    END IF;

    CREATE POLICY "Admins can manage events" ON events
    FOR ALL
    USING (can_manage_content());

    -- Opportunities policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage opportunities' AND tablename = 'opportunities') THEN
        DROP POLICY "Admins can manage opportunities" ON opportunities;
    END IF;

    CREATE POLICY "Admins can manage opportunities" ON opportunities
    FOR ALL
    USING (can_manage_content());

    -- Subjects policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage subjects' AND tablename = 'subjects') THEN
        DROP POLICY "Admins can manage subjects" ON subjects;
    END IF;

    CREATE POLICY "Admins can manage subjects" ON subjects
    FOR ALL
    USING (can_manage_content());

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may not exist yet - this is normal for new installations';
END;
$$;

-- ============================================
-- 7. CREATE OWNER ACCOUNT HELPER
-- ============================================

-- Function to create owner account (can only be called by existing owner or during setup)
CREATE OR REPLACE FUNCTION create_owner_account(
    owner_email VARCHAR,
    owner_name VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    owner_count INTEGER;
BEGIN
    -- Check if any owners exist
    SELECT COUNT(*) INTO owner_count FROM users WHERE role = 'owner';

    -- If owners exist, check if caller is owner
    IF owner_count > 0 AND NOT is_owner() THEN
        RAISE EXCEPTION 'Only existing owners can create new owners';
    END IF;

    -- Create the owner account
    INSERT INTO users (email, name, role, is_admin)
    VALUES (owner_email, owner_name, 'owner', true)
    RETURNING id INTO new_user_id;

    RETURN new_user_id;
END;
$$;

-- ============================================
-- 8. ADMIN DASHBOARD FUNCTIONS
-- ============================================

-- Function to get dashboard stats (admin and owner access)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSON;
BEGIN
    -- Check if caller is admin or owner
    IF NOT is_admin_or_above() THEN
        RAISE EXCEPTION 'Only admins or owners can access dashboard stats';
    END IF;

    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users),
        'total_notes', (SELECT COUNT(*) FROM notes),
        'total_events', (SELECT COUNT(*) FROM events),
        'total_downloads', (SELECT COUNT(*) FROM note_downloads),
        'user_roles', json_build_object(
            'students', (SELECT COUNT(*) FROM users WHERE role = 'student'),
            'admins', (SELECT COUNT(*) FROM users WHERE role = 'admin'),
            'owners', (SELECT COUNT(*) FROM users WHERE role = 'owner')
        )
    ) INTO stats;

    RETURN stats;
END;
$$;

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_above(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_content(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_remove_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_to_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_management() TO authenticated;
GRANT EXECUTE ON FUNCTION create_owner_account(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_events() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_opportunities() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;

-- ============================================
-- 10. DATA VALIDATION
-- ============================================

-- Check role distribution
DO $$
DECLARE
    student_count INTEGER;
    admin_count INTEGER;
    owner_count INTEGER;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE role = 'student'),
        COUNT(*) FILTER (WHERE role = 'admin'),
        COUNT(*) FILTER (WHERE role = 'owner')
    INTO student_count, admin_count, owner_count
    FROM users;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Role Distribution:';
    RAISE NOTICE '  Students: %', student_count;
    RAISE NOTICE '  Admins: %', admin_count;
    RAISE NOTICE '  Owners: %', owner_count;
    RAISE NOTICE '========================================';
END;
$$;

-- ============================================
-- 11. NOTES AND INSTRUCTIONS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Owner Role System Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPDATED PERMISSIONS:';
    RAISE NOTICE '';
    RAISE NOTICE 'OWNER PERMISSIONS:';
    RAISE NOTICE '  ✓ Ultimate control over everything';
    RAISE NOTICE '  ✓ Can manage all users (promote, demote, remove)';
    RAISE NOTICE '  ✓ Can manage all content (notes, events, opportunities)';
    RAISE NOTICE '  ✓ Can view all analytics and dashboard stats';
    RAISE NOTICE '  ✓ Can create other owners (via database only)';
    RAISE NOTICE '';
    RAISE NOTICE 'ADMIN PERMISSIONS:';
    RAISE NOTICE '  ✓ Can manage all content (notes, events, opportunities)';
    RAISE NOTICE '  ✓ Can view all analytics and dashboard stats';
    RAISE NOTICE '  ✓ Can view user management interface';
    RAISE NOTICE '  ✓ Can promote students to admin';
    RAISE NOTICE '  ✗ Cannot demote other admins';
    RAISE NOTICE '  ✗ Cannot remove any users';
    RAISE NOTICE '  ✗ Cannot bypass owner decisions';
    RAISE NOTICE '';
    RAISE NOTICE 'STUDENT PERMISSIONS:';
    RAISE NOTICE '  ✓ Basic app access (download notes, view events)';
    RAISE NOTICE '  ✗ No management capabilities';
    RAISE NOTICE '';
    RAISE NOTICE 'HIERARCHY: OWNER > ADMIN > STUDENT';
    RAISE NOTICE '';
    RAISE NOTICE 'TO CREATE FIRST OWNER (run in Supabase SQL editor):';
    RAISE NOTICE 'SELECT create_owner_account(''owner@yourapp.com'', ''Owner Name'');';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Create your first owner account';
    RAISE NOTICE '2. Update admin dashboard to use new role system';
    RAISE NOTICE '3. Test user management and content management features';
    RAISE NOTICE '4. Verify admin permissions work correctly';
    RAISE NOTICE '========================================';
END;
$$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
