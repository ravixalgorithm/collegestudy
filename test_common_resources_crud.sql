-- Test SQL for Common Resources CRUD Operations
-- This file tests the database schema and CRUD operations for common resources

-- ===============================================
-- 1. TEST SCHEMA VERIFICATION
-- ===============================================

-- Check if required tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('common_categories', 'common_topics', 'common_notes', 'ai_tool_categories', 'ai_tools');

-- Check table structures (verify icon, color, sort_order columns are removed)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'common_categories'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'common_topics'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'common_notes'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===============================================
-- 2. TEST COMMON CATEGORIES CRUD
-- ===============================================

-- Insert test categories
INSERT INTO common_categories (id, title, description) VALUES
('test-dsa', 'Test DSA', 'Test Data Structures and Algorithms'),
('test-development', 'Test Development', 'Test Development Resources'),
('test-placement', 'Test Placement', 'Test Placement Preparation')
ON CONFLICT (id) DO UPDATE SET
title = EXCLUDED.title,
description = EXCLUDED.description;

-- Read categories
SELECT * FROM common_categories WHERE id LIKE 'test-%';

-- Update a category
UPDATE common_categories
SET description = 'Updated Test DSA Description'
WHERE id = 'test-dsa';

-- ===============================================
-- 3. TEST COMMON TOPICS CRUD
-- ===============================================

-- Insert test topics
INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies) VALUES
('test-arrays', 'test-dsa', 'Test Arrays', 'Array data structure basics', 'Easy', '["JavaScript", "Python"]'),
('test-react', 'test-development', 'Test React', 'React development fundamentals', 'Medium', '["React", "JavaScript"]'),
('test-interview', 'test-placement', 'Test Interview', 'Interview preparation tips', 'Beginner', '["Communication", "Problem Solving"]')
ON CONFLICT (id) DO UPDATE SET
title = EXCLUDED.title,
description = EXCLUDED.description,
difficulty = EXCLUDED.difficulty,
technologies = EXCLUDED.technologies;

-- Read topics
SELECT * FROM common_topics WHERE category_id LIKE 'test-%';

-- Update a topic
UPDATE common_topics
SET difficulty = 'Medium', technologies = '["JavaScript", "Python", "Java"]'
WHERE id = 'test-arrays';

-- ===============================================
-- 4. TEST COMMON NOTES CRUD
-- ===============================================

-- Insert test notes (using dummy user ID)
INSERT INTO common_notes (title, description, category_id, topic_id, file_url, file_type, file_size, uploaded_by, is_approved) VALUES
('Test Array Notes', 'Comprehensive array notes', 'test-dsa', 'test-arrays', 'https://example.com/array-notes.pdf', 'pdf', '1.5MB', (SELECT id FROM auth.users LIMIT 1), true),
('Test React Tutorial', 'React basics tutorial', 'test-development', 'test-react', 'https://example.com/react-tutorial.pdf', 'pdf', '2.1MB', (SELECT id FROM auth.users LIMIT 1), true),
('Test Interview Guide', 'Interview preparation guide', 'test-placement', 'test-interview', 'https://example.com/interview-guide.pdf', 'pdf', '800KB', (SELECT id FROM auth.users LIMIT 1), true);

-- Read notes
SELECT
    cn.id,
    cn.title,
    cn.description,
    cn.category_id,
    cn.topic_id,
    cn.file_url,
    cn.file_type,
    cn.is_approved,
    cn.downloads,
    cn.views,
    cn.rating,
    ct.title as topic_title,
    cc.title as category_title
FROM common_notes cn
JOIN common_topics ct ON cn.topic_id = ct.id
JOIN common_categories cc ON cn.category_id = cc.id
WHERE cn.category_id LIKE 'test-%';

-- Update a note
UPDATE common_notes
SET description = 'Updated comprehensive array notes with examples',
    is_featured = true,
    downloads = downloads + 1
WHERE title = 'Test Array Notes';

-- ===============================================
-- 5. TEST AI TOOLS CRUD
-- ===============================================

-- Insert test AI tool categories
INSERT INTO ai_tool_categories (id, title, description) VALUES
('test-writing', 'Test Writing Tools', 'AI tools for writing assistance'),
('test-coding', 'Test Coding Tools', 'AI tools for coding assistance')
ON CONFLICT (id) DO UPDATE SET
title = EXCLUDED.title,
description = EXCLUDED.description;

-- Insert test AI tools
INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score) VALUES
('Test GPT Writer', 'AI writing assistant', 'test-writing', 'https://example.com/gpt-writer', false, 4.5, '["Grammar Check", "Content Generation"]', 95),
('Test Code Helper', 'AI coding assistant', 'test-coding', 'https://example.com/code-helper', true, 4.8, '["Code Generation", "Bug Detection"]', 98);

-- Read AI tools with categories
SELECT
    at.id,
    at.name,
    at.description,
    at.category_id,
    at.url,
    at.is_premium,
    at.rating,
    at.features,
    at.popularity_score,
    atc.title as category_title
FROM ai_tools at
JOIN ai_tool_categories atc ON at.category_id = atc.id
WHERE atc.id LIKE 'test-%';

