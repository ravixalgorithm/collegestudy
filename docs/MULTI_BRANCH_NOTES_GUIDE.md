# Multi-Branch Notes Implementation Guide

## Overview
This guide explains how to enable notes to be shared across multiple branches, allowing admins to create notes that are visible to students from different branches (e.g., common subjects like Mathematics, Physics, etc.).

---

## 🎯 Problem Statement

Currently:
- Each note is tied to a specific subject
- Each subject belongs to one branch
- Notes cannot be shared across branches

**Solution**: Create a many-to-many relationship between notes and branches.

---

## 📊 Database Changes

### Step 1: Run the Migration

Execute the migration file: `supabase/migrations/add_multi_branch_notes.sql`

```sql
-- In Supabase SQL Editor or psql
\i supabase/migrations/add_multi_branch_notes.sql
```

Or manually run:

```sql
-- Create junction table
CREATE TABLE IF NOT EXISTS note_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, branch_id)
);

-- Create indexes
CREATE INDEX idx_note_branches_note_id ON note_branches(note_id);
CREATE INDEX idx_note_branches_branch_id ON note_branches(branch_id);

-- Enable RLS
ALTER TABLE note_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view note branches" ON note_branches
FOR SELECT USING (true);

CREATE POLICY "Admins can manage note branches" ON note_branches
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Migrate existing data
INSERT INTO note_branches (note_id, branch_id)
SELECT DISTINCT n.id, s.branch_id
FROM notes n
INNER JOIN subjects s ON n.subject_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM note_branches nb
    WHERE nb.note_id = n.id AND nb.branch_id = s.branch_id
);
```

---

## 🔧 Admin Dashboard Changes

### Update Notes Form

Add multi-branch selector in `admin-dashboard/app/dashboard/notes/page.tsx`:

```typescript
// Add to form state
const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

// Add branch selection UI in the form
<div className="space-y-2">
  <label className="block text-sm font-medium">
    Applicable Branches * (Select one or more)
  </label>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {branches.map((branch) => (
      <label
        key={branch.id}
        className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
      >
        <input
          type="checkbox"
          checked={selectedBranches.includes(branch.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedBranches([...selectedBranches, branch.id]);
            } else {
              setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
            }
          }}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <span className="text-sm font-medium">{branch.name}</span>
      </label>
    ))}
  </div>
</div>
```

### Update Save Function

```typescript
async function handleSaveNote() {
  try {
    // 1. Save the note
    const noteData = {
      title: formData.title,
      description: formData.description,
      subject_id: formData.subject_id,
      file_url: formData.google_drive_link,
      file_type: formData.file_type,
      is_verified: true,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
    };

    let noteId;
    if (editingNote) {
      const { error } = await supabase
        .from("notes")
        .update(noteData)
        .eq("id", editingNote.id);
      if (error) throw error;
      noteId = editingNote.id;

      // Delete existing branch associations
      await supabase.from("note_branches").delete().eq("note_id", noteId);
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert(noteData)
        .select()
        .single();
      if (error) throw error;
      noteId = data.id;
    }

    // 2. Create branch associations
    const branchAssociations = selectedBranches.map(branchId => ({
      note_id: noteId,
      branch_id: branchId,
    }));

    const { error: branchError } = await supabase
      .from("note_branches")
      .insert(branchAssociations);

    if (branchError) throw branchError;

    alert("Note saved successfully!");
    closeModal();
    loadData();
  } catch (error: any) {
    console.error("Error saving note:", error);
    alert("Error: " + error.message);
  }
}
```

### Update Load Function for Editing

```typescript
async function openEditModal(note: Note) {
  setEditingNote(note);

  // Fetch existing branch associations
  const { data: noteBranches } = await supabase
    .from("note_branches")
    .select("branch_id")
    .eq("note_id", note.id);

  const branchIds = noteBranches?.map(nb => nb.branch_id) || [];
  setSelectedBranches(branchIds);

  // Set other form data
  setFormData({
    title: note.title,
    description: note.description || "",
    subject_id: note.subject_id,
    // ... other fields
  });

  setShowModal(true);
}
```

---

## 📱 Mobile App Changes

### Update Notes Query

In `mobile-app/app/(tabs)/notes.tsx`:

```typescript
async function loadData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load user profile
    const { data: profileData } = await supabase
      .from("users")
      .select("branch_id, semester")
      .eq("id", user.id)
      .single();

    if (profileData) {
      // Load notes for user's branch (using junction table)
      const { data: notesData } = await supabase
        .from("notes")
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            semester
          ),
          note_branches!inner (
            branch_id
          )
        `)
        .eq("is_verified", true)
        .eq("note_branches.branch_id", profileData.branch_id)
        .eq("subjects.semester", profileData.semester)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);
    }
  } catch (error) {
    console.error("Error loading notes:", error);
  }
}
```

### Alternative: Use Helper Function

```typescript
// Use the helper function created in migration
const { data: notesData } = await supabase
  .rpc("get_notes_for_branch", {
    p_branch_id: profileData.branch_id,
    p_semester: profileData.semester,
  });
