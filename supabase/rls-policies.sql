-- Row Level Security Policies for HBTU College Study App

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cgpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- BRANCHES: Public read, admin write
CREATE POLICY "Public can view branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage branches" ON branches FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- USERS: Users can view own profile, admins can view all
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- SUBJECTS: Public read, admin write
CREATE POLICY "Public can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- NOTES: Students read verified, admins manage all
CREATE POLICY "Students can view verified notes" ON notes FOR SELECT USING (is_verified = true);
CREATE POLICY "Admins can manage notes" ON notes FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- TIMETABLE: Public read, admin write
CREATE POLICY "Public can view timetable" ON timetable FOR SELECT USING (true);
CREATE POLICY "Admins can manage timetable" ON timetable FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- EXAM SCHEDULE: Public read, admin write
CREATE POLICY "Public can view exam schedule" ON exam_schedule FOR SELECT USING (true);
CREATE POLICY "Admins can manage exam schedule" ON exam_schedule FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- EVENTS: Public read published, admin manage all
CREATE POLICY "Public can view published events" ON events FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage events" ON events FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- EVENT RSVP: Users manage own RSVPs
CREATE POLICY "Users can view own RSVPs" ON event_rsvp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create RSVPs" ON event_rsvp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own RSVPs" ON event_rsvp FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all RSVPs" ON event_rsvp FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ANNOUNCEMENTS: Public read published, admin manage all
CREATE POLICY "Public can view published announcements" ON announcements FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- OPPORTUNITIES: Public read published, admin manage all
CREATE POLICY "Public can view published opportunities" ON opportunities FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage opportunities" ON opportunities FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- OPPORTUNITY BOOKMARKS: Users manage own bookmarks
CREATE POLICY "Users can view own bookmarks" ON opportunity_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON opportunity_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON opportunity_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- FORUM POSTS: Users create, view approved, admins manage all
CREATE POLICY "Users can view approved posts" ON forum_posts FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view own posts" ON forum_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all posts" ON forum_posts FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- FORUM REPLIES: Users create/view, admins manage
CREATE POLICY "Users can view replies" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Users can create replies" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own replies" ON forum_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage replies" ON forum_replies FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- FORUM VOTES: Users manage own votes
CREATE POLICY "Users can view votes" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "Users can create votes" ON forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON forum_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON forum_votes FOR DELETE USING (auth.uid() = user_id);

-- CGPA RECORDS: Users manage own records
CREATE POLICY "Users can view own CGPA" ON cgpa_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own CGPA" ON cgpa_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own CGPA" ON cgpa_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all CGPA" ON cgpa_records FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- ACTIVITY LOGS: Users view own, admins view all
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create activity logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all activity" ON activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
