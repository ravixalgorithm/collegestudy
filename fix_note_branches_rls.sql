-- ============================================
-- FIX: Note Branches RLS Policy Issues
-- ============================================
-- This script fixes the RLS policy that's preventing note_branches insertions
-- Run this in Supabase SQL Editor after the main migration

-- ============================================
-- STEP 1: DROP EXISTING PROBLEMATIC POLICIES
-- ============================================

-- Drop all existing policies for note_branches table
DROP POLICY IF EXISTS "Public can view note branches" ON note_branches;
DROP POLICY IF EXISTS "Admins can manage note branches" ON note_branches;
DROP POLICY IF EXISTS "note_branches_select_policy" ON note_branches;
DROP POLICY IF EXISTS "note_branches_insert_policy" ON note_branches;
DROP POLICY IF EXISTS "note_branches_update_policy" ON note_branches;
DROP POLICY IF EXISTS "note_branches_delete_policy" ON note_branches;

-- ============================================
-- STEP 2: CREATE NEW WORKING RLS POLICIES
-- ============================================

-- Policy for SELECT (viewing note-branch associations)
-- Allow anyone to view note-branch associations for verified notes
CREATE POLICY "Allow public to view note branches for verified notes" ON note_branches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_branches.note_id
            AND notes.is_verified = true
        )
    );

-- Policy for INSERT (creating note-branch associations)
-- Allow authenticated users to create associations (we'll check admin status in app logic)
CREATE POLICY "Allow authenticated users to create note branches" ON note_branches
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Alternative admin-only INSERT policy (uncomment this and comment above if you want stricter control)
-- CREATE POLICY "Allow only admins to create note branches" ON note_branches
--     FOR INSERT
--     WITH CHECK (
--         auth.uid() IS NOT NULL AND
--         EXISTS (
--             SELECT 1 FROM users
--             WHERE users.id = auth.uid()
--             AND users.is_admin = true
--         )
--     );

-- Policy for UPDATE (modifying note-branch associations)
-- Allow admins to update associations
CREATE POLICY "Allow admins to update note branches" ON note_branches
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Policy for DELETE (removing note-branch associations)
-- Allow admins to delete associations
CREATE POLICY "Allow admins to delete note branches" ON note_branches
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- ============================================
-- STEP 3: ENSURE TABLE HAS RLS ENABLED
-- ============================================

-- Enable RLS on the table (in case it's not already enabled)
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant basic permissions to authenticated users
GRANT SELECT ON note_branches TO authenticated;
GRANT INSERT ON note_branches TO authenticated;
GRANT UPDATE ON note_branches TO authenticated;
GRANT DELETE ON note_branches TO authenticated;

-- Grant usage on the sequence if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'note_branches_id_seq') THEN
        GRANT USAGE ON SEQUENCE note_branches_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- STEP 5: CREATE HELPER FUNCTION FOR SAFE INSERTION
-- ============================================

-- Function to safely create note-branch associations with proper checks
CREATE OR REPLACE FUNCTION create_note_branch_associations(
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
    current_user_id UUID;
    is_admin_user BOOLEAN := FALSE;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();

    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Check if user is admin
    SELECT users.is_admin INTO is_admin_user
    FROM users
    WHERE users.id = current_user_id;

    IF is_admin_user IS NULL THEN
        RAISE EXCEPTION 'User not found in users table';
    END IF;

    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Only admins can create note-branch associations';
    END IF;

    -- Check if note exists
    IF NOT EXISTS (SELECT 1 FROM notes WHERE id = p_note_id) THEN
        RAISE EXCEPTION 'Note with ID % not found', p_note_id;
    END IF;

    -- Insert each branch association
    FOREACH branch_id IN ARRAY p_branch_ids
    LOOP
        -- Check if branch exists
        IF NOT EXISTS (SELECT 1 FROM branches WHERE id = branch_id) THEN
            RAISE EXCEPTION 'Branch with ID % not found', branch_id;
        END IF;

        -- Insert with conflict handling
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

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION create_note_branch_associations(UUID, UUID[]) TO authenticated;

-- ============================================
-- STEP 6: UPDATE EXISTING AUTO-ASSIGNMENT TRIGGER
-- ============================================

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION auto_assign_note_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subject_branch_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user (for logging purposes)
    current_user_id := auth.uid();

    -- Get the branch_id from the subject
    SELECT s.branch_id INTO subject_branch_id
    FROM subjects s
    WHERE s.id = NEW.subject_id;

    -- If subject has a branch, create the association
    IF subject_branch_id IS NOT NULL THEN
        BEGIN
            INSERT INTO note_branches (note_id, branch_id)
            VALUES (NEW.id, subject_branch_id)
            ON CONFLICT (note_id, branch_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            -- Log the error but don't fail the note creation
            RAISE WARNING 'Failed to auto-assign note-branch association for note % and branch %: %',
                NEW.id, subject_branch_id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_note_branch ON notes;
CREATE TRIGGER trigger_auto_assign_note_branch
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_note_branch();

-- ============================================
-- STEP 7: TEST THE FIX
-- ============================================

DO $$
DECLARE
    test_note_id UUID;
    test_branch_id UUID;
    test_result INTEGER;
    current_user_id UUID;
    user_is_admin BOOLEAN := FALSE;
BEGIN
    -- Get current user
    current_user_id := auth.uid();

    RAISE NOTICE '========================================';
    RAISE NOTICE 'NOTE BRANCHES RLS FIX APPLIED';
    RAISE NOTICE '========================================';

    IF current_user_id IS NOT NULL THEN
        -- Check if current user is admin
        SELECT is_admin INTO user_is_admin
        FROM users
        WHERE id = current_user_id;

        RAISE NOTICE 'Current user ID: %', current_user_id;
        RAISE NOTICE 'User is admin: %', COALESCE(user_is_admin, false);
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Policies Updated:';
    RAISE NOTICE '  ✓ SELECT: Public can view verified note branches';
    RAISE NOTICE '  ✓ INSERT: Authenticated users can create';
    RAISE NOTICE '  ✓ UPDATE: Admins only';
    RAISE NOTICE '  ✓ DELETE: Admins only';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Helper Functions Available:';
    RAISE NOTICE '  ✓ create_note_branch_associations(note_id, branch_ids)';
    RAISE NOTICE '  ✓ auto_assign_note_branch() trigger';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Try creating a note in the admin dashboard';
    RAISE NOTICE '  2. Verify branch associations are created';
    RAISE NOTICE '  3. Check mobile app displays notes correctly';
    RAISE NOTICE '========================================';

    -- Get sample IDs for testing information
    SELECT id INTO test_note_id FROM notes LIMIT 1;
    SELECT id INTO test_branch_id FROM branches LIMIT 1;

    IF test_note_id IS NOT NULL AND test_branch_id IS NOT NULL THEN
        RAISE NOTICE 'Test Data Available:';
        RAISE NOTICE '  Sample note ID: %', test_note_id;
        RAISE NOTICE '  Sample branch ID: %', test_branch_id;
        RAISE NOTICE '========================================';
    END IF;

END $$;

-- ============================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'note_branches'
ORDER BY policyname;

-- Check table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'note_branches'
ORDER BY grantee, privilege_type;
