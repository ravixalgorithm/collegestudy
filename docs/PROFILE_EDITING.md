# Profile Editing Documentation

## Overview

The mobile app now includes comprehensive profile editing functionality that allows users to update their personal information, academic details, and app preferences. This feature ensures that students can keep their profiles current and customize their experience.

## Features

### 1. Profile Viewing & Editing
- **View Profile**: Complete profile overview with academic information and activity stats
- **Edit Profile**: Comprehensive form to update all profile fields
- **Photo Management**: Profile photo upload and removal (coming soon)
- **Real-time Validation**: Form validation with helpful error messages

### 2. Settings Management
- **Notifications**: Granular control over different notification types
- **App Preferences**: Dark mode, auto-download, sound settings
- **Privacy Controls**: Profile visibility and activity sharing settings
- **Storage Management**: Cache clearing and data usage monitoring

### 3. Navigation Flow
```
Profile Tab
├── View Profile (main screen)
│   ├── Edit Profile Button → Edit Screen
│   └── Settings Menu Item → Settings Screen
├── Edit Profile (/profile/edit)
│   ├── Form Fields
│   ├── Photo Upload
│   └── Save/Cancel Actions
└── Settings (/profile/settings)
    ├── Notification Settings
    ├── App Preferences
    ├── Privacy Controls
    └── Storage Management
```

## File Structure

```
mobile-app/app/
├── (tabs)/
│   └── profile.tsx           # Main profile screen
└── profile/
    ├── edit.tsx             # Profile editing form
    └── settings.tsx         # App settings screen
```

## Database Schema

### Users Table Fields

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),                    -- New: Phone number
    branch_id UUID REFERENCES branches(id),
    year INTEGER CHECK (year >= 1 AND year <= 4),
    semester INTEGER CHECK (semester >= 1 AND semester <= 8),
    roll_number VARCHAR(50),
    course VARCHAR(50) DEFAULT 'B.Tech',
    photo_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Optional: User Preferences Table

```sql
-- For storing app settings and preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_settings JSONB DEFAULT '{}',
    app_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

## Profile Edit Screen Features

### Form Fields

1. **Personal Information**
   - Full Name (required, min 2 characters)
   - Email Address (required, valid email format)
   - Phone Number (optional, 10-digit Indian format)

2. **Academic Information**
   - Course (default: B.Tech)
   - Branch (required, dropdown from branches table)
   - Year (required, 1-4)
   - Semester (required, validates against year)
   - Roll Number (optional)

3. **Profile Photo**
   - Current photo display
   - Upload new photo (placeholder for future implementation)
   - Remove existing photo

### Validation Rules

```typescript
interface ValidationRules {
  name: {
    required: true,
    minLength: 2,
    maxLength: 255
  },
  email: {
    required: true,
    format: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  phone: {
    required: false,
    format: /^[6-9]\d{9}$/,  // Indian mobile format
    length: 10
  },
  branch_id: {
    required: true,
    existsIn: 'branches.id'
  },
  year: {
    required: true,
    range: [1, 4]
  },
  semester: {
    required: true,
    range: [1, 8],
    validation: 'semester must match year (year*2-1 or year*2)'
  }
}
```

### Form Components

1. **Text Inputs**: Name, email, phone, course, roll number
2. **Dropdown Pickers**: Branch, year, semester
3. **Photo Uploader**: Profile photo management
4. **Save/Cancel**: Form actions with loading states

## Settings Screen Features

### Notification Settings

```typescript
interface NotificationSettings {
  general: boolean;           // General app notifications
  notes: boolean;            // New notes available
  events: boolean;           // Event reminders
  forum: boolean;            // Forum activity
  announcements: boolean;    // Important announcements
}
```

### App Preferences

```typescript
interface AppPreferences {
  darkMode: boolean;         // Dark theme (coming soon)
  autoDownload: boolean;     // Auto-download on WiFi
  offlineMode: boolean;      // Offline reading mode
  soundEnabled: boolean;     // Sound effects
}
```

### Privacy Settings

```typescript
interface PrivacySettings {
  profileVisible: boolean;   // Profile visibility to others
  showActivity: boolean;     // Show activity stats publicly
}
```

## Implementation Details

### Profile Edit Form

```typescript
// Form state management
const [formData, setFormData] = useState<FormData>({
  name: "",
  email: "",
  phone: "",
  branch_id: "",
  year: "",
  semester: "",
  roll_number: "",
  course: "B.Tech"
});

// Validation function
function validateForm(): boolean {
  const newErrors: FormErrors = {};
  
  if (!formData.name.trim()) {
    newErrors.name = "Name is required";
  }
  
  // ... other validations
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}

// Save function
async function handleSave() {
  if (!validateForm()) return;
  
  const { error } = await supabase
    .from('users')
    .update(formData)
    .eq('id', profile?.id);
    
  if (error) throw error;
  // Handle success
}
```

### Settings Persistence

```typescript
// Save settings to database (example)
async function saveSettings(settings: SettingsState) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      notification_settings: settings.notifications,
      app_preferences: settings.preferences,
      privacy_settings: settings.privacy
    });
}
```

## Navigation & UX

### Navigation Flow

1. **From Profile Tab**: 
   - Tap "Edit" button or "Edit Profile" menu item
   - Navigate to `/profile/edit`

2. **From Edit Screen**:
   - Save changes and return to profile
   - Cancel and discard changes

3. **From Profile Menu**:
   - Access settings via "App Settings" menu item
   - Navigate to `/profile/settings`

### User Experience Features

1. **Real-time Validation**: Errors clear as user fixes them
2. **Loading States**: Save buttons show loading indicators
3. **Success Feedback**: Toast messages for successful updates
4. **Confirmation Dialogs**: For destructive actions (photo removal, reset settings)
5. **Auto-refresh**: Profile screen refreshes when returning from edit

## Security Considerations

### Data Validation

1. **Server-side Validation**: Always validate on the backend
2. **Sanitization**: Clean user inputs before saving
3. **Permission Checks**: Users can only edit their own profiles

### Privacy Controls

1. **Profile Visibility**: Users control who can see their profile
2. **Activity Privacy**: Optional sharing of activity statistics
3. **Photo Privacy**: Profile photos follow visibility settings

## Future Enhancements

### Photo Upload Integration

```typescript
// Example implementation with expo-image-picker
import * as ImagePicker from 'expo-image-picker';

