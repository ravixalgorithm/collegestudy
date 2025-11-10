# Fix RLS Error: note_branches Table

## Problem
You're getting this error when trying to save notes:
```
Error saving note: new row violates row-level security policy for table "note_branches"
```

This happens because the Row Level Security (RLS) policy on the `note_branches` table is preventing your admin user from creating note-branch associations.

## Quick Fix (3 Steps)

### Step 1: Check Your Admin Status
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste this:

```sql
-- Check if you're an admin
SELECT
    auth.uid() as your_user_id,
    u.email,
    u.is_admin,
    CASE
        WHEN u.is_admin = true THEN '✓ You are admin'
        WHEN u.is_admin = false THEN '✗ You are NOT admin'
        WHEN u.id IS NULL THEN '✗ User not found in database'
        ELSE '? Unknown status'
    END as status
FROM users u
WHERE u.id = auth.uid();
```

4. Click **Run**

**If the result shows you're NOT an admin, run this:**
```sql
-- Make yourself admin
UPDATE users
SET is_admin = true
WHERE id = auth.uid();
```

### Step 2: Fix the RLS Policies
Copy and paste this entire script in a new SQL query and run it:

```sql
-- Fix note_branches RLS policies
DROP POLICY IF EXISTS "Public can view note branches" ON note_branches;
DROP POLICY IF EXISTS "Admins can manage note branches" ON note_branches;

-- Allow everyone to view note-branch associations
CREATE POLICY "Allow public to view note branches" ON note_branches
    FOR SELECT
    USING (true);

-- Allow authenticated users to create note-branch associations
CREATE POLICY "Allow authenticated users to create note branches" ON note_branches
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins to update/delete
CREATE POLICY "Allow admins to manage note branches" ON note_branches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Create helper function for safe insertion
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
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
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

-- Grant permissions
GRANT SELECT ON note_branches TO authenticated;
GRANT INSERT ON note_branches TO authenticated;
GRANT UPDATE ON note_branches TO authenticated;
GRANT DELETE ON note_branches TO authenticated;
GRANT EXECUTE ON FUNCTION create_note_branch_associations(UUID, UUID[]) TO authenticated;
```

### Step 3: Test the Fix
1. Go back to your admin dashboard
2. Try creating a new note
3. Select multiple branches
4. Save the note

**If it still fails, run this diagnostic:**
```sql
-- Test your permissions
DO $$
BEGIN
    RAISE NOTICE 'Current user: %', auth.uid();
    RAISE NOTICE 'User is admin: %', (
        SELECT is_admin FROM users WHERE id = auth.uid()
    );
    
    -- Test function
    PERFORM create_note_branch_associations(
        (SELECT id FROM notes LIMIT 1),
        ARRAY[(SELECT id FROM branches LIMIT 1)]
    );
    
    RAISE NOTICE 'RLS fix successful!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;
```

## Alternative: Disable RLS Temporarily

If the above doesn't work, you can temporarily disable RLS on the table:

```sql
-- TEMPORARY: Disable RLS (not recommended for production)
ALTER TABLE note_branches DISABLE ROW LEVEL SECURITY;
```

**Remember to re-enable it later:**
```sql
-- Re-enable RLS when fixed
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;
```

## Root Cause

The issue occurs because:
1. The `note_branches` table has RLS enabled
2. The policy was checking for admin status incorrectly
3. The admin dashboard tries to insert directly into `note_branches`
4. RLS blocks the insertion even for admins

## Prevention

To prevent this in the future:
1. Always test RLS policies after creating them
2. Use helper functions for complex operations
3. Ensure admin users are properly flagged in the database
4. Test with actual admin accounts, not just superuser

## Verification

After applying the fix, you should be able to:
- ✅ Create notes in the admin dashboard
- ✅ Select multiple branches for a note
- ✅ See notes appear in the mobile app
- ✅ Browse notes by subject and module

## Still Having Issues?

1. **Check your internet connection** - Supabase needs connectivity
2. **Clear browser cache** - Old cached policies might interfere
3. **Check Supabase logs** - Look for detailed error messages
4. **Verify database connection** - Ensure you're connected to the right project
5. **Contact support** - With specific error messages and user ID

---

**Files to run in order:**
1. `check_admin_status.sql` - Verify you're admin
2. `fix_note_branches_rls.sql` - Fix the RLS policies
3. Test in admin dashboard

**Expected result:** You should be able to create notes with multiple branch associations without RLS errors.