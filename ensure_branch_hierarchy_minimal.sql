-- ============================================
-- Minimal Branch Hierarchy Setup
-- Date: 2024-12-07
-- Description: Simple script to ensure branch hierarchy exists
-- ============================================

-- Ensure branch_years table has all 4 years for each branch
INSERT INTO branch_years (branch_id, year_number, is_active, display_order, academic_year)
SELECT
    b.id as branch_id,
    y.year_number,
    true as is_active,
    y.year_number as display_order,
    '2024-25' as academic_year
FROM branches b
CROSS JOIN (SELECT 1 as year_number UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) y
WHERE b.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM branch_years by
    WHERE by.branch_id = b.id
    AND by.year_number = y.year_number
);

-- Ensure branch_semesters table has all 8 semesters for each branch
INSERT INTO branch_semesters (
    branch_year_id,
    branch_id,
    year_number,
    semester_number,
    semester_label,
    is_active,
    display_order
)
SELECT
    by.id as branch_year_id,
    b.id as branch_id,
    by.year_number,
    s.semester_number,
    CASE by.year_number
        WHEN 1 THEN 'First Year - Semester ' || (s.semester_number)
        WHEN 2 THEN 'Second Year - Semester ' || (s.semester_number - 2)
        WHEN 3 THEN 'Third Year - Semester ' || (s.semester_number - 4)
        WHEN 4 THEN 'Fourth Year - Semester ' || (s.semester_number - 6)
    END as semester_label,
    true as is_active,
    s.semester_number as display_order
FROM branches b
JOIN branch_years by ON b.id = by.branch_id
CROSS JOIN (
    SELECT 1 as semester_number UNION SELECT 2
    UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6
    UNION SELECT 7 UNION SELECT 8
) s
WHERE b.is_active = true
AND by.is_active = true
AND (
    (by.year_number = 1 AND s.semester_number IN (1, 2)) OR
    (by.year_number = 2 AND s.semester_number IN (3, 4)) OR
    (by.year_number = 3 AND s.semester_number IN (5, 6)) OR
    (by.year_number = 4 AND s.semester_number IN (7, 8))
)
AND NOT EXISTS (
    SELECT 1 FROM branch_semesters bs
    WHERE bs.branch_id = b.id
    AND bs.year_number = by.year_number
    AND bs.semester_number = s.semester_number
);

-- Verification
SELECT
    'Setup Complete!' as status,
    COUNT(DISTINCT b.id) as branches,
    COUNT(DISTINCT by.id) as years,
    COUNT(DISTINCT bs.id) as semesters
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true;
