# Active Branch Filtering Implementation Guide

## Overview

This guide explains how to implement and use the active branch filtering system in the HBTU College Study App. The system allows admins to activate/deactivate branches, years, and semesters, hiding deactivated options from students during registration.

## 🏗️ System Architecture

### Database Structure

```
branches
├── is_active (BOOLEAN) - Controls branch visibility
├── display_order (INTEGER) - Controls branch ordering
└── ...other fields

branch_years
├── branch_id (UUID) - References branches.id
├── year_number (INTEGER) - 1, 2, 3, 4
├── is_active (BOOLEAN) - Controls year visibility
└── ...other fields

branch_semesters
├── branch_year_id (UUID) - References branch_years.id
├── branch_id (UUID) - References branches.id
├── year_number (INTEGER) - 1, 2, 3, 4
├── semester_number (INTEGER) - 1, 2, 3, 4, 5, 6, 7, 8
├── is_active (BOOLEAN) - Controls semester visibility
└── ...other fields
```

### Key Functions

1. **`get_active_branches_for_mobile()`** - Gets only active branches for mobile app
2. **`get_active_years_for_branch(UUID)`** - Gets active years for a specific branch
3. **`get_active_semesters_for_branch_year(UUID, INTEGER)`** - Gets active semesters for branch/year
4. **`can_register_for_combination(UUID, INTEGER, INTEGER)`** - Validates if registration is allowed
5. **`toggle_branch_status(VARCHAR, UUID, BOOLEAN)`** - Admin function to toggle activation

## 🚀 Implementation Steps

### Step 1: Update Database Schema

```sql
-- Run the enhanced branch structure migration
\i supabase/migrations/003_enhanced_branch_structure.sql

-- Add mobile app functions
\i add_mobile_onboarding_functions.sql

-- Populate branch hierarchy for all branches
\i populate_branch_hierarchy.sql
```

### Step 2: Update Branch Names (if needed)

```sql
-- Update to new 13 branch structure
\i update_branch_names.sql

-- Re-populate hierarchy after branch changes
\i populate_branch_hierarchy.sql
```

### Step 3: Verify Database Setup

```sql
-- Check all branches have complete hierarchy
SELECT
    b.code,
    b.name,
    b.is_active,
    COUNT(DISTINCT by.id) as years,
    COUNT(DISTINCT bs.id) as semesters
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
GROUP BY b.id, b.code, b.name, b.is_active
ORDER BY b.code;

-- Should show 13 branches, each with 4 years and 8 semesters
```

## 📱 Mobile App Integration

### Updated Onboarding Flow

The mobile app onboarding (`mobile-app/app/(auth)/onboarding.tsx`) now:

1. **Fetches only active branches** using `get_active_branches_for_mobile()`
2. **Loads active years** when user selects a branch
3. **Loads active semesters** when user selects a year
4. **Validates selection** before allowing registration

### Key Code Changes

```typescript
// Load only active branches
async function loadBranches() {
  const { data, error } = await supabase.rpc("get_active_branches_for_mobile");
  if (data) setBranches(data);
}

// Load active years for selected branch
async function loadActiveYears(branchId: string) {
  const { data, error } = await supabase.rpc("get_active_years_for_branch", {
    p_branch_id: branchId,
  });
  if (data) setActiveYears(data.map(item => item.year_number));
}

// Load active semesters for selected branch/year
async function loadActiveSemesters(branchId: string, year: number) {
  const { data, error } = await supabase.rpc("get_active_semesters_for_branch_year", {
    p_branch_id: branchId,
    p_year_number: year,
  });
  if (data) setActiveSemesters(data.map(item => item.semester_number));
}

// Validate before registration
async function completeProfile() {
  const isValid = await supabase.rpc("can_register_for_combination", {
    p_branch_id: formData.branch_id,
    p_year_number: parseInt(formData.year),
    p_semester_number: parseInt(formData.semester),
  });
  
  if (!isValid) {
    Alert.alert("Error", "Selected combination is not available");
    return;
  }
  
  // Proceed with registration...
}
```

## 🖥️ Admin Dashboard Usage

### Accessing Branch Management

1. **Login to Admin Dashboard**: `http://localhost:3000/dashboard/branches`
2. **View Branch Hierarchy**: See all branches with expandable years and semesters
3. **Toggle Status**: Click activate/deactivate buttons for any level

### Branch Management Features

- ✅ **Branch Level**: Deactivate entire branch (hides from mobile app)
- ✅ **Year Level**: Deactivate specific years (e.g., no new 1st year admissions)
- ✅ **Semester Level**: Deactivate specific semesters (e.g., semester not currently running)

### Admin Functions

```sql
-- Deactivate a branch
SELECT toggle_branch_status('branch', 'branch-uuid-here', false);

-- Deactivate first year for a branch
SELECT toggle_branch_status('year', 'year-uuid-here', false);

-- Deactivate specific semester
SELECT toggle_branch_status('semester', 'semester-uuid-here', false);
```

## 📊 Current Branch Structure

### 13 Active Branches

1. **CSE** - Computer Science & Engineering
2. **IT** - Information Technology  
3. **ET** - Electronics Engineering
4. **EE** - Electrical Engineering
5. **ME** - Mechanical Engineering
6. **CE** - Civil Engineering
7. **CHE** - Chemical Engineering
8. **PT** - Paint Technology
9. **PL** - Plastic Technology
10. **OT** - Oil Technology
11. **LFT** - Leather & Fashion Technology
12. **BE** - Biochemical Engineering
13. **FT** - Food Technology

