-- ============================================
-- MIGRATION 010: SETUP PROFILE STORAGE
-- ============================================

-- Create profiles storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile images
CREATE POLICY "Users can upload their own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can view all profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON storage.objects TO authenticated;
GRANT INSERT ON storage.objects TO authenticated;
GRANT UPDATE ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;

-- Create function to clean up old profile images when new ones are uploaded
CREATE OR REPLACE FUNCTION cleanup_old_profile_images()
RETURNS TRIGGER AS $$
DECLARE
  user_folder TEXT;
BEGIN
  -- Extract user ID from the file path (userid/filename.ext)
  user_folder := split_part(NEW.name, '/', 1);

  -- Delete old profile images for the same user (keep only the latest one)
  DELETE FROM storage.objects
  WHERE bucket_id = 'profiles'
  AND name LIKE user_folder || '/%'
  AND name != NEW.name
  AND created_at < NEW.created_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically cleanup old images
CREATE TRIGGER cleanup_profile_images_trigger
AFTER INSERT ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id = 'profiles')
EXECUTE FUNCTION cleanup_old_profile_images();

-- Update users table to ensure photo_url column exists with proper type
ALTER TABLE users
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create index for faster photo URL lookups
CREATE INDEX IF NOT EXISTS idx_users_photo_url ON users(photo_url) WHERE photo_url IS NOT NULL;

-- Grant bucket permissions
GRANT ALL ON storage.buckets TO authenticated;
