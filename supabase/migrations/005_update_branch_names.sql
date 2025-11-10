-- ============================================
-- Migration: Update Branch Names to New 13 Branches
-- Version: 005
-- Date: 2024-12-07
-- Description: Updates branch names, codes, and descriptions to match new requirements
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- 1. BACKUP CURRENT BRANCHES (for rollback)
-- ============================================
CREATE TABLE IF NOT EXISTS branches_backup_005 AS
SELECT * FROM branches;

-- ============================================
-- 2. UPDATE EXISTING BRANCHES TO NEW NAMES
-- ============================================

-- Update ECE to ET (Electronics Engineering)
UPDATE branches
SET
    code = 'ET',
    name = 'Electronics',
    full_name = 'Electronics Engineering',
    description = 'Electronic circuits, devices, digital systems',
    updated_at = NOW()
WHERE code = 'ECE';

-- Update BT to BE (Biochemical Engineering)
UPDATE branches
SET
    code = 'BE',
    name = 'Biochemical',
    full_name = 'Biochemical Engineering',
    description = 'Bioprocessing, fermentation, biotechnology',
    updated_at = NOW()
WHERE code = 'BT';

-- Update LT to LFT (Leather & Fashion Technology)
UPDATE branches
SET
    code = 'LFT',
    name = 'Leather & Fashion',
    full_name = 'Leather & Fashion Technology',
    description = 'Tanning, leather processing, fashion design',
    updated_at = NOW()
WHERE code = 'LT';

-- ============================================
-- 3. DELETE BRANCHES THAT ARE BEING SPLIT/REMOVED
-- ============================================

-- Delete OPT (Oil & Paint Technology) - will be split into PT, PL, OT
DELETE FROM branches WHERE code = 'OPT';

-- Delete PE (Pharmaceutical Engineering) - not in new requirements
DELETE FROM branches WHERE code = 'PE';

-- Delete PIE (Production & Industrial Engineering) - not in new requirements
DELETE FROM branches WHERE code = 'PIE';

-- ============================================
-- 4. INSERT NEW BRANCHES
-- ============================================

-- Insert PT (Paint Technology)
INSERT INTO branches (code, name, full_name, description)
VALUES ('PT', 'Paint Tech', 'Paint Technology', 'Coatings, pigments, surface chemistry')
ON CONFLICT (code) DO NOTHING;

-- Insert PL (Plastic Technology)
INSERT INTO branches (code, name, full_name, description)
VALUES ('PL', 'Plastic Tech', 'Plastic Technology', 'Polymer processing, molding, material science')
ON CONFLICT (code) DO NOTHING;

-- Insert OT (Oil Technology)
INSERT INTO branches (code, name, full_name, description)
VALUES ('OT', 'Oil Tech', 'Oil Technology', 'Petroleum processing, refining, petrochemicals')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. VERIFY FINAL BRANCH COUNT AND STRUCTURE
-- ============================================

-- Check that we have exactly 13 branches
DO $$
DECLARE
    branch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO branch_count FROM branches;

    IF branch_count != 13 THEN
        RAISE EXCEPTION 'Expected 13 branches, found %', branch_count;
    END IF;

    RAISE NOTICE 'SUCCESS: Found exactly 13 branches after migration';
END;
$$;

-- ============================================
-- 6. UPDATE ANY RELATED DATA (if needed)
-- ============================================

-- Note: Since we're changing branch codes, any existing data referencing
-- the old branch IDs will automatically follow due to UUID references.
-- However, if there are any hardcoded references to branch codes in
-- the application, those will need to be updated separately.

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Display final branch structure
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'FINAL BRANCH STRUCTURE:';
    RAISE NOTICE '===========================================';

    FOR rec IN
        SELECT code, name, full_name
        FROM branches
        ORDER BY code
    LOOP
        RAISE NOTICE '% - % (%)', rec.code, rec.name, rec.full_name;
    END LOOP;

    RAISE NOTICE '===========================================';
END;
$$;

-- Commit the transaction
COMMIT;

-- ============================================
-- 8. POST-MIGRATION NOTES
-- ============================================

/*
MIGRATION SUMMARY:
================

UPDATED BRANCHES:
- ECE → ET (Electronics Engineering)
- BT → BE (Biochemical Engineering)
- LT → LFT (Leather & Fashion Technology)

REMOVED BRANCHES:
- OPT (Oil & Paint Technology) - split into PT, PL, OT
- PE (Pharmaceutical Engineering)
- PIE (Production & Industrial Engineering)

NEW BRANCHES:
- PT (Paint Technology)
- PL (Plastic Technology)
- OT (Oil Technology)

UNCHANGED BRANCHES:
- CSE (Computer Science & Engineering)
- IT (Information Technology)
- EE (Electrical Engineering)
- ME (Mechanical Engineering)
- CE (Civil Engineering)
- CHE (Chemical Engineering)
- FT (Food Technology)

FINAL COUNT: 13 branches

NEXT STEPS:
1. Update any hardcoded branch references in the application
2. Update admin dashboard UI to reflect new branch names
3. Update mobile app if it has hardcoded branch references
4. Test all functionality with new branch structure
5. Update documentation and README files

ROLLBACK INSTRUCTIONS (if needed):
If you need to rollback this migration, run:
1. TRUNCATE branches;
2. INSERT INTO branches SELECT * FROM branches_backup_005;
3. DROP TABLE branches_backup_005;
*/
