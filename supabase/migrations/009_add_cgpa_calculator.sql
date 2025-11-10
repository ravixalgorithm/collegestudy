-- ============================================
-- MIGRATION 009: CGPA CALCULATOR (FIXED)
-- ============================================

-- Add marks column to cgpa_records if it doesn't exist
ALTER TABLE cgpa_records
ADD COLUMN IF NOT EXISTS marks INTEGER CHECK (marks >= 0 AND marks <= 100);

-- Add unique constraint for user, semester, subject combination
ALTER TABLE cgpa_records
DROP CONSTRAINT IF EXISTS unique_user_semester_subject;

ALTER TABLE cgpa_records
ADD CONSTRAINT unique_user_semester_subject
UNIQUE (user_id, semester, subject_id);

-- Function to get all available subjects for a user (including electives)
CREATE OR REPLACE FUNCTION get_available_subjects_for_cgpa(p_user_id UUID)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    subject_code TEXT,
    credits INTEGER,
    is_core BOOLEAN,
    branch_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branch_id UUID;
    v_semester INTEGER;
BEGIN
    -- Get user's branch and semester
    SELECT u.branch_id, u.semester INTO v_branch_id, v_semester
    FROM users u
    WHERE u.id = p_user_id;

    IF v_branch_id IS NULL OR v_semester IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        s.id as subject_id,
        s.name::TEXT as subject_name,
        s.code::TEXT as subject_code,
        s.credits,
        CASE
            WHEN s.branch_id = v_branch_id THEN true
            ELSE false
        END as is_core,
        b.name::TEXT as branch_name
    FROM subjects s
    INNER JOIN branches b ON s.branch_id = b.id
    WHERE (
        -- Core subjects for user's branch and semester
        (s.branch_id = v_branch_id AND s.semester = v_semester)
        OR
        -- Open electives (subjects from other branches/semesters)
        (s.branch_id != v_branch_id AND s.name ILIKE '%elective%')
        OR
        -- Common subjects that can be taken by any branch
        (s.code ILIKE 'GE%' OR s.code ILIKE 'HS%' OR s.code ILIKE 'BS%')
    )
    ORDER BY
        CASE WHEN s.branch_id = v_branch_id THEN 0 ELSE 1 END,
        s.code;
END;
$$;

-- Function to get user's selected subjects with their marks
CREATE OR REPLACE FUNCTION get_user_selected_subjects(p_user_id UUID)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    subject_code TEXT,
    credits INTEGER,
    current_marks INTEGER,
    current_grade_point DECIMAL(3,2),
    grade VARCHAR(5),
    is_core BOOLEAN,
    branch_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_branch_id UUID;
BEGIN
    -- Get user's current semester and branch
    SELECT u.semester, u.branch_id INTO v_semester, v_branch_id
    FROM users u
    WHERE u.id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        s.id as subject_id,
        s.name::TEXT as subject_name,
        s.code::TEXT as subject_code,
        s.credits,
        COALESCE(cgpa.marks, 0) as current_marks,
        COALESCE(cgpa.grade_point, 0.00) as current_grade_point,
        COALESCE(cgpa.grade, '')::VARCHAR(5) as grade,
        CASE
            WHEN s.branch_id = v_branch_id THEN true
            ELSE false
        END as is_core,
        b.name::TEXT as branch_name
    FROM subjects s
    INNER JOIN branches b ON s.branch_id = b.id
    INNER JOIN cgpa_records cgpa ON s.id = cgpa.subject_id
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester
    ORDER BY
        CASE WHEN s.branch_id = v_branch_id THEN 0 ELSE 1 END,
        s.code;
END;
$$;

-- Function to calculate grade point from marks (out of 100)
CREATE OR REPLACE FUNCTION calculate_grade_point(marks INTEGER)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF marks >= 90 THEN
        RETURN 10.00;
    ELSIF marks >= 80 THEN
        RETURN 9.00;
    ELSIF marks >= 70 THEN
        RETURN 8.00;
    ELSIF marks >= 60 THEN
        RETURN 7.00;
    ELSIF marks >= 50 THEN
        RETURN 6.00;
    ELSIF marks >= 40 THEN
        RETURN 5.00;
    ELSIF marks >= 30 THEN
        RETURN 4.00;
    ELSE
        RETURN 0.00;
    END IF;
