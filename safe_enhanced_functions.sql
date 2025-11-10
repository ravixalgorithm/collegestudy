-- ============================================
-- Safe Enhanced Functions for Disabled State UX
-- Date: 2024-12-07
-- Description: Safely drops all existing functions and creates new ones for showing disabled options
-- ============================================

BEGIN;

-- ============================================
-- 1. SAFELY DROP ALL EXISTING FUNCTIONS
-- ============================================

-- Drop all existing functions that might cause conflicts
DROP FUNCTION IF EXISTS get_active_branches_for_mobile() CASCADE;
DROP FUNCTION IF EXISTS get_active_years_for_branch(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_semesters_for_branch_year(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_active_semester_for_branch(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_register_for_combination(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_select_combination(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_all_branches_with_status() CASCADE;
DROP FUNCTION IF EXISTS get_all_years_with_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_all_semesters_with_status(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_events() CASCADE;

-- ============================================
-- 2. FIX EVENTS TABLE (if needed)
-- ============================================

-- Add expires_at column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Set expires_at for existing events
UPDATE events SET expires_at = event_date + INTERVAL '7 days' WHERE expires_at IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);

-- ============================================
-- 3. CREATE NEW ENHANCED FUNCTIONS
-- ============================================

-- Function 1: Get ALL branches with their active status (enhanced UX)
CREATE FUNCTION get_all_branches_with_status()
RETURNS TABLE (
    id UUID,
    code TEXT,
    name TEXT,
    full_name TEXT,
    description TEXT,
    is_active BOOLEAN,
    display_order INTEGER,
    status_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.code::TEXT,
        b.name::TEXT,
        b.full_name::TEXT,
        b.description,
        b.is_active,
        COALESCE(b.display_order, 999) as display_order,
        CASE
            WHEN b.is_active = true THEN 'Available for registration'
            ELSE 'Currently not accepting new registrations'
        END::TEXT as status_reason
    FROM branches b
    ORDER BY COALESCE(b.display_order, 999), b.name;
END;
$$;

-- Function 2: Get ALL years for a branch with their active status
CREATE FUNCTION get_all_years_with_status(p_branch_id UUID)
RETURNS TABLE (
    id UUID,
    year_number INTEGER,
    academic_year TEXT,
    display_label TEXT,
    is_active BOOLEAN,
    branch_active BOOLEAN,
    can_select BOOLEAN,
    status_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        by.id,
        by.year_number,
        COALESCE(by.academic_year, '2024-25')::TEXT,
        CASE by.year_number
            WHEN 1 THEN 'First Year'
            WHEN 2 THEN 'Second Year'
            WHEN 3 THEN 'Third Year'
            WHEN 4 THEN 'Fourth Year'
            ELSE 'Year ' || by.year_number::TEXT
        END::TEXT as display_label,
        by.is_active,
        b.is_active as branch_active,
        (by.is_active AND b.is_active) as can_select,
        CASE
            WHEN NOT b.is_active THEN 'Branch is currently unavailable'
            WHEN NOT by.is_active THEN 'Year is currently unavailable for registration'
            ELSE 'Available for registration'
        END::TEXT as status_reason
    FROM branch_years by
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    ORDER BY by.year_number;
END;
$$;

-- Function 3: Get ALL semesters for a branch/year with their active status
CREATE FUNCTION get_all_semesters_with_status(
    p_branch_id UUID,
    p_year_number INTEGER
)
RETURNS TABLE (
    id UUID,
    semester_number INTEGER,
    semester_label TEXT,
    is_active BOOLEAN,
    year_active BOOLEAN,
    branch_active BOOLEAN,
    can_select BOOLEAN,
    is_current BOOLEAN,
    status_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.id,
        bs.semester_number,
        COALESCE(bs.semester_label, 'Semester ' || bs.semester_number::TEXT)::TEXT,
        bs.is_active,
        by.is_active as year_active,
        b.is_active as branch_active,
        (bs.is_active AND by.is_active AND b.is_active) as can_select,
        COALESCE(bs.is_current, false) as is_current,
        CASE
            WHEN NOT b.is_active THEN 'Branch is currently unavailable'
            WHEN NOT by.is_active THEN 'Year is currently unavailable'
            WHEN NOT bs.is_active THEN 'Semester is currently unavailable for registration'
            ELSE 'Available for registration'
        END::TEXT as status_reason
    FROM branch_semesters bs
    JOIN branch_years by ON bs.branch_year_id = by.id
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    AND by.year_number = p_year_number
    ORDER BY bs.semester_number;
END;
$$;

-- Function 4: Check if combination can be selected
CREATE FUNCTION can_select_combination(
    p_branch_id UUID,
    p_year_number INTEGER DEFAULT NULL,
    p_semester_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
    can_select BOOLEAN,
    branch_active BOOLEAN,
    year_active BOOLEAN,
    semester_active BOOLEAN,
    status_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branch_active BOOLEAN := false;
    v_year_active BOOLEAN := false;
    v_semester_active BOOLEAN := false;
    v_message TEXT;
BEGIN
    -- Check branch status
    SELECT is_active INTO v_branch_active
    FROM branches WHERE id = p_branch_id;

    IF v_branch_active IS NULL THEN
        v_branch_active := false;
    END IF;

    -- If checking year as well
    IF p_year_number IS NOT NULL THEN
        SELECT by.is_active INTO v_year_active
        FROM branch_years by
        WHERE by.branch_id = p_branch_id AND by.year_number = p_year_number;

        IF v_year_active IS NULL THEN
            v_year_active := false;
        END IF;
    ELSE
        v_year_active := true; -- Not checking year
    END IF;

    -- If checking semester as well
    IF p_semester_number IS NOT NULL AND p_year_number IS NOT NULL THEN
        SELECT bs.is_active INTO v_semester_active
        FROM branch_semesters bs
        JOIN branch_years by ON bs.branch_year_id = by.id
        WHERE by.branch_id = p_branch_id
        AND by.year_number = p_year_number
        AND bs.semester_number = p_semester_number;

        IF v_semester_active IS NULL THEN
            v_semester_active := false;
        END IF;
    ELSE
        v_semester_active := true; -- Not checking semester
    END IF;

    -- Determine message
    IF NOT v_branch_active THEN
        v_message := 'This branch is currently not accepting new registrations';
    ELSIF p_year_number IS NOT NULL AND NOT v_year_active THEN
        v_message := 'This year is currently not available for registration';
    ELSIF p_semester_number IS NOT NULL AND NOT v_semester_active THEN
        v_message := 'This semester is currently not available for registration';
    ELSIF v_branch_active AND v_year_active AND v_semester_active THEN
        v_message := 'Available for registration';
    ELSE
        v_message := 'Please check with administration';
    END IF;

    RETURN QUERY
    SELECT
        (v_branch_active AND v_year_active AND v_semester_active) as can_select,
        v_branch_active as branch_active,
        v_year_active as year_active,
        v_semester_active as semester_active,
        v_message as status_message;
END;
$$;

-- ============================================
-- 4. CREATE BACKWARD COMPATIBILITY FUNCTIONS
-- ============================================

-- Simple function for backward compatibility (only active items)
CREATE FUNCTION get_active_branches_for_mobile()
RETURNS TABLE (
    id UUID,
    code TEXT,
    name TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.code::TEXT, b.name::TEXT, b.full_name::TEXT
    FROM branches b
    WHERE b.is_active = true
    ORDER BY COALESCE(b.display_order, 999), b.name;
END;
$$;

CREATE FUNCTION get_active_years_for_branch(p_branch_id UUID)
RETURNS TABLE (
    year_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT by.year_number
    FROM branch_years by
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    AND by.is_active = true
    AND b.is_active = true
    ORDER BY by.year_number;
END;
$$;

CREATE FUNCTION get_active_semesters_for_branch_year(
    p_branch_id UUID,
    p_year_number INTEGER
)
RETURNS TABLE (
    semester_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT bs.semester_number
    FROM branch_semesters bs
    JOIN branch_years by ON bs.branch_year_id = by.id
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    AND by.year_number = p_year_number
    AND bs.is_active = true
    AND by.is_active = true
    AND b.is_active = true
    ORDER BY bs.semester_number;
END;
$$;

-- Registration validation function
CREATE FUNCTION can_register_for_combination(
    p_branch_id UUID,
    p_year_number INTEGER,
    p_semester_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO result_count
    FROM branches b
    JOIN branch_years by ON b.id = by.branch_id
    JOIN branch_semesters bs ON by.id = bs.branch_year_id
    WHERE b.id = p_branch_id
    AND by.year_number = p_year_number
    AND bs.semester_number = p_semester_number
    AND b.is_active = true
    AND by.is_active = true
    AND bs.is_active = true;

    RETURN result_count > 0;
END;
$$;

-- ============================================
-- 5. GRANT PERMISSIONS TO ALL FUNCTIONS
-- ============================================

-- Grant permissions to authenticated users and anonymous (for public access)
GRANT EXECUTE ON FUNCTION get_all_branches_with_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_years_with_status(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_semesters_with_status(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_select_combination(UUID, INTEGER, INTEGER) TO authenticated, anon;

-- Backward compatibility functions
GRANT EXECUTE ON FUNCTION get_active_branches_for_mobile() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_years_for_branch(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_semesters_for_branch_year(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_register_for_combination(UUID, INTEGER, INTEGER) TO authenticated, anon;

-- ============================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON FUNCTION get_all_branches_with_status() IS 'Returns ALL branches with active status for enhanced UX - shows disabled options with reasons';
COMMENT ON FUNCTION get_all_years_with_status(UUID) IS 'Returns ALL years for a branch with active status - shows disabled options with reasons';
COMMENT ON FUNCTION get_all_semesters_with_status(UUID, INTEGER) IS 'Returns ALL semesters with active status - shows disabled options with reasons';
COMMENT ON FUNCTION can_select_combination(UUID, INTEGER, INTEGER) IS 'Validates if a combination can be selected and provides user-friendly reason';

COMMIT;

-- ============================================
-- 7. VERIFICATION TESTS
-- ============================================

-- Test 1: Enhanced functions
SELECT 'Testing enhanced functions...' as test_status;

SELECT 'All branches with status:' as test_name, COUNT(*) as count
FROM get_all_branches_with_status();

SELECT 'Years with status for first branch:' as test_name, COUNT(*) as count
FROM get_all_years_with_status((SELECT id FROM branches LIMIT 1));

SELECT 'Semesters with status:' as test_name, COUNT(*) as count
FROM get_all_semesters_with_status(
    (SELECT id FROM branches LIMIT 1),
    1
);

-- Test 2: Backward compatibility functions
SELECT 'Active branches only:' as test_name, COUNT(*) as count
FROM get_active_branches_for_mobile();

SELECT 'Active years only:' as test_name, COUNT(*) as count
FROM get_active_years_for_branch((SELECT id FROM branches WHERE is_active = true LIMIT 1));

-- Test 3: Validation functions
SELECT 'Registration validation:' as test_name, can_register_for_combination(
    (SELECT id FROM branches WHERE is_active = true LIMIT 1),
    1,
    1
) as can_register;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '=================================================' as message
UNION ALL
SELECT '✅ ENHANCED FUNCTIONS CREATED SUCCESSFULLY!' as message
UNION ALL
SELECT '=================================================' as message
UNION ALL
SELECT '✅ Enhanced UX: Shows disabled options with reasons' as message
UNION ALL
SELECT '✅ Backward compatibility: Old functions still work' as message
UNION ALL
SELECT '✅ Events table fixed with expires_at column' as message
UNION ALL
SELECT '✅ All permissions granted properly' as message
UNION ALL
SELECT '=================================================' as message
UNION ALL
SELECT 'NEXT STEPS:' as message
UNION ALL
SELECT '1. Restart mobile app: npx expo start -c' as message
UNION ALL
SELECT '2. Test registration flow with disabled options' as message
UNION ALL
SELECT '3. Test admin dashboard toggles' as message
UNION ALL
SELECT '4. Verify profile editing shows disabled state' as message
UNION ALL
SELECT '=================================================' as message;

-- ============================================
-- AVAILABLE FUNCTIONS FOR MOBILE APP:
-- ============================================

/*
NEW ENHANCED FUNCTIONS (for better UX):
=====================================

1. get_all_branches_with_status()
   - Returns ALL branches with is_active and status_reason
   - Mobile app can show disabled branches as grayed out with explanation

2. get_all_years_with_status(branch_id)
   - Returns ALL years with can_select boolean and status_reason
   - Mobile app can show disabled years with explanation

3. get_all_semesters_with_status(branch_id, year_number)
   - Returns ALL semesters with can_select boolean and status_reason
   - Mobile app can show disabled semesters with explanation

4. can_select_combination(branch_id, year_number, semester_number)
   - Returns detailed validation with user-friendly status_message
   - Use for final validation before allowing selection

BACKWARD COMPATIBILITY FUNCTIONS:
================================

- get_active_branches_for_mobile() - returns only active branches
- get_active_years_for_branch() - returns only active years
- get_active_semesters_for_branch_year() - returns only active semesters
- can_register_for_combination() - boolean validation

MOBILE APP USAGE:
================

For better UX, use the enhanced functions:
- Show ALL options to users
- Make inactive options unclickable/grayed out
- Display status_reason when user taps disabled option
- Provide clear feedback about why option is unavailable

ADMIN BENEFITS:
==============

- Immediate visual feedback when toggling options
- Users understand why options are unavailable
- Reduces confusion and support tickets
- Better communication between admin actions and user experience
*/
