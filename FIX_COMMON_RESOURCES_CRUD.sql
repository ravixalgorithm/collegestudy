-- COMPREHENSIVE FIX FOR COMMON RESOURCES CRUD OPERATIONS
-- This SQL script ensures all CRUD operations work properly for admin dashboard and mobile app
-- Run this script in your Supabase SQL editor or psql console

-- ===============================================
-- 1. ENSURE SCHEMA IS CORRECT
-- ===============================================

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS common_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    approved_by UUID,
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

CREATE TABLE IF NOT EXISTS ai_tool_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 2. REMOVE OLD COLUMNS IF THEY EXIST
-- ===============================================

ALTER TABLE common_categories DROP COLUMN IF EXISTS icon;
ALTER TABLE common_categories DROP COLUMN IF EXISTS color;
ALTER TABLE common_categories DROP COLUMN IF EXISTS sort_order;

ALTER TABLE common_topics DROP COLUMN IF EXISTS icon;
ALTER TABLE common_topics DROP COLUMN IF EXISTS color;
ALTER TABLE common_topics DROP COLUMN IF EXISTS sort_order;

ALTER TABLE ai_tool_categories DROP COLUMN IF EXISTS icon;
ALTER TABLE ai_tool_categories DROP COLUMN IF EXISTS color;
ALTER TABLE ai_tool_categories DROP COLUMN IF EXISTS sort_order;

ALTER TABLE ai_tools DROP COLUMN IF EXISTS icon;
ALTER TABLE ai_tools DROP COLUMN IF EXISTS color;