END;
$$;

-- Function to add a subject to user's CGPA calculation
CREATE OR REPLACE FUNCTION add_subject_to_cgpa(
    p_user_id UUID,
    p_subject_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_credits INTEGER;
    v_subject_name TEXT;
BEGIN
    -- Get user's current semester
    SELECT semester INTO v_semester
    FROM users
    WHERE id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get subject details
    SELECT credits, name INTO v_credits, v_subject_name
    FROM subjects
    WHERE id = p_subject_id;

    IF v_credits IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Subject not found');
    END IF;

    -- Check if subject is already added
    IF EXISTS (
        SELECT 1 FROM cgpa_records
        WHERE user_id = p_user_id
        AND semester = v_semester
        AND subject_id = p_subject_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Subject already added');
    END IF;

    -- Add subject with 0 marks initially
    INSERT INTO cgpa_records (
        user_id,
        semester,
        subject_id,
        marks,
        grade,
        credits,
        grade_point,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        v_semester,
        p_subject_id,
        0,
        'F',
        v_credits,
        0.00,
        NOW(),
        NOW()
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Subject added successfully',
        'subject_name', v_subject_name
    );
END;
$$;

-- Function to remove a subject from user's CGPA calculation
CREATE OR REPLACE FUNCTION remove_subject_from_cgpa(
    p_user_id UUID,
    p_subject_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_subject_name TEXT;
BEGIN
    -- Get user's current semester
    SELECT semester INTO v_semester
    FROM users
    WHERE id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get subject name before deletion
    SELECT s.name INTO v_subject_name
    FROM subjects s
    INNER JOIN cgpa_records cgpa ON s.id = cgpa.subject_id
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester
    AND cgpa.subject_id = p_subject_id;

    -- Remove the subject
    DELETE FROM cgpa_records
    WHERE user_id = p_user_id
    AND semester = v_semester
    AND subject_id = p_subject_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Subject not found in your list');
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Subject removed successfully',
        'subject_name', COALESCE(v_subject_name, 'Unknown Subject')
    );
END;
$$;

-- Function to save or update CGPA record
CREATE OR REPLACE FUNCTION save_cgpa_record(
    p_user_id UUID,
    p_subject_id UUID,
    p_marks INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_credits INTEGER;
    v_grade_point DECIMAL(3,2);
    v_grade VARCHAR(5);
BEGIN
    -- Get user's current semester
    SELECT semester INTO v_semester
    FROM users
    WHERE id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get subject credits
    SELECT credits INTO v_credits
    FROM subjects
    WHERE id = p_subject_id;

    IF v_credits IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Subject not found');
    END IF;

    -- Calculate grade point
    v_grade_point := calculate_grade_point(p_marks);

    -- Determine letter grade
    v_grade := CASE
        WHEN p_marks >= 90 THEN 'A+'
        WHEN p_marks >= 80 THEN 'A'
        WHEN p_marks >= 70 THEN 'B+'
        WHEN p_marks >= 60 THEN 'B'
        WHEN p_marks >= 50 THEN 'C'
        WHEN p_marks >= 40 THEN 'D'
        ELSE 'F'
    END;

    -- Insert or update CGPA record
    INSERT INTO cgpa_records (
        user_id,
        semester,
        subject_id,
        marks,
        grade,
        credits,
        grade_point,
        updated_at
    )
    VALUES (
        p_user_id,
        v_semester,
        p_subject_id,
        p_marks,
        v_grade,
        v_credits,
        v_grade_point,
        NOW()
    )
    ON CONFLICT (user_id, semester, subject_id)
    DO UPDATE SET
        marks = EXCLUDED.marks,
        grade = EXCLUDED.grade,
        grade_point = EXCLUDED.grade_point,
        updated_at = NOW();

    RETURN json_build_object(
        'success', true,
        'grade_point', v_grade_point,
        'grade', v_grade
    );
END;
$$;

-- Function to calculate current SGPA for user
CREATE OR REPLACE FUNCTION calculate_current_sgpa(p_user_id UUID)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_total_grade_points DECIMAL;
    v_total_credits INTEGER;
    v_sgpa DECIMAL(4,2);
BEGIN
    -- Get user's current semester
    SELECT semester INTO v_semester
    FROM users
    WHERE id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN 0.00;
    END IF;

    -- Calculate total grade points and credits for current semester
    SELECT
        COALESCE(SUM(cgpa.grade_point * cgpa.credits), 0),
        COALESCE(SUM(cgpa.credits), 0)
    INTO v_total_grade_points, v_total_credits
    FROM cgpa_records cgpa
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester
    AND cgpa.marks > 0; -- Only count subjects with marks entered

    -- Calculate SGPA
    IF v_total_credits > 0 THEN
        v_sgpa := v_total_grade_points / v_total_credits;
    ELSE
        v_sgpa := 0.00;
    END IF;

    RETURN ROUND(v_sgpa, 2);
END;
$$;

-- Function to get CGPA calculation summary
CREATE OR REPLACE FUNCTION get_cgpa_summary(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_semester INTEGER;
    v_sgpa DECIMAL(4,2);
    v_subjects_count INTEGER;
    v_completed_subjects INTEGER;
    v_total_credits INTEGER;
    v_completed_credits INTEGER;
BEGIN
    -- Get user's current semester
    SELECT semester INTO v_semester
    FROM users
    WHERE id = p_user_id;

    IF v_semester IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get current SGPA
    v_sgpa := calculate_current_sgpa(p_user_id);

    -- Count total subjects added by user
    SELECT COUNT(*), COALESCE(SUM(credits), 0)
    INTO v_subjects_count, v_total_credits
    FROM cgpa_records cgpa
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester;

    -- Count completed subjects (with marks > 0)
    SELECT COUNT(*), COALESCE(SUM(credits), 0)
    INTO v_completed_subjects, v_completed_credits
    FROM cgpa_records cgpa
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester
    AND cgpa.marks > 0;

    RETURN json_build_object(
        'success', true,
        'semester', v_semester,
        'sgpa', v_sgpa,
        'subjects_count', v_subjects_count,
        'completed_subjects', v_completed_subjects,
        'total_credits', v_total_credits,
        'completed_credits', v_completed_credits,
        'completion_percentage',
        CASE
            WHEN v_subjects_count > 0 THEN ROUND((v_completed_subjects::DECIMAL / v_subjects_count) * 100, 1)
            ELSE 0
        END
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_available_subjects_for_cgpa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_selected_subjects(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_grade_point(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_subject_to_cgpa(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_subject_from_cgpa(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_cgpa_record(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_current_sgpa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cgpa_summary(UUID) TO authenticated;

-- Set up RLS policies for cgpa_records table
ALTER TABLE cgpa_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own cgpa records" ON cgpa_records;
DROP POLICY IF EXISTS "Users can insert own cgpa records" ON cgpa_records;
DROP POLICY IF EXISTS "Users can update own cgpa records" ON cgpa_records;
DROP POLICY IF EXISTS "Users can delete own cgpa records" ON cgpa_records;
DROP POLICY IF EXISTS "Admins can view all cgpa records" ON cgpa_records;

-- Policy to allow users to view their own CGPA records
CREATE POLICY "Users can view own cgpa records" ON cgpa_records
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own CGPA records
CREATE POLICY "Users can insert own cgpa records" ON cgpa_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own CGPA records
CREATE POLICY "Users can update own cgpa records" ON cgpa_records
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own CGPA records
CREATE POLICY "Users can delete own cgpa records" ON cgpa_records
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all CGPA records
CREATE POLICY "Admins can view all cgpa records" ON cgpa_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );
