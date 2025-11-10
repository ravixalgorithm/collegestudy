-- ============================================
-- Migration: Multi-Branch Notes Support
-- Version: 001
-- Date: 2024-12-07
-- Description: Allows notes to be associated with multiple branches
-- ============================================

-- ============================================
-- 1. CREATE NOTE_BRANCHES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS note_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, branch_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_branches_note_id ON note_branches(note_id);
CREATE INDEX IF NOT EXISTS idx_note_branches_branch_id ON note_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_note_branches_composite ON note_branches(note_id, branch_id);

COMMENT ON TABLE note_branches IS 'Junction table for many-to-many relationship between notes and branches';
COMMENT ON COLUMN note_branches.note_id IS 'Reference to the note';
COMMENT ON COLUMN note_branches.branch_id IS 'Reference to the branch';

-- ============================================
-- 2. MIGRATE EXISTING DATA
-- ============================================
-- Populate note_branches with existing note-subject-branch relationships
INSERT INTO note_branches (note_id, branch_id)
SELECT DISTINCT
    n.id as note_id,
    s.branch_id
FROM notes n
INNER JOIN subjects s ON n.subject_id = s.id
WHERE s.branch_id IS NOT NULL
ON CONFLICT (note_id, branch_id) DO NOTHING;

-- Verify migration
DO $$
DECLARE
    notes_count INTEGER;
    note_branches_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO notes_count FROM notes;
    SELECT COUNT(DISTINCT note_id) INTO note_branches_count FROM note_branches;

    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total notes: %', notes_count;
    RAISE NOTICE '  Notes with branch associations: %', note_branches_count;
    RAISE NOTICE '  Total note-branch associations: %', (SELECT COUNT(*) FROM note_branches);

    IF note_branches_count < notes_count THEN
        RAISE WARNING 'Some notes may not have branch associations. Review notes without subjects.';
    END IF;
END $$;

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view note branches" ON note_branches;
DROP POLICY IF EXISTS "Admins can manage note branches" ON note_branches;

-- Public can view note-branch associations
CREATE POLICY "Public can view note branches" ON note_branches
    FOR SELECT
    USING (true);

