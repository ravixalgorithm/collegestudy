-- ============================================
-- Fix Events Table - Add expires_at Column
-- Date: 2024-12-07
-- Description: Simple fix to add missing expires_at column to events table
-- ============================================

-- Add expires_at column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Set expires_at to 7 days after event_date for existing events
UPDATE events
SET expires_at = event_date + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);

-- Add comment for clarity
COMMENT ON COLUMN events.expires_at IS 'When this event expires and can be deleted (auto-set to 7 days after event_date)';

-- Verify the fix
SELECT
    'Events table fixed!' as status,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL) as events_with_expiration
FROM events;

-- Success message
SELECT 'SUCCESS: expires_at column added to events table' as message;
