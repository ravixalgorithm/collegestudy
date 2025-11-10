# Debug Authentication Flow

## Current Issue
Admin dashboard shows "Not authenticated" error when creating notifications.

## Debug Steps

### 1. Check Browser Console
Open browser dev tools (F12) and check for:
- Session errors
- Supabase authentication logs
- Any RLS (Row Level Security) errors

### 2. Verify Admin User in Database
Run this query in Supabase SQL editor:

```sql
-- Check if your user exists and is admin
SELECT id, email, name, is_admin, created_at 
FROM users 
WHERE email = 'your-admin-email@domain.com';

-- If user doesn't exist or is_admin = false, update:
UPDATE users 
SET is_admin = true 
WHERE email = 'your-admin-email@domain.com';
```

### 3. Check Session Storage
In browser dev tools > Application > Local Storage:
- Look for `sb-[project-id]-auth-token`
- Verify it exists and is not expired

### 4. Test Manual Query
In browser console, run:

```javascript
// Check current session
const { data: session } = await supabase.auth.getSession();
console.log('Session:', session);

// Check user in database
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', session?.session?.user?.id)
  .single();
console.log('User from DB:', user);
```

### 5. Common Fixes

#### Fix 1: Clear Session and Re-login
```javascript
await supabase.auth.signOut();
// Then login again
```

#### Fix 2: Manually Set Admin Status
```sql
UPDATE users 
SET is_admin = true 
WHERE id = 'your-user-uuid';
```

#### Fix 3: Check RLS Policies
```sql
-- Disable RLS temporarily for testing
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
```

### 6. Environment Variables Check
Verify in admin dashboard `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7. Quick Test Notification
Try creating a simple notification directly in Supabase:

```sql
-- Insert test notification
INSERT INTO notifications (title, message, type, priority, is_published, created_by)
VALUES (
  'Test Notification',
  'This is a test message',
  'custom',
  'normal',
  true,
  'your-user-uuid'
);

-- Check if it appears in dashboard
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### 8. Network Tab Check
In browser dev tools > Network tab:
- Look for failed requests to Supabase
- Check for 401 Unauthorized errors
- Verify request headers include auth token

### 9. Simplified Auth Check
Add this to notifications page for debugging:

```javascript
useEffect(() => {
  const debugAuth = async () => {
    console.log('=== AUTH DEBUG START ===');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Session Error:', error);
    
    if (session?.user) {
      console.log('User ID:', session.user.id);
      console.log('User Email:', session.user.email);
      
      try {
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        console.log('DB User:', dbUser);
        console.log('DB Error:', dbError);
        console.log('Is Admin:', dbUser?.is_admin);
      } catch (e) {
        console.log('DB Query Failed:', e);
      }
    }
    
    console.log('=== AUTH DEBUG END ===');
  };
  
  debugAuth();
}, []);
```

### 10. Expected Output
When working correctly, you should see:
- Session with valid user object
- User exists in database with `is_admin: true`
- No RLS errors
- Successful notification creation

### 11. Contact Points
If still failing:
1. Check Supabase dashboard > Authentication > Users
2. Verify RLS policies in Database > Policies
3. Check database logs in Supabase dashboard
4. Ensure JWT token is valid and not expired

### 12. Last Resort
If nothing works, try bypassing auth temporarily:

```sql
-- Create notification directly in database
INSERT INTO notifications (title, message, type, priority, is_published)
VALUES ('Direct Insert Test', 'This was inserted directly', 'custom', 'normal', true);

-- Then check if it appears in the admin dashboard
```
