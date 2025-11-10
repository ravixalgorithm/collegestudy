-- ============================================
-- SIMPLE PROFILE STORAGE SETUP
-- ============================================

-- Create profiles storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Create policy for users to upload their own profile images
CREATE POLICY "Users can upload their own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create policy for users to view all profile images (needed for display)
CREATE POLICY "Users can view all profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');

-- Create policy for users to update their own profile images
CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create policy for users to delete their own profile images
CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Ensure photo_url column exists in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Test function to verify setup
CREATE OR REPLACE FUNCTION test_profile_storage_setup()
RETURNS TEXT AS $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check bucket exists
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id = 'profiles';

  -- Check policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%profile%';

  IF bucket_count = 1 AND policy_count >= 4 THEN
    RETURN 'SUCCESS: Profile storage is properly configured';
  ELSE
    RETURN 'ERROR: Setup incomplete - bucket count: ' || bucket_count || ', policy count: ' || policy_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute on test function
GRANT EXECUTE ON FUNCTION test_profile_storage_setup() TO authenticated;

-- Test the setup
SELECT test_profile_storage_setup();