async function handlePhotoUpload() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  
  if (!result.canceled) {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(`${user.id}/avatar.jpg`, photo);
  }
}
```

### Push Notifications

```typescript
// Example notification settings implementation
import * as Notifications from 'expo-notifications';

async function updateNotificationSettings(settings: NotificationSettings) {
  // Register for push notifications
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Save token and preferences to database
  await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      push_token: token.data,
      notification_settings: settings
    });
}
```

### Social Features

1. **Profile Sharing**: Share profile with classmates
2. **Study Groups**: Form groups based on branch/semester
3. **Activity Feed**: See what classmates are studying

## API Integration

### Profile Update Endpoint

```typescript
// Update user profile
async function updateProfile(profileData: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...profileData,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single();
    
  return { data, error };
}
```

### Settings Management

```typescript
// Load user settings
async function loadUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  return data || defaultSettings;
}

// Save user settings
async function saveUserSettings(userId: string, settings: SettingsState) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    });
    
  return { error };
}
```

## Testing

### Manual Testing Checklist

1. **Profile Edit Form**
   - [ ] All fields display current values
   - [ ] Validation works for all fields
   - [ ] Save updates database correctly
   - [ ] Cancel discards changes
   - [ ] Navigation works properly

2. **Settings Screen**
   - [ ] All toggles work correctly
   - [ ] Settings persist after app restart
   - [ ] Reset functionality works
   - [ ] Navigation and back button work

3. **Photo Management**
   - [ ] Photo display works
   - [ ] Remove photo functionality
   - [ ] Placeholder shows when no photo

### Edge Cases

1. **Network Issues**: Handle offline scenarios
2. **Invalid Data**: Graceful error handling
3. **Permission Denied**: Handle auth failures
4. **Large Photos**: Image compression and resizing

## Troubleshooting

### Common Issues

**Issue**: Form validation not working
- **Solution**: Check validation rules and error state management

**Issue**: Settings not persisting
- **Solution**: Verify database upsert operations and user ID

**Issue**: Photo upload fails
- **Solution**: Check storage permissions and file size limits

**Issue**: Navigation errors
- **Solution**: Verify route names and navigation stack

### Debug Information

```typescript
// Add debug logging
console.log('Profile data:', profileData);
console.log('Form errors:', errors);
console.log('Settings state:', settings);
```

## Performance Optimization

1. **Image Optimization**: Compress profile photos
2. **Form Debouncing**: Debounce validation checks
3. **Lazy Loading**: Load settings on demand
4. **Caching**: Cache profile data locally

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Dependencies**: React Native, Expo Router, Supabase  
**Platform**: iOS & Android