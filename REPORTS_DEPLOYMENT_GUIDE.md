# Report Generation System - Deployment Guide

## Pre-Deployment Checklist

Before deploying the report generation system, ensure you have:

- [x] Supabase project set up
- [x] Database access credentials
- [x] Admin access to Supabase dashboard
- [x] Node.js and pnpm installed
- [x] All dependencies installed (`pnpm install`)

---

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd /path/to/indigo-yield-platform-v01

# Install required packages
pnpm add jspdf jspdf-autotable exceljs
```

**Verification**:
```bash
# Check package.json includes:
# - jspdf: ^3.0.3
# - jspdf-autotable: ^5.0.2
# - exceljs: ^4.4.0
```

---

### Step 2: Run Database Migration

#### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

#### Option B: Manual SQL Execution

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy content from `/supabase/migrations/20251104000000_create_reports_system.sql`
4. Paste and execute

**Verification**:
```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'report%';

-- Expected results:
-- report_definitions
-- generated_reports
-- report_schedules
-- report_access_logs
-- report_shares

-- Check functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%report%';

-- Expected results:
-- get_user_reports
-- get_report_statistics
-- cleanup_expired_reports
-- calculate_next_run_time
```

---

### Step 3: Configure Storage Bucket

#### Create Reports Bucket

**Via Supabase Dashboard**:
1. Go to Storage
2. Click "Create Bucket"
3. Name: `reports`
4. Public: NO (unchecked)
5. Click "Create Bucket"

**Via SQL**:
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/json']
);
```

#### Configure RLS Policies

```sql
-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- System can create reports (service role only)
CREATE POLICY "Service role can create reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' AND
  auth.jwt() ->> 'role' = 'service_role'
);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Verification**:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'reports';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%report%';
```

---

### Step 4: Deploy Edge Function

#### Create Edge Function

```bash
# Navigate to project root
cd /path/to/indigo-yield-platform-v01

# Deploy edge function
supabase functions deploy generate-report
```

#### Set Environment Variables

```bash
# The function needs access to these (automatically available in Supabase)
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

**Verification**:
```bash
# Test the edge function
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/generate-report' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportId": "test-report-id",
    "reportType": "portfolio_performance",
    "format": "pdf"
  }'
```

---

### Step 5: Seed Initial Data

#### Insert Default Report Definitions

The migration already includes default report definitions. Verify:

```sql
SELECT report_type, name, is_admin_only
FROM report_definitions
WHERE is_active = true;
```

Expected results: 13 report definitions (7 investor, 6 admin)

#### Optional: Add Custom Report Definitions

```sql
INSERT INTO report_definitions (
  report_type,
  name,
  description,
  template_config,
  is_admin_only,
  available_formats
) VALUES (
  'custom_performance',
  'Custom Performance Report',
  'Customized performance analysis with specific metrics',
  '{"sections": ["summary", "performance", "charts"]}',
  false,
  ARRAY['pdf', 'excel']::report_format[]
);
```

---

### Step 6: Configure Frontend

#### Update TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### Add Components to Routes

```tsx
// In your router configuration
import { ReportBuilder, ReportHistory } from '@/components/reports';

// Add routes
{
  path: '/reports/generate',
  element: <ReportBuilder />
},
{
  path: '/reports/history',
  element: <ReportHistory />
}
```

#### Add to Navigation

```tsx
// In your navigation component
import { FileText } from 'lucide-react';

<NavLink to="/reports/generate">
  <FileText className="mr-2 h-4 w-4" />
  Generate Reports
</NavLink>

<NavLink to="/reports/history">
  <FileText className="mr-2 h-4 w-4" />
  Report History
