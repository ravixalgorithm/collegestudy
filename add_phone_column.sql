-- ============================================
-- MIGRATION: Add Phone Column to Users Table
-- ============================================
-- This migration adds the phone column that's required for profile editing

-- ============================================
-- STEP 1: ADD PHONE COLUMN
-- ============================================

-- Add phone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ============================================
-- STEP 2: ADD INDEX FOR PERFORMANCE (OPTIONAL)
-- ============================================

-- Create index on phone for potential lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- STEP 3: VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHONE COLUMN MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';

    -- Check if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        RAISE NOTICE '✓ Phone column added successfully';
    ELSE
        RAISE NOTICE '✗ Phone column was not added';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users can now add phone numbers to their profiles!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 4: SHOW UPDATED TABLE STRUCTURE
-- ============================================

-- Display users table columns for verification
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
