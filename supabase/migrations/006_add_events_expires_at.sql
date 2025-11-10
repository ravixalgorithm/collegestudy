-- Migration: Add expires_at column to events table
-- Date: 2024-12-19
-- Description: Fix missing expires_at column that's causing deletion errors

BEGIN;

-- Add expires_at column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Set expires_at to 7 days after event_date for existing events
UPDATE events
SET expires_at = event_date + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Create index for performance on expires_at queries
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);

-- Create composite index for common queries (active events)
CREATE INDEX IF NOT EXISTS idx_events_active_with_expiry ON events(event_date, is_published, expires_at)
WHERE is_published = true;

-- Add comment for documentation
COMMENT ON COLUMN events.expires_at IS 'When this event expires and can be automatically cleaned up (auto-set to 7 days after event_date)';

-- Create or replace the cleanup function that was causing the error
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

-- Grant execute permission to service_role for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;

-- Create trigger to automatically set expires_at for new events
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

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_event_expiration ON events;
CREATE TRIGGER trigger_set_event_expiration
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_expiration();

-- Verify the migration worked
DO $$
DECLARE
    column_exists BOOLEAN;
    events_count INTEGER;
    events_with_expiry INTEGER;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'expires_at'
    ) INTO column_exists;

    -- Get event counts
    SELECT COUNT(*) FROM events INTO events_count;
    SELECT COUNT(*) FROM events WHERE expires_at IS NOT NULL INTO events_with_expiry;

    -- Log results
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE 'expires_at column exists: %', column_exists;
    RAISE NOTICE 'Total events: %', events_count;
    RAISE NOTICE 'Events with expiration set: %', events_with_expiry;

    -- Fail if something went wrong
    IF NOT column_exists THEN
        RAISE EXCEPTION 'Migration failed: expires_at column was not created';
    END IF;

    IF events_count > 0 AND events_with_expiry = 0 THEN
        RAISE EXCEPTION 'Migration failed: Existing events do not have expires_at set';
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
END;
$$;

COMMIT;
