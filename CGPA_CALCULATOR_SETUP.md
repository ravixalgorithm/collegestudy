# CGPA Calculator Setup Guide

## Overview
This guide will help you set up the CGPA calculator feature in your college study app. Students can add subjects manually (including open electives) and calculate their SGPA based on marks out of 100.

## Features
- ✅ Manual subject selection (core + elective subjects)
- ✅ Marks entry out of 100
- ✅ Automatic grade calculation (90-100=10, 80-89=9, etc.)
- ✅ SGPA calculation: Σ(Grade Point × Credits) / Σ(Credits)
- ✅ Progress tracking and completion percentage
- ✅ Search functionality for subjects
- ✅ Subject management (add/remove)

## Setup Steps

### 1. Database Migration
Run the following SQL in your Supabase SQL Editor:

```sql
-- Copy the entire content of: 
-- supabase/migrations/009_add_cgpa_calculator.sql
```

### 2. Database Functions Created
The migration creates these functions:
- `get_available_subjects_for_cgpa(user_id)` - Get all available subjects (core + electives)
- `get_user_selected_subjects(user_id)` - Get user's selected subjects with marks
- `add_subject_to_cgpa(user_id, subject_id)` - Add a subject to user's list
- `remove_subject_from_cgpa(user_id, subject_id)` - Remove a subject from user's list
- `save_cgpa_record(user_id, subject_id, marks)` - Save marks for a subject
- `calculate_current_sgpa(user_id)` - Calculate current SGPA
- `get_cgpa_summary(user_id)` - Get completion summary

### 3. Database Schema Updates
- Added `marks` column to `cgpa_records` table (0-100)
- Added unique constraint for (user_id, semester, subject_id)
- Set up RLS policies for data security

### 4. Mobile App Components
- `CGPACalculator.tsx` component added to `src/components/`
- Integrated into home page (`app/(tabs)/home.tsx`)
- Two modals: main calculator and subject selection

## Grading Scale

| Marks Range | Grade Points | Letter Grade |
|-------------|--------------|--------------|
| 90-100      | 10.0        | A+           |
| 80-89       | 9.0         | A            |
| 70-79       | 8.0         | B+           |
| 60-69       | 7.0         | B            |
| 50-59       | 6.0         | C            |
| 40-49       | 5.0         | D            |
| Below 40    | 0.0         | F            |

## Subject Selection Logic

### Core Subjects
- Automatically includes subjects for user's branch and semester
- Example: CSE 3rd semester students see all CSE 3rd sem subjects

### Elective Subjects
- Subjects from other branches containing "elective" in name
- Common subjects (codes starting with GE, HS, BS)
- Students can search and manually add these

### Search Features
- Search by subject name
- Search by subject code
- Search by branch name
- Real-time filtering

## User Workflow

1. **Home Page**: Student sees CGPA calculator card showing:
   - Current SGPA
   - Subjects completed count
   - Progress percentage

2. **Open Calculator**: Tap card to open calculator modal

3. **Add Subjects**: 
   - Tap "Add Subject" button
   - Search available subjects
   - Add core subjects and electives

4. **Enter Marks**:
   - Enter marks out of 100 for each subject
   - See real-time grade point calculation
   - View updated SGPA

5. **Save Data**: Tap "Save All Marks" to store in database

6. **Manage Subjects**: Remove subjects using minus button

## Testing

### Database Functions Test
```sql
-- Test available subjects
SELECT * FROM get_available_subjects_for_cgpa('user-uuid-here');

-- Test grade calculation
SELECT calculate_grade_point(85); -- Should return 9.00

-- Test adding subject
SELECT add_subject_to_cgpa('user-uuid', 'subject-uuid');

-- Test SGPA calculation
SELECT calculate_current_sgpa('user-uuid-here');
```

### Mobile App Test
1. Login as student
2. Navigate to home page
3. Check if CGPA calculator card appears
4. Tap to open calculator
5. Add subjects and enter marks
6. Verify SGPA calculation
7. Save and reload to check persistence

## Troubleshooting

### Common Issues

**Error: "Function does not exist"**
- Run the migration SQL script first
- Check function permissions in Supabase

**Error: "Column reference ambiguous"**
- Fixed in updated migration script
- Re-run the migration if you used old version

**No subjects available**
- Ensure subjects table has data for user's branch/semester
- Check if elective subjects exist with proper naming

**CGPA calculator not showing**
- Check if component is properly imported in home.tsx
- Verify user has valid profile data (branch_id, semester)

### Debug Queries

```sql
-- Check user profile
SELECT * FROM users WHERE id = 'user-uuid-here';

-- Check available subjects
SELECT * FROM subjects WHERE branch_id = 'user-branch-id' AND semester = 'user-semester';

-- Check CGPA records
SELECT * FROM cgpa_records WHERE user_id = 'user-uuid-here';

-- Check function permissions
SELECT has_function_privilege('authenticated', 'get_cgpa_summary(uuid)', 'execute');
```

## Data Structure

### cgpa_records table
- `user_id`: Student UUID
- `semester`: Current semester
- `subject_id`: Subject UUID
- `marks`: Marks out of 100
- `grade`: Letter grade (A+, A, B+, etc.)
- `credits`: Subject credits
- `grade_point`: Calculated grade point (0-10)

### Key Relationships
- User → cgpa_records (one-to-many)
- Subject → cgpa_records (one-to-many)
- Branch → subjects (one-to-many)

## Security

- RLS policies ensure users can only access their own data
- Functions use SECURITY DEFINER for controlled access
- Input validation for marks (0-100 range)
- Authenticated user checks in all functions

## Performance Notes

- Indexes on (user_id, semester, subject_id)
- Efficient queries using JOINs instead of subqueries
- Minimal data transfer with specific column selection
- Real-time calculation in frontend, database save on demand

## Future Enhancements

- CGPA calculation across multiple semesters
- Grade prediction and recommendations
- Export CGPA report as PDF
- Semester-wise SGPA history
- Grade analytics and trends
- Integration with academic calendar