-- ============================================
-- Enhanced Mobile Functions for Better UX
-- Date: 2024-12-07
-- Description: Functions that return ALL options with active status so mobile app can show disabled state
-- ============================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_all_branches_with_status() CASCADE;
DROP FUNCTION IF EXISTS get_all_years_with_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_all_semesters_with_status(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_branch_status(UUID) CASCADE;

-- ============================================
-- Function 1: Get ALL branches with their active status
-- ============================================
CREATE OR REPLACE FUNCTION get_all_branches_with_status()
RETURNS TABLE (
    id UUID,
    code VARCHAR(10),
    name VARCHAR(100),
    full_name VARCHAR(255),
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
        b.code,
        b.name,
        b.full_name,
        b.description,
        b.is_active,
        COALESCE(b.display_order, 999) as display_order,
        CASE
            WHEN b.is_active = true THEN 'Available'
            ELSE 'Currently unavailable'
        END as status_reason
    FROM branches b
    ORDER BY COALESCE(b.display_order, 999), b.name;
END;
$$;

-- ============================================
-- Function 2: Get ALL years for a branch with their active status
-- ============================================
CREATE OR REPLACE FUNCTION get_all_years_with_status(p_branch_id UUID)
RETURNS TABLE (
    id UUID,
    year_number INTEGER,
    academic_year VARCHAR(20),
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
        by.academic_year,
        CASE by.year_number
            WHEN 1 THEN 'First Year'
            WHEN 2 THEN 'Second Year'
            WHEN 3 THEN 'Third Year'
            WHEN 4 THEN 'Fourth Year'
            ELSE 'Year ' || by.year_number::TEXT
        END || COALESCE(' (' || by.academic_year || ')', '') as display_label,
        by.is_active,
        b.is_active as branch_active,
        (by.is_active AND b.is_active) as can_select,
        CASE
            WHEN NOT b.is_active THEN 'Branch is currently unavailable'
            WHEN NOT by.is_active THEN 'Year is currently unavailable'
            ELSE 'Available for registration'
        END as status_reason
    FROM branch_years by
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    ORDER BY by.year_number;
END;
$$;

-- ============================================
-- Function 3: Get ALL semesters for a branch/year with their active status
-- ============================================
CREATE OR REPLACE FUNCTION get_all_semesters_with_status(
    p_branch_id UUID,
    p_year_number INTEGER
)
RETURNS TABLE (
    id UUID,
    semester_number INTEGER,
    semester_label VARCHAR(50),
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
        bs.semester_label,
        bs.is_active,
        by.is_active as year_active,
        b.is_active as branch_active,
        (bs.is_active AND by.is_active AND b.is_active) as can_select,
        bs.is_current,
        CASE
            WHEN NOT b.is_active THEN 'Branch is currently unavailable'
            WHEN NOT by.is_active THEN 'Year is currently unavailable'
            WHEN NOT bs.is_active THEN 'Semester is currently unavailable'
            ELSE 'Available for registration'
        END as status_reason
    FROM branch_semesters bs
    JOIN branch_years by ON bs.branch_year_id = by.id
    JOIN branches b ON by.branch_id = b.id
    WHERE by.branch_id = p_branch_id
    AND by.year_number = p_year_number
    ORDER BY bs.semester_number;
END;
$$;

-- ============================================
-- Function 4: Check if combination can be selected
-- ============================================
CREATE OR REPLACE FUNCTION can_select_combination(
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
-- Function 5: Get only active options (for backward compatibility)
-- ============================================
CREATE OR REPLACE FUNCTION get_active_branches_for_mobile()
RETURNS TABLE (
    id UUID,
    code VARCHAR(10),
    name VARCHAR(100),
    full_name VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.code, b.name, b.full_name
    FROM branches b
    WHERE b.is_active = true
    ORDER BY COALESCE(b.display_order, 999), b.name;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_years_for_branch(p_branch_id UUID)
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

CREATE OR REPLACE FUNCTION get_active_semesters_for_branch_year(
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

-- ============================================
-- Grant permissions to all functions
-- ============================================
GRANT EXECUTE ON FUNCTION get_all_branches_with_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_years_with_status(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_semesters_with_status(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_select_combination(UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_branches_for_mobile() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_years_for_branch(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_semesters_for_branch_year(UUID, INTEGER) TO authenticated, anon;

-- ============================================
-- Add helpful comments
-- ============================================
COMMENT ON FUNCTION get_all_branches_with_status() IS 'Returns ALL branches with active status for better UX - shows disabled options';
COMMENT ON FUNCTION get_all_years_with_status(UUID) IS 'Returns ALL years for a branch with active status - shows disabled options';
COMMENT ON FUNCTION get_all_semesters_with_status(UUID, INTEGER) IS 'Returns ALL semesters with active status - shows disabled options';
COMMENT ON FUNCTION can_select_combination(UUID, INTEGER, INTEGER) IS 'Validates if a combination can be selected and provides user-friendly reason';

-- ============================================
-- Test the functions
-- ============================================

-- Test 1: All branches with status
SELECT 'Testing get_all_branches_with_status()...' as test;
SELECT code, name, is_active, status_reason FROM get_all_branches_with_status() LIMIT 5;

-- Test 2: All years with status for first branch
SELECT 'Testing get_all_years_with_status()...' as test;
SELECT year_number, display_label, can_select, status_reason
FROM get_all_years_with_status((SELECT id FROM branches LIMIT 1))
LIMIT 5;

-- Test 3: Combination check
SELECT 'Testing can_select_combination()...' as test;
SELECT can_select, status_message
FROM can_select_combination(
    (SELECT id FROM branches LIMIT 1),
    1,
    1
);

SELECT '✅ Enhanced functions created successfully!' as status;
SELECT '🎯 Mobile app can now show disabled options with clear status messages' as status;
SELECT '🚀 Run: npx expo start -c to test in mobile app' as status;

-- ============================================
-- Usage Examples for Mobile App Development
-- ============================================

/*
MOBILE APP USAGE EXAMPLES:
==========================

1. GET ALL BRANCHES WITH STATUS:
   const { data: branches } = await supabase.rpc('get_all_branches_with_status');
   // Shows all branches, disabled ones are grayed out with status_reason

2. GET ALL YEARS WITH STATUS:
   const { data: years } = await supabase.rpc('get_all_years_with_status', {
     p_branch_id: selectedBranchId
   });
   // Shows all years, can_select determines if clickable

3. GET ALL SEMESTERS WITH STATUS:
   const { data: semesters } = await supabase.rpc('get_all_semesters_with_status', {
     p_branch_id: selectedBranchId,
     p_year_number: selectedYear
   });
   // Shows all semesters with their status

4. VALIDATE SELECTION:
   const { data: validation } = await supabase.rpc('can_select_combination', {
     p_branch_id: branchId,
     p_year_number: year,
     p_semester_number: semester
   });
   // Returns can_select boolean and user-friendly status_message

MOBILE APP UI GUIDELINES:
========================

- Active options: Normal appearance, clickable
- Inactive options: Grayed out, show status_reason on tap
- Provide tooltip/info icon showing why option is disabled
- Use consistent disabled styling across all pickers
- Show clear error messages when trying to select disabled options

ADMIN BENEFITS:
==============

- Admins can see immediate impact of their changes
- Students see what's available vs temporarily unavailable
- Clear communication about why options are disabled
- Reduces confusion and support tickets
- Better user experience overall
*/
