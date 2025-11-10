# HBTU Study - Mobile App 📱

A complete college companion app for HBTU students built with React Native and Expo.

## 🚀 Features

### ✅ Implemented Features

#### Authentication & Onboarding
- **Email + OTP Authentication** - Secure passwordless login using Supabase Auth
- **Complete Profile Setup** - Students provide name, branch, year, semester, roll number, and photo
- **Branch Selection** - All HBTU branches supported (CSE, IT, ECE, EE, ME, CE, etc.)

#### Home Screen
- **Personalized Dashboard** - Greeting with student's name and academic info
- **Quick Stats** - Total notes, upcoming events, and exams count
- **Today's Classes** - Shows current day's timetable with time, room, and faculty
- **Upcoming Exams** - Countdown to exams with urgency indicators
- **Recent Notes** - Latest study materials for your branch/semester
- **Upcoming Events** - Campus events with dates and locations

#### Notes & Resources
- **Subject-wise Filtering** - Browse notes by specific subjects
- **Search Functionality** - Find notes by title or description
- **Google Drive Integration** - Direct download from Drive links
- **File Type Icons** - Visual indicators for PDF, DOC, PPT, etc.
- **Download Tracking** - See how many times notes have been downloaded
- **Branch/Semester Filtering** - Only see relevant notes

#### Timetable & Exams
- **Weekly Timetable View** - Day-wise class schedule with tabs
- **Today's Classes Highlighted** - Quick view of current day's schedule
- **Class Details** - Time slots, room numbers, faculty names, class types
- **Color-coded Class Types** - Lecture, Lab, Tutorial, Practical
- **Exam Schedule** - All upcoming exams with countdown timers
- **Exam Details** - Date, time, room, marks, special instructions
- **Urgency Indicators** - Visual alerts for exams within 3 days

#### Events
- **Upcoming Events** - All campus events sorted by date
- **Past Events** - History of previous events
- **RSVP Functionality** - Mark yourself as "Going" to events
- **Event Details** - Date, time, location, organizer, description
- **Event Types** - Workshop, Tech Fest, Cultural, Sports, Placement
- **Registration Links** - Direct links to event registration
- **Today/Tomorrow Badges** - Special indicators for immediate events

#### Profile
- **Academic Information** - Course, branch, year, semester display
- **Activity Stats** - Notes downloaded, events attended, forum posts
- **Profile Photo** - Upload and display profile picture
- **Settings Menu** - App settings, notifications, privacy
- **Support** - Help & support, about app
- **Logout** - Secure sign out functionality

### 🎨 UI/UX Highlights
- **Modern Design** - Clean, minimal interface with Lucide icons
- **Responsive Layouts** - Optimized for all screen sizes
- **Pull-to-Refresh** - Update data with a simple swipe
- **Loading States** - Smooth loading indicators
- **Empty States** - Helpful messages when no data available
- **Color Coding** - Visual distinction for different content types
- **Shadow & Elevation** - Material Design-inspired depth

---

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** (Mac only) or **Android Emulator**
- **Expo Go app** (for testing on physical devices)

---

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd collegestudy/mobile-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the `mobile-app` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project dashboard.

### 4. Start the Development Server
```bash
npm start
```

This will open Expo DevTools in your browser.

### 5. Run on Device/Simulator

#### iOS Simulator (Mac only)
```bash
npm run ios
```

#### Android Emulator
```bash
npm run android
```

#### Physical Device
1. Install **Expo Go** from App Store or Play Store
2. Scan the QR code from Expo DevTools
3. App will load on your device

---

## 📁 Project Structure

```
mobile-app/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── welcome.tsx           # Welcome/splash screen
│   │   ├── login.tsx             # Email + OTP login
│   │   └── onboarding.tsx        # Profile setup
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab navigation setup
│   │   ├── home.tsx              # Home dashboard
│   │   ├── notes.tsx             # Notes & resources
│   │   ├── timetable.tsx         # Timetable & exams
│   │   ├── events.tsx            # Events & notices
│   │   └── profile.tsx           # User profile
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point & auth check
├── src/
│   ├── lib/
│   │   └── supabase.ts           # Supabase client config
│   └── types/                    # TypeScript type definitions
├── assets/                       # Images, fonts, etc.
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🔧 Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform
- **Expo Router** - File