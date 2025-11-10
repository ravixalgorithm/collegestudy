-- Common Learning Resources Database Schema for College Study App
-- This schema supports admin-managed content for DSA, Development, Placement, and AI Tools

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS common_note_comments CASCADE;
DROP TABLE IF EXISTS common_note_ratings CASCADE;
DROP TABLE IF EXISTS common_notes CASCADE;
DROP TABLE IF EXISTS ai_tool_categories CASCADE;
DROP TABLE IF EXISTS ai_tools CASCADE;
DROP TABLE IF EXISTS common_topics CASCADE;
DROP TABLE IF EXISTS common_categories CASCADE;

-- Create admin users table extension
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'content_admin', 'moderator')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create common categories table (DSA, Development, Placement)
-- Create common categories table
CREATE TABLE IF NOT EXISTS common_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create common topics table (topics within each category)
CREATE TABLE IF NOT EXISTS common_topics (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES common_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Easy', 'Intermediate', 'Medium', 'Advanced', 'Hard')),
    technologies JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create common notes table
CREATE TABLE IF NOT EXISTS common_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES common_categories(id) ON DELETE CASCADE,
    topic_id TEXT REFERENCES common_topics(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size TEXT,
    thumbnail_url TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES admin_users(id),
    downloads INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI tool categories table
CREATE TABLE IF NOT EXISTS ai_tool_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI tools table
CREATE TABLE IF NOT EXISTS ai_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES ai_tool_categories(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    price TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    features JSONB DEFAULT '[]',
    logo_url TEXT,
    screenshot_urls JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    popularity_score INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    meta_data JSONB DEFAULT '{}',
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table for notes
CREATE TABLE IF NOT EXISTS common_note_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES common_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, user_id)
);

-- Create comments table for notes
CREATE TABLE IF NOT EXISTS common_note_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES common_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    parent_id UUID REFERENCES common_note_comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES admin_users(id),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admin_users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS resource_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('note', 'ai_tool')),
    resource_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('view', 'download', 'rate', 'share')),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_common_notes_category_id ON common_notes(category_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_topic_id ON common_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_uploaded_by ON common_notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_common_notes_created_at ON common_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_common_notes_downloads ON common_notes(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_common_notes_rating ON common_notes(rating DESC);
CREATE INDEX IF NOT EXISTS idx_common_notes_approved ON common_notes(is_approved);
CREATE INDEX IF NOT EXISTS idx_common_notes_featured ON common_notes(is_featured);

CREATE INDEX IF NOT EXISTS idx_common_topics_category_id ON common_topics(category_id);

CREATE INDEX IF NOT EXISTS idx_ai_tools_category_id ON ai_tools(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_featured ON ai_tools(is_featured);
CREATE INDEX IF NOT EXISTS idx_ai_tools_active ON ai_tools(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_tools_popularity ON ai_tools(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_note_ratings_note_id ON common_note_ratings(note_id);
CREATE INDEX IF NOT EXISTS idx_note_ratings_user_id ON common_note_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON common_note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_parent_id ON common_note_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_analytics_resource_type ON resource_analytics(resource_type);
CREATE INDEX IF NOT EXISTS idx_analytics_action ON resource_analytics(action);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON resource_analytics(created_at DESC);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_common_notes_category_topic ON common_notes(category_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_category_featured ON common_notes(category_id, is_featured) WHERE is_featured = true;

-- Create functions
CREATE OR REPLACE FUNCTION update_note_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE common_notes
    SET
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM common_note_ratings
            WHERE note_id = COALESCE(NEW.note_id, OLD.note_id)
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM common_note_ratings
            WHERE note_id = COALESCE(NEW.note_id, OLD.note_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.note_id, OLD.note_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_analytics_on_download()
RETURNS TRIGGER AS $$
BEGIN
    -- Log download analytics when downloads count increases
    IF NEW.downloads > OLD.downloads THEN
        INSERT INTO resource_analytics (resource_type, resource_id, action, created_at)
        VALUES ('note', NEW.id::TEXT, 'download', NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_note_rating
    AFTER INSERT OR UPDATE OR DELETE ON common_note_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_note_rating();

CREATE TRIGGER trigger_common_notes_updated_at
    BEFORE UPDATE ON common_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_common_topics_updated_at
    BEFORE UPDATE ON common_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_common_categories_updated_at
    BEFORE UPDATE ON common_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ai_tools_updated_at
    BEFORE UPDATE ON ai_tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ai_tool_categories_updated_at
    BEFORE UPDATE ON ai_tool_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_note_download_analytics
    AFTER UPDATE ON common_notes
    FOR EACH ROW
    EXECUTE FUNCTION log_analytics_on_download();

-- Enable Row Level Security
ALTER TABLE common_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_note_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public reading
CREATE POLICY "Anyone can read active categories" ON common_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read active topics" ON common_topics
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read approved notes" ON common_notes
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Anyone can read active ai tool categories" ON ai_tool_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read active ai tools" ON ai_tools
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read ratings" ON common_note_ratings
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read approved comments" ON common_note_comments
    FOR SELECT USING (is_approved = true);

-- RLS Policies for admin access
CREATE POLICY "Admins can manage categories" ON common_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'content_admin')
        )
    );

CREATE POLICY "Admins can manage topics" ON common_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'content_admin')
        )
    );

CREATE POLICY "Admins can manage notes" ON common_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'content_admin', 'moderator')
        )
    );

