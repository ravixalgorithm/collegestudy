-- Update Notes Table for Google Drive Links
-- This removes file_size and ensures the table is optimized for Google Drive links

-- First, check if file_size column exists and remove it if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notes'
        AND column_name = 'file_size'  ) THEN
        ALTER TABLE notes DROP COLUMN file_size;
    END IF;
END $$;

-- Ensure file_url is properly configured for Google Drive links
ALTER TABLE notes
    ALTER COLUMN file_url TYPE TEXT,
    ALTER COLUMN file_url SET NOT NULL;

-- Update file_type to be more flexible
ALTER TABLE notes
    ALTER COLUMN file_type TYPE VARCHAR(50),
    ALTER COLUMN file_type DROP NOT NULL;

-- Add a comment to the file_url column
COMMENT ON COLUMN notes.file_url IS 'Google Drive shareable link for the note file';

-- Create an index on file_type for better filtering
CREATE INDEX IF NOT EXISTS idx_notes_file_type ON notes(file_type);

-- Update any existing notes with NULL file_type to 'PDF'
UPDATE notes
SET file_type = 'PDF'
WHERE file_type IS NULL;

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notes'
AND column_name IN ('file_url', 'file_type', 'file_size')
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Notes table successfully updated for Google Drive links!';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Removed file_size column (not needed for Google Drive)';
    RAISE NOTICE '2. Ensured file_url is TEXT type for long Google Drive URLs';
    RAISE NOTICE '3. Made file_type more flexible (VARCHAR(50))';
    RAISE NOTICE '4. Added index on file_type for better performance';
    RAISE NOTICE '5. Set default file_type to PDF for existing records';
END $$;
