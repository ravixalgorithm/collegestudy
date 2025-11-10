-- ============================================
-- Migration: Add Modules and PYQ Support to Notes
-- Version: 002
-- Date: 2024-12-07
-- Description: Restructure notes to support modules (1-5) and PYQ sections per subject
-- ============================================

-- ============================================
-- 1. ADD NEW COLUMNS TO NOTES TABLE
-- ============================================

-- Add module_number column (NULL for PYQ notes)
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS module_number INTEGER CHECK (module_number >= 1 AND module_number <= 5);

-- Add is_pyq flag to identify Previous Year Questions
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS is_pyq BOOLEAN DEFAULT FALSE;

-- Add academic_year for PYQ (e.g., '2023-24', '2022-23')
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

-- Add exam_type for PYQ (e.g., 'Mid-term', 'End-term', 'Quiz')
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50);

-- ============================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_module_number ON notes(module_number);
CREATE INDEX IF NOT EXISTS idx_notes_is_pyq ON notes(is_pyq);
CREATE INDEX IF NOT EXISTS idx_notes_subject_module ON notes(subject_id, module_number);
CREATE INDEX IF NOT EXISTS idx_notes_subject_pyq ON notes(subject_id, is_pyq);

-- ============================================
-- 3. ADD CONSTRAINT TO ENSURE PROPER CATEGORIZATION
-- ============================================

-- A note must either be a PYQ (is_pyq = true) OR have a module_number (1-5)
-- But not both or neither
ALTER TABLE notes
ADD CONSTRAINT check_note_category
CHECK (
    (is_pyq = TRUE AND module_number IS NULL) OR
    (is_pyq = FALSE AND module_number IS NOT NULL)
);

-- ============================================
-- 4. CREATE VIEW FOR ORGANIZED NOTES STRUCTURE
-- ============================================

CREATE OR REPLACE VIEW notes_organized AS
SELECT
    n.id,
    n.subject_id,
    n.title,
    n.description,
    n.file_url,
    n.file_type,
    n.tags,
    n.module_number,
    n.is_pyq,
    n.academic_year,
    n.exam_type,
    n.is_verified,
    n.download_count,
    n.created_at,
    n.updated_at,
    s.name as subject_name,
    s.code as subject_code,
    s.semester,
    s.branch_id,
    b.name as branch_name,
    b.code as branch_code,
    CASE
        WHEN n.is_pyq = TRUE THEN 'PYQ'
        ELSE CONCAT('Module ', n.module_number)
    END as category
FROM notes n
INNER JOIN subjects s ON n.subject_id = s.id
INNER JOIN branches b ON s.branch_id = b.id
WHERE n.is_verified = TRUE
ORDER BY
    s.semester,
    s.name,
    n.is_pyq DESC, -- PYQ first
    n.module_number ASC,
    n.created_at DESC;

