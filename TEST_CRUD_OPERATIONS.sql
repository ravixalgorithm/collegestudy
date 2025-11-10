-- TEST CRUD OPERATIONS FOR COMMON RESOURCES
-- This script tests all CRUD operations to verify everything is working correctly
-- Run this in Supabase SQL editor to test the system

-- ===============================================
-- CLEANUP PREVIOUS TESTS
-- ===============================================
DELETE FROM common_notes WHERE title LIKE 'TEST_%';
DELETE FROM common_topics WHERE id LIKE 'test_%';
DELETE FROM common_categories WHERE id LIKE 'test_%';
DELETE FROM ai_tools WHERE name LIKE 'TEST_%';
DELETE FROM ai_tool_categories WHERE id LIKE 'test_%';

-- ===============================================
-- TEST 1: COMMON CATEGORIES CRUD
-- ===============================================
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing Common Categories CRUD ===';

    -- CREATE
    INSERT INTO common_categories (id, title, description)
    VALUES ('test_category', 'TEST Category', 'Test category description');

    -- READ
    SELECT COUNT(*) INTO category_count FROM common_categories WHERE id = 'test_category';
    IF category_count != 1 THEN
        RAISE EXCEPTION 'CREATE failed for common_categories';
    END IF;
    RAISE NOTICE 'CREATE: ✓ Category created successfully';

    -- UPDATE
    UPDATE common_categories SET description = 'Updated description' WHERE id = 'test_category';

    -- Verify UPDATE
    IF NOT EXISTS (SELECT 1 FROM common_categories WHERE id = 'test_category' AND description = 'Updated description') THEN
        RAISE EXCEPTION 'UPDATE failed for common_categories';
    END IF;
    RAISE NOTICE 'UPDATE: ✓ Category updated successfully';

    -- DELETE will be done at the end
    RAISE NOTICE 'Common Categories CRUD: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 2: COMMON TOPICS CRUD
-- ===============================================
DO $$
DECLARE
    topic_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing Common Topics CRUD ===';

    -- CREATE
    INSERT INTO common_topics (id, category_id, title, description, difficulty, technologies)
    VALUES ('test_topic', 'test_category', 'TEST Topic', 'Test topic description', 'Easy', '["JavaScript", "Python"]');

    -- READ
    SELECT COUNT(*) INTO topic_count FROM common_topics WHERE id = 'test_topic';
    IF topic_count != 1 THEN
        RAISE EXCEPTION 'CREATE failed for common_topics';
    END IF;
    RAISE NOTICE 'CREATE: ✓ Topic created successfully';

    -- UPDATE
    UPDATE common_topics
    SET description = 'Updated topic description', difficulty = 'Medium'
    WHERE id = 'test_topic';

    -- Verify UPDATE
    IF NOT EXISTS (SELECT 1 FROM common_topics WHERE id = 'test_topic' AND difficulty = 'Medium') THEN
        RAISE EXCEPTION 'UPDATE failed for common_topics';
    END IF;
    RAISE NOTICE 'UPDATE: ✓ Topic updated successfully';

    RAISE NOTICE 'Common Topics CRUD: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 3: COMMON NOTES CRUD
-- ===============================================
DO $$
DECLARE
    note_id UUID;
    note_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing Common Notes CRUD ===';

    -- CREATE
    INSERT INTO common_notes (title, description, category_id, topic_id, file_url, file_type, is_approved)
    VALUES ('TEST_Note', 'Test note description', 'test_category', 'test_topic', 'https://example.com/test.pdf', 'pdf', true)
    RETURNING id INTO note_id;

    -- READ
    SELECT COUNT(*) INTO note_count FROM common_notes WHERE id = note_id;
    IF note_count != 1 THEN
        RAISE EXCEPTION 'CREATE failed for common_notes';
    END IF;
    RAISE NOTICE 'CREATE: ✓ Note created successfully with ID: %', note_id;

    -- UPDATE
    UPDATE common_notes
    SET description = 'Updated note description', is_featured = true, downloads = 5
    WHERE id = note_id;

    -- Verify UPDATE
    IF NOT EXISTS (SELECT 1 FROM common_notes WHERE id = note_id AND is_featured = true AND downloads = 5) THEN
        RAISE EXCEPTION 'UPDATE failed for common_notes';
    END IF;
    RAISE NOTICE 'UPDATE: ✓ Note updated successfully';

    -- Test view with joins
    IF NOT EXISTS (
        SELECT 1 FROM common_notes cn
        JOIN common_topics ct ON cn.topic_id = ct.id
        JOIN common_categories cc ON cn.category_id = cc.id
        WHERE cn.id = note_id
    ) THEN
        RAISE EXCEPTION 'JOIN query failed for common_notes';
    END IF;
    RAISE NOTICE 'JOIN: ✓ Note joins work correctly';

    RAISE NOTICE 'Common Notes CRUD: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 4: AI TOOL CATEGORIES CRUD
