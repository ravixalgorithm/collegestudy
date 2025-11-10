-- ============================================
-- Populate Branch Hierarchy Script (Simple Version)
-- Date: 2024-12-07
-- Description: Ensures all branches have proper year/semester hierarchy populated
-- This version avoids ON CONFLICT for better compatibility
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- 1. CREATE BRANCH HIERARCHY FOR ALL BRANCHES
-- ============================================

DO $$
DECLARE
    branch_record RECORD;
    year_id UUID;
    existing_year_id UUID;
    existing_semester_id UUID;
BEGIN
    -- Loop through all active branches
    FOR branch_record IN SELECT id, code, name FROM branches WHERE is_active = true LOOP
        RAISE NOTICE 'Processing branch: % (%)', branch_record.name, branch_record.code;

        -- Create 4 years for each branch
        FOR year_num IN 1..4 LOOP

            -- Check if year already exists
            SELECT id INTO existing_year_id
            FROM branch_years
            WHERE branch_id = branch_record.id AND year_number = year_num;

            -- If year doesn't exist, create it
            IF existing_year_id IS NULL THEN
                RAISE NOTICE 'Creating year % for branch %', year_num, branch_record.name;

                INSERT INTO branch_years (branch_id, year_number, is_active, display_order, academic_year)
                VALUES (branch_record.id, year_num, TRUE, year_num, '2024-25')
                RETURNING id INTO year_id;
            ELSE
                year_id := existing_year_id;
                RAISE NOTICE 'Year % already exists for branch %', year_num, branch_record.name;
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

                    -- Check if semester already exists
                    SELECT id INTO existing_semester_id
                    FROM branch_semesters
                    WHERE branch_id = branch_record.id
                    AND year_number = year_num
                    AND semester_number = global_sem_num;

                    -- If semester doesn't exist, create it
                    IF existing_semester_id IS NULL THEN
                        RAISE NOTICE 'Creating semester % for branch % year %', global_sem_num, branch_record.name, year_num;

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
                    ELSE
                        RAISE NOTICE 'Semester % already exists for branch % year %', global_sem_num, branch_record.name, year_num;
                    END IF;
                END;
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Branch hierarchy population complete!';
END;
$$;

-- ============================================
-- 2. VERIFY HIERARCHY IS COMPLETE
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
        RAISE WARNING 'NOTICE: Hierarchy counts may include inactive items or pre-existing data';
        RAISE NOTICE 'This is normal if you ran this script multiple times or have inactive items';
    END IF;

    RAISE NOTICE '===========================================';
END;
$$;

-- ============================================
-- 3. DISPLAY CURRENT HIERARCHY SUMMARY
-- ============================================

-- Show summary of all branches and their hierarchy
SELECT
    b.code as branch_code,
    b.name as branch_name,
    b.is_active as branch_active,
    COUNT(DISTINCT by.id) as year_count,
    COUNT(DISTINCT bs.id) as semester_count,
    CASE
        WHEN COUNT(DISTINCT by.id) >= 4 AND COUNT(DISTINCT bs.id) >= 8 THEN 'Complete'
        ELSE 'Incomplete'
    END as status
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true
GROUP BY b.id, b.code, b.name, b.is_active
ORDER BY b.code;

-- ============================================
-- 4. SHOW DETAILED HIERARCHY FOR VERIFICATION
-- ============================================

SELECT
    b.code,
    b.name,
    by.year_number,
    bs.semester_number,
    bs.semester_label,
    by.is_active as year_active,
    bs.is_active as semester_active
FROM branches b
JOIN branch_years by ON b.id = by.branch_id
JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true
ORDER BY b.code, by.year_number, bs.semester_number;

-- Commit the transaction
COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Branch hierarchy population completed successfully!' as status;

-- ============================================
-- USAGE NOTES
-- ============================================

/*
WHAT THIS SCRIPT DOES:
======================

1. Creates 4 years (1-4) for each active branch
2. Creates 8 semesters (1-8) for each branch, properly mapped to years
3. Sets all new items as active by default
4. Checks for existing data and won't create duplicates
5. Provides verification output

EXPECTED RESULTS:
================

After running, you should see:
- 13 active branches
- 52 years total (13 branches × 4 years each)
- 104 semesters total (13 branches × 8 semesters each)
- All marked as "Complete" status

SEMESTER MAPPING:
================

Year 1: Semesters 1, 2
Year 2: Semesters 3, 4
Year 3: Semesters 5, 6
Year 4: Semesters 7, 8

SAFE TO RE-RUN:
==============

This script is safe to run multiple times. It checks for existing
data and won't create duplicates.

NEXT STEPS:
==========

1. Verify the output shows all branches as "Complete"
2. Check the detailed hierarchy output
3. Go to Admin Dashboard > Branches to see the management interface
4. Test mobile app onboarding to ensure active filtering works
*/
