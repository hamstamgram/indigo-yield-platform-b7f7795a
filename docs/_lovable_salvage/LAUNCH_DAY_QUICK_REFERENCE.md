# Launch Day Quick Reference — 2026-04-08

**Time Zone**: UTC  
**Launch Time**: 10:00 UTC (when all checks pass)  
**Status Check Every**: 15 minutes

---

## Pre-Launch Checklist (09:00-09:30)

### 1. Database Checks (5 min)
```bash
# Check profiles are correct
psql -d indigo -c "SELECT email, fee_pct, ib_parent_id, account_type FROM profiles WHERE account_type IN ('investor', 'ib') LIMIT 10;"

# Expected output:
# Sam Johnson | 0.16 | ryan-id | investor ✓
# Ryan Van Der Wall | 0 | NULL | ib ✓
# Paul Johnson | 0.16 | alex-id | investor ✓
# etc.

# Check transactions exist
psql -d indigo -c "SELECT COUNT(*), asset FROM transactions_v2 WHERE fund_id IN (SELECT id FROM funds WHERE code IN ('XRP', 'SOL')) GROUP BY asset;"

# Expected:
# XRP | 6+ ✓
# SOL | 4+ ✓
```

### 2. RPC Test (10 min)
```bash
# Test preview RPC (read-only, safe)
npm run test:yield:preview

# Expected output:
# XRP Fund Preview
#   Gross Yield: 355
#   Sam allocation: 284
#   Ryan allocation: 14.20
#   INDIGO allocation: 56.80
# Status: PASS ✓
```

### 3. Reconciliation Check (5 min)
```bash
# Check no drift between positions and transactions
npm run sql:reconcile

# Expected output (empty):
# v_ledger_reconciliation: 0 rows
# fund_aum_mismatch: 0 rows
# conservation_check: 0 rows
# Status: PASS ✓
```

### 4. UI Smoke Test (5 min)
```bash
# In browser:
# 1. Go to /admin/yields
#    - [ ] XRP fund loads
#    - [ ] SOL fund loads
#    - [ ] No console errors
#
# 2. Go to /investor/portfolio
#    - [ ] Sam sees XRP balance
#    - [ ] Paul sees SOL balance
#    - [ ] No console errors
#
# 3. Check browser console
#    - [ ] No 500 errors
#    - [ ] No RLS permission denied
#    - [ ] No network failures
```

---

## Go-Live (10:00 UTC)

### If All Checks Pass ✅
```bash
# 1. Enable yield processing
psql -d indigo -c "UPDATE features SET enabled = true WHERE feature = 'YIELD_DISTRIBUTION';"

# 2. Verify enable worked
psql -d indigo -c "SELECT feature, enabled FROM features WHERE feature = 'YIELD_DISTRIBUTION';"
# Expected: YIELD_DISTRIBUTION | true ✓

# 3. Post to Slack
# "Yield processing is LIVE 🚀 All systems nominal."

# 4. Send investor email
# "Automated yield processing is now active on your account."
```

### If Any Check Fails ⛔
```bash
# STOP - Do not proceed
# 1. Log the failure
# 2. Check TROUBLESHOOTING section below
# 3. Fix the issue
# 4. Re-run checks
# 5. Proceed only when all pass
```

---

## Post-Launch (10:00+)

### Every 15 Minutes (First Hour)
```bash
# Check error rate
tail -f logs/errors.log | grep -i "yield\|allocation" | wc -l
# Expected: 0-5 errors

# Check RPC performance
npm run perf:check:rpc
# Expected: p99 < 2000ms

# Check database load
psql -d indigo -c "SELECT count(*) FROM pg_stat_activity WHERE query LIKE '%yield%';"
# Expected: ≤ 3 active queries
```

### Every 30 Minutes (First 4 Hours)
```bash
# Check investor_positions auto-synced
npm run sql:audit:positions
# Expected: 0 orphaned positions

# Check reconciliation still clean
npm run sql:reconcile
# Expected: All empty (0 rows)

# Check yield_distributions created
psql -d indigo -c "SELECT COUNT(*) FROM yield_distributions WHERE created_at > NOW() - INTERVAL '30 minutes';"
# Expected: ≥ 1 (if yields were applied)
```

### Hourly (First 8 Hours)
```bash
# Full reconciliation
npm run sql:full-reconcile

# Error log review
grep "CRITICAL\|ERROR" logs/indigo.log | tail -20

# Fund AUM check
npm run sql:fund-aum:check
```

---

## Troubleshooting Guide

### RPC Preview Returns Error
```
Error: "profiles.fee_pct is NULL"

Fix:
  1. Check: SELECT * FROM profiles WHERE id = 'inv-sam-001';
  2. Ensure fee_pct = 0.16 (not NULL)
  3. If NULL: UPDATE profiles SET fee_pct = 0.16 WHERE id = 'inv-sam-001';
  4. Retry RPC
```

### UI Shows Old Data (Cache Issue)
```
Browser still shows "0" for yield

Fix:
  1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
  2. Check React Query cache: Open DevTools → React Query tab
  3. If cache stale: Invalidate it manually
  4. Retry page load
```

