-- ============================================
-- Migration: Update Exam Types Nomenclature
-- ============================================
-- This migration updates existing exam types from old naming convention
-- to new academic naming convention

BEGIN;

-- ============================================
-- 1. BACKUP EXISTING DATA
-- ============================================
CREATE TABLE IF NOT EXISTS exam_schedule_backup_007 AS
SELECT * FROM exam_schedule;

CREATE TABLE IF NOT EXISTS notes_backup_007 AS
SELECT id, exam_type FROM notes WHERE exam_type IS NOT NULL;

-- ============================================
-- 2. UPDATE EXAM SCHEDULE TABLE
-- ============================================
-- Update exam types to new nomenclature
UPDATE exam_schedule
SET exam_type = CASE
    WHEN exam_type = 'Mid-term' THEN 'Mid Sem 1'
    WHEN exam_type = 'End-term' THEN 'End Sem'
    WHEN exam_type = 'Quiz' THEN 'Mid Sem 2'
    WHEN exam_type = 'Assignment' THEN 'Practical'
    ELSE exam_type -- Keep any other values as-is
END
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

-- ============================================
-- 3. UPDATE NOTES TABLE (for PYQ exam types)
-- ============================================
UPDATE notes
SET exam_type = CASE
    WHEN exam_type = 'Mid-term' THEN 'Mid Sem 1'
    WHEN exam_type = 'End-term' THEN 'End Sem'
    WHEN exam_type = 'Quiz' THEN 'Mid Sem 2'
    WHEN exam_type = 'Assignment' THEN 'Practical'
    ELSE exam_type -- Keep any other values as-is
END
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

-- ============================================
-- 4. ADD CHECK CONSTRAINT (Optional)
-- ============================================
-- Add a check constraint to ensure only valid exam types are used
ALTER TABLE exam_schedule
DROP CONSTRAINT IF EXISTS check_valid_exam_type;

ALTER TABLE exam_schedule
ADD CONSTRAINT check_valid_exam_type
CHECK (exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical'));

-- ============================================
-- 5. UPDATE UPDATED_AT TIMESTAMP
-- ============================================
UPDATE exam_schedule
SET updated_at = NOW()
WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

UPDATE notes
SET updated_at = NOW()
WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================
DO $$
DECLARE
    exam_schedule_count INTEGER;
    notes_count INTEGER;
    old_exam_schedule_count INTEGER;
    old_notes_count INTEGER;
BEGIN
    -- Count updated records
    SELECT COUNT(*) INTO exam_schedule_count
    FROM exam_schedule
    WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

    SELECT COUNT(*) INTO notes_count
    FROM notes
    WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

    -- Count any remaining old types
    SELECT COUNT(*) INTO old_exam_schedule_count
    FROM exam_schedule
    WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

    SELECT COUNT(*) INTO old_notes_count
    FROM notes
    WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

    -- Output results
    RAISE NOTICE '';
    RAISE NOTICE '=== EXAM TYPES MIGRATION COMPLETED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'EXAM SCHEDULE TABLE:';
    RAISE NOTICE '  ✓ Records with new exam types: %', exam_schedule_count;
    RAISE NOTICE '  ✗ Records with old exam types: %', old_exam_schedule_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NOTES TABLE:';
    RAISE NOTICE '  ✓ Records with new exam types: %', notes_count;
    RAISE NOTICE '  ✗ Records with old exam types: %', old_notes_count;
    RAISE NOTICE '';

    IF old_exam_schedule_count = 0 AND old_notes_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: All exam types updated successfully!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some old exam types may still exist';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'NEW EXAM TYPES:';
    RAISE NOTICE '  • Mid Sem 1  (formerly Mid-term)';
    RAISE NOTICE '  • Mid Sem 2  (formerly Quiz)';
    RAISE NOTICE '  • End Sem    (formerly End-term)';
    RAISE NOTICE '  • Practical  (formerly Assignment)';
    RAISE NOTICE '';

    -- Show sample of updated data
    RAISE NOTICE 'SAMPLE UPDATED EXAM SCHEDULE:';
    FOR rec IN
        SELECT exam_type, COUNT(*) as count
        FROM exam_schedule
        GROUP BY exam_type
        ORDER BY exam_type
    LOOP
        RAISE NOTICE '  • %: % records', rec.exam_type, rec.count;
    END LOOP;

END $$;

-- ============================================
-- 7. CLEANUP INSTRUCTIONS
-- ============================================
-- Note: Backup tables can be dropped after verification:
-- DROP TABLE IF EXISTS exam_schedule_backup_007;
-- DROP TABLE IF EXISTS notes_backup_007;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- In case rollback is needed, uncomment and run:
/*
BEGIN;

UPDATE exam_schedule
SET exam_type = CASE
    WHEN exam_type = 'Mid Sem 1' THEN 'Mid-term'
    WHEN exam_type = 'End Sem' THEN 'End-term'
    WHEN exam_type = 'Mid Sem 2' THEN 'Quiz'
    WHEN exam_type = 'Practical' THEN 'Assignment'
    ELSE exam_type
END
WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

UPDATE notes
SET exam_type = CASE
    WHEN exam_type = 'Mid Sem 1' THEN 'Mid-term'
    WHEN exam_type = 'End Sem' THEN 'End-term'
    WHEN exam_type = 'Mid Sem 2' THEN 'Quiz'
    WHEN exam_type = 'Practical' THEN 'Assignment'
    ELSE exam_type
END
WHERE exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical');

ALTER TABLE exam_schedule DROP CONSTRAINT IF EXISTS check_valid_exam_type;

COMMIT;
*/
