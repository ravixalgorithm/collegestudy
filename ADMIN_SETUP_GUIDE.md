# College Study Admin Dashboard - Common Resources Setup Guide

## Overview
This guide will help you set up the admin dashboard to manage Common Learning Resources including DSA Notes, Development Tracks, Placement Preparation, and AI Tools.

## 🗄️ Database Setup

### Step 1: Run the SQL Schema
Execute the complete SQL schema to set up all necessary tables:

```sql
-- Navigate to the database folder and run:
psql -U your_username -d your_database -f mobile-app/database/common_notes_schema.sql
```

Or copy and paste the content from `mobile-app/database/common_notes_schema.sql` into your Supabase SQL editor.

### Step 2: Verify Tables Created
After running the schema, you should have these tables:
- `common_categories` - Main categories (DSA, Development, Placement, AI Tools)
- `common_topics` - Topics within each category
- `common_notes` - Notes/resources for each topic
- `ai_tools` - AI tools catalog
- `common_note_ratings` - User ratings
- `common_note_comments` - User comments
- `common_note_downloads` - Download tracking
- `ai_tool_clicks` - AI tool click tracking
- `admin_action_logs` - Admin action auditing

## 🔧 Admin Dashboard Features

### Navigation Structure
```
Admin Dashboard
├── DSA Notes (/dashboard/common-resources/dsa)
├── Development (/dashboard/common-resources/development)
├── Placement Prep (/dashboard/common-resources/placement)
└── AI Tools (/dashboard/common-resources/ai-tools)
```

### Key Management Features

#### 1. DSA Notes Management
- **Topics Management**: Create, edit, delete DSA topics (Arrays, Trees, Graphs, etc.)
- **Notes Management**: Add notes to topics with file uploads
- **Statistics**: Track downloads, ratings, and user engagement
- **Status Control**: Mark notes as verified, featured, active/inactive

#### 2. Development Tracks Management
- **Track Management**: Manage development paths (Frontend, Backend, Mobile, etc.)
- **Technology Tags**: Add relevant technologies to each track
- **Resource Management**: Upload tutorials, guides, and learning materials
- **Difficulty Levels**: Set beginner, intermediate, or advanced levels

#### 3. Placement Preparation Management
- **Category Management**: Resume building, technical interviews, HR rounds, etc.
- **Resource Organization**: Organize by preparation type and difficulty
- **Feature Control**: Mark important resources as featured
- **Timeline Management**: Organize resources by preparation timeline

#### 4. AI Tools Management
- **Tool Catalog**: Add and manage AI tools with descriptions
- **Category Organization**: Organize tools by use case (Writing, Coding, etc.)
- **Feature Management**: Mark popular or recommended tools
- **External Links**: Manage links to external AI tool websites

## 📱 Mobile App Integration

### Removed Hardcoded Data
The mobile app now fetches all data dynamically from the database instead of using hardcoded arrays.

### Updated Components
- `app/common/dsa.tsx` - Now fetches DSA topics and notes from database
- `app/common/development.tsx` - Loads development tracks dynamically
- `app/common/placement.tsx` - Fetches placement categories from database
- `app/common/ai-tools.tsx` - Loads AI tools from database
- `app/common/notes/[category].tsx` - Universal notes viewer for all categories

## 🚀 Getting Started

### 1. Database Setup
```bash
# 1. Run the SQL schema
psql -U postgres -d collegestudy -f mobile-app/database/common_notes_schema.sql

# 2. Verify tables are created
psql -U postgres -d collegestudy -c "\dt common_*"
```

### 2. Admin Dashboard Access
1. Navigate to `/dashboard/common-resources/dsa`
2. Start by creating DSA topics using the "Add Topic" button
3. Add notes to each topic using the "Add Note" button
4. Repeat for Development, Placement, and AI Tools sections

### 3. Initial Data Population

#### Sample DSA Topics:
```sql
-- These are automatically created by the schema, but you can modify them
UPDATE common_topics SET 
  description = 'Your custom description',
  color = '#your-color'
WHERE slug = 'arrays';
```

#### Sample Notes:
Use the admin dashboard to add notes, or insert directly:
```sql
INSERT INTO common_notes (category_id, topic_id, title, description, file_url, file_type, admin_verified)
VALUES (
  (SELECT id FROM common_categories WHERE slug = 'dsa'),
  (SELECT id FROM common_topics WHERE slug = 'arrays'),
  'Array Fundamentals Guide',
  'Complete guide to array operations and algorithms',
  'https://your-storage.com/array-guide.pdf',
  'pdf',
  true
);
```

## 🔐 Security & Permissions

