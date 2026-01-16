# Integrity Monitoring Scheduling Guide

## Overview

The integrity monitor checks the platform for data consistency issues including:
- Ledger/position reconciliation
- AUM mismatches
- Crystallization gaps
- Duplicate profiles
- Yield conservation

Results are stored in `admin_integrity_runs` table and alerts are created in `admin_alerts` table.

## Option 1: Supabase Scheduled Functions (Recommended)

If your Supabase plan supports scheduled functions (Pro plan and above):

1. Navigate to Supabase Dashboard → Edge Functions
2. Select `integrity-monitor` function
3. Click "Schedule" and set cron expression:
   - Every 15 minutes: `*/15 * * * *`
   - Every hour: `0 * * * *`
   - Every 6 hours: `0 */6 * * *`

## Option 2: GitHub Actions Cron

Add to `.github/workflows/integrity-monitor.yml`:

```yaml
name: Integrity Monitor

on:
  schedule:
    # Run every 15 minutes
    - cron: '*/15 * * * *'
  workflow_dispatch:
    inputs:
      triggered_by:
        description: 'Trigger source'
        default: 'manual'

jobs:
  run-integrity-check:
    runs-on: ubuntu-latest
    steps:
      - name: Run Integrity Check
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/integrity-monitor" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"triggered_by": "${{ github.event.inputs.triggered_by || 'cron' }}"}'
```

Required secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (from Supabase dashboard)

## Option 3: External Cron Service

Use services like:
- **Uptime Robot**: Free tier supports cron-like monitoring
- **Cron-job.org**: Free scheduled HTTP requests
- **EasyCron**: Simple cron service

Configure them to POST to:
```
POST https://<your-project>.supabase.co/functions/v1/integrity-monitor
Authorization: Bearer <service_role_key>
Content-Type: application/json
Body: {"triggered_by": "external_cron"}
```

## Local Testing

Use the provided script:

```bash
./scripts/run-integrity-monitor.sh
```

Or manually:

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/integrity-monitor" \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by": "manual"}'
```

## Verifying Monitor is Running

1. **Check admin_integrity_runs table**:
```sql
SELECT id, run_at, status, runtime_ms, triggered_by
FROM admin_integrity_runs
ORDER BY run_at DESC
LIMIT 10;
```

2. **Check for recent runs**:
```sql
SELECT
  DATE_TRUNC('hour', run_at) as hour,
  COUNT(*) as runs,
  SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failures
FROM admin_integrity_runs
WHERE run_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', run_at)
ORDER BY hour DESC;
```

3. **Check alerts**:
```sql
SELECT * FROM admin_alerts
WHERE acknowledged_at IS NULL
ORDER BY created_at DESC;
```

## Alert Configuration

Set these environment variables in Supabase Dashboard → Edge Functions → Secrets:

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for alerts |
| `ALERT_EMAIL` | Email address for email alerts |

## Troubleshooting

1. **No runs recorded**: Check edge function logs in Supabase dashboard
2. **Alerts not sending**: Verify SLACK_WEBHOOK_URL and ALERT_EMAIL are set
3. **High runtime**: Consider adding database indexes or reducing check scope
