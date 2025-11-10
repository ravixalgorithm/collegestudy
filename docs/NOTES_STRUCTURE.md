# Notes Structure Documentation

## Overview

The notes system has been restructured to provide a hierarchical organization that matches typical college course structures. Students can now browse notes organized by:

1. **Subjects** (per semester and branch)
2. **PYQ Section** (Previous Year Questions)
3. **Modules** (1-5, typical for most subjects)
4. **Individual Notes** within each category

## Database Schema

### Notes Table Structure

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    tags TEXT[],
    
    -- New fields for organization
    module_number INTEGER CHECK (module_number >= 1 AND module_number <= 5),
    is_pyq BOOLEAN DEFAULT FALSE,
    academic_year VARCHAR(20),  -- For PYQ: '2023-24', '2022-23', etc.
    exam_type VARCHAR(50),       -- For PYQ: 'Mid-term', 'End-term', 'Quiz'
    
    uploaded_by UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Must be either PYQ OR have a module number (not both)
    CONSTRAINT check_note_category CHECK (
        (is_pyq = TRUE AND module_number IS NULL) OR
        (is_pyq = FALSE AND module_number IS NOT NULL)
    )
);
```

### Key Constraints

- **Category Validation**: A note must either be:
  - A PYQ note (`is_pyq = TRUE` and `module_number = NULL`)
  - A module note (`is_pyq = FALSE` and `module_number` is 1-5)
- **Module Range**: Module numbers are restricted to 1-5
- **PYQ Metadata**: Academic year and exam type are only used for PYQ notes

## Hierarchical Structure

### Visual Representation

```
Semester 3 (Computer Science)
│
├── Data Structures
│   ├── 📝 Previous Year Questions (PYQ)
│   │   ├── Mid-term 2023-24
│   │   ├── End-term 2023-24
│   │   └── Mid-term 2022-23
│   │
│   ├── 📚 Module 1: Introduction to Data Structures
│   │   ├── Lecture Notes - Arrays
│   │   ├── Practice Problems
│   │   └── Tutorial Sheet 1
│   │
│   ├── 📚 Module 2: Linked Lists
│   │   ├── Lecture Notes - Singly Linked List
│   │   └── Lab Assignment 2
│   │
│   ├── 📚 Module 3: Stacks and Queues
│   ├── 📚 Module 4: Trees and Graphs
│   └── 📚 Module 5: Sorting and Searching
│
├── Operating Systems
│   ├── 📝 Previous Year Questions (PYQ)
│   ├── 📚 Module 1
│   ├── 📚 Module 2
│   └── ...
│
└── Database Management Systems
    └── ...
```

## Database Functions

### 1. Get PYQ Notes for a Subject

```sql
SELECT * FROM get_pyq_notes_for_subject('subject-uuid-here');
```

Returns all verified PYQ notes for a specific subject, ordered by academic year and creation date.

### 2. Get Module Notes for a Subject

```sql
-- Get all module notes
SELECT * FROM get_module_notes_for_subject('subject-uuid-here');

-- Get notes for a specific module
SELECT * FROM get_module_notes_for_subject('subject-uuid-here', 3);
```

Returns verified notes for one or all modules of a subject.

### 3. Get Notes Summary

```sql
SELECT * FROM get_notes_summary_for_subject('subject-uuid-here');
```

Returns a count of notes in each category (PYQ, Module 1, Module 2, etc.).

### 4. Get Organized Notes for Semester

```sql
SELECT * FROM get_organized_notes_for_semester('branch-uuid', 3);
```

Returns all subjects and their notes for a specific branch and semester, organized by category.

## Mobile App Implementation

### UI Flow

1. **Subject List View**
   - Shows all subjects for the user's semester
   - Displays note count badge for each subject
   - Expandable/collapsible cards

2. **Expanded Subject View**
   - PYQ section appears first (if available)
   - Followed by Module 1-5 sections
   - Each section is collapsible

3. **Category View**
   - Shows note count badge
   - Lists all notes in that category
   - Click to download/view

### Key Features

- **Search**: Searches across subject names, note titles, and descriptions
- **Collapsible Sections**: All subjects and categories are collapsible to reduce clutter
- **Visual Indicators**: 
  - 📝 for PYQ sections
  - 📚 for Module sections
  - File type icons (📕 PDF, 📘 DOC, 📙 PPT, etc.)
- **Download Tracking**: Each download increments the counter

## Admin Dashboard Implementation

### Adding Notes

1. **Select Subject**: Choose branch, semester, and subject
2. **Choose Category**: 
   - Select "Module Notes" and choose module number (1-5)
   - OR select "Previous Year Questions" and enter academic year/exam type
3. **Upload Details**: Provide title, description, Google Drive link
4. **Multi-Branch Support**: Select applicable branches
5. **Verification**: Notes are auto-verified when added by admin

### Note Form Fields

#### For Module Notes:
- Title (required)
- Description
- Module Number (1-5) (required)
- File URL (required)
- File Type
- Tags

#### For PYQ Notes:
- Title (required)
- Description
- Academic Year (e.g., "2023-24")
- Exam Type (Mid-term, End-term, Quiz, Assignment)
- File URL (required)
- File Type
- Tags

### Table View

The admin dashboard displays:
- Note title and description
- Subject name
- Branch(es) associated
- Category badge (PYQ or Module 1-5)
- Verification status
- Download count
- Action buttons (verify, edit, delete)

## Migration Guide

### Running the Migration

1. **Apply the migration**:
   ```bash
   # Execute the migration SQL file
   psql -d your_database < supabase/migrations/002_add_modules_and_pyq.sql
   ```

2. **Verify installation**:
   The migration will output a summary showing:
   - Total notes count
   - PYQ notes count
   - Module notes count
   - Available functions

### Existing Data Handling

- All existing notes are automatically set to `module_number = 1` and `is_pyq = FALSE`
- Admins should review and recategorize these notes appropriately

### Data Cleanup Steps

1. Review all notes marked as Module 1
2. Recategorize notes to correct modules (1-5)
3. Move any PYQ materials to the PYQ category
4. Add academic year and exam type for PYQ notes

## API Usage Examples

### Fetching Notes in Mobile App

```typescript
// Get all subjects with their notes for current user
const { data: profile } = await supabase
  .from('users')
  .select('branch_id, semester')
  .eq('id', userId)
  .single();

