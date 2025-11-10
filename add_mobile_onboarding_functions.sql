-- ============================================
-- Mobile App Onboarding Functions
-- Date: 2024-12-07
-- Description: Additional functions for mobile app onboarding to filter active branches, years, and semesters
-- ============================================

-- Function to get active semesters for a specific branch and year combination
CREATE OR REPLACE FUNCTION get_active_semesters_for_branch_year(
    p_branch_id UUID,
    p_year_number INTEGER
)
RETURNS TABLE (
    id UUID,
    semester_number INTEGER,
    semester_label VARCHAR,
    is_current BOOLEAN
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
        bs.is_current
    FROM branch_semesters bs
    JOIN branch_years by ON bs.branch_year_id = by.id
    WHERE by.branch_id = p_branch_id
    AND by.year_number = p_year_number
    AND by.is_active = true
    AND bs.is_active = true
    ORDER BY bs.semester_number;
END;
$$;

-- Function to validate if a specific semester is active for a branch and year
CREATE OR REPLACE FUNCTION get_active_semester_for_branch(
    p_branch_id UUID,
    p_year_number INTEGER,
    p_semester_number INTEGER
)
RETURNS TABLE (
    id UUID,
    semester_number INTEGER,
    semester_label VARCHAR,
    is_active BOOLEAN,
    is_current BOOLEAN
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
        bs.is_current
    FROM branch_semesters bs
    JOIN branch_years by ON bs.branch_year_id = by.id
    WHERE by.branch_id = p_branch_id
    AND by.year_number = p_year_number
    AND bs.semester_number = p_semester_number
    AND by.is_active = true
    AND bs.is_active = true
    LIMIT 1;
END;
$$;

-- Function to get all active branches with their display order (for mobile app)
CREATE OR REPLACE FUNCTION get_active_branches_for_mobile()
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    full_name VARCHAR,
    description TEXT,
    display_order INTEGER
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
        COALESCE(b.display_order, 999) as display_order
    FROM branches b
    WHERE b.is_active = true
    ORDER BY COALESCE(b.display_order, 999), b.name;
END;
$$;

-- Function to get complete active registration hierarchy for a branch
CREATE OR REPLACE FUNCTION get_active_registration_hierarchy(p_branch_id UUID)
RETURNS TABLE (
    branch_id UUID,
    branch_code VARCHAR,
    branch_name VARCHAR,
    year_id UUID,
    year_number INTEGER,
    year_label VARCHAR,
    semester_id UUID,
    semester_number INTEGER,
    semester_label VARCHAR,
    is_current_semester BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id as branch_id,
        b.code as branch_code,
        b.name as branch_name,
        by.id as year_id,
        by.year_number,
        CASE by.year_number
            WHEN 1 THEN 'First Year'
            WHEN 2 THEN 'Second Year'
            WHEN 3 THEN 'Third Year'
            WHEN 4 THEN 'Fourth Year'
        END as year_label,
        bs.id as semester_id,
        bs.semester_number,
        bs.semester_label,
        bs.is_current as is_current_semester
    FROM branches b
    JOIN branch_years by ON b.id = by.branch_id
    JOIN branch_semesters bs ON by.id = bs.branch_year_id
    WHERE b.id = p_branch_id
    AND b.is_active = true
    AND by.is_active = true
    AND bs.is_active = true
    ORDER BY by.year_number, bs.semester_number;
END;
$$;

-- Function to check if a user can register for a specific branch/year/semester combination
CREATE OR REPLACE FUNCTION can_register_for_combination(
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
    -- Check if the combination exists and is active
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

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_active_semesters_for_branch_year(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_semester_for_branch(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_branches_for_mobile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_registration_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_register_for_combination(UUID, INTEGER, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_active_semesters_for_branch_year IS 'Gets all active semesters for a specific branch and year combination - used in mobile app onboarding';
COMMENT ON FUNCTION get_active_semester_for_branch IS 'Validates if a specific semester is active for a branch/year combination - used in mobile app onboarding validation';
COMMENT ON FUNCTION get_active_branches_for_mobile IS 'Gets all active branches ordered by display_order - optimized for mobile app branch picker';
COMMENT ON FUNCTION get_active_registration_hierarchy IS 'Gets complete active hierarchy for a branch - useful for debugging and admin views';
COMMENT ON FUNCTION can_register_for_combination IS 'Boolean check if user can register for a specific branch/year/semester combination';

-- Test queries (commented out - uncomment to test)
/*
-- Test active branches
SELECT * FROM get_active_branches_for_mobile();

-- Test active years for CSE branch
SELECT * FROM get_active_years_for_branch((SELECT id FROM branches WHERE code = 'CSE' LIMIT 1));

-- Test active semesters for CSE Year 1
SELECT * FROM get_active_semesters_for_branch_year(
    (SELECT id FROM branches WHERE code = 'CSE' LIMIT 1),
    1
);

-- Test semester validation for CSE Year 1 Semester 1
SELECT * FROM get_active_semester_for_branch(
    (SELECT id FROM branches WHERE code = 'CSE' LIMIT 1),
    1,
    1
);

-- Test registration validation
SELECT can_register_for_combination(
    (SELECT id FROM branches WHERE code = 'CSE' LIMIT 1),
    1,
    1
);

-- Test complete hierarchy for CSE
SELECT * FROM get_active_registration_hierarchy(
    (SELECT id FROM branches WHERE code = 'CSE' LIMIT 1)
);
*/
