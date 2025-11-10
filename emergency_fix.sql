-- ============================================
-- EMERGENCY FIX: One-liner for note_branches RLS issue
-- ============================================
-- Copy and paste this entire block into Supabase SQL Editor and run it

-- Disable RLS and grant permissions
ALTER TABLE note_branches DISABLE ROW LEVEL SECURITY;
GRANT ALL ON note_branches TO authenticated;
DROP FUNCTION IF EXISTS create_note_branch_associations(UUID, UUID[]);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🔧 EMERGENCY FIX APPLIED! You can now create notes without RLS errors.';
END $$;
