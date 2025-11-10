-- ============================================
-- Update Branch Names Script
-- Date: 2024-12-07
-- Description: Updates branch names to match new 13 branch requirements
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- 1. BACKUP CURRENT BRANCHES (for rollback)
-- ============================================
CREATE TABLE IF NOT EXISTS branches_backup AS
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
-- 3. DELETE BRANCHES THAT ARE BEING REPLACED
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
-- 5. VERIFY FINAL BRANCH COUNT
-- ============================================

-- Check that we have exactly 13 branches
SELECT
    COUNT(*) as total_branches,
    CASE
        WHEN COUNT(*) = 13 THEN 'SUCCESS: Exactly 13 branches found'
        ELSE 'ERROR: Expected 13 branches, found ' || COUNT(*)
    END as status
FROM branches;

-- ============================================
-- 6. DISPLAY FINAL BRANCH STRUCTURE
-- ============================================

SELECT
    code,
    name,
    full_name,
    description
FROM branches
ORDER BY
    CASE code
        WHEN 'CSE' THEN 1
        WHEN 'IT' THEN 2
        WHEN 'ET' THEN 3
        WHEN 'EE' THEN 4
        WHEN 'ME' THEN 5
        WHEN 'CE' THEN 6
        WHEN 'CHE' THEN 7
        WHEN 'PT' THEN 8
        WHEN 'PL' THEN 9
        WHEN 'OT' THEN 10
        WHEN 'LFT' THEN 11
        WHEN 'BE' THEN 12
        WHEN 'FT' THEN 13
        ELSE 99
    END;

-- Commit the transaction
COMMIT;

-- ============================================
-- MIGRATION SUMMARY
-- ============================================

/*
CHANGES MADE:
=============

UPDATED BRANCHES:
- ECE → ET (Electronics Engineering)
- BT → BE (Biochemical Engineering)
- LT → LFT (Leather & Fashion Technology)

REMOVED BRANCHES:
- OPT (Oil & Paint Technology) - replaced by PT, PL, OT
- PE (Pharmaceutical Engineering)
- PIE (Production & Industrial Engineering)

NEW BRANCHES ADDED:
- PT (Paint Technology)
- PL (Plastic Technology)
- OT (Oil Technology)

FINAL 13 BRANCHES:
1. CSE - Computer Science & Engineering
2. IT - Information Technology
3. ET - Electronics Engineering
4. EE - Electrical Engineering
5. ME - Mechanical Engineering
6. CE - Civil Engineering
7. CHE - Chemical Engineering
8. PT - Paint Technology
9. PL - Plastic Technology
10. OT - Oil Technology
11. LFT - Leather & Fashion Technology
12. BE - Biochemical Engineering
13. FT - Food Technology

ROLLBACK INSTRUCTIONS (if needed):
If you need to rollback these changes, run:
1. TRUNCATE branches;
2. INSERT INTO branches SELECT * FROM branches_backup;
3. DROP TABLE branches_backup;
*/
