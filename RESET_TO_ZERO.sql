-- ============================================
-- RESET TO ZERO - CLEAN START
-- ============================================
-- Simple script to reset all download counts to zero
-- Run this if you want to start with fresh data

BEGIN;

-- Reset all download counts in notes table to 0
UPDATE notes SET download_count = 0;

-- Drop the download tracking table if it exists
DROP TABLE IF EXISTS note_downloads CASCADE;

-- Show confirmation
SELECT
    'All download counts reset to zero' as status,
    COUNT(*) as total_notes,
    SUM(download_count) as total_downloads
FROM notes
WHERE is_verified = true;

-- Show current analytics should be zero
SELECT 'Current Analytics (should be zero):' as info;
SELECT * FROM get_download_analytics();

COMMIT;

-- ============================================
-- WHAT THIS SCRIPT DOES:
-- ============================================
-- 1. Sets all notes.download_count = 0
-- 2. Removes the note_downloads tracking table
-- 3. Shows confirmation that everything is reset
--
-- After running this:
-- - Admin dashboard will show 0 downloads
-- - All analytics will start fresh
-- - Ready for real download tracking setup
