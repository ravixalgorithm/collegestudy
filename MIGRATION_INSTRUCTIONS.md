# Migration Instructions: Adding Modules and PYQ Support

## Overview

This guide will help you apply the database migration to add module numbers and PYQ (Previous Year Questions) support to your notes system.

## Before You Start

1. **Backup your database** (always recommended before major changes)
2. Make sure you have access to your Supabase dashboard
3. Ensure no critical operations are running on the database
4. **Run the diagnostic script first** (see Step 1 below)

## Step 1: Run Diagnostic Check (IMPORTANT)

**Before running the migration, check your current data:**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"** to create a new SQL script
4. Open the file `check_before_migration.sql` in your code editor
5. **Copy and paste** the entire contents into the SQL Editor
6. Click **"Run"** to see your current database status

This will show you:
- ✅ Current notes structure
- ✅ Data summary
- ✅ Whether migration was already applied
- ✅ Potential issues to address

**Important:** If the diagnostic shows "MIGRATION ALREADY APPLIED", stop here and contact support.

## Step 2: Access Supabase SQL Editor (for Migration)

1. Create another **new query** in the SQL Editor
2. This will be for the actual migration script

## Step 3: Run the Migration Script

1. Open the file `run_migration_manually.sql` in your code editor
2. **Copy the entire contents** of that file
3. **Paste it into the new SQL Editor query**
4. Click **"Run"** to execute the migration

**Note:** The new migration script safely handles existing data and applies constraints properly to avoid the "check constraint violated" error.

### What This Safe Migration Does

- ✅ Adds 4 new columns to the `notes` table:
  - `module_number` (INTEGER, 1-5)
  - `is_pyq` (BOOLEAN, default FALSE)
  - `academic_year` (VARCHAR, e.g., "2023-24")
  - `exam_type` (VARCHAR, e.g., "Mid-term")

- ✅ **Safely updates existing data first** (all notes → Module 1)
- ✅ **Then applies constraints** (prevents constraint violations)
- ✅ Creates database indexes for performance  
- ✅ Creates helper functions for querying notes
- ✅ Creates a convenient view for organized queries
- ✅ Validates all data integrity

## Step 4: Verify Migration Success

After running the migration, you should see output similar to:

```
NOTICE: ========================================
NOTICE: MIGRATION COMPLETED SUCCESSFULLY!
NOTICE: ========================================
NOTICE: Data Validation:
NOTICE:   Total notes: 25
NOTICE:   PYQ notes: 0
NOTICE:   Module notes: 25
NOTICE:   Invalid notes: 0 (should be 0)
```

**Important:** If you see "Invalid notes: X" where X > 0, contact support immediately.

## Step 5: Test the New Structure

Run this test query in the SQL Editor:

```sql
-- Check if new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notes'
AND column_name IN ('module_number', 'is_pyq', 'academic_year', 'exam_type');
```

You should see all 4 new columns listed.

## Step 6: Update Your Applications

### Admin Dashboard
- The admin dashboard has already been updated to include the new fields
- When adding notes, you can now choose between:
  - **Module Notes**: Select module number (1-5)
  - **PYQ Notes**: Enter academic year and exam type

### Mobile App
- The mobile app now displays notes in the new hierarchical structure:
  - Subject → PYQ Section → Individual PYQ notes
  - Subject → Module 1-5 → Individual module notes

### API Changes
- The `notes` table now includes the new fields
All existing API calls will continue to work
- New fields are optional for backward compatibility

## Step 7: Clean Up Existing Data (Optional)

After migration, all existing notes are set to "Module 1". You may want to:

1. Review and recategorize existing notes to appropriate modules
2. Move any question papers to the PYQ section
3. Add academic years and exam types to PYQ notes

### Example: Moving a note to PYQ

```sql
UPDATE notes
SET is_pyq = TRUE,
    module_number = NULL,
    academic_year = '2023-24',
    exam_type = 'Mid-term'
WHERE title ILIKE '%question paper%' OR title ILIKE '%exam%';
```

### Example: Moving a note to Module 3

```sql
UPDATE notes
SET module_number = 3,
    is_pyq = FALSE
WHERE title ILIKE '%module 3%' OR description ILIKE '%unit 3%';
```

## Troubleshooting

### Error: "column already exists"
- This is harmless - it means some columns were already added
- The migration uses `IF NOT EXISTS` to prevent errors

### Error: "constraint violation" 
- **This should NOT happen with the new safe migration script**
- If you still see this error, run the diagnostic script first
- The new migration updates data before applying constraints

### Error: "function already exists"
- This is harmless - the migration recreates functions safely

### Notes not appearing in mobile app
- Ensure notes have `is_verified = TRUE`
- Check that notes have valid `module_number` or `is_pyq = TRUE`

## Testing New Features

### Add a Module Note (Admin Dashboard)
1. Go to Notes section in admin dashboard
2. Click "Add Note"
3. Select "Module Notes" category
4. Choose module number (1-5)
5. Fill in other details and save

### Add a PYQ Note (Admin Dashboard)
1. Go to Notes section in admin dashboard
2. Click "Add Note"
3. Select "Previous Year Questions" category
4. Enter academic year (e.g., "2023-24")
5. Select exam type (Mid-term, End-term, etc.)
6. Fill in other details and save

### View in Mobile App
1. Open the mobile app
2. Go to Notes tab
3. You should see subjects with expandable sections for:
   - 📝 Previous Year Questions (if any PYQ notes exist)
   - 📚 Module 1-5 (if any module notes exist)

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove constraints first
ALTER TABLE notes DROP CONSTRAINT IF EXISTS check_note_category;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS check_module_range;

-- Remove new columns (THIS WILL DELETE DATA!)
ALTER TABLE notes DROP COLUMN IF EXISTS module_number;
ALTER TABLE notes DROP COLUMN IF EXISTS is_pyq;
ALTER TABLE notes DROP COLUMN IF EXISTS academic_year;
ALTER TABLE notes DROP COLUMN IF EXISTS exam_type;

-- Drop view
DROP VIEW IF EXISTS notes_organized;

-- Drop functions
DROP FUNCTION IF EXISTS get_pyq_notes_for_subject(UUID);
DROP FUNCTION IF EXISTS get_module_notes_for_subject(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_notes_summary_for_subject(UUID);
DROP FUNCTION IF EXISTS get_organized_notes_for_semester(UUID, INTEGER);

-- Drop indexes
DROP INDEX IF EXISTS idx_notes_module_number;
DROP INDEX IF EXISTS idx_notes_is_pyq;
DROP INDEX IF EXISTS idx_notes_subject_module;
DROP INDEX IF EXISTS idx_notes_subject_pyq;
```

## Support

If you encounter any issues:

1. **Always run the diagnostic script first** (`check_before_migration.sql`)
2. Check the migration output for specific error messages
3. Verify your database permissions
4. Ensure you're running the migration on the correct database
5. If you get constraint violations, use the new safe migration script
6. Review the troubleshooting section above

## Next Steps

After successful migration:

1. ✅ Test adding new notes through the admin dashboard
2. ✅ Verify the mobile app displays the new structure
3. ✅ Recategorize existing notes as needed
4. ✅ Train users on the new structure

---

**Files Included:**
- `check_before_migration.sql` - Diagnostic script (run first)
- `run_migration_manually.sql` - Safe migration script  
- `docs/NOTES_STRUCTURE.md` - Complete documentation

**Version**: 2.1 (Safe Migration)