### Year-Semester Mapping

```
Year 1 → Semesters 1, 2
Year 2 → Semesters 3, 4
Year 3 → Semesters 5, 6
Year 4 → Semesters 7, 8
```

## 🔧 Troubleshooting

### Issue: No branches showing in mobile app

**Diagnosis:**
```sql
SELECT * FROM branches WHERE is_active = true;
```

**Solution:**
```sql
-- Activate all branches
UPDATE branches SET is_active = true;
```

### Issue: Years/semesters missing

**Diagnosis:**
```sql
-- Check hierarchy completeness
SELECT b.code, COUNT(by.id) as years, COUNT(bs.id) as semesters
FROM branches b
LEFT JOIN branch_years by ON b.id = by.branch_id  
LEFT JOIN branch_semesters bs ON by.id = bs.branch_year_id
WHERE b.is_active = true
GROUP BY b.id, b.code;
```

**Solution:**
```sql
-- Re-populate hierarchy
\i populate_branch_hierarchy.sql
```

### Issue: Can't register for valid combination

**Diagnosis:**
```sql
-- Test specific combination
SELECT can_register_for_combination(
  (SELECT id FROM branches WHERE code = 'CSE'),
  1,  -- year
  1   -- semester
);
```

**Solution:**
```sql
-- Activate the specific semester
UPDATE branch_semesters 
SET is_active = true 
WHERE branch_id = (SELECT id FROM branches WHERE code = 'CSE')
AND year_number = 1 
AND semester_number = 1;
```

## 🧪 Testing

### Test Active Branch Filtering

```sql
-- 1. Test branch filtering
SELECT * FROM get_active_branches_for_mobile();

-- 2. Test year filtering for CSE
SELECT * FROM get_active_years_for_branch(
  (SELECT id FROM branches WHERE code = 'CSE')
);

-- 3. Test semester filtering for CSE Year 1
SELECT * FROM get_active_semesters_for_branch_year(
  (SELECT id FROM branches WHERE code = 'CSE'),
  1
);

-- 4. Test registration validation
SELECT can_register_for_combination(
  (SELECT id FROM branches WHERE code = 'CSE'),
  1,
  1
);
```

### Test Scenarios

1. **All Active**: All branches/years/semesters should appear
2. **Branch Deactivated**: Branch shouldn't appear in mobile app
3. **Year Deactivated**: Year shouldn't appear for that branch
4. **Semester Deactivated**: Semester shouldn't appear for that year
5. **Registration Validation**: Should prevent registration for inactive combinations

## 📋 Maintenance

### Regular Tasks

1. **Start of Academic Year**:
   ```sql
   -- Activate new year/semester combinations
   UPDATE branch_semesters SET is_active = true WHERE semester_number = 1;
   ```

2. **End of Semester**:
   ```sql
   -- Deactivate completed semesters if needed
   UPDATE branch_semesters SET is_active = false WHERE semester_number = 8;
   ```

3. **Branch Changes**:
   ```sql
   -- After adding new branches, populate their hierarchy
   \i populate_branch_hierarchy.sql
   ```

### Monitoring

```sql
-- Monitor registration patterns
SELECT 
    b.code,
    by.year_number,
    bs.semester_number,
    COUNT(u.id) as student_count
FROM users u
JOIN branches b ON u.branch_id = b.id
JOIN branch_years by ON b.id = by.branch_id AND u.year = by.year_number
JOIN branch_semesters bs ON by.id = bs.branch_year_id AND u.semester = bs.semester_number
GROUP BY b.code, by.year_number, bs.semester_number
ORDER BY b.code, by.year_number, bs.semester_number;
```

## 🔒 Security

### RLS Policies

```sql
-- Only authenticated users can view active data
CREATE POLICY "Users can view active branches" ON branches
FOR SELECT TO authenticated
USING (is_active = true);

-- Admins can manage all data
CREATE POLICY "Admins can manage branches" ON branches
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');
```

### Function Permissions

All functions are granted to `authenticated` users:
- Students can only read active data
- Admins can toggle status through dashboard
- Functions use `SECURITY DEFINER` for controlled access

## 📈 Performance

### Indexes

Key indexes for performance:
```sql
CREATE INDEX idx_branches_active ON branches(is_active);
CREATE INDEX idx_branch_years_active ON branch_years(is_active);
CREATE INDEX idx_branch_semesters_active ON branch_semesters(is_active);
```

### Caching Strategy

- Mobile app caches branch data for session
- Re-fetches on app restart
- Admin changes reflect immediately in database
- Consider adding cache invalidation for real-time updates

## 📞 Support

### Common Issues

1. **Mobile app shows "No branches available"** → Check database connection and branch activation
2. **Can't complete registration** → Validate branch/year/semester combination in database
3. **Admin toggles not working** → Check admin user permissions and function access

### Debug Tools

```sql
-- Quick health check
SELECT 
    'Branches' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active) as active
FROM branches
UNION ALL
SELECT 
    'Years' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active) as active
FROM branch_years
UNION ALL
SELECT 
    'Semesters' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active) as active
FROM branch_semesters;
```

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented and Tested