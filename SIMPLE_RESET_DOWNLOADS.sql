-- ============================================
-- SIMPLE RESET DOWNLOADS SCRIPT
-- ============================================
-- This script resets download counts to realistic values

BEGIN;

-- Reset all download counts to 0 first
UPDATE notes SET download_count = 0 WHERE download_count IS NOT NULL;

-- Set realistic download counts for different tiers of notes

-- Tier 1: Popular notes (top 5 most recent) get 10-30 downloads
UPDATE notes
SET download_count = floor(random() * 21 + 10)::INTEGER
WHERE is_verified = true
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    ORDER BY created_at DESC
    LIMIT 5
);

-- Tier 2: Moderately popular notes (next 10) get 3-15 downloads
UPDATE notes
SET download_count = floor(random() * 13 + 3)::INTEGER
WHERE is_verified = true
AND download_count = 0
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    AND download_count = 0
    ORDER BY created_at DESC
    LIMIT 10
);

-- Tier 3: Some notes (next 15) get 1-5 downloads
UPDATE notes
SET download_count = floor(random() * 5 + 1)::INTEGER
WHERE is_verified = true
AND download_count = 0
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    AND download_count = 0
    ORDER BY created_at DESC
    LIMIT 15
);

-- Show results
SELECT 'Download counts have been reset successfully!' as status;

-- Show summary statistics
SELECT
    'Summary Statistics' as info,
    COUNT(*) as total_notes,
    SUM(download_count) as total_downloads,
    COUNT(*) FILTER (WHERE download_count > 0) as notes_with_downloads,
    MAX(download_count) as highest_downloads,
    ROUND(AVG(download_count), 1) as average_downloads
FROM notes
WHERE is_verified = true;

-- Show top 10 downloaded notes
SELECT 'Top 10 Downloaded Notes' as section;

SELECT
    title,
    download_count,
    created_at::date as uploaded_date
FROM notes
WHERE is_verified = true
AND download_count > 0
ORDER BY download_count DESC
LIMIT 10;

COMMIT;