-- Only admins can insert/update/delete note-branch associations
CREATE POLICY "Admins can manage note branches" ON note_branches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_notes_for_branch(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_branches_for_note(UUID);
DROP FUNCTION IF EXISTS add_note_to_branches(UUID, UUID[]);

-- Function to get notes for a specific branch and semester
CREATE OR REPLACE FUNCTION get_notes_for_branch(
    p_branch_id UUID,
    p_semester INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    subject_id UUID,
    title VARCHAR,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR,
    tags TEXT[],
    is_verified BOOLEAN,
    download_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        n.id,
        n.subject_id,
        n.title,
        n.description,
        n.file_url,
        n.file_type,
        n.tags,
        n.is_verified,
        n.download_count,
        n.created_at,
        n.updated_at
    FROM notes n
    INNER JOIN note_branches nb ON n.id = nb.note_id
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE nb.branch_id = p_branch_id
    AND n.is_verified = true
    AND (p_semester IS NULL OR s.semester = p_semester OR s.semester IS NULL)
    ORDER BY n.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_notes_for_branch IS 'Fetches all verified notes for a specific branch, optionally filtered by semester';

-- Function to get branches for a specific note
CREATE OR REPLACE FUNCTION get_branches_for_note(p_note_id UUID)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    full_name VARCHAR
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
        b.full_name
    FROM branches b
    INNER JOIN note_branches nb ON b.id = nb.branch_id
    WHERE nb.note_id = p_note_id
    ORDER BY b.name;
END;
$$;

COMMENT ON FUNCTION get_branches_for_note IS 'Fetches all branches associated with a specific note';

-- Function to add note-branch associations (bulk)
CREATE OR REPLACE FUNCTION add_note_to_branches(
    p_note_id UUID,
    p_branch_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_count INTEGER := 0;
    branch_id UUID;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can add note-branch associations';
    END IF;

    -- Insert each branch association
    FOREACH branch_id IN ARRAY p_branch_ids
    LOOP
        INSERT INTO note_branches (note_id, branch_id)
        VALUES (p_note_id, branch_id)
        ON CONFLICT (note_id, branch_id) DO NOTHING;

        IF FOUND THEN
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;

    RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION add_note_to_branches IS 'Adds a note to multiple branches in bulk. Returns count of associations created.';

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger to automatically create note_branches entry when a note is created
-- (based on the subject's branch)
CREATE OR REPLACE FUNCTION auto_assign_note_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    subject_branch_id UUID;
BEGIN
    -- Get the branch_id from the subject
    SELECT s.branch_id INTO subject_branch_id
    FROM subjects s
    WHERE s.id = NEW.subject_id;

    -- If subject has a branch, create the association
    IF subject_branch_id IS NOT NULL THEN
        INSERT INTO note_branches (note_id, branch_id)
        VALUES (NEW.id, subject_branch_id)
        ON CONFLICT (note_id, branch_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_note_branch ON notes;
CREATE TRIGGER trigger_auto_assign_note_branch
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_note_branch();

COMMENT ON FUNCTION auto_assign_note_branch IS 'Automatically creates note-branch association when a note is created';

-- ============================================
-- 6. VIEWS (Optional - for easier querying)
-- ============================================

-- View: Notes with their associated branches
CREATE OR REPLACE VIEW notes_with_branches AS
SELECT
    n.*,
    s.name as subject_name,
    s.code as subject_code,
    s.semester,
    array_agg(DISTINCT b.name ORDER BY b.name) as branch_names,
    array_agg(DISTINCT b.code ORDER BY b.code) as branch_codes,
    array_agg(DISTINCT b.id) as branch_ids
FROM notes n
LEFT JOIN subjects s ON n.subject_id = s.id
LEFT JOIN note_branches nb ON n.id = nb.note_id
LEFT JOIN branches b ON nb.branch_id = b.id
GROUP BY n.id, n.subject_id, n.title, n.description, n.file_url, n.file_type,
         n.tags, n.uploaded_by, n.verified_by, n.is_verified, n.download_count,
         n.created_at, n.updated_at, s.name, s.code, s.semester;

COMMENT ON VIEW notes_with_branches IS 'Consolidated view of notes with their associated branches';

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON note_branches TO authenticated;
GRANT SELECT ON notes_with_branches TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_notes_for_branch(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branches_for_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_note_to_branches(UUID, UUID[]) TO authenticated;

-- ============================================
-- 8. VALIDATION QUERIES
-- ============================================

-- Run these to verify the migration worked correctly:

-- Check if junction table was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'note_branches'
    ) THEN
        RAISE NOTICE '✓ Table note_branches created successfully';
    ELSE
        RAISE EXCEPTION '✗ Table note_branches was not created';
    END IF;
END $$;

-- Check if indexes were created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'note_branches'
        AND indexname = 'idx_note_branches_note_id'
    ) THEN
        RAISE NOTICE '✓ Indexes created successfully';
    ELSE
        RAISE WARNING '✗ Some indexes may be missing';
    END IF;
END $$;

-- Check if RLS is enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'note_branches'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✓ RLS enabled on note_branches';
    ELSE
        RAISE WARNING '✗ RLS not enabled on note_branches';
    END IF;
END $$;

-- Sample query to test: Get all notes for CSE branch
-- SELECT * FROM get_notes_for_branch(
--     (SELECT id FROM branches WHERE code = 'CSE' LIMIT 1),
--     1  -- Semester 1
-- );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Multi-Branch Notes Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update admin dashboard to show multi-branch selector';
    RAISE NOTICE '2. Update mobile app to use get_notes_for_branch() function';
    RAISE NOTICE '3. Test thoroughly with sample data';
    RAISE NOTICE '========================================';
END $$;
