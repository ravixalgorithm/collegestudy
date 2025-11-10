-- ============================================
-- PRE-MIGRATION DIAGNOSTIC SCRIPT
-- ============================================
-- Run this script BEFORE the migration to understand your current data
-- This will help identify any potential issues

-- ============================================
-- CHECK 1: CURRENT NOTES TABLE STRUCTURE
-- ============================================
SELECT
    'Current notes table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;

-- ============================================
-- CHECK 2: EXISTING DATA SUMMARY
-- ============================================
SELECT
    'Data Summary' as category,
    COUNT(*) as total_notes,
    SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verified_notes,
    SUM(CASE WHEN is_verified = FALSE THEN 1 ELSE 0 END) as unverified_notes
FROM notes;

-- ============================================
-- CHECK 3: NOTES BY SUBJECT AND BRANCH
-- ============================================
SELECT
    b.name as branch_name,
    s.semester,
    s.name as subject_name,
    COUNT(n.id) as note_count
FROM branches b
LEFT JOIN subjects s ON b.id = s.branch_id
LEFT JOIN notes n ON s.id = n.subject_id
GROUP BY b.name, s.semester, s.name, b.id, s.id
ORDER BY b.name, s.semester, s.name;

-- ============================================
-- CHECK 4: CHECK IF NEW COLUMNS ALREADY EXIST
-- ============================================
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notes' AND column_name = 'module_number'
        ) THEN 'module_number column EXISTS'
        ELSE 'module_number column MISSING'
    END as module_number_status,

    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notes' AND column_name = 'is_pyq'
        ) THEN 'is_pyq column EXISTS'
        ELSE 'is_pyq column MISSING'
    END as is_pyq_status,

    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notes' AND column_name = 'academic_year'
        ) THEN 'academic_year column EXISTS'
        ELSE 'academic_year column MISSING'
    END as academic_year_status,

    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notes' AND column_name = 'exam_type'
        ) THEN 'exam_type column EXISTS'
        ELSE 'exam_type column MISSING'
    END as exam_type_status;

-- ============================================
-- CHECK 5: SAMPLE NOTES DATA
-- ============================================
SELECT
    'Sample notes:' as info,
    n.id,
    n.title,
    s.name as subject_name,
    s.semester,
    b.name as branch_name,
    n.is_verified,
    n.created_at
FROM notes n
INNER JOIN subjects s ON n.subject_id = s.id
INNER JOIN branches b ON s.branch_id = b.id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- CHECK 6: POTENTIAL ISSUES DETECTION
-- ============================================

-- Check for notes without subjects
SELECT
    'Notes without subjects:' as issue_type,
    COUNT(*) as count
FROM notes
WHERE subject_id IS NULL;

-- Check for notes without file URLs
SELECT
    'Notes without file URLs:' as issue_type,
    COUNT(*) as count
FROM notes
WHERE file_url IS NULL OR file_url = '';

-- Check for notes with very long titles (might need truncation)
SELECT
    'Notes with very long titles:' as issue_type,
    COUNT(*) as count
FROM notes
WHERE LENGTH(title) > 100;

-- ============================================
-- CHECK 7: EXISTING CONSTRAINTS
-- ============================================
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'notes'
ORDER BY constraint_type;

-- ============================================
-- CHECK 8: EXISTING INDEXES
-- ============================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notes'
ORDER BY indexname;

-- ============================================
-- CHECK 9: NOTES THAT MIGHT BE PYQ (HEURISTIC)
-- ============================================
-- This helps identify which existing notes might be Previous Year Questions
SELECT
    'Potential PYQ notes (heuristic detection):' as info,
    id,
    title,
    description
FROM notes
WHERE
    title ILIKE '%question%'
    OR title ILIKE '%exam%'
    OR title ILIKE '%paper%'
    OR title ILIKE '%quiz%'
    OR title ILIKE '%test%'
    OR title ILIKE '%pyq%'
    OR description ILIKE '%question paper%'
    OR description ILIKE '%previous year%'
ORDER BY created_at DESC;

-- ============================================
-- CHECK 10: MIGRATION READINESS SUMMARY
-- ============================================
DO $$
DECLARE
    notes_count INTEGER;
    subjects_count INTEGER;
    branches_count INTEGER;
    has_module_col BOOLEAN;
    has_pyq_col BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO notes_count FROM notes;
    SELECT COUNT(*) INTO subjects_count FROM subjects;
    SELECT COUNT(*) INTO branches_count FROM branches;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'module_number'
    ) INTO has_module_col;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'is_pyq'
    ) INTO has_pyq_col;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION READINESS REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Status:';
    RAISE NOTICE '  Notes: % records', notes_count;
    RAISE NOTICE '  Subjects: % records', subjects_count;
    RAISE NOTICE '  Branches: % records', branches_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Status:';

    IF has_module_col AND has_pyq_col THEN
        RAISE NOTICE '  ❌ MIGRATION ALREADY APPLIED';
        RAISE NOTICE '  The new columns already exist in your database.';
    ELSE
        RAISE NOTICE '  ✅ READY FOR MIGRATION';
        RAISE NOTICE '  You can safely run the migration script.';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Recommendations:';

    IF notes_count = 0 THEN
        RAISE NOTICE '  • No existing notes - migration will be clean';
    ELSE
        RAISE NOTICE '  • % existing notes will be set to Module 1 by default', notes_count;
        RAISE NOTICE '  • Review and recategorize after migration';
    END IF;

    IF subjects_count = 0 THEN
        RAISE WARNING '  ⚠️  No subjects found - add subjects before notes';
    END IF;

    IF branches_count = 0 THEN
        RAISE WARNING '  ⚠️  No branches found - add branches before subjects';
    END IF;

    RAISE NOTICE '========================================';
END $$;
