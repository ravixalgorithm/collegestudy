# Photo Upload Fix - Step by Step Guide

## Quick Fix for "Network request failed" Error

Follow these steps in order to resolve photo upload issues:

### Step 1: Run Simple Storage Setup

Copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Essential Profile Storage Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create upload policy
CREATE POLICY "Users can upload profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create view policy
CREATE POLICY "Users can view profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Ensure photo_url column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### Step 2: Test Storage Setup

Run this test query:

```sql
-- Test if everything is configured
SELECT
  CASE
    WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'profiles')
    THEN 'BUCKET: ✅ EXISTS'
    ELSE 'BUCKET: ❌ MISSING'
  END as bucket_status,
  
  CASE
    WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%profile%')
    THEN 'POLICIES: ✅ CONFIGURED'
    ELSE 'POLICIES: ❌ MISSING'
  END as policy_status;
```

**Expected Result:** Both should show ✅

### Step 3: Test Manual Upload

1. Go to Supabase Dashboard → Storage
2. Open the "profiles" bucket
3. Try uploading a test image manually
4. If this fails, repeat Step 1

### Step 4: Check App Configuration

Verify your Supabase configuration in `src/lib/supabase.ts`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'  // Should end with .supabase.co
const supabaseAnonKey = 'YOUR_ANON_KEY'   // Should be long string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 5: Test Photo Upload in App

1. Open the app
2. Go to Profile → Edit Profile
3. Tap on profile photo
4. Select "Gallery" and choose a small image (< 1MB)
5. Check console logs for errors

### Step 6: Check Console Logs

Enable debug mode and look for these logs:

**Successful Upload:**
```
Starting photo upload: user-id/timestamp.jpg
Upload successful: {Key: "..."}
Public URL: https://...
```

**Failed Upload:**
```
Error uploading photo: [Error: ...]
Upload error details: {...}
```

### Common Issues and Quick Fixes

#### Issue 1: "Bucket not found"
**Fix:** Run Step 1 again

#### Issue 2: "Permission denied"
**Fix:** Check if user is authenticated:
```sql
SELECT auth.uid(); -- Should return user ID, not null
```

#### Issue 3: "File too large"
**Fix:** Use images smaller than 5MB

#### Issue 4: "Invalid file format"
**Fix:** Use only JPG, PNG, or WebP images

### Emergency Reset (If Nothing Works)

If all else fails, run this complete reset:

```sql
-- 1. Drop existing bucket and policies
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile images" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'profiles';

-- 2. Start fresh
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- 3. Create minimal policies
CREATE POLICY "profile_upload" ON storage.objects
FOR ALL USING (bucket_id = 'profiles');

-- 4. Grant all permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
```

### Verify Fix Works

After completing the steps:

1. ✅ Storage bucket exists
2. ✅ Manual upload works in Supabase Dashboard
3. ✅ App can upload photos without "Network request failed"
4. ✅ Photos display in profile page

### Still Not Working?

Check these final items:

1. **Internet Connection:** Ensure stable connection
2. **Supabase Status:** Check https://status.supabase.com
3. **Project Limits:** Verify you haven't exceeded storage limits
4. **API Keys:** Ensure anon key has storage permissions

### Success Checklist

- [ ] SQL setup completed without errors
- [ ] Test query shows ✅ for both bucket and policies
- [ ] Manual upload works in Supabase Dashboard
- [ ] App upload works without "Network request failed"
- [ ] Profile photo displays correctly

If all checkboxes are ✅, photo upload should work perfectly!

### Support

If you still encounter issues:

1. Run the test query from Step 2
2. Share the results
3. Include console error logs from Step 5
4. Specify which step failed

This will help identify the exact issue quickly.