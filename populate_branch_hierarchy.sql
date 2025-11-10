-- ============================================
-- Populate Branch Hierarchy Script
-- Date: 2024-12-07
-- Description: Ensures all branches have proper year/semester hierarchy populated
-- Run this after adding/updating branches
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- 1. CREATE OR UPDATE BRANCH HIERARCHY
-- ============================================

-- Function to ensure branch hierarchy exists
CREATE OR REPLACE FUNCTION ensure_branch_hierarchy()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    branch_record RECORD;
    year_id UUID;
    existing_year_count INTEGER;
    existing_semester_count INTEGER;
BEGIN
    -- Loop through all active branches
    FOR branch_record IN SELECT id, code, name FROM branches WHERE is_active = true LOOP
        RAISE NOTICE 'Processing branch: % (%)', branch_record.name, branch_record.code;

        -- Check if years exist for this branch
        SELECT COUNT(*) INTO existing_year_count
        FROM branch_years
        WHERE branch_id = branch_record.id;

        -- If no years exist, create them
        IF existing_year_count = 0 THEN
            RAISE NOTICE 'Creating years for branch: %', branch_record.name;

            -- Create 4 years for each branch
            FOR year_num IN 1..4 LOOP
                INSERT INTO branch_years (branch_id, year_number, is_active, display_order, academic_year)
                VALUES (branch_record.id, year_num, TRUE, year_num, '2024-25')
                ON CONFLICT (branch_id, year_number) DO NOTHING
                RETURNING id INTO year_id;

                -- Get year_id if it already existed
                IF year_id IS NULL THEN
                    SELECT id INTO year_id
                    FROM branch_years
                    WHERE branch_id = branch_record.id AND year_number = year_num;
                END IF;

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
                        ) ON CONFLICT (branch_id, year_number, semester_number) DO NOTHING;
                    END;
                END LOOP;
            END LOOP;
        ELSE
            -- Check if all years have semesters
            FOR year_num IN 1..4 LOOP
                SELECT id INTO year_id
                FROM branch_years
                WHERE branch_id = branch_record.id AND year_number = year_num;

                IF year_id IS NOT NULL THEN
                    SELECT COUNT(*) INTO existing_semester_count
                    FROM branch_semesters
                    WHERE branch_year_id = year_id;

                    -- If no semesters exist for this year, create them
                    IF existing_semester_count = 0 THEN
                        RAISE NOTICE 'Creating semesters for branch % year %', branch_record.name, year_num;

                        -- Create 2 semesters for this year
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
                                ) ON CONFLICT (branch_id, year_number, semester_number) DO NOTHING;
                            END;
                        END LOOP;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    RAISE NOTICE 'Branch hierarchy population complete!';
END;
$$;

-- ============================================
-- 2. EXECUTE THE HIERARCHY POPULATION
-- ============================================

SELECT ensure_branch_hierarchy();

-- ============================================
-- 3. VERIFY HIERARCHY IS COMPLETE
-- ============================================

-- Check that all active branches have years and semesters
DO $$
DECLARE
    branch_count INTEGER;
    year_count INTEGER;
    semester_count INTEGER;
    expected_years INTEGER;
    expected_semesters INTEGER;
BEGIN
    -- Count active branches
    SELECT COUNT(*) INTO branch_count FROM branches WHERE is_active = true;

    -- Count years for active branches
    SELECT COUNT(*) INTO year_count
    FROM branch_years by
    JOIN branches b ON by.branch_id = b.id
    WHERE b.is_active = true;

    -- Count semesters for active branches
    SELECT COUNT(*) INTO semester_count
    FROM branch_semesters bs
    JOIN branches b ON bs.branch_id = b.id
    WHERE b.is_active = true;

    expected_years := branch_count * 4;
    expected_semesters := branch_count * 8;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'HIERARCHY VERIFICATION:';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Active Branches: %', branch_count;
    RAISE NOTICE 'Years Created: % (Expected: %)', year_count, expected_years;
    RAISE NOTICE 'Semesters Created: % (Expected: %)', semester_count, expected_semesters;

    IF year_count = expected_years AND semester_count = expected_semesters THEN
        RAISE NOTICE 'SUCCESS: All branches have complete hierarchy!';
    ELSE
        RAISE WARNING 'WARNING: Some branches may be missing years or semesters!';
    END IF;

    RAISE NOTICE '===========================================';
END;
$$;

-- ============================================
-- 4. DISPLAY CURRENT HIERARCHY SUMMARY
-- ============================================

-- Show summary of all branches and their hierarchy
SELECT
    b.code as branch_code,
    b.name as branch_name,
    b.is_active as branch_active,
    COUNT(DISTINCT by.id) as year_count,
    COUNT(DISTINCT bs.id) as semester_count,
    CASE
        WHEN COUNT(DISTINCT by.id) = 4 AND COUNT(DISTINCT bs.id) = 8 THEN 'Complete'
        ELSE 'Incomplete'
    END as status
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true
GROUP BY b.id, b.code, b.name, b.is_active
ORDER BY b.code;

-- ============================================
-- 5. CLEANUP FUNCTION
-- ============================================

-- Drop the temporary function
DROP FUNCTION IF EXISTS ensure_branch_hierarchy();

-- Commit the transaction
COMMIT;

-- ============================================
-- USAGE NOTES
-- ============================================

/*
WHEN TO RUN THIS SCRIPT:
========================

1. After running the branch name update script (update_branch_names.sql)
2. When adding new branches to the system
3. When you notice missing years or semesters in the admin dashboard
4. As part of initial setup

WHAT THIS SCRIPT DOES:
=====================

1. Ensures every active branch has 4 years (1st, 2nd, 3rd, 4th year)
2. Ensures every year has 2 semesters (8 total per branch)
3. Sets all years and semesters as active by default
4. Creates proper semester labels and numbering
5. Handles conflicts gracefully (won't duplicate existing data)

VERIFICATION:
============

After running, you should see:
- Active Branches: 13
- Years Created: 52 (13 branches × 4 years)
- Semesters Created: 104 (13 branches × 8 semesters)

TROUBLESHOOTING:
===============

If you see "Incomplete" status for any branch:
1. Check if branch_years table has entries for that branch
2. Check if branch_semesters table has entries for each year
3. Re-run this script - it's safe to run multiple times
4. Check admin dashboard to manually activate/deactivate as needed

ADMIN DASHBOARD:
===============

After running this script, go to Admin Dashboard > Branches to:
1. Verify all branches appear with their years and semesters
2. Manually activate/deactivate specific years or semesters if needed
3. Set current semester flags for each branch
*/
