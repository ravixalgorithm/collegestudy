# API Documentation - HBTU College Study App

## Overview

This document describes the Supabase database API endpoints and usage patterns for the HBTU College Study App.

## Authentication

All API calls require authentication via Supabase Auth. Users must be logged in with a valid session token.

### Email OTP Authentication

```typescript
// Send OTP
const { error } = await supabase.auth.signInWithOtp({
  email: 'student@hbtu.ac.in',
});

// Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  email: 'student@hbtu.ac.in',
  token: '123456',
  type: 'email',
});
```

## Core Entities

### Branches

**Get all branches**
```typescript
const { data, error } = await supabase
  .from('branches')
  .select('*')
  .order('name');
```

**Get single branch**
```typescript
const { data, error } = await supabase
  .from('branches')
  .select('*')
  .eq('code', 'CSE')
  .single();
```

### Users

**Get current user profile**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data, error } = await supabase
  .from('users')
  .select('*, branches(*)')
  .eq('id', user.id)
  .single();
```

**Update user profile**
```typescript
const { data, error } = await supabase
  .from('users')
  .update({
    name: 'John Doe',
    branch_id: 'branch-uuid',
    year: 2,
    semester: 4,
    roll_number: '21001',
  })
  .eq('id', user.id);
```

### Notes

**Get notes for branch/semester**
```typescript
const { data, error } = await supabase
  .from('notes')
  .select(`
    *,
    subjects(
      *,
      branches(*)
    )
  `)
  .eq('is_verified', true)
  .eq('subjects.branch_id', branchId)
  .eq('subjects.semester', semester)
  .order('created_at', { ascending: false });
```

**Download note (increment counter)**
```typescript
const { data, error } = await supabase.rpc('increment_download_count', {
  note_id: noteId,
});
```

**Admin: Upload note**
```typescript
// First upload file to storage
const { data: fileData, error: uploadError } = await supabase.storage
  .from('notes')
  .upload(`${subjectId}/${fileName}`, file);

// Then create note record
const { data, error } = await supabase
  .from('notes')
  .insert({
    subject_id: subjectId,
    title: 'Chapter 1 Notes',
    description: 'Introduction to algorithms',
    file_url: fileData.path,
    file_type: 'application/pdf',
    tags: ['algorithms', 'chapter1'],
    uploaded_by: userId,
    is_verified: false,
  });
```

### Timetable

**Get timetable for branch/semester**
```typescript
const { data, error } = await supabase
  .from('timetable')
  .select(`
    *,
    subjects(*)
  `)
  .eq('branch_id', branchId)
  .eq('semester', semester)
  .order('day_of_week')
  .order('start_time');
```

### Exam Schedule

**Get exam schedule**
```typescript
const { data, error } = await supabase
  .from('exam_schedule')
  .select(`
    *,
    subjects(*)
  `)
  .eq('branch_id', branchId)
  .eq('semester', semester)
  .gte('exam_date', new Date().toISOString())
  .order('exam_date');
```

### Events

**Get published events**
```typescript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('is_published', true)
  .gte('event_date', new Date().toISOString())
  .order('event_date');
```

**Filter events by branch/semester**
```typescript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('is_published', true)
  .or(`target_branches.is.null,target_branches.cs.{${branchId}}`)
  .or(`target_semesters.is.null,target_semesters.cs.{${semester}}`)
  .order('event_date');
```

**RSVP to event**
```typescript
const { data, error } = await supabase
  .from('event_rsvp')
  .insert({
    event_id: eventId,
    user_id: userId,
    status: 'registered',
  });
```

### Opportunities

**Get opportunities**
```typescript
const { data, error } = await supabase
  .from('opportunities')
  .select('*')
  .eq('is_published', true)
  .gte('deadline', new Date().toISOString())
  .order('created_at', { ascending: false });
```

**Bookmark opportunity**
```typescript
const { data, error } = await supabase
  .from('opportunity_bookmarks')
  .insert({
    opportunity_id: opportunityId,
    user_id: userId,
  });
```

### Forum

**Get approved posts**
```typescript
const { data, error } = await supabase
  .from('forum_posts')
  .select(`
    *,
    users(name, branch_id),
    subjects(name)
  `)
  .eq('status', 'approved')
  .order('created_at', { ascending: false });
```

**Create post**
```typescript
const { data, error } = await supabase
  .from('forum_posts')
  .insert({
    user_id: userId,
    title: 'How to solve this problem?',
    content: 'I am stuck on question 5...',
    subject_id: subjectId,
    tags: ['algorithms', 'help'],
    status: 'pending',
  });
```

**Add reply**
```typescript
const { data, error } = await supabase
  .from('forum_replies')
  .insert({
    post_id: postId,
    user_id: userId,
    content: 'Here is the solution...',
  });
```

**Vote on reply**
```typescript
const { data, error } = await supabase
  .from('forum_votes')
  .insert({
    reply_id: replyId,
    user_id: userId,
    vote_type: 'upvote', // or 'downvote'
  });
```

### CGPA Records

**Get user CGPA records**
```typescript
const { data, error } = await supabase
  .from('cgpa_records')
  .select(`
    *,
    subjects(name, code)
  `)
  .eq('user_id', userId)
  .order('semester');
```

**Add/Update grades**
```typescript
const { data, error } = await supabase
  .from('cgpa_records')
  .upsert({
    user_id: userId,
    semester: 1,
    subject_id: subjectId,
    grade: 'A',
    credits: 4,
    grade_point: 9.0,
  });
```

## Storage Buckets

### Upload File

```typescript
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file', file, {
    cacheControl: '3600',
    upsert: false,
  });
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file');
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file');
```

## Real-time Subscriptions

### Listen to new events

```typescript
const channel = supabase
  .channel('events-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
    },
    (payload) => {
      console.log('New event:', payload.new);
    }
  )
  .subscribe();
```

### Listen to forum replies

```typescript
const channel = supabase
  .channel(`post-${postId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'forum_replies',
      filter: `post_id=eq.${postId}`,
    },
    (payload) => {
      console.log('New reply:', payload.new);
    }
  )
  .subscribe();
```

## Edge Functions (Optional)

### Calculate CGPA

```typescript
const { data, error } = await supabase.functions.invoke('calculate-cgpa', {
  body: { userId, semester },
});
```

### Send Notification

```typescript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId,
    title: 'New Event',
    message: 'Check out the latest event!',
  },
});
```

## Error Handling

```typescript
const { data, error } = await supabase
  .from('table')
  .select('*');

if (error) {
  console.error('Error:', error.message);
  // Handle error appropriately
}
```

## Rate Limiting

Supabase free tier limits:
- **Database**: 500MB storage
- **Storage**: 1GB files
- **Bandwidth**: 2GB/month
- **API Requests**: Unlimited (with reasonable use)

## Best Practices

1. **Use RLS policies** - Never bypass Row Level Security
2. **Batch requests** - Use `.in()` for multiple IDs
3. **Select specific columns** - Don't use `select('*')` in production
4. **Cache responses** - Use React Query or similar
5. **Handle errors** - Always check for errors
6. **Optimize queries** - Use indexes and limit results
7. **Use transactions** - For related operations

## Admin-Only Operations

Admin users (where `is_admin = true`) can:
- Upload/verify notes
- Create/edit events
- Moderate forum posts
- Manage timetables
- View all user data
- Export analytics

---

**Last Updated**: November 2025