</NavLink>
```

---

### Step 7: Set Up Scheduled Reports (Optional)

#### Install Cron Job for Schedule Processing

Create a scheduled function to process report schedules:

```typescript
// supabase/functions/process-report-schedules/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get active schedules that are due
  const now = new Date();
  const { data: schedules } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', now.toISOString());

  // Process each schedule
  for (const schedule of schedules || []) {
    // Generate report for each format
    for (const format of schedule.formats) {
      await supabase.functions.invoke('generate-report', {
        body: {
          reportType: schedule.report_type,
          format,
          filters: schedule.filters,
          parameters: schedule.parameters,
          scheduleId: schedule.id,
        },
      });
    }

    // Calculate next run time
    const { data: nextRun } = await supabase.rpc('calculate_next_run_time', {
      p_frequency: schedule.frequency,
      p_day_of_week: schedule.day_of_week,
      p_day_of_month: schedule.day_of_month,
      p_time_of_day: schedule.time_of_day,
      p_timezone: schedule.timezone,
      p_current_time: now.toISOString(),
    });

    // Update schedule
    await supabase
      .from('report_schedules')
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun,
        run_count: schedule.run_count + 1,
      })
      .eq('id', schedule.id);
  }

  return new Response(JSON.stringify({ processed: schedules?.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### Configure Cron Schedule

In Supabase Dashboard → Edge Functions → Cron Jobs:
```
0 * * * * (every hour)
```

Or use external cron service (e.g., GitHub Actions, Vercel Cron):

```yaml
# .github/workflows/process-schedules.yml
name: Process Report Schedules
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Edge Function
        run: |
          curl -X POST 'https://your-project.supabase.co/functions/v1/process-report-schedules' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}'
```

---

### Step 8: Testing

#### Test Report Generation

```typescript
// Test script
import { ReportsApi } from '@/services/api/reportsApi';

async function testReportGeneration() {
  try {
    // Test 1: Generate PDF
    console.log('Test 1: Generating PDF...');
    const pdfResult = await ReportsApi.generateReportNow({
      reportType: 'portfolio_performance',
      format: 'pdf',
      filters: { period: 'mtd' },
    });
    console.log('PDF Result:', pdfResult.success ? 'SUCCESS' : 'FAILED');

    // Test 2: Generate Excel
    console.log('Test 2: Generating Excel...');
    const excelResult = await ReportsApi.generateReportNow({
      reportType: 'transaction_history',
      format: 'excel',
      filters: {
        dateRangeStart: '2024-01-01',
        dateRangeEnd: '2024-12-31',
      },
    });
    console.log('Excel Result:', excelResult.success ? 'SUCCESS' : 'FAILED');

    // Test 3: List reports
    console.log('Test 3: Listing reports...');
    const reports = await ReportsApi.getUserReports();
    console.log(`Found ${reports.length} reports`);

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReportGeneration();
```

#### Verify Database

```sql
-- Check report definitions
SELECT COUNT(*) FROM report_definitions WHERE is_active = true;
-- Expected: 13

-- Check generated reports
SELECT report_type, format, status, COUNT(*)
FROM generated_reports
GROUP BY report_type, format, status;

-- Check storage bucket
SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'reports';
```

---

### Step 9: Configure Maintenance

#### Set Up Automated Cleanup

Create a scheduled function to clean old reports:

```sql
-- Run weekly cleanup (keep reports for 90 days)
SELECT cleanup_expired_reports(90);
```

Add to cron (weekly):
```yaml
0 0 * * 0  # Every Sunday at midnight
```

#### Monitor Performance

```sql
-- Check report statistics
SELECT * FROM get_report_statistics(null, 30);

-- Check failed reports
SELECT id, report_type, error_message, created_at
FROM generated_reports
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Check storage usage
SELECT
  COUNT(*) as total_reports,
  SUM(file_size_bytes) / 1024 / 1024 as total_size_mb
FROM generated_reports
WHERE storage_path IS NOT NULL;
```

---

### Step 10: Production Configuration

#### Enable Rate Limiting

```typescript
// In your API middleware
import rateLimit from 'express-rate-limit';

const reportGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour per user
  message: 'Too many report generation requests, please try again later',
});

app.post('/api/reports/generate', reportGenerationLimiter, async (req, res) => {
  // Handle request
});
```

#### Configure Monitoring

```typescript
// Add monitoring hooks
import * as Sentry from '@sentry/react';

// In ReportsApi
static async generateReport(request: GenerateReportRequest) {
  const transaction = Sentry.startTransaction({
    name: 'Generate Report',
    op: 'report.generate',
  });

  try {
    // ... generation logic
    transaction.setStatus('ok');
  } catch (error) {
    transaction.setStatus('error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

#### Set Up Alerts

Configure alerts for:
- Failed report generations
- Storage quota reached (80%)
- Edge function errors
- Slow report generation (> 30s)

---

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Storage bucket created and configured
- [ ] RLS policies applied
- [ ] Edge function deployed and tested
- [ ] Report definitions seeded
- [ ] Frontend components integrated
- [ ] Navigation updated
- [ ] Test report generation works
- [ ] Scheduled reports configured (if applicable)
- [ ] Cleanup cron job set up
- [ ] Monitoring enabled
- [ ] Rate limiting configured
- [ ] Documentation reviewed
- [ ] Team trained on usage

---

## Rollback Plan

If issues occur:

### Rollback Database
```bash
# Revert migration
supabase db reset

# Or drop tables manually
DROP TABLE IF EXISTS report_shares CASCADE;
DROP TABLE IF EXISTS report_access_logs CASCADE;
DROP TABLE IF EXISTS report_schedules CASCADE;
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS report_definitions CASCADE;

DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS report_format CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS report_schedule_frequency CASCADE;
```

### Rollback Edge Function
```bash
supabase functions delete generate-report
```

### Rollback Storage
```sql
DELETE FROM storage.objects WHERE bucket_id = 'reports';
DELETE FROM storage.buckets WHERE id = 'reports';
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Migration fails with "relation already exists"
**Solution**: Tables may already exist. Drop tables and re-run migration.

**Issue**: Edge function deployment fails
**Solution**: Check Supabase CLI is logged in: `supabase login`

**Issue**: Storage bucket not accessible
**Solution**: Verify RLS policies are correctly configured

**Issue**: Reports not generating
**Solution**: Check Edge Function logs in Supabase Dashboard

### Getting Help

- Review `/REPORTS_SYSTEM_GUIDE.md`
- Check `/src/lib/reports/README.md`
- Inspect Edge Function logs
- Query `generated_reports` table for errors
- Enable debug logging

---

## Success Metrics

After deployment, monitor:

1. **Report Generation Success Rate**
   - Target: > 95%

2. **Average Generation Time**
   - PDF: < 15 seconds
   - Excel: < 10 seconds

3. **User Adoption**
   - Track reports generated per week
   - Monitor which report types are most popular

4. **Storage Usage**
   - Monitor bucket size
   - Set up alerts at 80% capacity

5. **Error Rate**
   - Failed generations < 5%
   - Edge function errors < 1%

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Environment**: [ ] Development [ ] Staging [ ] Production
**Status**: [ ] Pending [ ] In Progress [ ] Complete

---

**Good luck with your deployment!** 🚀