-- Update an AI tool
UPDATE ai_tools
SET rating = 4.9,
    popularity_score = 99,
    features = '["Grammar Check", "Content Generation", "SEO Optimization"]'
WHERE name = 'Test GPT Writer';

-- ===============================================
-- 6. TEST JOINS AND COMPLEX QUERIES
-- ===============================================

-- Test topic with note count
SELECT
    ct.id,
    ct.title,
    ct.description,
    ct.difficulty,
    ct.technologies,
    COUNT(cn.id) as note_count,
    COALESCE(SUM(cn.downloads), 0) as total_downloads
FROM common_topics ct
LEFT JOIN common_notes cn ON ct.id = cn.topic_id AND cn.is_approved = true
WHERE ct.category_id LIKE 'test-%'
GROUP BY ct.id, ct.title, ct.description, ct.difficulty, ct.technologies
ORDER BY ct.title;

-- Test notes with topic and category info
SELECT
    cn.id,
    cn.title,
    cn.description,
    cn.file_type,
    cn.downloads,
    cn.rating,
    cn.is_featured,
    cn.is_approved,
    cn.tags,
    ct.title as topic_title,
    ct.difficulty,
    cc.title as category_title
FROM common_notes cn
JOIN common_topics ct ON cn.topic_id = ct.id
JOIN common_categories cc ON cn.category_id = cc.id
WHERE cn.category_id LIKE 'test-%'
ORDER BY cn.created_at DESC;

-- ===============================================
-- 7. TEST DATA VALIDATION
-- ===============================================

-- Check for any invalid foreign keys
SELECT 'Invalid topic references' as issue, COUNT(*) as count
FROM common_notes cn
LEFT JOIN common_topics ct ON cn.topic_id = ct.id
WHERE ct.id IS NULL
UNION ALL
SELECT 'Invalid category references in notes' as issue, COUNT(*) as count
FROM common_notes cn
LEFT JOIN common_categories cc ON cn.category_id = cc.id
WHERE cc.id IS NULL
UNION ALL
SELECT 'Invalid category references in topics' as issue, COUNT(*) as count
FROM common_topics ct
LEFT JOIN common_categories cc ON ct.category_id = cc.id
WHERE cc.id IS NULL;

-- ===============================================
-- 8. CLEANUP TEST DATA
-- ===============================================

-- Delete test data (uncomment to clean up)
-- DELETE FROM common_notes WHERE category_id LIKE 'test-%';
-- DELETE FROM ai_tools WHERE category_id LIKE 'test-%';
-- DELETE FROM common_topics WHERE category_id LIKE 'test-%';
-- DELETE FROM common_categories WHERE id LIKE 'test-%';
-- DELETE FROM ai_tool_categories WHERE id LIKE 'test-%';

-- ===============================================
-- 9. VERIFY CRUD OPERATIONS WORK
-- ===============================================

-- Test that we can create, read, update, and delete successfully
DO $$
DECLARE
    test_category_id TEXT := 'crud-test-' || extract(epoch from now())::text;
    test_topic_id TEXT := 'topic-test-' || extract(epoch from now())::text;
    test_note_id UUID;
    note_count INTEGER;
BEGIN
    -- CREATE operations
    INSERT INTO common_categories (id, title, description)
    VALUES (test_category_id, 'CRUD Test Category', 'Testing CRUD operations');

    INSERT INTO common_topics (id, category_id, title, description, difficulty)
    VALUES (test_topic_id, test_category_id, 'CRUD Test Topic', 'Testing topic CRUD', 'Easy');

    INSERT INTO common_notes (title, description, category_id, topic_id, file_url, file_type, uploaded_by, is_approved)
    VALUES ('CRUD Test Note', 'Testing note CRUD', test_category_id, test_topic_id, 'https://example.com/test.pdf', 'pdf', (SELECT id FROM auth.users LIMIT 1), true)
    RETURNING id INTO test_note_id;

    -- READ operations
    SELECT COUNT(*) INTO note_count FROM common_notes WHERE id = test_note_id;
    IF note_count != 1 THEN
        RAISE EXCEPTION 'READ operation failed: Note not found';
    END IF;

    -- UPDATE operations
    UPDATE common_notes SET description = 'Updated CRUD test description' WHERE id = test_note_id;
    UPDATE common_topics SET difficulty = 'Medium' WHERE id = test_topic_id;
    UPDATE common_categories SET description = 'Updated CRUD test category' WHERE id = test_category_id;

    -- DELETE operations
    DELETE FROM common_notes WHERE id = test_note_id;
    DELETE FROM common_topics WHERE id = test_topic_id;
    DELETE FROM common_categories WHERE id = test_category_id;

    RAISE NOTICE 'All CRUD operations completed successfully!';
END $$;

-- Show current data counts
SELECT
    'common_categories' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM common_categories
UNION ALL
SELECT
    'common_topics' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM common_topics
UNION ALL
SELECT
    'common_notes' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_approved = true) as approved_records
FROM common_notes
UNION ALL
SELECT
    'ai_tool_categories' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM ai_tool_categories
UNION ALL
SELECT
    'ai_tools' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM ai_tools;
