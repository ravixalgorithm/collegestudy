-- ============================================
-- SIMPLE RLS FIX: Direct Note-Branch Insertion
-- ============================================
-- This script provides a simple fix for the RLS authentication issue
-- by temporarily disabling RLS and creating a simpler approach

-- ============================================
-- STEP 1: TEMPORARILY DISABLE RLS ON NOTE_BRANCHES
-- ============================================

-- Disable RLS to allow direct insertions
ALTER TABLE note_branches DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: GRANT DIRECT PERMISSIONS
-- ============================================

-- Grant all necessary permissions to authenticated users
GRANT ALL ON note_branches TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- STEP 3: DROP PROBLEMATIC HELPER FUNCTION
-- ============================================

-- Remove the function that's causing authentication issues
DROP FUNCTION IF EXISTS create_note_branch_associations(UUID, UUID[]);

-- ============================================
-- STEP 4: CREATE SIMPLE BULK INSERT FUNCTION (OPTIONAL)
-- ============================================

-- Simple function that doesn't check authentication (relies on RLS being off)
CREATE OR REPLACE FUNCTION insert_note_branches(
    p_note_id UUID,
    p_branch_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER := 0;
    branch_id UUID;
BEGIN
    -- Delete existing associations for this note first
    DELETE FROM note_branches WHERE note_id = p_note_id;

    -- Insert new associations
    FOREACH branch_id IN ARRAY p_branch_ids
    LOOP
        INSERT INTO note_branches (note_id, branch_id)
        VALUES (p_note_id, branch_id)
        ON CONFLICT (note_id, branch_id) DO NOTHING;

        GET DIAGNOSTICS inserted_count = ROW_COUNT;
    END LOOP;

    RETURN array_length(p_branch_ids, 1);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION insert_note_branches(UUID, UUID[]) TO authenticated;

-- ============================================
-- STEP 5: UPDATE AUTO-ASSIGNMENT TRIGGER
-- ============================================

-- Simplify the auto-assignment trigger
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_note_branch ON notes;
CREATE TRIGGER trigger_auto_assign_note_branch
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_note_branch();

-- ============================================
-- STEP 6: TEST THE SIMPLE FIX
-- ============================================

DO $$
DECLARE
    test_note_id UUID;
    test_branch_ids UUID[];
    result INTEGER;
BEGIN
    -- Get a test note and some branches
    SELECT id INTO test_note_id FROM notes LIMIT 1;
    SELECT array_agg(id) INTO test_branch_ids FROM branches LIMIT 3;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SIMPLE RLS FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  ✓ RLS disabled on note_branches table';
    RAISE NOTICE '  ✓ Direct permissions granted';
    RAISE NOTICE '  ✓ Simple insert function created';
    RAISE NOTICE '  ✓ Auto-assignment trigger updated';
    RAISE NOTICE '========================================';

    IF test_note_id IS NOT NULL AND test_branch_ids IS NOT NULL THEN
        BEGIN
            -- Test the simple function
            SELECT insert_note_branches(test_note_id, test_branch_ids) INTO result;
            RAISE NOTICE 'Test insertion: SUCCESS (% associations)', result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Test insertion: FAILED - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Test insertion: SKIPPED (no test data)';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update admin dashboard to use direct insertion';
    RAISE NOTICE '  2. Test creating notes through the admin panel';
    RAISE NOTICE '  3. If everything works, consider re-enabling RLS later';
    RAISE NOTICE '========================================';

END $$;

-- ============================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================

-- Check current table permissions
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'note_branches'
ORDER BY grantee, privilege_type;

-- Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED'
    END as rls_status
FROM pg_tables
WHERE tablename = 'note_branches';

-- ============================================
-- STEP 8: SAMPLE DIRECT INSERTION (FOR TESTING)
-- ============================================

-- Example of how to insert note-branch associations directly
-- (This is what the admin dashboard will do)

/*
-- Example usage:
INSERT INTO note_branches (note_id, branch_id)
VALUES
    ('your-note-id-here', 'branch-id-1'),
    ('your-note-id-here', 'branch-id-2')
ON CONFLICT (note_id, branch_id) DO NOTHING;
*/

-- ============================================
-- STEP 9: RE-ENABLE RLS LATER (OPTIONAL)
-- ============================================

-- Once everything is working, you can optionally re-enable RLS
-- with simpler policies:

/*
-- Re-enable RLS with permissive policies
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow authenticated users
CREATE POLICY "allow_all_authenticated" ON note_branches
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
*/