CREATE POLICY "Admins can manage ai tool categories" ON ai_tool_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'content_admin')
        )
    );

CREATE POLICY "Admins can manage ai tools" ON ai_tools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'content_admin')
        )
    );

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can rate notes" ON common_note_ratings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own ratings" ON common_note_ratings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can comment" ON common_note_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own comments" ON common_note_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert default common categories
INSERT INTO common_categories (id, title, description) VALUES
('dsa', 'DSA Notes', 'Data Structures & Algorithms resources for coding interviews and competitive programming'),
('development', 'Development Notes', 'Web, mobile, and backend development resources with modern tech stacks'),
('placement', 'Placement Preparation', 'Interview preparation, resume building, and career guidance resources')
ON CONFLICT (id) DO NOTHING;

-- Insert default AI tool categories
INSERT INTO ai_tool_categories (id, title, description) VALUES
('writing', 'Writing & Content', 'AI tools for writing, editing, and content creation'),
('research', 'Research & Learning', 'AI assistants for academic research and learning'),
('coding', 'Code & Development', 'AI tools for programming and software development'),
('creative', 'Creative & Media', 'AI for image generation, design, and creative work'),
('productivity', 'Productivity', 'AI tools to boost productivity and efficiency')
ON CONFLICT (id) DO NOTHING;

-- Insert default DSA topics
INSERT INTO common_topics (id, category_id, title, description, difficulty) VALUES
('arrays', 'dsa', 'Arrays & Strings', 'Basic data structures and string manipulation algorithms', 'Easy'),
('linkedlist', 'dsa', 'Linked Lists', 'Singly, doubly and circular linked lists implementation', 'Easy'),
('stacks-queues', 'dsa', 'Stacks & Queues', 'LIFO and FIFO data structures with applications', 'Easy'),
('trees', 'dsa', 'Trees & BST', 'Binary trees, BST, and tree traversal algorithms', 'Medium'),
('graphs', 'dsa', 'Graphs', 'Graph algorithms, DFS, BFS, and shortest path problems', 'Medium'),
('dp', 'dsa', 'Dynamic Programming', 'Optimization problems using memoization and tabulation', 'Hard'),
('sorting', 'dsa', 'Sorting & Searching', 'Various sorting algorithms and binary search techniques', 'Medium'),
('greedy', 'dsa', 'Greedy Algorithms', 'Optimization problems using greedy approach', 'Medium')
ON CONFLICT (id) DO NOTHING;

-- Insert default Development topics
INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
('frontend', 'development', 'Frontend Development', 'HTML, CSS, JavaScript, React, Vue.js frameworks', 'Beginner', '["HTML", "CSS", "JavaScript", "React", "Vue.js"]'),
('backend', 'development', 'Backend Development', 'Node.js, Python, Java, PHP server-side development', 'Intermediate', '["Node.js", "Python", "Java", "PHP"]'),
('mobile', 'development', 'Mobile Development', 'React Native, Flutter, Android, iOS app development', 'Intermediate', '["React Native", "Flutter", "Android", "iOS"]'),
('fullstack', 'development', 'Full Stack Development', 'MERN, MEAN, Django, Laravel complete stacks', 'Advanced', '["MERN", "MEAN", "Django", "Laravel"]'),
('database', 'development', 'Database Management', 'MySQL, MongoDB, PostgreSQL, Redis database systems', 'Intermediate', '["MySQL", "MongoDB", "PostgreSQL", "Redis"]'),
('devops', 'development', 'DevOps & Cloud', 'AWS, Docker, Kubernetes, CI/CD deployment', 'Advanced', '["AWS", "Docker", "Kubernetes", "Git"]')
ON CONFLICT (id) DO NOTHING;

-- Insert default Placement topics
INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
('resume-building', 'placement', 'Resume Building', 'Create ATS-friendly resumes that get noticed by recruiters', 'Beginner', '["ATS Format", "Keywords", "Projects", "Skills"]'),
('technical-interviews', 'placement', 'Technical Interviews', 'Coding challenges and system design interview preparation', 'Advanced', '["DSA", "System Design", "Coding", "Problem Solving"]'),
('hr-interviews', 'placement', 'HR & Behavioral', 'Soft skills and behavioral interview preparation', 'Intermediate', '["Communication", "Leadership", "STAR Method", "Questions"]'),
('company-specific', 'placement', 'Company-Specific Prep', 'Target preparation for top tech companies and startups', 'Advanced', '["FAANG", "Startups", "Culture Fit", "Company Research"]'),
('mock-interviews', 'placement', 'Mock Interview Tips', 'Practice sessions and feedback strategies for improvement', 'Intermediate', '["Practice", "Feedback", "Confidence", "Performance"]'),
('salary-negotiation', 'placement', 'Salary Negotiation', 'Get the best offer and negotiate effectively with employers', 'Advanced', '["Research", "Negotiation", "Benefits", "Counter Offers"]')
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE common_categories IS 'Main categories for common learning resources (DSA, Development, Placement)';
COMMENT ON TABLE common_topics IS 'Specific topics within each category';
COMMENT ON TABLE common_notes IS 'User-uploaded notes and resources for each topic';
COMMENT ON TABLE ai_tools IS 'Curated AI tools for student productivity and learning';
COMMENT ON TABLE ai_tool_categories IS 'Categories for organizing AI tools';
COMMENT ON TABLE admin_users IS 'Admin users with different permission levels';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions';
COMMENT ON TABLE resource_analytics IS 'Analytics tracking for resource usage';
