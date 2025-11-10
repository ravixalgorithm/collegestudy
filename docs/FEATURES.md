# Feature Specifications - HBTU College Study App

## 1. Authentication & Onboarding

### 1.1 Email OTP Login
- **Flow**: Email → OTP → Verify → Profile
- **No password required**
- **Session persistence** via AsyncStorage
- **Auto-login** on app restart

### 1.2 Onboarding Screens
- **Screen 1**: Welcome + App overview
- **Screen 2**: Features showcase
- **Screen 3**: Privacy & security info
- **Skip option** for returning users

### 1.3 Profile Setup
**Required fields:**
- Name
- Branch (dropdown from 13 HBTU branches)
- Year (1-4)
- Semester (1-8)
- Roll Number

**Optional fields:**
- Profile photo (camera/gallery)
- Course (default: B.Tech)

---

## 2. Student App Features

### 2.1 Home Dashboard
**Widgets:**
- Welcome message with user name
- Quick stats (notes downloaded, events joined)
- Upcoming events (next 3)
- Recent announcements
- Quick actions (CGPA calculator, timetable)

### 2.2 Notes & Resources
**Features:**
- **Filter by**: Branch, Semester, Subject
- **Search**: Title, tags, description
- **Preview**: PDF viewer in-app
- **Download**: Save to device
- **Offline access**: Downloaded notes cached
- **Sort**: Latest, most downloaded, subject

**Note Card Shows:**
- Title
- Subject name
- File type & size
- Upload date
- Download count
- Tags

### 2.3 Timetable
**Views:**
- **Weekly view**: All classes for the week
- **Daily view**: Today's schedule
- **List view**: Chronological

**Each class shows:**
- Subject name & code
- Time (start - end)
- Room number
- Faculty name
- Class type (Lecture/Lab/Tutorial)

**Features:**
- Color-coded by subject
- Set reminders (15 min before)
- Export to calendar

### 2.4 Exam Schedule
**Display:**
- Upcoming exams list
- Countdown timer
- Exam type (Mid-term, End-term, Quiz)
- Date, time, room
- Total marks
- Instructions

**Features:**
- Filter by subject
- Add to calendar
- Set study reminders

### 2.5 Events & Notices
**Event Card:**
- Title & description
- Poster image
- Date, time, location
- Organizer
- Categories (Technical, Cultural, Sports)
- RSVP button
- Participant count

**Features:**
- Filter by category
- RSVP/Cancel
- Add to calendar
- Share event
- Notifications for RSVPed events

**Announcements:**
- Priority badges (Urgent, High, Normal)
- Pinned announcements at top
- Expiry dates
- Targeted by branch/semester

### 2.6 CGPA Calculator
**Input:**
- Semester selection
- Subject-wise grades (O, A+, A, B+, B, C, D, F)
- Credits per subject

**Output:**
- SGPA for semester
- Overall CGPA
- Grade distribution chart
- Downloadable report card

**Features:**
- Save grades to profile
- Track semester-wise progress
- Share as image card
- Export PDF

### 2.7 Opportunities
**Types:**
- Internships
- Jobs
- Scholarships
- Competitions
- Workshops

**Each opportunity shows:**
- Title & company
- Type badge
- Description
- Eligibility criteria
- Deadline countdown
- Stipend/Prize
- Location (Remote/On-site)
- Application link

**Features:**
- Bookmark opportunities
- Filter by type, location
- Sort by deadline
- Share with friends
- Notifications for deadlines

### 2.8 Forum (Q&A)
**Post Features:**
- Title & content (rich text)
- Tag subjects
- Add code snippets
- Attach images
- Mark as resolved

**Reply Features:**
- Upvote/Downvote
- Mark as best answer
- Nested replies (1 level)
- Edit/Delete own replies

**Moderation:**
- Admin approval required
- Report inappropriate content
- User reputation system (future)

### 2.9 Profile Management
**View:**
- Profile photo
- Name, branch, year, semester
- Roll number
- Email
- Join date
- Activity stats

**Edit:**
- Update photo
- Change name
- Switch semester/year
- Update roll number

**Download Profile Card:**
- QR code with student ID
- Profile photo
- All details
- CGPA (if entered)
- Share as image

