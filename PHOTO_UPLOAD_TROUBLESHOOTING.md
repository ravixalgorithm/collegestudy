# Photo Upload Troubleshooting Guide

## Common Photo Upload Issues and Solutions

### Error: "Network request failed"

This is the most common error when uploading photos to Supabase storage. Here are the solutions:

#### 1. Check Storage Bucket Setup

First, run the storage setup migration:

```sql
-- Run this in Supabase SQL Editor
-- Copy content from: supabase/migrations/010_setup_profile_storage.sql
```

#### 2. Test Storage Configuration

Run these test queries in Supabase SQL Editor:

```sql
-- Test 1: Check if profiles bucket exists
SELECT * FROM storage.buckets WHERE id = 'profiles';

-- Test 2: Run comprehensive storage test
SELECT * FROM test_storage_permissions();

-- Test 3: Emergency bucket creation (if needed)
SELECT create_profiles_bucket_emergency();
```

#### 3. Verify Bucket Configuration

The profiles bucket should have:
- ✅ **Public**: `true` (for displaying images)
- ✅ **File Size Limit**: `5242880` (5MB)
- ✅ **Allowed MIME Types**: `['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`

#### 4. Check RLS Policies

Ensure these policies exist on `storage.objects`:
- `Users can upload their own profile images`
- `Users can view all profile images`
- `Users can update their own profile images`
- `Users can delete their own profile images`

### Error: "File too large"

#### Solution:
- Images must be under 5MB
- The app automatically checks file size before upload
- Compress images if needed

### Error: "Permission denied"

#### Solutions:

1. **Check Authentication**:
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

2. **Verify RLS Policies**:
   ```sql
   -- Check if policies are active
   SELECT * FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage';
   ```

3. **Test User Permissions**:
   ```sql
   -- Replace 'user-id-here' with actual user ID
   SELECT * FROM check_user_upload_permissions('user-id-here');
   ```

### Error: "Invalid file format"

#### Solution:
Only these image formats are allowed:
- JPEG/JPG
- PNG
- WebP

### Manual Bucket Setup (Emergency)

If the migration didn't work, manually create the bucket:

```sql
-- 1. Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- 2. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create upload policy
CREATE POLICY "Users can upload profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- 4. Create view policy
CREATE POLICY "Users can view profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');
```

### Debug Photo Upload Process

#### 1. Enable Debug Logging

In the app, check the console logs during upload:

```javascript
// These logs should appear during upload:
console.log("Starting photo upload:", fileName);
console.log("Upload successful:", uploadData);
console.log("Public URL:", photoUrl);
```

#### 2. Test Upload Manually

Test upload in Supabase Dashboard:
1. Go to Storage → profiles bucket
2. Try uploading a test image manually
3. If manual upload fails, bucket setup is incorrect

#### 3. Check File Path Structure

Files should be uploaded as: `{user-id}/{timestamp}.{extension}`

Example: `123e4567-e89b-12d3-a456-426614174000/1699123456789.jpg`

### Network Issues

#### Solutions:

1. **Check Internet Connection**:
   - Ensure device has stable internet
   - Test other network requests in the app

2. **Supabase URL Configuration**:
   ```javascript
   // Verify in src/lib/supabase.ts
   const supabaseUrl = 'your-project-url'
   const supabaseKey = 'your-anon-key'
   ```

3. **Timeout Issues**:
   - Large images may timeout on slow connections
   - Consider adding image compression

### Alternative Upload Method

If the current method fails, try this alternative approach:

```javascript
// Alternative upload using FormData
async function uploadPhotoAlternative(photoUri, userId) {
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  });

  const { data, error } = await supabase.storage
    .from('profiles')
    .upload(`${userId}/${Date.now()}.jpg`, formData);
    
  return { data, error };
}
```

### Quick Fix Checklist

When photo upload fails, check these in order:

1. ✅ Is the user authenticated?
2. ✅ Does the profiles bucket exist?
3. ✅ Are RLS policies configured?
4. ✅ Is the image under 5MB?
5. ✅ Is the image format supported?
6. ✅ Does the user have internet connection?
7. ✅ Are console logs showing any specific errors?

### Testing Storage Setup

Run this complete test:

```sql
-- Complete storage test
DO $$
DECLARE
    bucket_exists BOOLEAN;
    policies_exist BOOLEAN;
BEGIN
    -- Check bucket
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'profiles') INTO bucket_exists;
    
    -- Check policies
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname LIKE '%profile%'
    ) INTO policies_exist;
    
    -- Report results
    IF bucket_exists AND policies_exist THEN
        RAISE NOTICE 'STORAGE SETUP: ✅ COMPLETE';
    ELSE
        RAISE NOTICE 'STORAGE SETUP: ❌ MISSING - bucket: %, policies: %', bucket_exists, policies_exist;
    END IF;
END $$;
```

### Contact Support

If none of these solutions work:

1. Run the storage test: `SELECT * FROM test_storage_permissions();`
2. Check console logs for specific error messages
3. Verify Supabase project configuration in dashboard
4. Consider checking Supabase status page for service issues

### Common File Upload Patterns

#### Successful Upload Log:
```
Starting photo upload: user-id/timestamp.jpg
Upload successful: {Key: "user-id/timestamp.jpg", ...}
Public URL: https://...supabase.co/storage/v1/object/public/profiles/user-id/timestamp.jpg
```

#### Failed Upload Log:
```
Error uploading photo: [Error: Photo upload failed: ...]
Upload error details: {statusCode: 400, error: "..."}
```

Use these logs to identify the specific issue and apply the appropriate solution above.