-- ============================================
-- MINIMAL REAL DOWNLOAD TRACKING SETUP
-- ============================================
-- Simple step-by-step setup to avoid column errors

BEGIN;

-- ============================================
-- STEP 1: CLEAN UP EXISTING FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS track_note_download(UUID, UUID, TEXT, TEXT, BIGINT);
DROP FUNCTION IF EXISTS get_download_analytics();

-- ============================================
-- STEP 2: RESET DOWNLOAD COUNTS
-- ============================================
UPDATE notes SET download_count = 0;

-- ============================================
-- STEP 3: CREATE DOWNLOAD TRACKING TABLE
-- ============================================
DROP TABLE IF EXISTS note_downloads CASCADE;

CREATE TABLE note_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL,
    user_id UUID NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_date DATE DEFAULT CURRENT_DATE
);

-- Add foreign key constraints
ALTER TABLE note_downloads
ADD CONSTRAINT fk_note_downloads_note_id
FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;

ALTER TABLE note_downloads
ADD CONSTRAINT fk_note_downloads_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE note_downloads
ADD CONSTRAINT unique_download_per_day
UNIQUE (note_id, user_id, download_date);

-- Create indexes
CREATE INDEX idx_note_downloads_note_id ON note_downloads(note_id);
CREATE INDEX idx_note_downloads_user_id ON note_downloads(user_id);
CREATE INDEX idx_note_downloads_date ON note_downloads(download_date);

-- ============================================
-- STEP 4: CREATE TRACKING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION track_note_download(
    p_note_id UUID,
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_file_size BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    download_exists BOOLEAN := FALSE;
    download_id UUID;
    note_title TEXT;
BEGIN
    -- Check if note exists
    SELECT title INTO note_title FROM notes WHERE id = p_note_id AND is_verified = true;

    IF note_title IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Note not found'
        );
    END IF;

    -- Check if already downloaded today
    SELECT EXISTS(
        SELECT 1 FROM note_downloads
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND download_date = CURRENT_DATE
    ) INTO download_exists;

    IF download_exists THEN
        RETURN json_build_object(
            'success', true,
            'already_downloaded', true,
            'message', 'Already downloaded today'
        );
    END IF;

    -- Record new download
    INSERT INTO note_downloads (note_id, user_id, download_date)
    VALUES (p_note_id, p_user_id, CURRENT_DATE)
    RETURNING id INTO download_id;

    -- Increment count in notes table
    UPDATE notes
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = p_note_id;

    RETURN json_build_object(
        'success', true,
        'already_downloaded', false,
        'download_id', download_id,
        'message', 'Download tracked'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END $$;

-- ============================================
-- STEP 5: CREATE ANALYTICS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_download_analytics()
RETURNS TABLE (
    total_downloads BIGINT,
    unique_users BIGINT,
    unique_notes BIGINT,
    downloads_today BIGINT,
    downloads_this_week BIGINT,
    downloads_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT user_id)::BIGINT,
        COUNT(DISTINCT note_id)::BIGINT,
        COUNT(*) FILTER (WHERE download_date = CURRENT_DATE)::BIGINT,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '7 days')::BIGINT,
        COUNT(*) FILTER (WHERE download_date >= CURRENT_DATE - INTERVAL '30 days')::BIGINT
    FROM note_downloads;
END $$;

-- ============================================
-- STEP 6: CREATE OTHER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_popular_notes(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    note_id UUID,
    title VARCHAR(255),
    download_count BIGINT,
    subject_name VARCHAR(255),
    subject_code VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        COALESCE(n.download_count, 0)::BIGINT,
        COALESCE(s.name, 'Unknown'::VARCHAR(255)),
        COALESCE(s.code, 'N/A'::VARCHAR(50))
    FROM notes n
    LEFT JOIN subjects s ON n.subject_id = s.id
    WHERE n.is_verified = true
    ORDER BY COALESCE(n.download_count, 0) DESC
    LIMIT p_limit;
END $$;

CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID)
RETURNS TABLE (
    saved_opportunities BIGINT,
    downloaded_notes BIGINT,
    total_events BIGINT,
    forum_posts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM opportunity_bookmarks WHERE user_id = p_user_id)::BIGINT,
        (SELECT COUNT(DISTINCT note_id) FROM note_downloads WHERE user_id = p_user_id)::BIGINT,
        (SELECT COUNT(*) FROM events WHERE is_published = true)::BIGINT,
        0::BIGINT;
END $$;

CREATE OR REPLACE FUNCTION get_daily_activity(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    downloads BIGINT,
    new_users BIGINT,
    notes_uploaded BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days - 1),
            CURRENT_DATE,
            '1 day'::interval
        )::date AS date
    )
    SELECT
        ds.date,
        COALESCE((SELECT COUNT(*) FROM note_downloads WHERE download_date = ds.date), 0)::BIGINT,
        0::BIGINT,
        0::BIGINT
    FROM date_series ds
    ORDER BY ds.date;
END $$;

-- ============================================
-- STEP 7: SETUP SECURITY
-- ============================================
ALTER TABLE note_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads" ON note_downloads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads" ON note_downloads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all" ON note_downloads
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ============================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON note_downloads TO authenticated;
GRANT EXECUTE ON FUNCTION track_note_download TO authenticated;
GRANT EXECUTE ON FUNCTION get_download_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_notes TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity TO authenticated;

-- ============================================
-- STEP 9: TEST AND VERIFY
-- ============================================
SELECT 'Real download tracking setup complete!' as result;

-- Show current state (should be zeros)
SELECT * FROM get_download_analytics();
SELECT * FROM get_popular_notes(3);

-- Show table was created
SELECT
    COUNT(*) as download_records,
    'note_downloads table ready' as status
FROM note_downloads;

COMMIT;
