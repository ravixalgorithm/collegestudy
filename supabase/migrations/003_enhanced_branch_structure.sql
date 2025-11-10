-- ============================================
-- Migration: Enhanced Branch Structure
-- Version: 003
-- Date: 2024-12-07
-- Description: Adds active/inactive states and proper year-semester hierarchy
-- ============================================

-- ============================================
-- 1. UPDATE BRANCHES TABLE STRUCTURE
-- ============================================

-- Add active/inactive status to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;

-- Update existing branches to be active by default
UPDATE branches SET is_active = TRUE WHERE is_active IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN branches.is_active IS 'Controls if branch is active for student registration';
COMMENT ON COLUMN branches.display_order IS 'Order in which branches appear in lists';

-- ============================================
-- 2. CREATE BRANCH_YEARS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS branch_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL CHECK (year_number >= 1 AND year_number <= 4),
    is_active BOOLEAN DEFAULT TRUE,
    academic_year VARCHAR(20), -- e.g., '2023-24'
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, year_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branch_years_branch_id ON branch_years(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_years_active ON branch_years(is_active);
CREATE INDEX IF NOT EXISTS idx_branch_years_composite ON branch_years(branch_id, year_number, is_active);

COMMENT ON TABLE branch_years IS 'Manages years within each branch with active/inactive status';
COMMENT ON COLUMN branch_years.year_number IS 'Year level: 1 (First Year) to 4 (Fourth Year)';
COMMENT ON COLUMN branch_years.is_active IS 'Controls if this year is active for student registration';
COMMENT ON COLUMN branch_years.academic_year IS 'Academic year label (e.g., 2023-24)';

-- ============================================
-- 3. CREATE BRANCH_SEMESTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS branch_semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_year_id UUID NOT NULL REFERENCES branch_years(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL CHECK (year_number >= 1 AND year_number <= 4),
    semester_number INTEGER NOT NULL CHECK (semester_number >= 1 AND semester_number <= 8),
    semester_label VARCHAR(50) NOT NULL, -- e.g., 'First Year - Semester 1'
    is_active BOOLEAN DEFAULT TRUE,
    starts_at DATE,
    ends_at DATE,
    is_current BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, year_number, semester_number),
    CONSTRAINT check_semester_year_mapping CHECK (
        (year_number = 1 AND semester_number IN (1, 2)) OR
        (year_number = 2 AND semester_number IN (3, 4)) OR
        (year_number = 3 AND semester_number IN (5, 6)) OR
        (year_number = 4 AND semester_number IN (7, 8))
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branch_semesters_branch_year ON branch_semesters(branch_year_id);
CREATE INDEX IF NOT EXISTS idx_branch_semesters_branch ON branch_semesters(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_semesters_active ON branch_semesters(is_active);
CREATE INDEX IF NOT EXISTS idx_branch_semesters_current ON branch_semesters(is_current);
CREATE INDEX IF NOT EXISTS idx_branch_semesters_composite ON branch_semesters(branch_id, year_number, semester_number, is_active);

COMMENT ON TABLE branch_semesters IS 'Manages semesters within years with active/inactive status';
COMMENT ON COLUMN branch_semesters.semester_number IS 'Semester number: 1-8 mapped to years 1-4';
COMMENT ON COLUMN branch_semesters.semester_label IS 'Human-readable semester label';
COMMENT ON COLUMN branch_semesters.is_active IS 'Controls if this semester is active for student registration';
COMMENT ON COLUMN branch_semesters.is_current IS 'Marks current active semester (only one per branch)';

-- ============================================
-- 4. POPULATE DEFAULT DATA
-- ============================================

-- Create default years for all existing branches
DO $$
DECLARE
    branch_record RECORD;
    year_id UUID;
BEGIN
    FOR branch_record IN SELECT id FROM branches LOOP
        -- Create 4 years for each branch
        FOR year_num IN 1..4 LOOP
            INSERT INTO branch_years (branch_id, year_number, is_active, display_order)
            VALUES (branch_record.id, year_num, TRUE, year_num)
            RETURNING id INTO year_id;

            -- Create 2 semesters for each year
            FOR sem_num IN 1..2 LOOP
                DECLARE
                    global_sem_num INTEGER;
                    sem_label VARCHAR(50);
                BEGIN
                    global_sem_num := (year_num - 1) * 2 + sem_num;
                    sem_label :=
                        CASE year_num
                            WHEN 1 THEN 'First Year - Semester ' || sem_num
                            WHEN 2 THEN 'Second Year - Semester ' || sem_num
                            WHEN 3 THEN 'Third Year - Semester ' || sem_num
                            WHEN 4 THEN 'Fourth Year - Semester ' || sem_num
                        END;

                    INSERT INTO branch_semesters (
                        branch_year_id,
                        branch_id,
                        year_number,
                        semester_number,
                        semester_label,
                        is_active,
                        display_order
                    ) VALUES (
                        year_id,
                        branch_record.id,
                        year_num,
                        global_sem_num,
                        sem_label,
                        TRUE,
                        global_sem_num
                    );
                END;
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Created default years and semesters for all branches';
END $$;

-- ============================================
-- 5. UPDATE USERS TABLE REFERENCES
-- ============================================

-- Add new columns for enhanced structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_year_id UUID REFERENCES branch_years(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_semester_id UUID REFERENCES branch_semesters(id);

-- Populate new references based on existing data
UPDATE users
SET
    branch_year_id = (
        SELECT by.id
        FROM branch_years by
        WHERE by.branch_id = users.branch_id
        AND by.year_number = users.year
        LIMIT 1
    ),
    branch_semester_id = (
        SELECT bs.id
        FROM branch_semesters bs
        WHERE bs.branch_id = users.branch_id
        AND bs.semester_number = users.semester
        LIMIT 1
    )
WHERE branch_id IS NOT NULL;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE branch_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_semesters ENABLE ROW LEVEL SECURITY;

-- Policies for branch_years
CREATE POLICY "Public can view active branch years" ON branch_years
    FOR SELECT
    USING (is_active = true OR auth.uid() IS NULL);

CREATE POLICY "Admins can manage branch years" ON branch_years
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Policies for branch_semesters
CREATE POLICY "Public can view active branch semesters" ON branch_semesters
    FOR SELECT
    USING (is_active = true OR auth.uid() IS NULL);

CREATE POLICY "Admins can manage branch semesters" ON branch_semesters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to get active branches for registration
CREATE OR REPLACE FUNCTION get_active_branches_for_registration()
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    full_name VARCHAR,
    description TEXT
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
        b.description
    FROM branches b
    WHERE b.is_active = true
    ORDER BY b.display_order, b.name;
END;
$$;

-- Function to get active years for a branch
CREATE OR REPLACE FUNCTION get_active_years_for_branch(p_branch_id UUID)
RETURNS TABLE (
    id UUID,
    year_number INTEGER,
    academic_year VARCHAR,
    display_label VARCHAR
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
        END || COALESCE(' (' || by.academic_year || ')', '') as display_label
    FROM branch_years by
    WHERE by.branch_id = p_branch_id
    AND by.is_active = true
    ORDER BY by.display_order, by.year_number;
END;
$$;

-- Function to get active semesters for a branch year
CREATE OR REPLACE FUNCTION get_active_semesters_for_year(p_branch_year_id UUID)
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
    WHERE bs.branch_year_id = p_branch_year_id
    AND bs.is_active = true
    ORDER BY bs.display_order, bs.semester_number;
END;
$$;

-- Function to get complete branch hierarchy
CREATE OR REPLACE FUNCTION get_branch_hierarchy()
RETURNS TABLE (
    branch_id UUID,
    branch_code VARCHAR,
    branch_name VARCHAR,
    branch_is_active BOOLEAN,
    year_id UUID,
    year_number INTEGER,
    year_is_active BOOLEAN,
    semester_id UUID,
    semester_number INTEGER,
    semester_label VARCHAR,
    semester_is_active BOOLEAN,
    semester_is_current BOOLEAN
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
        b.is_active as branch_is_active,
        by.id as year_id,
        by.year_number,
        by.is_active as year_is_active,
        bs.id as semester_id,
        bs.semester_number,
        bs.semester_label,
        bs.is_active as semester_is_active,
        bs.is_current as semester_is_current
    FROM branches b
    LEFT JOIN branch_years by ON b.id = by.branch_id
    LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
    ORDER BY
        b.display_order,
        b.code,
        by.year_number,
        bs.semester_number;
END;
$$;

-- Function to toggle branch/year/semester status
CREATE OR REPLACE FUNCTION toggle_branch_status(
    p_entity_type VARCHAR, -- 'branch', 'year', 'semester'
    p_entity_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can toggle branch status';
    END IF;

    CASE p_entity_type
        WHEN 'branch' THEN
            UPDATE branches
            SET is_active = p_is_active, updated_at = NOW()
            WHERE id = p_entity_id;

        WHEN 'year' THEN
            UPDATE branch_years
            SET is_active = p_is_active, updated_at = NOW()
            WHERE id = p_entity_id;

        WHEN 'semester' THEN
            UPDATE branch_semesters
            SET is_active = p_is_active, updated_at = NOW()
            WHERE id = p_entity_id;

        ELSE
            RAISE EXCEPTION 'Invalid entity type. Use: branch, year, or semester';
    END CASE;

    RETURN TRUE;
END;
$$;

-- ============================================
-- 8. VIEWS FOR EASIER QUERYING
-- ============================================

-- View: Complete branch structure with hierarchy
CREATE OR REPLACE VIEW branch_structure_view AS
SELECT
    b.id as branch_id,
    b.code as branch_code,
    b.name as branch_name,
    b.full_name as branch_full_name,
    b.is_active as branch_is_active,
    by.id as year_id,
    by.year_number,
    by.academic_year,
    by.is_active as year_is_active,
    bs.id as semester_id,
    bs.semester_number,
    bs.semester_label,
    bs.is_active as semester_is_active,
    bs.is_current as semester_is_current,
    bs.starts_at as semester_starts,
    bs.ends_at as semester_ends
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
ORDER BY
    b.display_order,
    b.code,
    by.year_number,
    bs.semester_number;

-- View: Active registration options only
CREATE OR REPLACE VIEW active_registration_options AS
SELECT
    b.id as branch_id,
    b.code as branch_code,
    b.name as branch_name,
    b.full_name as branch_full_name,
    by.id as year_id,
    by.year_number,
    by.academic_year,
    bs.id as semester_id,
    bs.semester_number,
    bs.semester_label
FROM branches b
INNER JOIN branch_years by ON b.id = by.branch_id
INNER JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true
AND by.is_active = true
AND bs.is_active = true
ORDER BY
    b.display_order,
    b.code,
    by.year_number,
    bs.semester_number;

-- ============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_branch_years_updated_at BEFORE UPDATE ON branch_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branch_semesters_updated_at BEFORE UPDATE ON branch_semesters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON branch_years TO authenticated;
GRANT SELECT ON branch_semesters TO authenticated;
GRANT SELECT ON branch_structure_view TO authenticated;
GRANT SELECT ON active_registration_options TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_active_branches_for_registration() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_years_for_branch(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_semesters_for_year(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_hierarchy() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_branch_status(VARCHAR, UUID, BOOLEAN) TO authenticated;

-- ============================================
-- 11. VALIDATION
-- ============================================

-- Check if all data was created correctly
DO $$
DECLARE
    branch_count INTEGER;
    year_count INTEGER;
    semester_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO branch_count FROM branches;
    SELECT COUNT(*) INTO year_count FROM branch_years;
    SELECT COUNT(*) INTO semester_count FROM branch_semesters;

    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  Branches: %', branch_count;
    RAISE NOTICE '  Years: %', year_count;
    RAISE NOTICE '  Semesters: %', semester_count;
    RAISE NOTICE '  Expected years: % (% branches × 4 years)', branch_count * 4, branch_count;
    RAISE NOTICE '  Expected semesters: % (% years × 2 semesters)', year_count * 2, year_count;

    IF year_count != branch_count * 4 THEN
        RAISE WARNING 'Year count mismatch. Expected %, got %', branch_count * 4, year_count;
    END IF;

    IF semester_count != year_count * 2 THEN
        RAISE WARNING 'Semester count mismatch. Expected %, got %', year_count * 2, semester_count;
    END IF;
END $$;

-- Sample queries for testing
-- SELECT * FROM get_active_branches_for_registration();
-- SELECT * FROM get_active_years_for_branch((SELECT id FROM branches WHERE code = 'CSE' LIMIT 1));
-- SELECT * FROM branch_structure_view WHERE branch_code = 'CSE';
-- SELECT * FROM active_registration_options LIMIT 10;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enhanced Branch Structure Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New Features:';
    RAISE NOTICE '1. Branches can be activated/deactivated';
    RAISE NOTICE '2. Years and semesters have individual active/inactive status';
    RAISE NOTICE '3. Proper hierarchy: Branch → Year → Semester';
    RAISE NOTICE '4. Year-semester mapping: Year 1→Sem 1,2 | Year 2→Sem 3,4 | etc.';
    RAISE NOTICE '5. Helper functions for registration and management';
    RAISE NOTICE '6. Views for easy querying';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update admin dashboard to use new hierarchy';
    RAISE NOTICE '2. Update registration forms to show only active options';
    RAISE NOTICE '3. Test activation/deactivation functionality';
    RAISE NOTICE '========================================';
END $$;
