-- ============================================
-- AUTO-EXPIRATION AND CLEANUP FOR EVENTS & OPPORTUNITIES
-- ============================================

-- Add expires_at column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add expires_at column to opportunities table (if not already exists from deadline)
-- We'll use the deadline as expiration date for opportunities

-- Update existing events to set expiration date (7 days after event_date)
UPDATE events
SET expires_at = (event_date + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE
WHERE expires_at IS NULL;

-- Update existing opportunities to set expiration date based on deadline
UPDATE opportunities
SET updated_at = deadline
WHERE deadline IS NOT NULL AND updated_at < deadline;

-- Create function to automatically delete expired events
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS void AS $$
BEGIN
    -- Delete expired events (past their expiration date)
    DELETE FROM events
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND event_date < CURRENT_DATE;

    -- Delete expired opportunities (past their deadline)
    DELETE FROM opportunities
    WHERE deadline IS NOT NULL
    AND deadline < NOW();

    -- Log cleanup activity
    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

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

-- Create function to check and cleanup on startup
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS void AS $$
BEGIN
    -- This function can be called periodically to clean up expired items
    PERFORM cleanup_expired_events();
END;
$$ LANGUAGE plpgsql;

-- Create a view for active (non-expired) events and opportunities combined
CREATE OR REPLACE VIEW active_events_and_opportunities AS
SELECT
    id,
    title,
    description,
    'event' as item_type,
    event_date as date,
    start_time,
    end_time,
    location,
    organizer as company_name,
    NULL as type,
    NULL as application_link,
    registration_deadline as deadline,
    expires_at,
    is_published,
    created_at,
    updated_at
FROM events
WHERE is_published = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND event_date >= CURRENT_DATE

UNION ALL

SELECT
    id,
    title,
    description,
    'opportunity' as item_type,
    deadline::DATE as date,
    NULL as start_time,
    NULL as end_time,
    location,
    company_name,
    type,
    application_link,
    deadline,
    deadline as expires_at,
    is_published,
    created_at,
    updated_at
FROM opportunities
WHERE is_published = true
    AND (deadline IS NULL OR deadline > NOW())

ORDER BY date ASC, created_at DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(event_date, is_published, expires_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON opportunities(deadline, is_published);

-- Grant necessary permissions
GRANT SELECT ON active_events_and_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;
GRANT EXECUTE ON FUNCTION schedule_cleanup() TO service_role;

-- Insert some example cleanup job (you can run this manually or set up a cron job)
-- This is a comment showing how to run periodic cleanup:
-- SELECT cron.schedule('cleanup-expired-content', '0 2 * * *', 'SELECT cleanup_expired_events();');

-- Manual cleanup function call (run this after migration)
SELECT cleanup_expired_events();

COMMIT;