### Row Level Security (RLS)
The schema includes comprehensive RLS policies:
- **Public Read Access**: Anyone can view active content
- **Admin Full Access**: Admin users can manage all content
- **User Interactions**: Authenticated users can rate and comment
- **Analytics Tracking**: Download and click tracking for all users

### Admin User Setup
Ensure admin users have proper permissions:
```sql
-- Update user role for admin access
UPDATE auth.users SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'), 
    '{role}', 
    '"admin"'
  )
WHERE email = 'admin@collegestudy.in';
```

## 📊 Analytics & Monitoring

### Built-in Analytics
- **Download Tracking**: Automatic download counting
- **Rating System**: 5-star rating with averages
- **View Statistics**: Track content popularity
- **Admin Action Logs**: Full audit trail of admin changes

### Performance Optimization
- **Database Indexes**: Optimized for fast queries
- **Efficient Joins**: Minimal database calls
- **Caching Strategy**: Consider implementing Redis for frequently accessed data

## 🛠️ Troubleshooting

### Common Issues

1. **RLS Permission Denied**
   ```sql
   -- Check user role
   SELECT raw_app_meta_data->>'role' FROM auth.users WHERE email = 'your-admin@email.com';
   ```

2. **Missing Categories**
   ```sql
   -- Verify categories exist
   SELECT * FROM common_categories WHERE is_active = true;
   ```

3. **Mobile App Not Loading Data**
   - Check Supabase connection in mobile app
   - Verify RLS policies allow public read access
   - Check if categories and topics are marked as active

### Database Maintenance
```sql
-- Clean up old download logs (optional, run monthly)
DELETE FROM common_note_downloads 
WHERE downloaded_at < NOW() - INTERVAL '6 months';

-- Update rating averages (automatic via triggers, but can run manually)
UPDATE common_notes SET rating = (
  SELECT AVG(rating) FROM common_note_ratings WHERE note_id = common_notes.id
);
```

## 🔄 Data Migration (If needed)

### From Old Structure
If you have existing notes data:
```sql
-- Example migration from old notes table
INSERT INTO common_notes (category_id, topic_id, title, description, file_url, admin_verified)
SELECT 
  (SELECT id FROM common_categories WHERE slug = old_notes.category),
  (SELECT id FROM common_topics WHERE slug = old_notes.topic_slug),
  old_notes.title,
  old_notes.description,
  old_notes.file_path,
  true
FROM old_notes_table old_notes;
```

## 📚 API Reference

### Key Supabase Queries Used

#### Fetch Topics with Notes Count
```javascript
const { data } = await supabase
  .from('common_topics')
  .select(`
    *,
    common_notes!inner(id)
  `)
  .eq('category_id', categoryId)
  .eq('is_active', true);
```

#### Add New Note
```javascript
const { error } = await supabase
  .from('common_notes')
  .insert([{
    category_id: categoryId,
    topic_id: topicId,
    title: 'Note Title',
    description: 'Note Description',
    file_url: 'https://example.com/file.pdf',
    admin_verified: true
  }]);
```

## 🎯 Best Practices

### Content Management
1. **Always verify content** before marking as admin_verified
2. **Use descriptive titles** and detailed descriptions
3. **Organize by difficulty** to help student progression
4. **Tag with relevant technologies** for better discovery
5. **Regular content audits** to remove outdated materials

### Performance
1. **Optimize file sizes** before uploading
2. **Use CDN** for file storage when possible
3. **Monitor download patterns** to identify popular content
4. **Cache frequently accessed** topics and categories

### Security
1. **Validate file uploads** to prevent malicious content
2. **Regular permission audits** for admin users
3. **Monitor admin action logs** for unusual activity
4. **Backup database regularly** with retention policy

## 📞 Support

For technical issues:
1. Check the admin action logs table for error details
2. Verify database connectivity and permissions
3. Test individual API endpoints in Supabase dashboard
4. Review browser console for client-side errors

## 🚀 Future Enhancements

### Planned Features
- **Bulk Upload**: Upload multiple files at once
- **Content Moderation**: Automated content quality checks
- **Advanced Analytics**: Detailed usage reports and insights
- **Content Scheduling**: Schedule content publication
- **Version Control**: Track content changes over time
- **Integration APIs**: Connect with external learning platforms

---

## Quick Start Checklist

- [ ] Run SQL schema in Supabase
- [ ] Verify all tables created successfully
- [ ] Set admin user permissions
- [ ] Test admin dashboard access
- [ ] Create first DSA topic via admin panel
- [ ] Add first note to test functionality
- [ ] Verify mobile app loads data correctly
- [ ] Set up content backup strategy
- [ ] Configure monitoring and alerts

**Note**: This system is designed to scale with your user base. Start with essential content and expand based on user feedback and analytics.