```

---

## 🎨 Admin Dashboard UI Examples

### Show Applied Branches in Notes List

```typescript
<div className="note-card">
  <h3>{note.title}</h3>
  <p>{note.description}</p>
  
  {/* Show which branches this note applies to */}
  <div className="flex gap-2 mt-2">
    {note.note_branches?.map(nb => (
      <span
        key={nb.branch_id}
        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
      >
        {branches.find(b => b.id === nb.branch_id)?.code}
      </span>
    ))}
  </div>
</div>
```

---

## 🔍 Query Examples

### Get all notes for a specific branch

```sql
SELECT n.*, array_agg(b.name) as branch_names
FROM notes n
JOIN note_branches nb ON n.id = nb.note_id
JOIN branches b ON nb.branch_id = b.id
WHERE nb.branch_id = 'branch-uuid-here'
GROUP BY n.id;
```

### Get all branches for a specific note

```sql
SELECT b.*
FROM branches b
JOIN note_branches nb ON b.id = nb.branch_id
WHERE nb.note_id = 'note-uuid-here';
```

### Find common notes (available to all branches)

```sql
SELECT n.*, COUNT(nb.branch_id) as branch_count
FROM notes n
JOIN note_branches nb ON n.id = nb.note_id
GROUP BY n.id
HAVING COUNT(nb.branch_id) = (SELECT COUNT(*) FROM branches);
```

---

## ✅ Testing Checklist

### Admin Dashboard
- [ ] Can select multiple branches when creating a note
- [ ] Can see which branches a note applies to
- [ ] Can edit branch associations
- [ ] "Select All" option works
- [ ] At least one branch must be selected
- [ ] Branch badges display correctly

### Mobile App
- [ ] Students see notes for their branch
- [ ] Students see multi-branch notes
- [ ] Notes don't duplicate if in multiple branches
- [ ] Filtering by subject works correctly

### Database
- [ ] Junction table has proper indexes
- [ ] RLS policies allow proper access
- [ ] Cascade deletes work correctly
- [ ] No orphaned records

---

## 🚀 Optional Enhancements

### 1. Quick Actions
Add "Apply to All Branches" button:

```typescript
<button onClick={() => setSelectedBranches(branches.map(b => b.id))}>
  Select All Branches
</button>

<button onClick={() => setSelectedBranches([])}>
  Clear Selection
</button>
```

### 2. Branch Groups
Create preset groups:

```typescript
const BRANCH_GROUPS = {
  engineering_common: ["CSE", "IT", "ECE", "EE", "ME"],
  first_year: ["ALL"], // All branches for first year subjects
  core_branches: ["CSE", "IT", "ECE"],
};
```

### 3. Smart Suggestions
Suggest branches based on subject name:

```typescript
// If subject contains "Mathematics" or "Physics" -> suggest all branches
// If subject contains "Programming" -> suggest CSE, IT
// etc.
```

---

## 📊 Benefits

✅ **Less Duplication** - Upload once, share with multiple branches  
✅ **Easier Management** - Update one note, reflects everywhere  
✅ **Common Subjects** - Perfect for Math, Physics, Chemistry, English  
✅ **Flexible** - Can still create branch-specific notes  
✅ **Scalable** - Easy to add/remove branch associations  

---

## 🔄 Migration Path

### For Existing Data:
1. Run migration script (auto-migrates existing notes)
2. Review migrated data
3. Manually add additional branches where needed
4. Update admin UI
5. Test thoroughly
6. Deploy to production

---

## 📝 Summary

**What Changed:**
- Added `note_branches` junction table
- Notes can now belong to multiple branches
- Admin can select multiple branches when creating/editing notes
- Students see notes for their branch (including multi-branch notes)

**What Stayed Same:**
- Note structure remains the same
- Subject association still exists
- File URLs still work
- RLS policies still enforce security

---

## 🆘 Troubleshooting

**Issue**: Students see duplicate notes  
**Fix**: Ensure `DISTINCT` is used in mobile app queries

**Issue**: Can't save without branches  
**Fix**: Add validation: `if (selectedBranches.length === 0) { alert("Select at least one branch"); return; }`

**Issue**: Branch badges not showing  
**Fix**: Check that note_branches data is included in SELECT query

---

**Last Updated**: December 2024  
**Status**: Ready for Implementation  
**Database Impact**: New table, no schema changes to existing tables