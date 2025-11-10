# Cron Job Setup for Exam Reminders

## Overview

This document explains how to set up automated cron jobs to send exam reminder notifications at appropriate times before exams.

## Prerequisites

- Supabase project with notification system implemented
- Database functions `send_exam_reminders()` available
- Admin access to your hosting environment or Supabase Edge Functions

## Option 1: Supabase Edge Functions (Recommended)

### Step 1: Create Edge Function

Create a new Edge Function in your Supabase project:

```typescript
// supabase/functions/exam-reminders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the exam reminder function
    const { data, error } = await supabase.rpc('send_exam_reminders')

    if (error) {
      console.error('Error sending exam reminders:', error)
      throw error
    }

    const reminderCount = data || 0
    console.log(`Sent ${reminderCount} exam reminders`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminderCount,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in exam-reminders function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
```

### Step 2: Deploy Edge Function

Deploy the function to Supabase:

```bash
# Deploy the function
supabase functions deploy exam-reminders

# Set environment variables
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Set up Cron Job via Third-party Service

Use a service like Cron-job.org, UptimeRobot, or GitHub Actions:

#### GitHub Actions Example

Create `.github/workflows/exam-reminders.yml`:

```yaml
name: Exam Reminders
on:
  schedule:
    # Run every day at 8:00 AM UTC
    - cron: '0 8 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Exam Reminders
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/exam-reminders"
```

Add these secrets to your GitHub repository:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

## Option 2: External Cron Service

### Using Cron-job.org

1. Go to https://cron-job.org
2. Create a free account
3. Add a new cron job with these settings:
   - **URL**: `https://your-project.supabase.co/functions/v1/exam-reminders`
   - **Schedule**: Every day at 08:00 (or your preferred time)
   - **HTTP Method**: POST
   - **Headers**: 
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type: application/json`

### Using UptimeRobot

1. Create an UptimeRobot account
2. Set up a "Heartbeat" monitor
3. Configure webhook to call your exam reminder function
4. Set interval to 24 hours

## Option 3: Server-side Cron (If you have server access)

### Linux/Unix Cron Job

Add this to your crontab (`crontab -e`):

```bash
# Send exam reminders every day at 8:00 AM
0 8 * * * /usr/bin/curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://your-project.supabase.co/functions/v1/exam-reminders" \
  >> /var/log/exam-reminders.log 2>&1
```

### Node.js Cron Job

If you have a Node.js server running:

```javascript
// exam-reminder-cron.js
const cron = require('node-cron');
const axios = require('axios');

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('Sending exam reminders...');
    
    const response = await axios.post(
      'https://your-project.supabase.co/functions/v1/exam-reminders',
      {},
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Exam reminders sent:', response.data);
  } catch (error) {
    console.error('Error sending exam reminders:', error);
  }
});
```

## Option 4: Direct Database Cron (PostgreSQL)

If you have direct access to PostgreSQL with pg_cron extension:

```sql
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the exam reminder function
SELECT cron.schedule(
  'exam-reminders-daily',
  '0 8 * * *', -- Every day at 8:00 AM
  'SELECT send_exam_reminders();'
);

-- Check scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('exam-reminders-daily');
```

## Timing Recommendations

### Optimal Schedule
- **Daily execution**: 8:00 AM local time
- **Frequency**: Once per day is sufficient
- **Timezone**: Use college's local timezone

### Why This Schedule?
1. **Morning alerts**: Students check notifications in the morning
2. **Not too early**: Avoids very early morning notifications
3. **Before classes**: Gives students time to prepare
4. **Consistent**: Same time every day for predictability

## Monitoring and Logging

### Logging Setup

Add logging to track cron job execution:

```sql
-- Create a log table for cron job monitoring
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL, -- 'success', 'error'
  message TEXT,
  reminder_count INTEGER,
  error_details JSONB
);

-- Update the exam reminder function to include logging
CREATE OR REPLACE FUNCTION send_exam_reminders_with_logging() 
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  error_message TEXT;
BEGIN
  BEGIN
    SELECT send_exam_reminders() INTO reminder_count;
    
    INSERT INTO cron_job_logs (job_name, status, message, reminder_count)
    VALUES ('exam_reminders', 'success', 'Exam reminders sent successfully', reminder_count);
    
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    
    INSERT INTO cron_job_logs (job_name, status, message, error_details)
    VALUES ('exam_reminders', 'error', 'Failed to send exam reminders', 
            jsonb_build_object('error', error_message));
    
    RAISE;
  END;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;
```

### Monitoring Queries

Check cron job execution status:

```sql
-- View recent cron job executions
SELECT * FROM cron_job_logs 
ORDER BY execution_time DESC 
LIMIT 10;

-- Count successful vs failed executions in last 30 days
SELECT 
  status,
  COUNT(*) as count,
  AVG(reminder_count) as avg_reminders
FROM cron_job_logs 
WHERE execution_time > NOW() - INTERVAL '30 days'
GROUP BY status;

-- Check if cron job ran today
SELECT EXISTS (
  SELECT 1 FROM cron_job_logs 
  WHERE job_name = 'exam_reminders' 
  AND DATE(execution_time) = CURRENT_DATE
) as ran_today;
```

## Testing

### Manual Testing

Test the exam reminder function manually:

```sql
-- Test the function directly
SELECT send_exam_reminders();

-- Check what reminders would be sent (dry run)
SELECT 
  e.exam_date,
  e.exam_type,
  s.name as subject_name,
  s.code as subject_code,
  e.branch_id,
  e.semester
FROM exam_schedule e
JOIN subjects s ON e.subject_id = s.id
WHERE e.exam_date IN (
  CURRENT_DATE + INTERVAL '7 days',  -- 1 week reminders
  CURRENT_DATE + INTERVAL '1 day'    -- 1 day reminders
);
```

### Edge Function Testing

Test your Edge Function:

```bash
# Test locally
curl -X POST http://localhost:54321/functions/v1/exam-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test production
curl -X POST https://your-project.supabase.co/functions/v1/exam-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Troubleshooting

### Common Issues

1. **Function not executing**
   - Check cron service is running
   - Verify URL and authentication
   - Check logs for errors

2. **No notifications sent**
   - Verify exam schedule has future exams
   - Check notification targeting logic
   - Ensure users have notification preferences enabled

3. **Authentication errors**
   - Verify Supabase keys are correct
   - Check RLS policies allow function execution
   - Ensure service role key has necessary permissions

### Debug Queries

```sql
-- Check upcoming exams
SELECT * FROM exam_schedule 
WHERE exam_date >= CURRENT_DATE 
ORDER BY exam_date;

-- Check notification delivery
SELECT COUNT(*) FROM notifications 
WHERE type = 'exam_reminder' 
AND created_at > CURRENT_DATE;

-- Check user notification preferences
SELECT * FROM notification_preferences 
WHERE enable_exam_reminders = false;
```

## Security Considerations

1. **API Keys**: Store Supabase keys securely as environment variables
2. **Rate Limiting**: Implement rate limiting on your cron endpoints
3. **Authentication**: Use service role key for backend operations
4. **Logging**: Don't log sensitive user information
5. **Error Handling**: Gracefully handle failures without exposing system details

## Performance Optimization

1. **Batch Processing**: Process notifications in batches for large user bases
2. **Indexing**: Ensure proper database indexes on exam_schedule
3. **Caching**: Cache notification templates and user preferences
4. **Cleanup**: Regularly clean up old notification records

This setup ensures reliable, automated exam reminder notifications that help students stay on top of their academic schedule.