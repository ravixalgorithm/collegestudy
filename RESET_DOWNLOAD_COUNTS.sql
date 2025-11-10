-- ============================================
-- RESET DOWNLOAD COUNTS TO REALISTIC VALUES
-- ============================================
-- This script resets the random download counts to more realistic values

BEGIN;

-- ============================================
-- 1. RESET ALL DOWNLOAD COUNTS TO 0
-- ============================================
UPDATE notes SET download_count = 0 WHERE download_count IS NOT NULL;

-- ============================================
-- 2. SET REALISTIC DOWNLOAD COUNTS
-- ============================================
-- Popular notes (top 20%) get 5-25 downloads
UPDATE notes
SET download_count = floor(random() * 21 + 5)::INTEGER
WHERE is_verified = true
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    ORDER BY created_at DESC
    LIMIT (SELECT CEIL(COUNT(*) * 0.2) FROM notes WHERE is_verified = true)::INTEGER
);

-- Moderately popular notes (next 30%) get 1-8 downloads
UPDATE notes
SET download_count = floor(random() * 8 + 1)::INTEGER
WHERE is_verified = true
AND download_count = 0
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    AND download_count = 0
    ORDER BY created_at DESC
    LIMIT (SELECT CEIL(COUNT(*) * 0.3) FROM notes WHERE is_verified = true AND download_count = 0)::INTEGER
);

-- Some notes get 1-3 downloads (next 25%)
UPDATE notes
SET download_count = floor(random() * 3 + 1)::INTEGER
WHERE is_verified = true
AND download_count = 0
AND id IN (
    SELECT id FROM notes
    WHERE is_verified = true
    AND download_count = 0
    ORDER BY random()
    LIMIT (SELECT CEIL(COUNT(*) * 0.25) FROM notes WHERE is_verified = true AND download_count = 0)::INTEGER
);

-- Remaining notes stay at 0 downloads (new or less popular content)

-- ============================================
-- 3. VERIFICATION
-- ============================================
DO $$
DECLARE
    total_downloads BIGINT;
    notes_with_downloads INTEGER;
    max_downloads INTEGER;
    avg_downloads NUMERIC;
BEGIN
    SELECT
        SUM(download_count),
        COUNT(*) FILTER (WHERE download_count > 0),
        MAX(download_count),
        ROUND(AVG(download_count), 2)
    INTO total_downloads, notes_with_downloads, max_downloads, avg_downloads
    FROM notes WHERE is_verified = true;

    RAISE NOTICE '';
    RAISE NOTICE '=== DOWNLOAD COUNTS RESET TO REALISTIC VALUES ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Statistics:';
    RAISE NOTICE '  • Total Downloads: %', COALESCE(total_downloads, 0);
    RAISE NOTICE '  • Notes with Downloads: %', COALESCE(notes_with_downloads, 0);
    RAISE NOTICE '  • Highest Downloads: %', COALESCE(max_downloads, 0);
    RAISE NOTICE '  • Average Downloads: %', COALESCE(avg_downloads, 0);
    RAISE NOTICE '';
    RAISE NOTICE 'Distribution:';
    RAISE NOTICE '  • Popular notes (5-25 downloads): ~20%%';
    RAISE NOTICE '  • Moderate notes (1-8 downloads): ~30%%';
    RAISE NOTICE '  • Few downloads (1-3): ~25%%';
    RAISE NOTICE '  • No downloads yet: ~25%%';
    RAISE NOTICE '';
END $$;

-- Show distribution breakdown
SELECT
    'Download Distribution' as category,
    COUNT(*) FILTER (WHERE download_count = 0) as "No Downloads",
    COUNT(*) FILTER (WHERE download_count BETWEEN 1 AND 3) as "1-3 Downloads",
    COUNT(*) FILTER (WHERE download_count BETWEEN 4 AND 8) as "4-8 Downloads",
    COUNT(*) FILTER (WHERE download_count BETWEEN 9 AND 15) as "9-15 Downloads",
    COUNT(*) FILTER (WHERE download_count > 15) as "15+ Downloads"
FROM notes WHERE is_verified = true;

-- Show top downloaded notes
SELECT 'Top Downloaded Notes' as info;
SELECT
    title,
    download_count,
    COALESCE(subjects.name, 'Unknown') as subject_name
FROM notes
LEFT JOIN subjects ON notes.subject_id = subjects.id
WHERE is_verified = true AND download_count > 0
ORDER BY download_count DESC
LIMIT 10;

COMMIT;

-- ============================================
-- QUICK RESET TO ZERO (UNCOMMENT IF NEEDED)
-- ============================================
/*
-- If you want to reset everything to zero:
-- UPDATE notes SET download_count = 0;
-- SELECT 'All download counts reset to zero' as result;
*/