-- ===============================================
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing AI Tool Categories CRUD ===';

    -- CREATE
    INSERT INTO ai_tool_categories (id, title, description)
    VALUES ('test_ai_category', 'TEST AI Category', 'Test AI category description');

    -- READ
    SELECT COUNT(*) INTO category_count FROM ai_tool_categories WHERE id = 'test_ai_category';
    IF category_count != 1 THEN
        RAISE EXCEPTION 'CREATE failed for ai_tool_categories';
    END IF;
    RAISE NOTICE 'CREATE: ✓ AI Tool Category created successfully';

    -- UPDATE
    UPDATE ai_tool_categories SET description = 'Updated AI category description' WHERE id = 'test_ai_category';

    -- Verify UPDATE
    IF NOT EXISTS (SELECT 1 FROM ai_tool_categories WHERE id = 'test_ai_category' AND description = 'Updated AI category description') THEN
        RAISE EXCEPTION 'UPDATE failed for ai_tool_categories';
    END IF;
    RAISE NOTICE 'UPDATE: ✓ AI Tool Category updated successfully';

    RAISE NOTICE 'AI Tool Categories CRUD: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 5: AI TOOLS CRUD
-- ===============================================
DO $$
DECLARE
    tool_id UUID;
    tool_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing AI Tools CRUD ===';

    -- CREATE
    INSERT INTO ai_tools (name, description, category_id, url, is_premium, rating, features, popularity_score)
    VALUES ('TEST_AI_Tool', 'Test AI tool description', 'test_ai_category', 'https://example.com/tool', false, 4.5, '["Feature1", "Feature2"]', 85)
    RETURNING id INTO tool_id;

    -- READ
    SELECT COUNT(*) INTO tool_count FROM ai_tools WHERE id = tool_id;
    IF tool_count != 1 THEN
        RAISE EXCEPTION 'CREATE failed for ai_tools';
    END IF;
    RAISE NOTICE 'CREATE: ✓ AI Tool created successfully with ID: %', tool_id;

    -- UPDATE
    UPDATE ai_tools
    SET rating = 4.8, popularity_score = 95, is_featured = true
    WHERE id = tool_id;

    -- Verify UPDATE
    IF NOT EXISTS (SELECT 1 FROM ai_tools WHERE id = tool_id AND rating = 4.8 AND is_featured = true) THEN
        RAISE EXCEPTION 'UPDATE failed for ai_tools';
    END IF;
    RAISE NOTICE 'UPDATE: ✓ AI Tool updated successfully';

    -- Test view with joins
    IF NOT EXISTS (
        SELECT 1 FROM ai_tools at
        JOIN ai_tool_categories atc ON at.category_id = atc.id
        WHERE at.id = tool_id
    ) THEN
        RAISE EXCEPTION 'JOIN query failed for ai_tools';
    END IF;
    RAISE NOTICE 'JOIN: ✓ AI Tool joins work correctly';

    RAISE NOTICE 'AI Tools CRUD: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 6: COMPLEX QUERIES
-- ===============================================
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing Complex Queries ===';

    -- Test topic with note statistics
    SELECT COUNT(*) INTO result_count
    FROM common_topics ct
    LEFT JOIN common_notes cn ON ct.id = cn.topic_id AND cn.is_approved = true
    WHERE ct.id = 'test_topic';

    IF result_count = 0 THEN
        RAISE EXCEPTION 'Topic statistics query failed';
    END IF;
    RAISE NOTICE 'STATS: ✓ Topic statistics query works';

    -- Test notes with full details
    SELECT COUNT(*) INTO result_count
    FROM common_notes cn
    JOIN common_topics ct ON cn.topic_id = ct.id
    JOIN common_categories cc ON cn.category_id = cc.id
    WHERE cn.title = 'TEST_Note';

    IF result_count = 0 THEN
        RAISE EXCEPTION 'Notes detail query failed';
    END IF;
    RAISE NOTICE 'DETAIL: ✓ Notes detail query works';

    -- Test AI tools with categories
    SELECT COUNT(*) INTO result_count
    FROM ai_tools at
    JOIN ai_tool_categories atc ON at.category_id = atc.id
    WHERE at.name = 'TEST_AI_Tool';

    IF result_count = 0 THEN
        RAISE EXCEPTION 'AI tools category query failed';
    END IF;
    RAISE NOTICE 'CATEGORY: ✓ AI tools category query works';

    RAISE NOTICE 'Complex Queries: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 7: RLS POLICIES
