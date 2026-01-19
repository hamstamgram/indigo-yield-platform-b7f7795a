# P1 Operations Lockdown Runbook

> **Phase**: P1 - Operations Lockdown
> **Status**: Complete
> **Date**: 2026-01-16

## Overview

P1 Operations Lockdown implements critical integrity gating, monitoring persistence, and admin operations console to ensure data consistency across the Indigo Yield Platform.

---

## Quick Reference

### Admin Console URLs

| Page | URL | Purpose |
|------|-----|---------|
| Integrity Dashboard | `/admin/integrity` | View integrity checks, run manual checks, see history |
| Crystallization Dashboard | `/admin/crystallization` | Monitor crystallization status, batch crystallize |
| Duplicates | `/admin/duplicates` | Review and merge duplicate profiles |
| Bypass Attempts | `/admin/bypass-attempts` | View blocked operations |

### Key RPCs

| Function | Purpose | Usage |
|----------|---------|-------|
| `run_integrity_check()` | Run full integrity check | Returns status, violations, run_id |
| `batch_crystallize_fund(p_fund_id, p_dry_run)` | Crystallize all gaps for fund | Use dry_run=true first |
| `merge_duplicate_profiles(p_keep_id, p_merge_id)` | Merge two profiles | Returns stats on moved data |
| `assert_integrity_or_raise(p_fund_id, p_investor_id)` | Check integrity before write | Raises exception if violations |

### Key Views

| View | Purpose |
|------|---------|
| `v_crystallization_gaps` | Positions needing crystallization |
| `v_crystallization_dashboard` | Fund-level crystallization status |
| `v_ledger_reconciliation` | Position vs transaction mismatches |
| `v_potential_duplicate_profiles` | Similar profiles that may be duplicates |
| `fund_aum_mismatch` | AUM vs position sum discrepancies |
| `v_yield_conservation_check` | Yield allocation integrity |

### Tables

| Table | Purpose |
|-------|---------|
| `admin_integrity_runs` | History of integrity check runs |
| `admin_alerts` | Alerts generated from critical failures |
| `transaction_bypass_attempts` | Blocked direct write attempts |

---

## Operational Procedures

### Daily Operations

1. **Check Integrity Dashboard** (`/admin/integrity`)
   - Verify overall status is "All Clear"
   - Review any active alerts
   - Check run history for recent failures

2. **Monitor Crystallization** (`/admin/crystallization`)
   - Check gap count (should be 0 at month end)
   - Review oldest gap days
   - Run batch crystallization if needed

### Monthly Operations

1. **Pre-Month-End Checklist**
   ```
   [ ] Run integrity check - confirm all pass
   [ ] Check crystallization gaps - none > 30 days
   [ ] Review duplicate profiles - merge if any
   [ ] Verify AUM matches position sums
   ```

2. **Month-End Crystallization**
   - Navigate to `/admin/crystallization`
   - For each fund with gaps:
     1. Click Preview (eye icon) to see what would change
     2. If preview looks correct, click Execute (play icon)
     3. Confirm in dialog
   - Verify all gaps are now 0

3. **Post-Month-End Verification**
   ```sql
   -- Check no crystallization gaps remain
   SELECT * FROM v_crystallization_gaps;

   -- Verify integrity
   SELECT run_integrity_check();
   ```

### Handling Integrity Failures

#### AUM Mismatch
```sql
-- Identify mismatches
SELECT * FROM fund_aum_mismatch;

-- Recalculate and update AUM
SELECT batch_initialize_fund_aum_service();
```

#### Crystallization Gaps
1. Navigate to `/admin/crystallization`
2. Select the fund with gaps
3. Preview the batch crystallization
4. Execute if preview is acceptable

#### Duplicate Profiles
1. Navigate to `/admin/duplicates`
2. Review the potential duplicates
3. For each true duplicate:
   - Click "Merge"
   - Select which profile to keep
   - Confirm the merge

#### Ledger Reconciliation Issues
```sql
-- View mismatches
SELECT * FROM v_ledger_reconciliation;

-- For each mismatch, investigate the transactions
SELECT * FROM transactions_v2
WHERE investor_id = '<investor_id>' AND fund_id = '<fund_id>'
ORDER BY tx_date DESC;
```

---

## Monitoring Setup

### Scheduled Integrity Monitor

The integrity monitor can be scheduled via:

1. **Supabase Scheduled Functions** (Pro plan)
   - Dashboard → Edge Functions → Schedule
   - Cron: `*/15 * * * *` (every 15 minutes)

2. **GitHub Actions Cron**
   - See `.github/workflows/golden-path.yml`
   - Or create dedicated workflow

3. **Manual via Script**
   ```bash
   ./scripts/run-integrity-monitor.sh local
   ```

### Checking Monitor Status

```sql
-- Recent runs
SELECT id, run_at, status, violation_count, runtime_ms
FROM admin_integrity_runs
ORDER BY run_at DESC
LIMIT 10;

-- Unacknowledged alerts
SELECT * FROM admin_alerts
WHERE acknowledged_at IS NULL
ORDER BY created_at DESC;
```

---

## Troubleshooting

### "Bypass attempt blocked" Error

If you see this error when trying to insert/update transactions:

1. **Do not** try to work around the trigger
2. Use the canonical RPC: `apply_transaction_with_crystallization`
3. Check `/admin/bypass-attempts` to see what was blocked

### Integrity Check Fails

1. Run `SELECT run_integrity_check()` to get details
2. Review the `violations` array in the response
3. Address each violation type using procedures above

### Crystallization Dashboard Empty

If `v_crystallization_dashboard` shows no data:

1. Check that funds exist and are active
2. Verify investor_positions table has data
3. Check the view definition for any filtering issues

### Edge Function Not Recording Runs

1. Check edge function logs in Supabase dashboard
2. Verify `admin_integrity_runs` table exists
3. Confirm RLS policies allow service role writes

---

## CI/CD Integration

### Golden Path CI Workflow

Located at `.github/workflows/golden-path.yml`:

1. **db-integrity job**
   - Applies migrations
   - Runs golden path seed
   - Verifies integrity views

2. **golden-path-tests job**
   - Runs Playwright E2E tests
   - Tests integrity views via Supabase client
   - Tests admin dashboard access

3. **integrity-monitor job**
   - Runs integrity monitor script
   - Verifies runs are recorded

### Required Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | For Supabase CLI |
| `LOCAL_ANON_KEY` | Local Supabase anon key |
| `LOCAL_SERVICE_KEY` | Local Supabase service key |

---

## Emergency Procedures

### Disabling Integrity Gating (Emergency Only)

⚠️ **Only use in genuine emergencies where gating is blocking critical operations**

```sql
-- Temporarily disable the bypass trigger
-- NOTE: This should be re-enabled immediately after
ALTER TABLE transactions_v2 DISABLE TRIGGER trg_block_direct_writes;

-- Perform emergency operation...

-- RE-ENABLE IMMEDIATELY
ALTER TABLE transactions_v2 ENABLE TRIGGER trg_block_direct_writes;
```

### Recovering from Failed Merge

If a profile merge fails midway:

1. Check `audit_log` for the merge attempt
2. Manually verify which data was moved
3. Contact support for data recovery if needed

---

## Related Documentation

- [Schema Truth Pack](./SCHEMA_TRUTH_PACK_LATEST.md)
- [Crystallization Architecture](./crystallization-architecture.md)
- [Monitoring Schedule Guide](../scripts/schedule-monitoring.md)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-16 | Initial P1 release - all phases complete |
