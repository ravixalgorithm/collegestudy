-- ============================================
-- Migration: Multi-Branch Notes Support
-- Version: 001 (Fixed)
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
CREATE FUNCTION get_notes_for_branch(
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
    created_at TIMESTAMP WITH TIME ZONE
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
        n.created_at
    FROM notes n
    INNER JOIN note_branches nb ON n.id = nb.note_id
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE nb.branch_id = p_branch_id
    AND n.is_verified = true
    AND (p_semester IS NULL OR s.semester = p_semester)
    ORDER BY n.created_at DESC;
END;
$$;

-- Function to get branches for a specific note
CREATE FUNCTION get_branches_for_note(p_note_id UUID)
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

-- Function to add note-branch associations (bulk)
CREATE FUNCTION add_note_to_branches(
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

-- ============================================
-- 5. TRIGGER FOR AUTO-ASSIGNMENT
-- ============================================

-- Trigger to automatically create note_branches entry when a note is created
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

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON note_branches TO authenticated;
GRANT EXECUTE ON FUNCTION get_notes_for_branch(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branches_for_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_note_to_branches(UUID, UUID[]) TO authenticated;

-- ============================================
-- 7. VERIFICATION
-- ============================================

DO $$
DECLARE
    notes_count INTEGER;
    note_branches_count INTEGER;
BEGIN
    -- Count notes and associations
    SELECT COUNT(*) INTO notes_count FROM notes;
    SELECT COUNT(DISTINCT note_id) INTO note_branches_count FROM note_branches;

    -- Display results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Multi-Branch Notes Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total notes: %', notes_count;
    RAISE NOTICE '  Notes with branch associations: %', note_branches_count;
    RAISE NOTICE '  Total note-branch associations: %', (SELECT COUNT(*) FROM note_branches);
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update admin dashboard to show multi-branch selector';
    RAISE NOTICE '2. Update mobile app to use get_notes_for_branch() function';
    RAISE NOTICE '3. Test with: SELECT * FROM get_notes_for_branch((SELECT id FROM branches LIMIT 1), 1);';
    RAISE NOTICE '========================================';
END $$;