### Reconciliation Shows Mismatch
```
fund_aum_mismatch: 184358 != 184287

Fix:
  1. Check: SELECT SUM(current_value) FROM investor_positions WHERE fund_id = 'xrp-fund-001';
  2. Compare to: SELECT aum_amount FROM fund_daily_aum WHERE fund_id = 'xrp-fund-001' ORDER BY aum_date DESC LIMIT 1;
  3. If mismatch, check audit log for missed allocations
  4. Verify trigger fired: SELECT COUNT(*) FROM audit_log WHERE table_name = 'investor_positions' AND operation = 'INSERT' AND created_at > NOW() - INTERVAL '1 hour';
```

### RPC Slow (> 2000ms)
```
Yield allocation taking too long

Fix:
  1. Check database CPU: pg_stat_statements
  2. Check if locks exist: SELECT * FROM pg_locks WHERE NOT granted;
  3. If locks: Identify blocker query and cancel
  4. Reindex if needed: REINDEX TABLE yield_allocations;
```

### Investor Portal Shows "Connection Error"
```
/investor/portfolio doesn't load

Fix:
  1. Check RLS policies: SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investor_positions';
  2. Verify is_admin() function works: SELECT is_admin();
  3. Check if investor's ID is correct in auth.users
  4. Test RPC directly: npm run test:investor:positions
```

---

## Rollback Procedures

### Pause Yield Processing (Safe)
```bash
# Stop processing new yields (existing data untouched)
psql -d indigo -c "UPDATE features SET enabled = false WHERE feature = 'YIELD_DISTRIBUTION';"

# Users won't be affected, yields just won't process
# Can resume when ready
```

### Void Last Distribution (Medium Risk)
```bash
# Get distribution ID
psql -d indigo -c "SELECT id FROM yield_distributions ORDER BY created_at DESC LIMIT 1;"

# Void it (cascades to all related records)
psql -d indigo -c "SELECT void_yield_distribution('DISTRIBUTION_ID');"

# Verify reverted
psql -d indigo -c "SELECT * FROM investor_positions WHERE fund_id = 'xrp-fund-001' LIMIT 5;"
# Should show pre-yield balances
```

### Full Database Rollback (Last Resort)
```bash
# Only if something is very broken
# Takes ~30 minutes, notify users first

supabase db reset --linked

# Restores from backup, users lose all changes since backup
# Use only if critical data corruption occurred
```

---

## Success Signals

### Green Light ✅
```
✓ RPC preview returns correct allocations
✓ UI loads without errors
✓ Investor_positions updated
✓ Reconciliation shows 0 mismatches
✓ Error rate < 0.5%
✓ RPC p99 latency < 2s
✓ No critical alerts triggered
```

### Yellow Light ⚠️
```
⚠ A few non-critical errors in logs
⚠ RPC latency borderline (1.5-2s)
⚠ One reconciliation mismatch (< $1)
→ Monitor closely, don't pause yet
```

### Red Light 🛑
```
✗ RPC returns errors
✗ UI crashes on load
✗ Large reconciliation mismatches
✗ Error rate > 5%
→ PAUSE immediately, investigate, fix, resume
```

---

## Key Numbers to Know

### Expected Values
```
XRP Fund:
  AUM: 184,358 XRP
  Yield (30/11): 355 XRP
  Sam balance after yield: 184,287 XRP
  Ryan balance: 14.20 XRP
  INDIGO fees: 56.80 XRP

SOL Fund:
  AUM: 1,500 SOL
  Total investors: 2+
  Test yield processing: Once daily
```

### Alert Thresholds
```
Error Rate: > 1% → Alert
RPC Latency p99: > 3s → Alert
Database CPU: > 80% → Alert
Database Connections: > 90 of 100 → Alert
Reconciliation Drift: > 0.01% → Alert
Yield Allocation Deviation: > 0.1% → Alert
```

---

## Contact Information

### If You Need Help
```
Database Issue → database-specialist agent
RPC Issue → backend-architect agent
UI Issue → frontend-architect agent
Yield Logic Issue → Read SUPABASE_SCHEMA_ANALYSIS.md + EXPERT_HANDOFF_PROMPT.md
Emergency → Use Rollback Procedures above
```

### Slack Channels to Monitor
```
#indigo-platform (main alerts)
#yield-processing (yield-specific)
#investor-support (customer issues)
#incidents (SRE on-call)
```

---

## Launch Timeline

```
09:00 UTC: Pre-flight checks begin
09:30 UTC: All checks complete
10:00 UTC: GO LIVE (yield processing enabled)
10:30 UTC: Send investor notification
11:00 UTC: First yield processing run
12:00 UTC: Post-launch validation complete
18:00 UTC: 8-hour stability check
24:00 UTC: 24-hour stability check (launch complete)
```

---

## Remember

1. **Slow and steady wins the race** - Don't skip checks to go faster
2. **When in doubt, pause** - It's easier to resume than to rollback
3. **Communicate early** - Notify team of any issues immediately
4. **Monitor actively** - First 4 hours are critical
5. **Trust the tests** - They validated all scenarios

**You've got this.** 🚀

---

**Quick Reference Version**: 1.0  
**For Launch Date**: 2026-04-08  
**Keep This Handy**: Yes, print it