-- ============================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get PYQ notes for a subject
CREATE OR REPLACE FUNCTION get_pyq_notes_for_subject(p_subject_id UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR,
    academic_year VARCHAR,
    exam_type VARCHAR,
    download_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.description,
        n.file_url,
        n.file_type,
        n.academic_year,
        n.exam_type,
        n.download_count,
        n.created_at
    FROM notes n
    WHERE n.subject_id = p_subject_id
    AND n.is_pyq = TRUE
    AND n.is_verified = TRUE
    ORDER BY n.academic_year DESC, n.created_at DESC;
END;
$$;

-- Function to get module notes for a subject
CREATE OR REPLACE FUNCTION get_module_notes_for_subject(
    p_subject_id UUID,
    p_module_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR,
    module_number INTEGER,
    download_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.description,
        n.file_url,
        n.file_type,
        n.module_number,
        n.download_count,
        n.created_at
    FROM notes n
    WHERE n.subject_id = p_subject_id
    AND n.is_pyq = FALSE
    AND n.is_verified = TRUE
    AND (p_module_number IS NULL OR n.module_number = p_module_number)
    ORDER BY n.module_number ASC, n.created_at DESC;
END;
$$;

-- Function to get notes summary for a subject (counts by module and PYQ)
CREATE OR REPLACE FUNCTION get_notes_summary_for_subject(p_subject_id UUID)
RETURNS TABLE (
    category VARCHAR,
    note_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN n.is_pyq = TRUE THEN 'PYQ'
            ELSE CONCAT('Module ', n.module_number)
        END as category,
        COUNT(*) as note_count
    FROM notes n
    WHERE n.subject_id = p_subject_id
    AND n.is_verified = TRUE
    GROUP BY n.is_pyq, n.module_number
    ORDER BY n.is_pyq DESC, n.module_number ASC;
END;
$$;

-- Function to get all notes organized by subject for a branch and semester
CREATE OR REPLACE FUNCTION get_organized_notes_for_semester(
    p_branch_id UUID,
    p_semester INTEGER
)
RETURNS TABLE (
    subject_id UUID,
    subject_name VARCHAR,
    subject_code VARCHAR,
    category VARCHAR,
    note_id UUID,
    note_title VARCHAR,
    note_description TEXT,
    file_url TEXT,
    file_type VARCHAR,
    academic_year VARCHAR,
    exam_type VARCHAR,
    module_number INTEGER,
    download_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        CASE
            WHEN n.is_pyq = TRUE THEN 'PYQ'
            ELSE CONCAT('Module ', n.module_number)
        END as category,
        n.id as note_id,
        n.title as note_title,
        n.description as note_description,
        n.file_url,
        n.file_type,
        n.academic_year,
        n.exam_type,
        n.module_number,
        n.download_count
    FROM subjects s
    LEFT JOIN notes n ON s.id = n.subject_id AND n.is_verified = TRUE
    WHERE s.branch_id = p_branch_id
    AND s.semester = p_semester
    ORDER BY
        s.name,
        n.is_pyq DESC, -- PYQ first
        n.module_number ASC,
        n.created_at DESC;
END;
$$;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON notes_organized TO authenticated;
GRANT EXECUTE ON FUNCTION get_pyq_notes_for_subject(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_module_notes_for_subject(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notes_summary_for_subject(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organized_notes_for_semester(UUID, INTEGER) TO authenticated;

-- ============================================
-- 7. UPDATE EXISTING NOTES (OPTIONAL)
-- ============================================
-- This sets all existing notes to Module 1 by default
-- You may want to manually categorize them later

UPDATE notes
SET module_number = 1, is_pyq = FALSE
WHERE module_number IS NULL AND is_pyq IS NULL;

-- ============================================
-- 8. VERIFICATION
-- ============================================

DO $$
DECLARE
    total_notes INTEGER;
    pyq_count INTEGER;
    module_notes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_notes FROM notes;
    SELECT COUNT(*) INTO pyq_count FROM notes WHERE is_pyq = TRUE;
    SELECT COUNT(*) INTO module_notes_count FROM notes WHERE is_pyq = FALSE;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Modules and PYQ Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total notes: %', total_notes;
    RAISE NOTICE '  PYQ notes: %', pyq_count;
    RAISE NOTICE '  Module notes: %', module_notes_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Structure:';
    RAISE NOTICE '  Subject → PYQ Section (is_pyq = TRUE)';
    RAISE NOTICE '  Subject → Module 1-5 (module_number = 1-5)';
    RAISE NOTICE '  Subject → Notes in each category';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  - get_pyq_notes_for_subject(subject_id)';
    RAISE NOTICE '  - get_module_notes_for_subject(subject_id, module_number)';
    RAISE NOTICE '  - get_notes_summary_for_subject(subject_id)';
    RAISE NOTICE '  - get_organized_notes_for_semester(branch_id, semester)';
    RAISE NOTICE '========================================';
END $$;