-- ===============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing RLS Policies ===';

    -- Test that tables have RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'common_categories' AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled for common_categories';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'common_topics' AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled for common_topics';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'common_notes' AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled for common_notes';
    END IF;

    RAISE NOTICE 'RLS: ✓ Row Level Security is properly enabled';
    RAISE NOTICE 'RLS Policies: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 8: DELETE OPERATIONS
-- ===============================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '=== Testing DELETE Operations ===';

    -- Delete note
    DELETE FROM common_notes WHERE title = 'TEST_Note';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count != 1 THEN
        RAISE EXCEPTION 'DELETE failed for common_notes';
    END IF;
    RAISE NOTICE 'DELETE: ✓ Note deleted successfully';

    -- Delete AI tool
    DELETE FROM ai_tools WHERE name = 'TEST_AI_Tool';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count != 1 THEN
        RAISE EXCEPTION 'DELETE failed for ai_tools';
    END IF;
    RAISE NOTICE 'DELETE: ✓ AI Tool deleted successfully';

    -- Delete topic
    DELETE FROM common_topics WHERE id = 'test_topic';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count != 1 THEN
        RAISE EXCEPTION 'DELETE failed for common_topics';
    END IF;
    RAISE NOTICE 'DELETE: ✓ Topic deleted successfully';

    -- Delete categories
    DELETE FROM common_categories WHERE id = 'test_category';
    DELETE FROM ai_tool_categories WHERE id = 'test_ai_category';

    RAISE NOTICE 'DELETE Operations: ✓ PASSED';
END $$;

-- ===============================================
-- TEST 9: VERIFY EXISTING DATA
-- ===============================================
DO $$
DECLARE
    category_count INTEGER;
    topic_count INTEGER;
    ai_category_count INTEGER;
    ai_tool_count INTEGER;
BEGIN
    RAISE NOTICE '=== Verifying Existing Data ===';

    SELECT COUNT(*) INTO category_count FROM common_categories;
    SELECT COUNT(*) INTO topic_count FROM common_topics;
    SELECT COUNT(*) INTO ai_category_count FROM ai_tool_categories;
    SELECT COUNT(*) INTO ai_tool_count FROM ai_tools;

    RAISE NOTICE 'DATA COUNTS:';
    RAISE NOTICE '  - Common Categories: %', category_count;
    RAISE NOTICE '  - Common Topics: %', topic_count;
    RAISE NOTICE '  - AI Tool Categories: %', ai_category_count;
    RAISE NOTICE '  - AI Tools: %', ai_tool_count;

    IF category_count = 0 THEN
        RAISE NOTICE 'WARNING: No common categories found. Run SIMPLE_CRUD_FIX.sql first.';
    END IF;

    IF topic_count = 0 THEN
        RAISE NOTICE 'WARNING: No common topics found. Run SIMPLE_CRUD_FIX.sql first.';
    END IF;

    RAISE NOTICE 'Existing Data Verification: ✓ COMPLETED';
END $$;

-- ===============================================
-- FINAL RESULTS
-- ===============================================

SELECT
    '🎉 ALL CRUD OPERATIONS TEST COMPLETED SUCCESSFULLY! 🎉' as test_result,
    NOW() as completed_at;

SELECT
    'Next Steps:' as action,
    '1. Test admin dashboard CRUD operations' as step_1,
    '2. Test mobile app data loading' as step_2,
    '3. Verify changes sync between platforms' as step_3;

-- Show current data summary
SELECT
    'FINAL DATA SUMMARY' as summary,
    (SELECT COUNT(*) FROM common_categories) as categories,
    (SELECT COUNT(*) FROM common_topics) as topics,
    (SELECT COUNT(*) FROM common_notes) as notes,
    (SELECT COUNT(*) FROM ai_tool_categories) as ai_categories,
    (SELECT COUNT(*) FROM ai_tools) as ai_tools;
