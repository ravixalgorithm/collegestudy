# Complete Setup Guide - HBTU College Study App

This guide will walk you through setting up the entire HBTU College Study App from scratch.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** installed
- **Expo CLI** (`npm install -g expo-cli`)
- **Supabase Account** (free tier) - [Sign up](https://supabase.com)
- **Code Editor** (VS Code recommended)

---

## 🚀 Part 1: Supabase Setup

### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `hbtu-college-study`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free
4. Click **"Create new project"** (takes 2-3 minutes)

### Step 1.2: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open `supabase/schema.sql` from your project
4. Copy the entire content and paste in SQL Editor
5. Click **"Run"** (should see "Success" message)
6. Create a new query, open `supabase/rls-policies.sql`
7. Copy, paste, and **"Run"**

### Step 1.3: Fix RLS Policies (Important!)

Run the `fix_rls_policies.sql` file to avoid authentication issues:

1. Open `fix_rls_policies.sql` in SQL Editor
2. Run the entire script
3. This fixes infinite recursion in Row Level Security policies

### Step 1.4: Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Click **"Create bucket"**
3. Create these three buckets (all **public**):
   - **Name**: `notes` → **Public**: ✓ → Create
   - **Name**: `posters` → **Public**: ✓ → Create
   - **Name**: `profiles` → **Public**: ✓ → Create

### Step 1.5: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (different long string)

---

## 💻 Part 2: Admin Dashboard Setup

### Step 2.1: Install Dependencies

```bash
cd admin-dashboard
npm install
```

### Step 2.2: Environment Variables

Create `.env.local` file in `admin-dashboard/` folder:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Replace with your actual values from Step 1.5!**

### Step 2.3: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 - you should see the admin dashboard login page.

### Step 2.4: Create Admin User

**Option A: Manual Creation in Supabase**

1. Go to **Authentication** → **Users** in Supabase
2. Click **"Add user"**
3. Enter:
   - **Email**: `your-admin@email.com`
   - **Password**: Create one or leave blank for email-only
   - **Auto Confirm User**: ✓
4. Click **"Create user"**
5. Go to **Table Editor** → **users** table
6. Find your user row
7. Set `is_admin` = `true`
8. Click **"Save"**

**Option B: SQL Script**

```sql
-- Replace with your actual user ID and email
INSERT INTO users (id, email, name, is_admin, created_at, updated_at)
VALUES (
  'your-user-id-from-auth-users',
  'your-admin@email.com',
  'Admin User',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true;
```

### Step 2.5: Login to Admin Dashboard

1. Go to http://localhost:3000/login
2. Enter your admin email
3. Click **"Send OTP"**
4. Check your email for the 6-digit code
5. Enter OTP and click **"Verify OTP"**
6. You should be redirected to the dashboard!

---

## 📱 Part 3: Mobile App Setup

### Step 3.1: Install Dependencies

```bash
cd mobile-app
npm install
```

### Step 3.2: Environment Variables

Create `.env` file in `mobile-app/` folder:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Use the same values from Step 1.5!**

### Step 3.3: Start Expo Development Server

```bash
npx expo start
```

You should see a QR code in your terminal.

### Step 3.4: Test on Device

**Option A: Expo Go App (Easiest)**

1. Install **Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Open Expo Go
3. Scan the QR code from your terminal
4. App should load on your phone!

**Option B: iOS Simulator (Mac Only)**

```bash
npx expo start --ios
```

**Option C: Android Emulator**

```bash
npx expo start --android
```

### Step 3.5: Create Student Account

1. Open the app on your device
2. Click **"Get Started"**
3. Enter your email
4. Receive OTP via email
5. Complete onboarding:
   - Enter name
   - Select branch (CSE, IT, etc.)
   - Select year and semester
   - Add roll number
   - Upload profile photo (optional)
6. Click **"Complete Setup"**
7. You're in! 🎉

---

## 🗄️ Part 4: Seed Initial Data

### Step 4.1: Insert Sample Data

Run this SQL in Supabase SQL Editor to populate initial data:

```sql
-- Sample subjects for CSE Semester 1
INSERT INTO subjects (branch_id, semester, code, name, credits) 
VALUES 
  ((SELECT id FROM branches WHERE code = 'CSE'), 1, 'CS101', 'Introduction to Programming', 4),
  ((SELECT id FROM branches WHERE code = 'CSE'), 1, 'MA101', 'Engineering Mathematics I', 4),
  ((SELECT id FROM branches WHERE code = 'CSE'), 1, 'PH101', 'Engineering Physics', 3),
  ((SELECT id FROM branches WHERE code = 'CSE'), 1, 'CH101', 'Engineering Chemistry', 3),
  ((SELECT id FROM branches WHERE code = 'CSE'), 1, 'EE101', 'Basic Electrical Engineering', 3);

-- Sample subjects for CSE Semester 2
INSERT INTO subjects (branch_id, semester, code, name, credits) 
VALUES 
  ((SELECT id FROM branches WHERE code = 'CSE'), 2, 'CS201', 'Data Structures', 4),
  ((SELECT id FROM branches WHERE code = 'CSE'), 2, 'CS202', 'Digital Logic Design', 3),
  ((SELECT id FROM branches WHERE code = 'CSE'), 2, 'MA201', 'Engineering Mathematics II', 4),
  ((SELECT id FROM branches WHERE code = 'CSE'), 2, 'ME101', 'Engineering Mechanics', 3);
```

---

## ✅ Part 5: Verify Everything Works

### 5.1 Admin Dashboard Tests

1. **Upload a Note**:
   - Go to **Notes** page
   - Click **"Upload Note"**
   - Select branch, semester, subject
   - Upload a PDF file
   - Submit
   - Should appear in notes list ✓

2. **Create an Event**:
   - Go to **Events** page
   - Click **"Create Event"**
   - Fill in details
   - Upload poster image (optional)
   - Submit
   - Should appear in events grid ✓

3. **View Users**:
   - Go to **Users** page
   - Should see your student account
   - Can toggle admin status ✓

### 5.2 Mobile App Tests

1. **View Home Dashboard**:
   - Should show welcome message
   - Stats cards visible ✓

2. **Browse Notes**:
   - Go to **Notes** tab
   - Should see uploaded notes
   - Can download/view ✓

3. **View Events**:
   - Go to **Events** tab
   - Should see created events
   - Can RSVP ✓

4. **Profile**:
   - Go to **Profile** tab
   - Should show your details
   - Can logout ✓

---

## 🔧 Part 6: Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Check your `.env` files have correct values:
```bash
# Admin Dashboard: .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Mobile App: .env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Issue: "Access denied. Admin privileges required"

**Solution**: 
1. Go to Supabase → **Table Editor** → **users**
2. Find your user
3. Set `is_admin` = `true`
4. Save and try logging in again

### Issue: "RLS policy error" or "Row level security"

**Solution**: 
1. Run `fix_rls_policies.sql` in SQL Editor
2. This removes recursive policy checks

### Issue: "Storage bucket not found"

**Solution**: 
1. Go to **Storage** in Supabase
2. Create buckets: `notes`, `posters`, `profiles`
3. Make all buckets **public**

### Issue: "Cannot upload files"

**Solution**: 
1. Check storage buckets are **public**
2. Go to **Storage** → bucket → **Policies**
3. Create policy:
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR ALL
   USING (bucket_id = 'notes');
   ```
4. Repeat for `posters` and `profiles` buckets

### Issue: Mobile app won't connect

**Solution**: 
1. Make sure Expo is running: `npx expo start`
2. Phone and computer on same WiFi
3. Check `.env` file exists in `mobile-app/`
4. Restart Expo: `npx expo start -c` (clear cache)

### Issue: "Network request failed"

**Solution**: 
1. Check internet connection
2. Verify Supabase project is running (not paused)
3. Check Supabase URL in `.env` is correct
4. Make sure API keys are valid

---

## 📦 Part 7: Production Deployment

### 7.1 Deploy Admin Dashboard (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set framework: **Next.js**
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **"Deploy"**
7. Your admin dashboard is live! 🚀

### 7.2 Build Mobile App (Expo EAS)

**For Android APK:**
```bash
cd mobile-app
npx expo install expo-dev-client
eas build --platform android --profile preview
```

**For iOS (requires Apple Developer account):**
```bash
eas build --platform ios --profile preview
```

**For both platforms:**
```bash
eas build --platform all
```

### 7.3 Submit to App Stores

**Google Play Store:**
```bash
eas submit --platform android
```

**Apple App Store:**
```bash
eas submit --platform ios
```

---

## 🎯 Part 8: Next Steps

### Add More Content

1. **Upload Notes**: Add PDFs for all subjects
2. **Create Events**: Add upcoming college events
3. **Post Opportunities**: Add internships and jobs
4. **Create Timetable**: Add class schedules

### Customize

1. Change app colors in theme files
2. Update logo and branding
3. Modify features to fit your needs
4. Add custom functionality

### Invite Users

1. Share app link with students
2. Promote on college groups
3. Get feedback and iterate
4. Monitor usage via Supabase Analytics

---

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **Next.js Docs**: https://nextjs.org/docs
- **React Native Docs**: https://reactnative.dev/docs/getting-started

---

## 🆘 Need Help?

- Check `docs/API_DOCUMENTATION.md` for API usage
- Check `docs/FEATURES.md` for feature details
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

**Congratulations! 🎉**

Your HBTU College Study App is now fully set up and running. Start uploading content and invite students to use the app!

---

**Last Updated**: December 2024
**Version**: 1.0.0