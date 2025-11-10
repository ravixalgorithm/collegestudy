-- ============================================
-- URGENT: Update Exam Types to Correct Academic Nomenclature
-- ============================================
-- Run this script in Supabase SQL Editor to update exam types immediately
-- From: Mid-term, End-term, Quiz, Assignment
-- To: Mid Sem 1, Mid Sem 2, End Sem, Practical

BEGIN;

-- Show current exam types before update
SELECT 'BEFORE UPDATE - EXAM SCHEDULE' as info, exam_type, COUNT(*) as count
FROM exam_schedule
GROUP BY exam_type
ORDER BY exam_type;

SELECT 'BEFORE UPDATE - NOTES (PYQ)' as info, exam_type, COUNT(*) as count
FROM notes
WHERE exam_type IS NOT NULL
GROUP BY exam_type
ORDER BY exam_type;

-- ============================================
-- UPDATE EXAM SCHEDULE TABLE
-- ============================================
UPDATE exam_schedule
SET
    exam_type = CASE
        WHEN exam_type = 'Mid-term' THEN 'Mid Sem 1'
        WHEN exam_type = 'End-term' THEN 'End Sem'
        WHEN exam_type = 'Quiz' THEN 'Mid Sem 2'
        WHEN exam_type = 'Assignment' THEN 'Practical'
        ELSE exam_type
    END,
    updated_at = NOW()
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

-- ============================================
-- UPDATE NOTES TABLE (for PYQ exam types)
-- ============================================
UPDATE notes
SET
    exam_type = CASE
        WHEN exam_type = 'Mid-term' THEN 'Mid Sem 1'
        WHEN exam_type = 'End-term' THEN 'End Sem'
        WHEN exam_type = 'Quiz' THEN 'Mid Sem 2'
        WHEN exam_type = 'Assignment' THEN 'Practical'
        ELSE exam_type
    END,
    updated_at = NOW()
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment');

-- ============================================
-- ADD VALIDATION CONSTRAINT
-- ============================================
ALTER TABLE exam_schedule
DROP CONSTRAINT IF EXISTS check_valid_exam_type;

ALTER TABLE exam_schedule
ADD CONSTRAINT check_valid_exam_type
CHECK (exam_type IN ('Mid Sem 1', 'Mid Sem 2', 'End Sem', 'Practical'));

-- ============================================
-- VERIFY CHANGES
-- ============================================
SELECT 'AFTER UPDATE - EXAM SCHEDULE' as info, exam_type, COUNT(*) as count
FROM exam_schedule
GROUP BY exam_type
ORDER BY exam_type;

SELECT 'AFTER UPDATE - NOTES (PYQ)' as info, exam_type, COUNT(*) as count
FROM notes
WHERE exam_type IS NOT NULL
GROUP BY exam_type
ORDER BY exam_type;

-- Check for any remaining old types
SELECT 'OLD TYPES REMAINING - EXAM SCHEDULE' as warning, exam_type, COUNT(*) as count
FROM exam_schedule
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment')
GROUP BY exam_type;

SELECT 'OLD TYPES REMAINING - NOTES' as warning, exam_type, COUNT(*) as count
FROM notes
WHERE exam_type IN ('Mid-term', 'End-term', 'Quiz', 'Assignment')
GROUP BY exam_type;

-- ============================================
-- SUCCESS CONFIRMATION
-- ============================================
SELECT
    'MIGRATION COMPLETE' as status,
    'Exam types updated to: Mid Sem 1, Mid Sem 2, End Sem, Practical' as message;

COMMIT;

-- ============================================
-- MAPPING REFERENCE:
-- ============================================
-- Old Type     → New Type
-- Mid-term     → Mid Sem 1
-- Quiz         → Mid Sem 2
-- End-term     → End Sem
-- Assignment   → Practical
-- ============================================
