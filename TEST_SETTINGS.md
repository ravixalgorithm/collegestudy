# Settings Test Guide

## Quick Test Steps

### 1. Database Setup
Run this in Supabase SQL Editor:
```sql
-- Copy and paste from create_user_preferences_table.sql
-- This creates the user_preferences table and functions
```

### 2. Test Settings Page

1. **Open app** → Profile → Settings
2. **Check what's visible**:
   - ✅ Should see: General notifications, Notes, Events, Announcements
   - ✅ Should see: Auto Download, Offline Mode, Sound Effects
   - ✅ Should see: Profile Visibility, Show Activity
   - ❌ Should NOT see: Forum notifications
   - ❌ Should NOT see: Dark Mode option

3. **Test saving**:
   - Toggle any setting ON/OFF
   - Should save without error messages
   - Close app completely
   - Reopen app → Settings
   - Setting should be saved in same state

### 3. Test Reset Function
1. Change several settings from defaults
2. Tap "Reset All Settings"
3. Confirm reset
4. All settings should return to default values

## Expected Behavior

### Working Features:
- ✅ Notification toggles (General, Notes, Events, Announcements)
- ✅ App preference toggles (Auto Download, Offline Mode, Sound)
- ✅ Privacy toggles (Profile Visibility, Show Activity) 
- ✅ Settings persistence across app restarts
- ✅ Reset to defaults functionality
- ✅ Clear cache option
- ✅ About/Privacy Policy dialogs

### Removed Features:
- ❌ Forum notifications (not needed)
- ❌ Dark mode toggle (removed per request)

## Troubleshooting

**Settings not saving?**
- Check internet connection
- Verify database setup completed
- Check Supabase logs for errors

**Reset not working?**
- Ensure you're logged in
- Check database functions were created
- Try logging out and back in

## Success Criteria
- No forum option visible
- No dark mode option visible  
- All remaining settings save and persist
- Reset function works properly
- No error messages when toggling settings