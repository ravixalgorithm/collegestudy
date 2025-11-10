-- HBTU College Study App - Database Schema
-- PostgreSQL + Supabase
-- Last updated: November 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BRANCHES TABLE
-- ============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert HBTU branches
INSERT INTO branches (code, name, full_name, description) VALUES
('CSE', 'Computer Science', 'Computer Science & Engineering', 'Software, algorithms, AI, data structures'),
('IT', 'Information Tech', 'Information Technology', 'Networks, databases, web development'),
('ET', 'Electronics', 'Electronics Engineering', 'Electronic circuits, devices, digital systems'),
('EE', 'Electrical', 'Electrical Engineering', 'Power systems, machines, control systems'),
('ME', 'Mechanical', 'Mechanical Engineering', 'Thermodynamics, manufacturing, design'),
('CE', 'Civil', 'Civil Engineering', 'Structures, construction, transportation'),
('CHE', 'Chemical', 'Chemical Engineering', 'Process engineering, reactions, thermodynamics'),
('PT', 'Paint Tech', 'Paint Technology', 'Coatings, pigments, surface chemistry'),
('PL', 'Plastic Tech', 'Plastic Technology', 'Polymer processing, molding, material science'),
('OT', 'Oil Tech', 'Oil Technology', 'Petroleum processing, refining, petrochemicals'),
('LFT', 'Leather & Fashion', 'Leather & Fashion Technology', 'Tanning, leather processing, fashion design'),
('BE', 'Biochemical', 'Biochemical Engineering', 'Bioprocessing, fermentation, biotechnology'),
('FT', 'Food Tech', 'Food Technology', 'Food processing, safety, nutrition');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
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

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INTEGER DEFAULT 3,
    syllabus_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, semester, code)
);

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL, -- Google Drive shareable link
    file_type VARCHAR(50), -- PDF, DOC, PPT, XLS, TXT, Other
    tags TEXT[],
    module_number INTEGER CHECK (module_number >= 1 AND module_number <= 5), -- Module 1-5, NULL for PYQ
    is_pyq BOOLEAN DEFAULT FALSE, -- Previous Year Questions flag
    academic_year VARCHAR(20), -- For PYQ: '2023-24', '2022-23', etc.
    exam_type VARCHAR(50), -- For PYQ: 'Mid-term', 'End-term', 'Quiz', etc.
    uploaded_by UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_note_category CHECK (
        (is_pyq = TRUE AND module_number IS NULL) OR
        (is_pyq = FALSE AND module_number IS NOT NULL)
    )
);

-- ============================================
-- TIMETABLE TABLE
-- ============================================
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    faculty_name VARCHAR(255),
    class_type VARCHAR(50), -- Lecture, Lab, Tutorial
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXAM SCHEDULE TABLE
-- ============================================
CREATE TABLE exam_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type VARCHAR(50) NOT NULL, -- Mid Sem 1, Mid Sem 2, End Sem, Practical
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    total_marks INTEGER,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_url TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    organizer VARCHAR(255),
    categories TEXT[], -- Technical, Cultural, Sports, Workshop
    target_branches UUID[], -- NULL means all branches
    target_semesters INTEGER[], -- NULL means all semesters
    max_participants INTEGER,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- When event expires and can be cleaned up
    is_published BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EVENT RSVP TABLE
-- ============================================
CREATE TABLE event_rsvp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered', -- registered, attended, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    target_branches UUID[], -- NULL means all branches
    target_semesters INTEGER[], -- NULL means all semesters
    expires_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Internship, Job, Scholarship, Competition, Workshop
    company_name VARCHAR(255),
    description TEXT NOT NULL,
    eligibility TEXT,
    target_branches UUID[], -- NULL means all branches
    target_years INTEGER[], -- NULL means all years
    application_link TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    stipend VARCHAR(100),
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- OPPORTUNITY BOOKMARKS TABLE
-- ============================================
CREATE TABLE opportunity_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(opportunity_id, user_id)
);

-- ============================================
-- FORUM POSTS TABLE
-- ============================================
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    is_resolved BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reported_by UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FORUM REPLIES TABLE
-- ============================================
CREATE TABLE forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE, -- Marked as best answer
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FORUM VOTES TABLE
-- ============================================
CREATE TABLE forum_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- ============================================
-- CGPA RECORDS TABLE
-- ============================================
CREATE TABLE cgpa_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    subject_id UUID REFERENCES subjects(id),
    grade VARCHAR(5) NOT NULL,
    credits INTEGER NOT NULL,
    grade_point DECIMAL(3,2),
    sgpa DECIMAL(4,2),
    cgpa DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- login, note_download, event_rsvp, etc.
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subjects_branch_semester ON subjects(branch_id, semester);
CREATE INDEX idx_notes_subject ON notes(subject_id);
CREATE INDEX idx_notes_verified ON notes(is_verified);
CREATE INDEX idx_notes_file_type ON notes(file_type);
CREATE INDEX idx_notes_module_number ON notes(module_number);
CREATE INDEX idx_notes_is_pyq ON notes(is_pyq);
CREATE INDEX idx_notes_subject_module ON notes(subject_id, module_number);
CREATE INDEX idx_notes_subject_pyq ON notes(subject_id, is_pyq);
CREATE INDEX idx_timetable_branch_semester ON timetable(branch_id, semester);
CREATE INDEX idx_exam_schedule_branch_semester ON exam_schedule(branch_id, semester);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_forum_posts_status ON forum_posts(status);
CREATE INDEX idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_schedule_updated_at BEFORE UPDATE ON exam_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_replies_updated_at BEFORE UPDATE ON forum_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cgpa_records_updated_at BEFORE UPDATE ON cgpa_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
