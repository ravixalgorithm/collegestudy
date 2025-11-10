# Owner Role System Setup Guide

This guide walks you through setting up the new hierarchical permission system with Owner, Admin, and Student roles.

## 🏗️ System Overview

### Role Hierarchy
```
OWNER (Ultimate Control)
├── Can manage all users
├── Can create/remove admins
├── Can remove any user (except other owners)
├── Can post content
└── Access to all features

ADMIN (Content Management)
├── Can post content
├── Can manage notes, events, etc.
├── Cannot manage users
└── No user management permissions

STUDENT (Basic Access)
├── Can use app features
├── Can download notes
├── Can view events
└── No management permissions
```

## 📋 Setup Steps

### Step 1: Run Database Migration

Execute the migration SQL in Supabase SQL Editor:

```sql
-- Run the contents of add_owner_role_system.sql in Supabase Dashboard
```

This will:
- Add `role` enum type and column to users table
- Create permission functions
- Update RLS policies
- Set up user management functions

### Step 2: Create Your First Owner Account

**Important:** Owners can only be created via database, not through the UI.

In Supabase SQL Editor, run:

```sql
-- Replace with your actual email and name
SELECT create_owner_account('your-email@example.com', 'Your Name');
```

Example:
```sql
SELECT create_owner_account('admin@college.edu', 'System Administrator');
```

### Step 3: Verify Setup

Check if the migration worked:

```sql
-- Check role distribution
SELECT 
    role,
    COUNT(*) as count
FROM users 
GROUP BY role;

-- Verify your owner account
SELECT id, email, name, role 
FROM users 
WHERE role = 'owner';
```

### Step 4: Update Admin Dashboard

The admin dashboard has been updated to support the new role system:

- **For Owners**: Full user management interface
- **For Admins**: Content management only
- **For Students**: Basic access

## 🔧 Owner Functions

### Available Functions for Owners

1. **Promote to Admin**
   ```sql
   SELECT promote_to_admin('user-uuid-here');
   ```

2. **Demote to Student**
   ```sql
   SELECT demote_to_student('user-uuid-here');
   ```

3. **Remove User**
   ```sql
   SELECT remove_user('user-uuid-here');
   ```

4. **Check User Role**
   ```sql
   SELECT get_user_role('user-uuid-here');
   ```

## 🛡️ Security Features

### Protection Mechanisms
- **Owner Protection**: Owners cannot be demoted or removed by other owners
- **Admin Limitations**: Admins cannot access user management functions
- **Database-Only Owner Creation**: Prevents unauthorized owner account creation
- **RLS Policies**: Row-level security enforces permissions at database level

### Permission Matrix

| Action | Student | Admin | Owner |
|--------|---------|-------|-------|
| Use App Features | ✅ | ✅ | ✅ |
| Post Content | ❌ | ✅ | ✅ |
| Manage Notes/Events | ❌ | ✅ | ✅ |
| View User List | ❌ | ❌ | ✅ |
| Promote to Admin | ❌ | ❌ | ✅ |
| Demote Admin | ❌ | ❌ | ✅ |
| Remove Users | ❌ | ❌ | ✅ |
| Create Owners | ❌ | ❌ | ✅* |

*Only via database function

## 📱 Admin Dashboard Features

### For Owners
- Complete user management interface
- Role-based user filtering
- Promote/demote/remove actions
- User statistics with role breakdown
- Protection indicators for owner accounts

### For Admins
- Content management features
- Cannot access user management
- Limited to posting and content moderation

### For Students
- Basic dashboard access
- No administrative features

## 🚨 Important Notes

### Security Considerations
1. **First Owner**: Create your first owner account immediately after migration
2. **Backup Access**: Consider creating a backup owner account
3. **Email Verification**: Ensure owner email addresses are secure
4. **Database Access**: Limit who has direct database access

### Best Practices
1. **Minimal Owners**: Keep the number of owners to minimum (1-2)
2. **Regular Audits**: Periodically review user roles
3. **Documentation**: Document any manual role changes
4. **Testing**: Test role permissions in development first

## 🔄 Migration from Old System

The migration automatically converts existing users:
- `is_admin = true` → `role = 'admin'`
- `is_admin = false` → `role = 'student'`

The `is_admin` column is kept for backward compatibility but `role` is now the primary field.

## 🛠️ Troubleshooting

### Common Issues

**1. Cannot create owner account**
```sql
-- Check if you're already an owner
SELECT role FROM users WHERE id = auth.uid();

-- If not owner, make sure no owners exist yet, or ask existing owner
```

**2. Functions not found**
- Ensure migration ran completely
- Check function permissions: `GRANT EXECUTE ON FUNCTION function_name TO authenticated;`

**3. Permission denied errors**
- Verify RLS policies are set correctly
- Check user role in database
- Ensure proper authentication

### Emergency Access

If you lose owner access:

```sql
-- Direct database update (requires superuser access)
UPDATE users 
SET role = 'owner' 
WHERE email = 'your-email@example.com';
```

## 📞 Support

If you encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify function execution permissions
3. Test with a fresh user account
4. Review RLS policies in Supabase dashboard

## 🎯 Next Steps

After setup:
1. Create your first owner account
2. Test user management features
3. Create admin accounts as needed
4. Train team on new role system
5. Update any external integrations

The owner role system provides fine-grained control over your application's user management while maintaining security and preventing unauthorized access escalation.