// Get subjects
const { data: subjects } = await supabase
  .from('subjects')
  .select('*')
  .eq('branch_id', profile.branch_id)
  .eq('semester', profile.semester);

// For each subject, get notes organized by category
for (const subject of subjects) {
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('is_verified', true)
    .order('created_at', { ascending: false });
  
  // Organize into categories
  const pyqNotes = notes.filter(n => n.is_pyq);
  const module1Notes = notes.filter(n => !n.is_pyq && n.module_number === 1);
  // ... and so on
}
```

### Adding a Module Note

```typescript
const noteData = {
  title: "Introduction to Arrays",
  description: "Complete notes on array data structure",
  subject_id: "subject-uuid",
  file_url: "https://drive.google.com/...",
  file_type: "PDF",
  is_pyq: false,
  module_number: 1,
  is_verified: true
};

const { data, error } = await supabase
  .from('notes')
  .insert(noteData);
```

### Adding a PYQ Note

```typescript
const pyqData = {
  title: "Mid-term Exam 2023-24",
  description: "Previous year mid-term question paper",
  subject_id: "subject-uuid",
  file_url: "https://drive.google.com/...",
  file_type: "PDF",
  is_pyq: true,
  module_number: null,
  academic_year: "2023-24",
  exam_type: "Mid-term",
  is_verified: true
};

const { data, error } = await supabase
  .from('notes')
  .insert(pyqData);
```

## Best Practices

### For Admins

1. **Consistent Naming**: Use clear, descriptive titles
   - ✅ "Module 2: Linked Lists - Lecture Notes"
   - ❌ "Notes 1"

2. **Proper Categorization**: 
   - Regular notes → Modules (1-5)
   - Question papers → PYQ section
   - Include academic year for PYQ

3. **Tags Usage**: Add relevant tags for better searchability
   - Examples: "important", "midterm", "theory", "practical"

4. **File Type**: Correctly identify file types (PDF, DOC, PPT, etc.)

5. **Multi-Branch**: If a note is applicable to multiple branches (e.g., common subjects), select all relevant branches

### For Developers

1. **Always Check Constraint**: When inserting/updating notes, ensure the category constraint is satisfied

2. **Use Helper Functions**: Leverage the provided SQL functions for common queries

3. **Index Usage**: The following indexes are available:
   - `idx_notes_module_number`
   - `idx_notes_is_pyq`
   - `idx_notes_subject_module`
   - `idx_notes_subject_pyq`

4. **Error Handling**: Handle constraint violations gracefully in the UI

## Troubleshooting

### Common Issues

**Issue**: "Check constraint violation" when adding note
- **Solution**: Ensure either `is_pyq = TRUE` with `module_number = NULL`, or `is_pyq = FALSE` with valid `module_number` (1-5)

**Issue**: Notes not appearing in mobile app
- **Solution**: Verify `is_verified = TRUE` and note is associated with correct subject/branch

**Issue**: Module number showing as "?" in admin dashboard
- **Solution**: Update existing notes to have proper `module_number` value

## Future Enhancements

Potential improvements to consider:

1. **Custom Module Names**: Allow subjects to define custom module names
2. **Sub-modules**: Support for sub-categories within modules
3. **Note Versioning**: Track updates to notes over time
4. **Collaborative Notes**: Allow students to contribute and vote on notes
5. **AI Recommendations**: Suggest relevant notes based on user activity
6. **Offline Support**: Download notes for offline access in mobile app

## Support

For issues or questions:
- Check the migration output for any errors
- Review the constraint definitions in `schema.sql`
- Test using the provided SQL functions
- Verify data integrity with sample queries

---

**Version**: 2.0  
**Last Updated**: December 2024  
**Migration File**: `002_add_modules_and_pyq.sql`
