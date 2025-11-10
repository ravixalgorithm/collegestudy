-- ============================================
-- URGENT FIX: expires_at Column Error
-- Date: 2024-12-19
-- Description: Complete fix for "column events.expires_at does not exist" error
-- ============================================

-- STEP 1: Add the missing expires_at column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- STEP 2: Set default expiration dates for all existing events (7 days after event_date)
UPDATE events
SET expires_at = event_date + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- STEP 3: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_active_with_expiry ON events(event_date, is_published, expires_at)
WHERE is_published = true;

-- STEP 4: Create or replace the cleanup function that was causing the error
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    result_count INTEGER;
BEGIN
    -- Delete expired events (past their expiration date and event date)
    DELETE FROM events
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND event_date < CURRENT_DATE;

    -- Get count of deleted rows
    GET DIAGNOSTICS result_count = ROW_COUNT;

    -- Return the count
    deleted_count := result_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;

-- STEP 6: Create trigger function to auto-set expires_at for new events
CREATE OR REPLACE FUNCTION set_event_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration date to 7 days after event date if not manually set
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := (NEW.event_date + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create the trigger (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_set_event_expiration ON events;
CREATE TRIGGER trigger_set_event_expiration
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_expiration();

-- STEP 8: Add helpful comment
COMMENT ON COLUMN events.expires_at IS 'When this event expires and can be automatically cleaned up (auto-set to 7 days after event_date)';

-- STEP 9: Verify the fix worked
DO $$
DECLARE
    column_exists BOOLEAN;
    events_count INTEGER;
    events_with_expiry INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'expires_at'
    ) INTO column_exists;

    -- Check if function exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'cleanup_expired_events'
        AND n.nspname = 'public'
    ) INTO function_exists;

    -- Get event counts
    SELECT COUNT(*) FROM events INTO events_count;
    SELECT COUNT(*) FROM events WHERE expires_at IS NOT NULL INTO events_with_expiry;

    -- Report results
    RAISE NOTICE '=== FIX VERIFICATION RESULTS ===';
    RAISE NOTICE 'expires_at column exists: %', column_exists;
    RAISE NOTICE 'cleanup_expired_events function exists: %', function_exists;
    RAISE NOTICE 'Total events: %', events_count;
    RAISE NOTICE 'Events with expiration date: %', events_with_expiry;

    -- Success/failure check
    IF column_exists AND function_exists THEN
        RAISE NOTICE '✅ SUCCESS: expires_at error should be fixed!';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Restart your mobile app: npx expo start -c';
        RAISE NOTICE '2. Restart your admin dashboard if running';
        RAISE NOTICE '3. The error should no longer appear';
    ELSE
        RAISE EXCEPTION '❌ FIX FAILED: Please contact support';
    END IF;
END;
$$;

-- SUCCESS MESSAGE
SELECT 'URGENT FIX COMPLETED - expires_at column added to events table!' as status;