### 2.10 Tools & Utilities
- **AI Study Helper** (future)
- **Calculator**
- **Unit Converter**
- **College Clubs** (links)
- **About HBTU**
- **App Settings**

---

## 3. Admin Dashboard Features

### 3.1 Dashboard Overview
**Metrics:**
- Total users
- Active users (last 7 days)
- Notes uploaded
- Events created
- Forum posts pending
- Storage used

**Charts:**
- User growth over time
- Branch-wise distribution
- Most downloaded notes
- Event participation

### 3.2 Notes Management
**Actions:**
- Upload new notes (PDF, DOCX, images)
- Edit note details
- Verify/Unverify notes
- Delete notes
- Bulk upload

**Form Fields:**
- Subject selection
- Title & description
- File upload
- Tags (comma-separated)
- Verification status

**List View:**
- Filter by branch, semester, subject
- Search by title
- Sort by date, downloads
- Verification status badge

### 3.3 Timetable Management
**Features:**
- Add/Edit class schedules
- Bulk import from CSV
- Copy from previous semester
- Delete entries

**Form:**
- Branch & semester
- Subject
- Day of week
- Start/End time
- Room number
- Faculty name
- Class type

### 3.4 Exam Schedule
**CRUD Operations:**
- Create exam entries
- Edit details
- Delete exams
- Bulk import

**Fields:**
- Branch, semester, subject
- Exam type
- Date & time
- Room number
- Total marks
- Instructions

### 3.5 Events & Announcements
**Event Creation:**
- Title, description
- Upload poster
- Date, time, location
- Organizer name
- Categories
- Target branches/semesters
- Max participants
- Registration deadline
- Publish/Draft

**Announcement Creation:**
- Title & content
- Priority level
- Target audience
- Expiry date
- Pin to top
- Publish/Draft

### 3.6 Opportunities Management
**Create Opportunity:**
- Title & company
- Type selection
- Description
- Eligibility
- Target branches/years
- Application link
- Deadline
- Stipend/Prize
- Location & remote option
- Publish/Draft

**List View:**
- Filter by type, status
- Search
- Edit/Delete
- View applicants (if tracked)

### 3.7 Forum Moderation
**Pending Posts:**
- Review queue
- Approve/Reject
- Edit content
- Add moderator note

**All Posts:**
- Search & filter
- View reports
- Delete posts
- Ban users (future)

**Replies:**
- View all replies
- Delete inappropriate
- Mark best answers

### 3.8 User Management
**User List:**
- Search by name, email, roll
- Filter by branch, year
- View profile details
- Edit user info (limited)
- View activity logs

**Actions:**
- Make admin
- Deactivate account
- Reset password (send OTP)
- Export user data (CSV)

### 3.9 Analytics & Reports
**Reports:**
- User activity report
- Note download stats
- Event participation
- Forum engagement
- Branch-wise analytics

**Export:**
- CSV download
- Date range selection
- Custom filters

---

## 4. Technical Features

### 4.1 Offline Support
- Downloaded notes cached
- Timetable cached
- Last viewed content available
- Sync on reconnect

### 4.2 Push Notifications
**Triggers:**
- New event published
- Event reminder (1 day, 1 hour before)
- Opportunity deadline approaching
- Forum reply to your post
- Announcement for your branch
- Exam reminder

### 4.3 Search
**Global search:**
- Notes
- Events
- Opportunities
- Forum posts

**Filters:**
- By type
- By date range
- By branch/semester

### 4.4 Dark Mode
- System preference detection
- Manual toggle
- Persistent setting

### 4.5 Accessibility
- Screen reader support
- Large text option
- High contrast mode
- Voice navigation (future)

---

## 5. Future Enhancements (v2.0+)

- **AI Study Assistant**: Ask questions, get answers
- **Resume Builder**: Create professional resumes
- **Code Quiz**: Practice programming
- **Study Groups**: Create/join study groups
- **Video Lectures**: Upload/watch lectures
- **Assignment Tracker**: Track submissions
- **Attendance Tracker**: Mark attendance
- **Library Integration**: Check book availability
- **Mess Menu**: Daily menu updates
- **Bus Tracking**: College bus live tracking
- **Placement Stats**: Company-wise data
- **Alumni Network**: Connect with alumni

---

**Last Updated**: November 2025
