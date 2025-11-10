-- ============================================
-- EMERGENCY FIX: Add Phone Column to Users Table
-- ============================================
-- Run this immediately in Supabase SQL Editor to fix the profile editing error

-- Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Test the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        RAISE NOTICE '🔧 SUCCESS: Phone column added! Users can now edit their profiles.';
    ELSE
        RAISE NOTICE '❌ ERROR: Phone column was not added properly.';
    END IF;
END $$;

-- Show updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
