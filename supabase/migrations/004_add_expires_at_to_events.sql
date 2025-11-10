-- ============================================
-- MIGRATION 004: ADD EXPIRES_AT TO EVENTS
-- ============================================
-- This migration adds expires_at column to events table and creates
-- related functions for automatic expiration handling

-- Add expires_at column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing events to set expiration date (7 days after event_date)
UPDATE events
SET expires_at = (event_date + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE
WHERE expires_at IS NULL;

-- Create function to automatically set expiration date for new events
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

-- Create trigger to automatically set expiration for new events
DROP TRIGGER IF EXISTS trigger_set_event_expiration ON events;
CREATE TRIGGER trigger_set_event_expiration
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_expiration();

-- Create function to cleanup expired events (admin use)
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

    GET DIAGNOSTICS result_count = ROW_COUNT;

    -- Return count of deleted rows
    RETURN QUERY SELECT result_count;

    -- Log cleanup activity
    RAISE NOTICE 'Cleanup completed at %, deleted % events', NOW(), result_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for active (non-expired) events
CREATE OR REPLACE VIEW active_events AS
SELECT
    id,
    title,
    description,
    poster_url,
    event_date,
    start_time,
    end_time,
    location,
    organizer,
    categories,
    registration_deadline,
    expires_at,
    is_published,
    created_at,
    updated_at
FROM events
WHERE is_published = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND event_date >= CURRENT_DATE
ORDER BY event_date ASC, created_at DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(event_date, is_published, expires_at);

-- Grant necessary permissions
GRANT SELECT ON active_events TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;

-- RLS policy for the new column (inherit existing policies)
-- The expires_at column will be covered by existing RLS policies on the events table

-- Validation: Check that expires_at was added correctly
DO $$
DECLARE
    column_exists BOOLEAN;
    sample_count INTEGER;
BEGIN
    -- Check if column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'expires_at'
    ) INTO column_exists;

    IF NOT column_exists THEN
        RAISE EXCEPTION 'Migration failed: expires_at column was not created';
    END IF;

    -- Check that existing events have expires_at set
    SELECT COUNT(*)
    FROM events
    WHERE expires_at IS NULL
    INTO sample_count;

    IF sample_count > 0 THEN
        RAISE WARNING 'Warning: % events still have NULL expires_at', sample_count;
    END IF;

    RAISE NOTICE 'Migration 004 completed successfully: expires_at column added to events table';
END $$;
