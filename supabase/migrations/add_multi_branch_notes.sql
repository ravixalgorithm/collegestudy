-- Migration: Add Multi-Branch Support for Notes
-- Date: 2024-12-07
-- Description: Allows notes to be associated with multiple branches

-- ============================================
-- CREATE NOTE_BRANCHES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS note_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, branch_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_note_branches_note_id ON note_branches(note_id);
CREATE INDEX IF NOT EXISTS idx_note_branches_branch_id ON note_branches(branch_id);

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================
-- For existing notes, create entries in note_branches based on subject's branch
INSERT INTO note_branches (note_id, branch_id)
SELECT DISTINCT n.id, s.branch_id
FROM notes n
INNER JOIN subjects s ON n.subject_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM note_branches nb
    WHERE nb.note_id = n.id AND nb.branch_id = s.branch_id
);

-- ============================================
-- ADD SEMESTER COLUMN TO NOTES (Optional)
-- ============================================
-- This allows notes to be semester-specific without requiring a subject
ALTER TABLE notes ADD COLUMN IF NOT EXISTS semester INTEGER CHECK (semester >= 1 AND semester <= 8);

-- Update existing notes with semester from their subject
UPDATE notes n
SET semester = s.semester
FROM subjects s
WHERE n.subject_id = s.id AND n.semester IS NULL;

-- ============================================
-- RLS POLICIES FOR NOTE_BRANCHES
-- ============================================
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;

-- Public can view note-branch associations
CREATE POLICY "Public can view note branches" ON note_branches
FOR SELECT USING (true);

-- Admins can manage note-branch associations
CREATE POLICY "Admins can manage note branches" ON note_branches
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ============================================
-- HELPER FUNCTION: Get notes for a branch
-- ============================================
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
    semester INTEGER
) AS $$
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
        n.semester
    FROM notes n
    INNER JOIN note_branches nb ON n.id = nb.note_id
    WHERE nb.branch_id = p_branch_id
    AND n.is_verified = true
    AND (p_semester IS NULL OR n.semester = p_semester)
    ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE note_branches IS 'Junction table for many-to-many relationship between notes and branches';
COMMENT ON COLUMN notes.semester IS 'Optional semester field for notes that apply across subjects';
COMMENT ON FUNCTION get_notes_for_branch IS 'Helper function to fetch notes for a specific branch and optional semester';
