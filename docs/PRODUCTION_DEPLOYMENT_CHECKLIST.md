# Production Deployment Checklist
**Indigo Yield Platform**

Last Updated: 2025-12-27

---

## Pre-Deployment Verification

### 1. Code Quality ✓
- [ ] All CI checks passing (lint, type-check, unit tests)
- [ ] SQL migration checks passing
- [ ] No console errors in development
- [ ] Security scan completed (no high/critical vulnerabilities)

### 2. Database Integrity
- [ ] Run integrity check: `SELECT * FROM v_transaction_distribution_orphans LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM v_period_orphans LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM v_investor_kpis_orphans LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM v_fee_allocation_orphans LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM fund_aum_mismatch LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM yield_distribution_conservation_check LIMIT 1;` → 0 rows
- [ ] Run integrity check: `SELECT * FROM ib_allocation_consistency LIMIT 1;` → 0 rows

### 3. Security Audit
- [ ] Run `./scripts/check-migrations.sh` → All green
- [ ] Run database linter → No critical issues
- [ ] RLS policies verified on all user-facing tables
- [ ] No exposed API keys in codebase

---

## Deployment Steps

### Step 1: Database Backup
```bash
# Create backup before any changes
supabase db dump --linked > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migrations
```bash
# Apply pending migrations
supabase db push --linked

# Verify migrations applied
supabase db remote status
```

### Step 3: Deploy Edge Functions
```bash
# Deploy all functions
cd supabase/functions
./deploy-all.sh

# Or deploy individually
supabase functions deploy integrity-monitor --project-ref <ref>
```

### Step 4: Verify Deployment
```bash
# Check edge function health
curl https://<project-ref>.supabase.co/functions/v1/status

# Run smoke tests
./scripts/db-smoke-test.sh
```

### Step 5: Enable Monitoring
```sql
-- Schedule integrity monitoring (run once in Supabase SQL editor)
SELECT cron.schedule(
  'integrity-monitor-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/integrity-monitor',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## Post-Deployment Verification

### 1. Functional Tests
- [ ] Login as admin → Dashboard loads
- [ ] View Admin Integrity page → All checks pass
- [ ] Login as investor → Portfolio displays correctly
- [ ] Generate a test statement → PDF renders
- [ ] Process a test withdrawal → Status updates correctly

### 2. Performance Checks
- [ ] Dashboard loads < 3s
- [ ] Statement generation < 10s
- [ ] No N+1 queries in console

### 3. Monitoring Setup
- [ ] Integrity monitor edge function deployed
- [ ] Cron job scheduled for hourly checks
- [ ] Alert notifications configured (email/Slack)

---

## Rollback Procedure

### If Issues Detected:
1. **Revert to previous deployment** in Vercel dashboard
2. **Restore database** from backup if schema changes caused issues:
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```
3. **Disable cron jobs** if integrity monitor is causing issues:
   ```sql
   SELECT cron.unschedule('integrity-monitor-hourly');
   ```

---

## Environment Variables

### Required for Production:
| Variable | Description | Location |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Vercel env vars |
| `SUPABASE_ANON_KEY` | Public anon key | Vercel env vars |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Edge function secrets |
| `RESEND_API_KEY` | Email delivery | Edge function secrets |
| `SENTRY_DSN` | Error tracking | Vercel env vars |

### Optional:
| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Integrity alert notifications |
| `ALERT_EMAIL` | Email for integrity alerts |

---

## Contacts

| Role | Contact |
|------|---------|
| Platform Lead | [TBD] |
| Database Admin | [TBD] |
| On-Call Engineer | [TBD] |

---

## Sign-Off

| Checkpoint | Verified By | Date |
|------------|-------------|------|
| Pre-deployment checks | | |
| Database backup | | |
| Migrations applied | | |
| Edge functions deployed | | |
| Functional tests passed | | |
| Monitoring enabled | | |

---

*Deployment checklist completed: _______________*
