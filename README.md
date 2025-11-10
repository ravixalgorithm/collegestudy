# HBTU College Study App

A comprehensive study platform for HBTU B.Tech students across 13 branches, 4 years, and 8 semesters.

## 🎯 Project Overview

- **Mobile App**: React Native (Expo SDK 54) - Cross-platform iOS/Android
- **Admin Dashboard**: Next.js 15 - Modern web-based content management
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Target Users**: HBTU B.Tech students (all branches and years)

## ✨ Current Status

**✅ Fully Functional & Ready to Use!**

- ✅ Authentication system with Email OTP
- ✅ Admin dashboard with full CRUD operations
- ✅ Notes upload and management
- ✅ Events creation and management
- ✅ User management system
- ✅ Mobile app with tab navigation
- ✅ Profile setup and onboarding
- ✅ Row Level Security (RLS) configured
- ✅ File storage integration

## 🏗️ Architecture

```
collegestudy/
├── mobile-app/          # Expo React Native app
├── admin-dashboard/     # Next.js admin panel
├── supabase/           # Database schema, migrations, RLS policies
└── docs/               # Documentation, mockups, specs
```

## ✨ Core Features

### Student App
- **Authentication**: Email + OTP (Supabase Auth)
- **Notes & Resources**: Branch/semester-specific study materials
- **Timetable**: Personalized class schedules
- **Events & Notices**: College announcements and activities
- **CGPA Calculator**: Grade tracking with downloadable cards
- **Opportunities**: Jobs, internships, scholarships
- **Forum**: Q&A for doubt clearing
- **Profile Management**: Downloadable profile cards

### Admin Dashboard
- Content management (notes, timetable, events)
- Forum moderation
- Student analytics
- Opportunity posting
- Exam schedule management

## 🚀 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile | React Native (Expo SDK 54) | Cross-platform app |
| Web Admin | Next.js 15 | Admin dashboard |
| Database | Supabase PostgreSQL | Data storage |
| Auth | Supabase Auth | Email OTP authentication |
| Storage | Supabase Storage | File hosting (notes, images) |
| API | Supabase Edge Functions | Serverless backend |
| Notifications | Expo Notifications | Push notifications |

## 📊 Database Schema

### Core Tables
- `users` - Student profiles
- `branches` - 13 HBTU branches
- `subjects` - Branch/semester subjects
- `notes` - Study materials
- `timetable` - Class schedules
- `exam_schedule` - Exam dates
- `events` - College events
- `announcements` - Notices
- `opportunities` - Jobs/internships
- `forum_posts` - Q&A discussions

## 🎨 HBTU Branches Supported

1. Computer Science & Engineering (CSE)
2. Information Technology (IT)
3. Electronics Engineering (ET)
4. Electrical Engineering (EE)
5. Mechanical Engineering (ME)
6. Civil Engineering (CE)
7. Chemical Engineering (CHE)
8. Paint Technology (PT)
9. Plastic Technology (PL)
10. Oil Technology (OT)
11. Leather & Fashion Technology (LFT)
12. Biochemical Engineering (BE)
13. Food Technology (FT)

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free): [supabase.com](https://supabase.com)

### Setup Steps

**1. Clone & Install**
```bash
git clone https://github.com/yourusername/collegestudy.git
cd collegestudy
```

**2. Supabase Setup**
- Create new project at [supabase.com](https://supabase.com)
- Run SQL: `supabase/schema.sql`
- Run SQL: `supabase/rls-policies.sql`
- Run SQL: `fix_rls_policies.sql` (Important!)
- Create storage buckets: `notes`, `posters`, `profiles` (all public)
- Copy Project URL and anon key

**3. Admin Dashboard**
```bash
cd admin-dashboard
npm install

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your-url-here" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here" >> .env.local

npm run dev
```
Open http://localhost:3000 and create admin user.

**4. Mobile App**
```bash
cd mobile-app
npm install

# Create .env
echo "EXPO_PUBLIC_SUPABASE_URL=your-url-here" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key-here" >> .env

npx expo start
```
Scan QR code with Expo Go app!

**📖 Detailed Setup**: See `docs/SETUP_GUIDE.md` for complete instructions.

## 💻 Development

### Admin Dashboard (Next.js)
```bash
cd admin-dashboard
npm run dev     # http://localhost:3000
npm run build   # Production build
npm start       # Production server
```

**Features:**
- ✅ Notes upload with file storage
- ✅ Events creation with poster upload
- ✅ User management (view, admin toggle)
- ✅ Forum moderation (coming soon)
- ✅ Analytics dashboard
- ✅ Timetable management (coming soon)

### Mobile App (Expo/React Native)
```bash
cd mobile-app
npx expo start           # Development server
npx expo start --ios     # iOS simulator (Mac only)
npx expo start --android # Android emulator
npx expo start -c        # Clear cache
```

**Features:**
- ✅ Email OTP authentication
- ✅ Profile onboarding
- ✅ Tab navigation (Home, Notes, Timetable, Events, Profile)
- ✅ Branch/semester selection
- 🔄 Notes browsing (in progress)
- 🔄 Event listing (in progress)
- 🔄 CGPA calculator (in progress)

## 🚢 Deployment

### Mobile App
- **iOS**: Submit to App Store via Expo EAS
- **Android**: Submit to Play Store via Expo EAS

### Admin Dashboard
- **Vercel**: Connect GitHub repo for auto-deploy
- **Netlify**: Alternative free hosting

### Database
- **Supabase**: Free tier (500MB database, 1GB storage)

## 🔒 Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Admin-only content management
- ✅ Email OTP authentication (no passwords)
- ✅ Secure file storage with public URLs
- ✅ Protected admin routes
- ✅ User data isolation

## 📈 Development Roadmap

### ✅ Phase 1: Core Infrastructure (COMPLETE)
- ✅ Database schema & migrations
- ✅ Authentication system
- ✅ Admin dashboard foundation
- ✅ Mobile app navigation
- ✅ File storage setup

### 🚧 Phase 2: Content Management (IN PROGRESS)
- ✅ Notes upload/management
- ✅ Events creation/editing
- ✅ User management
- 🔄 Timetable CRUD
- 🔄 Opportunities management
- 🔄 Forum moderation

### 📋 Phase 3: Student Features (UPCOMING)
- 📋 Notes browsing & download
- 📋 Event listing & RSVP
- 📋 Timetable viewing
- 📋 CGPA calculator
- 📋 Forum Q&A
- 📋 Profile management

### 🔮 Phase 4: Advanced Features (FUTURE)
- Push notifications
- AI study assistant
- Analytics dashboard
- Resume builder
- Video lectures
- Study groups

## 🤝 Contributing

This is a student project for HBTU. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 📂 Project Structure

```
collegestudy/
├── admin-dashboard/     # Next.js admin panel
│   ├── app/            # App router pages
│   ├── components/     # React components
│   └── lib/            # Supabase client
├── mobile-app/         # Expo React Native app
│   ├── app/            # Expo router pages
│   └── src/            # Source files
├── supabase/           # Database schema & policies
├── docs/               # Documentation
└── README.md
```

## 🤝 Contributing

This is a student project for HBTU. Contributions welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

Built with ❤️ for HBTU B.Tech students

## 📞 Support

- 📖 **Documentation**: Check `/docs` folder
- 🐛 **Issues**: Open GitHub issue
- 📧 **Contact**: [your-email@example.com]

---

**Last Updated**: December 2024  
**Version**: 1.0.0 (MVP)  
**Status**: ✅ Functional & Ready for Testing
