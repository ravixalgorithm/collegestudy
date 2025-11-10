# Fix Phone Column Error

## Problem
You're getting this error when trying to save your profile:
```
Error saving profile: Could not find the 'phone' column of 'users' in the schema cache
```

This happens because the `phone` column doesn't exist in the `users` table yet.

## Quick Fix (1 minute)

### Step 1: Add Phone Column
1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** in the sidebar
3. Click **"New query"**
4. Copy and paste this code:

```sql
-- Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Test success
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: Phone column added! Profile editing now works.';
    ELSE
        RAISE NOTICE '❌ ERROR: Phone column was not added.';
    END IF;
END $$;
```

5. Click **"Run"** to execute
6. You should see: `✅ SUCCESS: Phone column added!`

### Step 2: Test Profile Editing
1. Go back to your mobile app
2. Try editing your profile again
3. It should now work without errors!

## What This Fixes

- ✅ **Adds phone field** to user profiles
- ✅ **Enables profile editing** without errors
- ✅ **Makes phone optional** (users don't have to fill it)
- ✅ **Maintains data integrity** with proper indexing

## If It Still Doesn't Work

Try refreshing your app or restarting it. The schema cache should update automatically, but sometimes needs a restart.

## Alternative: Use Basic Profile Editor

If you're still having issues, temporarily use the basic profile editor that doesn't include phone:

1. Rename `app/profile/edit.tsx` to `app/profile/edit-with-phone.tsx`
2. Rename `app/profile/edit-basic.tsx` to `app/profile/edit.tsx`
3. This gives you a working profile editor without the phone field

---

**Expected Result**: Profile editing works perfectly with optional phone number field.

**Time to Fix**: 1-2 minutes

**Risk**: None (just adds a new optional column)