# Status Bar Configuration Guide

## Overview

This guide explains how the status bar is configured in the College Study app to ensure the time, battery, and signal indicators are always visible against the app's background.

## Problem Solved

**Before**: Status bar content (time, battery, signal) was white and invisible against the app's white background.

**After**: Status bar content is now dark and clearly visible on light backgrounds.

## Implementation

### 1. Global Configuration

The app is configured to show dark status bar content globally:

```tsx
// app/_layout.tsx
<SafeAreaView style={{ flex: 1 }}>
  <StatusBar style="dark" backgroundColor="#ffffff" />
  {/* Rest of app */}
</SafeAreaView>
```

### 2. App.json Configuration

Default status bar behavior is set in `app.json`:

```json
{
  "expo": {
    "statusBar": {
      "style": "dark",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "statusBar": {
        "style": "dark"
      }
    },
    "android": {
      "statusBar": {
        "backgroundColor": "#ffffff",
        "barStyle": "dark-content"
      }
    }
  }
}
```

## Available Components

### 1. Simple Usage

For most screens (with white/light backgrounds):

```tsx
import { AppStatusBar } from '../src/components/AppStatusBar';

function MyScreen() {
  return (
    <View>
      <AppStatusBar style="dark" backgroundColor="#ffffff" />
      {/* Screen content */}
    </View>
  );
}
```

### 2. Predefined Components

```tsx
import { 
  LightStatusBar,    // Dark content on white background
  DarkStatusBar,     // Light content on dark background
  PrimaryStatusBar,  // Light content on blue background
  TransparentStatusBar // Dark content on transparent background
} from '../src/components/AppStatusBar';

// Usage
<LightStatusBar />     // Most common - for white backgrounds
<DarkStatusBar />      // For dark modal overlays
<PrimaryStatusBar />   // For screens with blue headers
<TransparentStatusBar /> // For overlay screens
```

### 3. Custom Hook (Advanced)

```tsx
import { useStatusBar } from '../src/hooks/useStatusBar';

function MyScreen() {
  const { StatusBarComponent } = useStatusBar({
    style: 'dark',
    backgroundColor: '#ffffff',
    animated: true
  });

  return (
    <View>
      <StatusBarComponent />
      {/* Screen content */}
    </View>
  );
}
```

## Status Bar Styles

### Dark Style (`style="dark"`)
- **Content**: Dark icons/text (black time, battery, signal)
- **Use for**: Light backgrounds (white, light gray, light colors)
- **Most common** in this app

### Light Style (`style="light"`)
- **Content**: Light icons/text (white time, battery, signal)
- **Use for**: Dark backgrounds (black, dark gray, dark colors)

### Auto Style (`style="auto"`)
- **Content**: Automatically adjusts based on system appearance
- **Use for**: Apps that support both light and dark themes

## Platform Differences

### iOS
- Uses `style` prop: `"dark"` or `"light"`
- Background color is managed by the app

### Android
- Uses `barStyle`: `"dark-content"` or `"light-content"`
- Can set explicit `backgroundColor`

## Best Practices

### ✅ Do
- Use `style="dark"` for light backgrounds (most screens)
- Use `style="light"` for dark backgrounds (modals, overlays)
- Set appropriate background color to match your screen
- Test on both iOS and Android devices

### ❌ Don't
- Forget to set status bar style on screens with different backgrounds
- Use light content on light backgrounds (invisible)
- Use dark content on dark backgrounds (invisible)

## Common Use Cases

### Standard App Screens
```tsx
<LightStatusBar />  // White background, dark content
```

### Modal Overlays
```tsx
<DarkStatusBar />   // Dark overlay, light content
```

### Primary Color Headers
```tsx
<PrimaryStatusBar /> // Blue header, light content
```

### Image Backgrounds
```tsx
<TransparentStatusBar /> // Transparent, adjust based on image
```

## Troubleshooting

### Status Bar Not Visible
- Check if background color matches your screen background
- Ensure you're using the correct style (`dark` vs `light`)
- Verify SafeAreaView is properly configured

### Inconsistent Appearance
- Make sure global StatusBar is set in `_layout.tsx`
- Check app.json configuration
- Test on physical devices, not just simulator

### Platform-Specific Issues
- iOS: Ensure `style` prop is correct
- Android: Check both `backgroundColor` and `barStyle`
- Test on multiple device types

## Testing Checklist

- [ ] Time/battery visible on home screen
- [ ] Status bar content visible on all main screens
- [ ] Proper contrast on modal overlays
- [ ] Works on both iOS and Android
- [ ] Consistent across different device types
- [ ] No content hidden behind status bar

## Future Considerations

- Support for dark theme (will need `style="light"` on dark backgrounds)
- Dynamic status bar based on screen content
- Handling of status bar on screens with image backgrounds
- Custom status bar for branded screens