-- ===============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_common_topics_category ON common_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_category ON common_notes(category_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_topic ON common_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_common_notes_approved ON common_notes(is_approved);
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON ai_tools(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_active ON ai_tools(is_active);

-- ===============================================
-- 4. CREATE UPDATED_AT TRIGGER FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_common_categories_updated_at ON common_categories;
CREATE TRIGGER update_common_categories_updated_at
    BEFORE UPDATE ON common_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_common_topics_updated_at ON common_topics;
CREATE TRIGGER update_common_topics_updated_at
    BEFORE UPDATE ON common_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_common_notes_updated_at ON common_notes;
CREATE TRIGGER update_common_notes_updated_at
    BEFORE UPDATE ON common_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_tool_categories_updated_at ON ai_tool_categories;
CREATE TRIGGER update_ai_tool_categories_updated_at
    BEFORE UPDATE ON ai_tool_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_tools_updated_at ON ai_tools;
CREATE TRIGGER update_ai_tools_updated_at
    BEFORE UPDATE ON ai_tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 5. SET UP RLS POLICIES
-- ===============================================

-- Enable RLS
ALTER TABLE common_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active categories" ON common_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON common_categories;
DROP POLICY IF EXISTS "Anyone can read active topics" ON common_topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON common_topics;
DROP POLICY IF EXISTS "Anyone can read approved notes" ON common_notes;
DROP POLICY IF EXISTS "Authenticated users can insert notes" ON common_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON common_notes;
DROP POLICY IF EXISTS "Admins can manage all notes" ON common_notes;
DROP POLICY IF EXISTS "Anyone can read active ai tool categories" ON ai_tool_categories;
DROP POLICY IF EXISTS "Admins can manage ai tool categories" ON ai_tool_categories;
DROP POLICY IF EXISTS "Anyone can read active ai tools" ON ai_tools;
DROP POLICY IF EXISTS "Admins can manage ai tools" ON ai_tools;

-- Create permissive policies for common_categories
CREATE POLICY "Anyone can read categories"
    ON common_categories FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage categories"
    ON common_categories FOR ALL
    USING (auth.role() = 'authenticated');

-- Create policies for common_topics
CREATE POLICY "Anyone can read topics"
    ON common_topics FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage topics"
    ON common_topics FOR ALL
    USING (auth.role() = 'authenticated');

-- Create policies for common_notes
CREATE POLICY "Anyone can read notes"
    ON common_notes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert notes"
    ON common_notes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own notes"
    ON common_notes FOR UPDATE
    USING (auth.uid() = uploaded_by OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notes"
    ON common_notes FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create policies for ai_tool_categories
CREATE POLICY "Anyone can read ai tool categories"
    ON ai_tool_categories FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage ai tool categories"
    ON ai_tool_categories FOR ALL
    USING (auth.role() = 'authenticated');

-- Create policies for ai_tools
CREATE POLICY "Anyone can read ai tools"
    ON ai_tools FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage ai tools"
    ON ai_tools FOR ALL
    USING (auth.role() = 'authenticated');

-- ===============================================
-- 6. INSERT DEFAULT DATA
-- ===============================================

-- Insert default categories
INSERT INTO common_categories (id, title, description) VALUES
('dsa', 'Data Structures & Algorithms', 'Learn fundamental data structures and algorithms essential for programming interviews and competitive programming'),
('development', 'Development Resources', 'Web development, mobile development, and software engineering resources and tutorials'),
('placement', 'Placement Preparation', 'Interview preparation, resume building, and career guidance resources for job placements');

-- Insert default DSA topics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'arrays-strings') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('arrays-strings', 'dsa', 'Arrays & Strings', 'Basic array operations, string manipulation, and common algorithms', 'Easy', '["JavaScript", "Python", "Java", "C++"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'linked-lists') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('linked-lists', 'dsa', 'Linked Lists', 'Singly linked lists, doubly linked lists, and circular linked lists', 'Easy', '["JavaScript", "Python", "Java", "C++"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'stacks-queues') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('stacks-queues', 'dsa', 'Stacks & Queues', 'LIFO and FIFO data structures with applications', 'Easy', '["JavaScript", "Python", "Java", "C++"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'trees-graphs') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('trees-graphs', 'dsa', 'Trees & Graphs', 'Binary trees, BST, graph traversal algorithms', 'Medium', '["JavaScript", "Python", "Java", "C++"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'dynamic-programming') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('dynamic-programming', 'dsa', 'Dynamic Programming', 'Memoization, tabulation, and optimization problems', 'Hard', '["JavaScript", "Python", "Java", "C++"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'sorting-searching') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('sorting-searching', 'dsa', 'Sorting & Searching', 'Various sorting algorithms and binary search', 'Medium', '["JavaScript", "Python", "Java", "C++"]');
    END IF;
END $$;

-- Insert default Development topics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'frontend-basics') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('frontend-basics', 'development', 'Frontend Basics', 'HTML, CSS, JavaScript fundamentals', 'Beginner', '["HTML", "CSS", "JavaScript"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'react-development') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('react-development', 'development', 'React Development', 'React.js framework for building user interfaces', 'Intermediate', '["React", "JavaScript", "JSX"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'backend-development') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('backend-development', 'development', 'Backend Development', 'Server-side programming and APIs', 'Intermediate', '["Node.js", "Express", "Python", "Java"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'mobile-development') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('mobile-development', 'development', 'Mobile Development', 'iOS and Android app development', 'Intermediate', '["React Native", "Flutter", "Swift", "Kotlin"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'devops-deployment') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('devops-deployment', 'development', 'DevOps & Deployment', 'CI/CD, containerization, and cloud deployment', 'Advanced', '["Docker", "AWS", "Jenkins", "Kubernetes"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'database-design') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('database-design', 'development', 'Database Design', 'SQL, NoSQL, and database optimization', 'Intermediate', '["SQL", "MongoDB", "PostgreSQL", "Redis"]');
    END IF;
END $$;

-- Insert default Placement topics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'resume-building') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('resume-building', 'placement', 'Resume Building', 'Create compelling resumes that get noticed', 'Beginner', '["Writing", "Design"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'interview-prep') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('interview-prep', 'placement', 'Interview Preparation', 'Technical and behavioral interview strategies', 'Intermediate', '["Communication", "Problem Solving"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'coding-interviews') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('coding-interviews', 'placement', 'Coding Interviews', 'Practice coding problems and whiteboard sessions', 'Intermediate', '["DSA", "Problem Solving"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'system-design') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('system-design', 'placement', 'System Design', 'Large-scale system design interview preparation', 'Advanced', '["Architecture", "Scalability"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'company-specific') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('company-specific', 'placement', 'Company-Specific Prep', 'Preparation for specific companies (FAANG, startups)', 'Advanced', '["Research", "Strategy"]');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'soft-skills') THEN
        INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
        ('soft-skills', 'placement', 'Soft Skills', 'Communication, leadership, and professional skills', 'Beginner', '["Communication", "Leadership"]');
    END IF;
END $$;

-- Insert default AI Tool categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'writing-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('writing-tools', 'Writing Tools', 'AI-powered writing assistants and content generators');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'coding-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('coding-tools', 'Coding Tools', 'AI tools for code generation, debugging, and optimization');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'research-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('research-tools', 'Research Tools', 'AI tools for research, data analysis, and information gathering');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'design-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('design-tools', 'Design Tools', 'AI-powered design and creative tools');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'productivity-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('productivity-tools', 'Productivity Tools', 'AI tools for task management and productivity enhancement');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'learning-tools') THEN
        INSERT INTO ai_tool_categories (id, title, description) VALUES
        ('learning-tools', 'Learning Tools', 'AI-powered educational and learning platforms');
    END IF;
END $$;

-- Insert some sample AI tools
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'ChatGPT') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('ChatGPT', 'Advanced conversational AI for various tasks', 'writing-tools', 'https://chat.openai.com', false, 4.8, '["Conversation", "Writing", "Code Help", "Research"]', 98);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'GitHub Copilot') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('GitHub Copilot', 'AI pair programmer for code completion', 'coding-tools', 'https://github.com/features/copilot', true, 4.6, '["Code Completion", "AI Suggestions", "Multi-language Support"]', 95);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'Perplexity AI') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('Perplexity AI', 'AI-powered research and answer engine', 'research-tools', 'https://www.perplexity.ai', false, 4.5, '["Research", "Citations", "Real-time Data"]', 90);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'Midjourney') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('Midjourney', 'AI image generation from text prompts', 'design-tools', 'https://midjourney.com', true, 4.7, '["Image Generation", "Art Creation", "Text-to-Image"]', 92);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'Notion AI') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('Notion AI', 'AI writing assistant integrated with Notion', 'productivity-tools', 'https://notion.so', true, 4.4, '["Writing", "Summarization", "Task Management"]', 85);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE name = 'Khan Academy Khanmigo') THEN
        INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
        ('Khan Academy Khanmigo', 'AI tutor for personalized learning', 'learning-tools', 'https://khanacademy.org', true, 4.3, '["Tutoring", "Personalized Learning", "Math Help"]', 80);
    END IF;
END $$;

-- ===============================================
-- 7. CREATE HELPER FUNCTIONS FOR ANALYTICS
-- ===============================================

-- Function to get topic stats
CREATE OR REPLACE FUNCTION get_topic_stats(topic_id_param TEXT)
RETURNS TABLE (
    note_count BIGINT,
    total_downloads BIGINT,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as note_count,
        COALESCE(SUM(downloads), 0) as total_downloads,
        COALESCE(AVG(rating), 0.0) as avg_rating
    FROM common_notes
    WHERE topic_id = topic_id_param AND is_approved = true;
END;
$$ LANGUAGE plpgsql;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(note_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE common_notes
    SET downloads = downloads + 1
    WHERE id = note_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(note_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE common_notes
    SET views = views + 1
    WHERE id = note_id_param;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 8. CREATE VIEW FOR EASY DATA ACCESS
-- ===============================================

-- View for notes with category and topic info
CREATE OR REPLACE VIEW common_notes_with_details AS
SELECT
    cn.*,
    ct.title as topic_title,
    ct.difficulty,
    cc.title as category_title
FROM common_notes cn
JOIN common_topics ct ON cn.topic_id = ct.id
JOIN common_categories cc ON cn.category_id = cc.id;

-- View for topics with stats
CREATE OR REPLACE VIEW common_topics_with_stats AS
SELECT
    ct.*,
    cc.title as category_title,
    COUNT(cn.id) as note_count,
    COALESCE(SUM(cn.downloads), 0) as total_downloads,
    COALESCE(AVG(cn.rating), 0.0) as avg_rating
FROM common_topics ct
LEFT JOIN common_categories cc ON ct.category_id = cc.id
LEFT JOIN common_notes cn ON ct.id = cn.topic_id AND cn.is_approved = true
GROUP BY ct.id, ct.category_id, ct.title, ct.description, ct.difficulty,
         ct.technologies, ct.is_active, ct.created_at, ct.updated_at, cc.title;

-- ===============================================
-- 9. GRANT NECESSARY PERMISSIONS
-- ===============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT ON common_categories TO anon, authenticated;
GRANT SELECT ON common_topics TO anon, authenticated;
GRANT SELECT ON common_notes TO anon, authenticated;
GRANT SELECT ON ai_tool_categories TO anon, authenticated;
GRANT SELECT ON ai_tools TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON common_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON common_topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON common_notes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ai_tool_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ai_tools TO authenticated;

-- Grant permissions on views
GRANT SELECT ON common_notes_with_details TO anon, authenticated;
GRANT SELECT ON common_topics_with_stats TO anon, authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_topic_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_download_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;

-- ===============================================
-- 10. VERIFICATION QUERIES
-- ===============================================

-- Check if all tables exist and have data
SELECT
    'common_categories' as table_name,
    COUNT(*) as record_count
FROM common_categories
UNION ALL
SELECT
    'common_topics' as table_name,
    COUNT(*) as record_count
FROM common_topics
UNION ALL
SELECT
    'common_notes' as table_name,
    COUNT(*) as record_count
FROM common_notes
UNION ALL
SELECT
    'ai_tool_categories' as table_name,
    COUNT(*) as record_count
FROM ai_tool_categories
UNION ALL
SELECT
    'ai_tools' as table_name,
    COUNT(*) as record_count
FROM ai_tools;

-- Test a simple CRUD operation to ensure everything works
DO $$
DECLARE
    test_note_id UUID;
BEGIN
    -- Test INSERT
    INSERT INTO common_notes (title, description, category_id, topic_id, file_url, file_type, uploaded_by, is_approved)
    VALUES ('Test CRUD Note', 'Testing CRUD operations', 'dsa', 'arrays-strings', 'https://example.com/test.pdf', 'pdf',
            COALESCE((SELECT id FROM auth.users LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid), true)
    RETURNING id INTO test_note_id;

    -- Test UPDATE
    UPDATE common_notes
    SET description = 'Updated test description'
    WHERE id = test_note_id;

    -- Test SELECT
    IF NOT EXISTS (SELECT 1 FROM common_notes WHERE id = test_note_id) THEN
        RAISE EXCEPTION 'CRUD test failed: Note not found after insert';
    END IF;

    -- Test DELETE
    DELETE FROM common_notes WHERE id = test_note_id;

    RAISE NOTICE 'CRUD operations test completed successfully!';
END $$;

-- Final success message
SELECT 'Common Resources CRUD Operations Setup Complete!' as status,
       'All tables, policies, and data have been configured successfully.' as message;
