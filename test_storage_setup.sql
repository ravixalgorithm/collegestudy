-- ============================================
-- STORAGE BUCKET TEST AND TROUBLESHOOTING
-- ============================================

-- Test if profiles bucket exists
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'profiles';

-- Check storage policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%profile%';

-- Test storage permissions for authenticated users
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'storage'
AND table_name = 'objects'
AND grantee = 'authenticated';

-- Function to test storage upload permissions
CREATE OR REPLACE FUNCTION test_storage_permissions()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    -- Test 1: Check if bucket exists
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profiles') THEN
        RETURN QUERY SELECT 'Bucket Exists'::TEXT, 'PASS'::TEXT, 'Profiles bucket is configured'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Bucket Exists'::TEXT, 'FAIL'::TEXT, 'Profiles bucket not found - run migration 010'::TEXT;
    END IF;

    -- Test 2: Check bucket is public
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profiles' AND public = true) THEN
        RETURN QUERY SELECT 'Bucket Public'::TEXT, 'PASS'::TEXT, 'Bucket is public for file access'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Bucket Public'::TEXT, 'FAIL'::TEXT, 'Bucket should be public for image display'::TEXT;
    END IF;

    -- Test 3: Check file size limit
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profiles' AND file_size_limit >= 5242880) THEN
        RETURN QUERY SELECT 'File Size Limit'::TEXT, 'PASS'::TEXT, 'File size limit is adequate (5MB+)'::TEXT;
    ELSE
        RETURN QUERY SELECT 'File Size Limit'::TEXT, 'WARN'::TEXT, 'File size limit may be too small'::TEXT;
    END IF;

    -- Test 4: Check MIME types
    IF EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'profiles'
        AND 'image/jpeg' = ANY(allowed_mime_types)
        AND 'image/png' = ANY(allowed_mime_types)
    ) THEN
        RETURN QUERY SELECT 'MIME Types'::TEXT, 'PASS'::TEXT, 'Image MIME types are allowed'::TEXT;
    ELSE
        RETURN QUERY SELECT 'MIME Types'::TEXT, 'FAIL'::TEXT, 'Required image MIME types not configured'::TEXT;
    END IF;

    -- Test 5: Check RLS policies exist
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND schemaname = 'storage'
        AND policyname LIKE '%profile%'
    ) THEN
        RETURN QUERY SELECT 'RLS Policies'::TEXT, 'PASS'::TEXT, 'Profile storage policies exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS Policies'::TEXT, 'FAIL'::TEXT, 'Storage policies missing - check migration'::TEXT;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_storage_permissions() TO authenticated;

-- Function to create profiles bucket if it doesn't exist (emergency fix)
CREATE OR REPLACE FUNCTION create_profiles_bucket_emergency()
RETURNS TEXT AS $$
BEGIN
    -- Create bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'profiles',
        'profiles',
        true,
        5242880, -- 5MB
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    ) ON CONFLICT (id) DO NOTHING;

    RETURN 'Profiles bucket created/updated successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error creating bucket: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_profiles_bucket_emergency() TO authenticated;

-- Function to check user upload permissions
CREATE OR REPLACE FUNCTION check_user_upload_permissions(user_id UUID)
RETURNS TABLE (
    permission_type TEXT,
    has_permission BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Check if user can insert into storage.objects
    RETURN QUERY
    SELECT
        'INSERT'::TEXT,
        has_table_privilege(user_id, 'storage.objects', 'INSERT'),
        'Permission to upload files'::TEXT;

    -- Check if user can select from storage.objects
    RETURN QUERY
    SELECT
        'SELECT'::TEXT,
        has_table_privilege(user_id, 'storage.objects', 'SELECT'),
        'Permission to view files'::TEXT;

    -- Check if user can update storage.objects
    RETURN QUERY
    SELECT
        'UPDATE'::TEXT,
        has_table_privilege(user_id, 'storage.objects', 'UPDATE'),
        'Permission to replace files'::TEXT;

    -- Check if user can delete from storage.objects
    RETURN QUERY
    SELECT
        'DELETE'::TEXT,
        has_table_privilege(user_id, 'storage.objects', 'DELETE'),
        'Permission to remove files'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_user_upload_permissions(UUID) TO authenticated;

-- View to check current storage usage
CREATE OR REPLACE VIEW storage_usage AS
SELECT
    bucket_id,
    COUNT(*) as file_count,
    COALESCE(SUM(
        CASE
            WHEN jsonb_typeof(metadata->'size') = 'number'
            THEN (metadata->>'size')::bigint
            ELSE 0
        END
    ), 0) as total_size_bytes,
    pg_size_pretty(COALESCE(SUM(
        CASE
            WHEN jsonb_typeof(metadata->'size') = 'number'
            THEN (metadata->>'size')::bigint
            ELSE 0
        END
    ), 0)) as total_size_readable,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'profiles'
GROUP BY bucket_id;

-- Grant access to view
GRANT SELECT ON storage_usage TO authenticated;

-- Troubleshooting queries to run manually:

-- 1. Run this to test storage setup:
-- SELECT * FROM test_storage_permissions();

-- 2. Check if bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'profiles';

-- 3. Emergency bucket creation (if needed):
-- SELECT create_profiles_bucket_emergency();

-- 4. Check storage usage:
-- SELECT * FROM storage_usage;

-- 5. Check user permissions (replace with actual user ID):
-- SELECT * FROM check_user_upload_permissions('your-user-id-here');

-- 6. Check recent uploads:
-- SELECT name, created_at, metadata FROM storage.objects
-- WHERE bucket_id = 'profiles'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 7. Test RLS policies:
-- SET row_security = on;
-- SELECT * FROM storage.objects WHERE bucket_id = 'profiles';
