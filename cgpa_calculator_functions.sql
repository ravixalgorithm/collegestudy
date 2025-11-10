-- ============================================
-- CGPA CALCULATOR FUNCTIONS
-- ============================================

-- Function to get all subjects for a user's current semester with their credits
CREATE OR REPLACE FUNCTION get_user_subjects_for_cgpa(p_user_id UUID)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    subject_code TEXT,
    credits INTEGER,
    current_marks INTEGER,
    current_grade_point DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as subject_id,
        s.name::TEXT as subject_name,
        s.code::TEXT as subject_code,
        s.credits,
        COALESCE(cgpa.marks, 0) as current_marks,
        COALESCE(cgpa.grade_point, 0.00) as current_grade_point
    FROM subjects s
    INNER JOIN users u ON s.branch_id = u.branch_id AND s.semester = u.semester
    LEFT JOIN (
        SELECT
            subject_id,
            marks,
            grade_point
        FROM cgpa_records
        WHERE user_id = p_user_id
        AND semester = (SELECT semester FROM users WHERE id = p_user_id)
    ) cgpa ON s.id = cgpa.subject_id
    WHERE u.id = p_user_id
    ORDER BY s.code;
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
    AND cgpa.semester = v_semester;

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

    -- Count total subjects for current semester
    SELECT COUNT(*), COALESCE(SUM(credits), 0)
    INTO v_subjects_count, v_total_credits
    FROM subjects s
    INNER JOIN users u ON s.branch_id = u.branch_id AND s.semester = u.semester
    WHERE u.id = p_user_id;

    -- Count completed subjects (with marks entered)
    SELECT COUNT(*), COALESCE(SUM(credits), 0)
    INTO v_completed_subjects, v_completed_credits
    FROM cgpa_records cgpa
    WHERE cgpa.user_id = p_user_id
    AND cgpa.semester = v_semester;

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

-- Add marks column to cgpa_records if it doesn't exist
ALTER TABLE cgpa_records
ADD COLUMN IF NOT EXISTS marks INTEGER CHECK (marks >= 0 AND marks <= 100);

-- Add unique constraint for user, semester, subject combination
ALTER TABLE cgpa_records
DROP CONSTRAINT IF EXISTS unique_user_semester_subject;

ALTER TABLE cgpa_records
ADD CONSTRAINT unique_user_semester_subject
UNIQUE (user_id, semester, subject_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_subjects_for_cgpa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_grade_point(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION save_cgpa_record(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_current_sgpa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cgpa_summary(UUID) TO authenticated;

-- Set up RLS policies for cgpa_records table
ALTER TABLE cgpa_records ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own CGPA records
CREATE POLICY "Users can view own cgpa records" ON cgpa_records
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own CGPA records
CREATE POLICY "Users can insert own cgpa records" ON cgpa_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own CGPA records
CREATE POLICY "Users can update own cgpa records" ON cgpa_records
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all CGPA records
CREATE POLICY "Admins can view all cgpa records" ON cgpa_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );
