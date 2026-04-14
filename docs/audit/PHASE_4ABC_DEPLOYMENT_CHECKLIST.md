# Phase 4A-4C Same-Day Deployment Checklist

**Timeline:** Deploy today if all gates pass  
**Scope:** Phase 4A (void isolation + locks), 4B (yield v5), 4C (reporting hardening)  
**Risk Level:** MODERATE (financial state changes: void atomic, locks added, reporting inputs hardened)  
**Rollback Window:** 2 hours post-deploy (before EOD reconciliation runs)  

---

## LOCAL PRE-DEPLOY GATE (10 min)

**Run before any staging push:**

### Git State
- [ ] On `main` branch
- [ ] All Phase 4A-4C commits present (grep for migration dates: 20260505, 20260512, 20260519, 20260526)
- [ ] No uncommitted changes except `.claude/settings.local.json` and `.temp/` files
- [ ] Branch ahead of `origin/main` by exactly 10 commits (6 from previous phases + 1 for 4C docs commit)

**Verify:**
```bash
git log --oneline -10 | grep -E "20260505|20260512|20260519|20260526"
# Should show 4 migration-related commits
```

### Migration Files Integrity
- [ ] `supabase/migrations/20260505000000_void_transaction_isolation.sql` exists
- [ ] `supabase/migrations/20260512000000_void_fund_level_locking.sql` exists
- [ ] `supabase/migrations/20260519000000_yield_domain_hardening_clean_state.sql` exists
- [ ] `supabase/migrations/20260526000000_consolidate_reporting_views.sql` exists
- [ ] All 4 migrations are valid SQL (no syntax errors)

**Verify:**
```bash
for f in 20260505000000 20260512000000 20260519000000 20260526000000; do
  sqlflint supabase/migrations/${f}*.sql || echo "SYNTAX ERROR: $f"
done
```

### Test Files Integrity
- [ ] `tests/migrations/void_unvoid_concurrency_tests.sql` exists (3 tests)
- [ ] `tests/migrations/yield_hardening_tests.sql` exists (6 tests)
- [ ] `tests/migrations/reporting_hardening_tests.sql` exists (3 tests)

### Type Check
- [ ] `npx tsc --noEmit` completes without new errors (pre-existing OOM acceptable)
- [ ] No new TypeScript errors in src/

**Verify:**
```bash
npx tsc --noEmit 2>&1 | grep -v "Allocation failed" | head -20
# Should show 0 new errors (OOM message ok)
```

### Linting
- [ ] No new lint violations in modified files
- [ ] All migrations follow SQL conventions (idempotent, DROP IF EXISTS, etc.)

---

## STAGING DEPLOYMENT GATE (30 min)

### Pre-Deployment
- [ ] Staging database is clean (no lingering test data)
- [ ] Staging Supabase logs cleared
- [ ] Staging monitoring dashboards loaded (check Supabase + any custom monitoring)

**Commands:**
```bash
supabase db reset --db-url $STAGING_DB_URL  # Fresh state
# Wait for reset to complete
```

### Apply Migrations in Order
- [ ] Migration 20260505 (void isolation) applies without error
- [ ] Migration 20260512 (void locks) applies without error
- [ ] Migration 20260519 (yield v5) applies without error
- [ ] Migration 20260526 (reporting verification) applies without error

**Verify:**
```bash
supabase migration list --db-url $STAGING_DB_URL | grep -E "20260505|20260512|20260519|20260526"
# All should show as "Applied"
```

### Smoke Test Suite — Critical Financial Flows (20 min)

**ST-1: Void + Position Isolation (Phase 4A foundational)**
- Create test investor + fund
- Deposit 1000 units → position should be 1000
- Void the deposit → position should be 0 (immediate, atomic)
- Unvoid → position should be 1000 again
- Verify no orphaned transactions in audit_log

**Pass Criteria**: All 3 state changes atomic, no inconsistency window

**Test Script:**
```sql
-- Run in staging
\i tests/migrations/void_unvoid_concurrency_tests.sql
-- All 3 tests must pass
```

**ST-2: Fund-Level Lock Behavior (Phase 4A integration)**
- Deposit to fund X as investor A
- Concurrently attempt void + yield on same fund
- Verify operations serialize (not interleaved)
- Verify final position consistent with transaction sum

**Pass Criteria**: No race condition, final state correct

**ST-3: Yield v5 Canonical (Phase 4B)**
- Apply deposit to investor
- Call `apply_adb_yield_distribution_v5(investor_id, fund_id, 50)` → position +50
- Verify yield_distributions table records the 50 units
- Verify v3 function does not exist (grep migration 20260414000002)

**Pass Criteria**: v5 applies correctly, v3 absent

**Test Script:**
```sql
\i tests/migrations/yield_hardening_tests.sql
-- All 6 tests must pass
```

**ST-4: Reporting Consistency (Phase 4C)**
- Create statement-ready scenario: investor + fund + position + yield
- Query investor_positions → should match transaction sum
- Query fund_daily_aum → should match sum of all investor positions in fund
- Void a transaction → both views update atomically

**Pass Criteria**: Reporting views consistent, void reflected immediately

**Test Script:**
```sql
\i tests/migrations/reporting_hardening_tests.sql
-- All 3 tests must pass
```

**ST-5: Reconciliation Validation**
- Run `SELECT * FROM v_ledger_reconciliation WHERE fund_id = test_fund_id`
- Should show 0 reconciliation errors
- Run `SELECT * FROM v_aum_position_reconciliation WHERE fund_id = test_fund_id`
- Should show reconciliation_status = 'OK'

**Pass Criteria**: No reconciliation violations

---

## STAGING GATE APPROVAL (5 min)

**All 5 smoke tests passing?**
- [ ] ST-1 void + position isolation: ✅ PASS
- [ ] ST-2 fund-level locking: ✅ PASS
- [ ] ST-3 yield v5 canonical: ✅ PASS
- [ ] ST-4 reporting consistency: ✅ PASS
- [ ] ST-5 reconciliation validation: ✅ PASS

**All migrations applied cleanly?**
- [ ] 20260505: ✅ Applied
- [ ] 20260512: ✅ Applied
- [ ] 20260519: ✅ Applied
- [ ] 20260526: ✅ Applied

**Staging environment stable?**
- [ ] No errors in Supabase logs (past 30 min)
- [ ] All database tables accessible
- [ ] No performance degradation

**Decision:**
```
IF (all tests passing) AND (no log errors) AND (all migrations applied)
  THEN → proceed to production deployment
ELSE
  THEN → STOP, investigate failure, do not proceed
```

---

## PRODUCTION DEPLOYMENT GATE (60 min total)

### Pre-Production Deployment Checks (5 min)

**Backup Verification**
- [ ] Production database has valid backup (created today, < 2 hours old)
- [ ] Backup can be restored (test in isolated environment, not on prod)
- [ ] Rollback plan documented and tested

**Current Production State**
- [ ] No active incidents or ongoing maintenance windows
- [ ] EOD reconciliation processes not running
- [ ] No pending manual transactions waiting approval

**Team Readiness**
- [ ] Oncall engineer available for 2-hour post-deploy window
- [ ] Slack channel #incidents or equivalent monitored
- [ ] Database admin on standby for rollback if needed

### Deploy to Production (15 min)

**Deploy Sequence:**
1. Stop non-critical background jobs (optional yield jobs, reporting jobs)
2. Apply migration 20260505 (void isolation)
3. Verify: no errors in Supabase logs
4. Apply migration 20260512 (void locks)
5. Verify: no errors in Supabase logs
6. Apply migration 20260519 (yield v5)
7. Verify: no errors in Supabase logs
8. Apply migration 20260526 (reporting verification)
9. Verify: no errors in Supabase logs
10. Resume background jobs

**Verify After Each Migration:**
```bash
# Check Supabase logs for errors
supabase logs --project-id $PROD_PROJECT_ID | tail -20
# Should show migration applied cleanly, no FATAL or ERROR
```

### Post-Deploy Validation (20 min)

**Critical Financial Flow Validation**

**PV-1: Void Cascade Still Works**
- Fetch a recent real transaction from production
- Void it using the hardened function
- Verify position updates immediately (no lag)
- Verify audit_log entry created
- Unvoid it
- Verify position restored

**PV-2: Yield Still Applies**
- Pick a real investor + fund
- Apply test yield distribution (small amount, e.g., 0.01 units)
- Verify yield_distributions table updated
- Verify investor position reflects yield
- Verify yield_distributions.distribution_date is today

**PV-3: AUM/Position Consistency Check**
- Query fund_daily_aum for a major fund
- Query SUM(position) from investor_positions for same fund
- Verify they match (within rounding)
- Run `SELECT reconciliation_status FROM v_aum_position_reconciliation`
- Verify no reconciliation errors

**PV-4: Statement Generation Works**
- Trigger a statement generation for a test investor
- Verify statement_email_delivery entry created
- Verify statement PDF path is valid
- Verify email send does not fail (check statement delivery logs)

**PV-5: Dashboard Rendering Works**
- Load investor dashboard in staging environment (query prod database)
- Verify positions display correctly
- Verify AUM values display
- Verify no SQL errors in browser console

---

## PRODUCTION GO/NO-GO DECISION

**GO if all true:**
- [ ] All 4 migrations applied cleanly (no FATAL errors)
- [ ] PV-1 void cascade works correctly
- [ ] PV-2 yield application works correctly
- [ ] PV-3 AUM/position consistency verified (no reconciliation errors)
- [ ] PV-4 statement generation works
- [ ] PV-5 dashboard rendering works
- [ ] No new errors in Supabase logs (past 30 min)

**NO-GO if any true:**
- ❌ Migration applies but returns error/warning
- ❌ Void operation fails or has lag > 5 seconds
- ❌ Yield application doesn't update position
- ❌ Reconciliation errors appear
- ❌ Statement generation fails
- ❌ Dashboard has rendering errors
- ❌ New FATAL errors in logs

**If NO-GO: Immediately trigger rollback (see Rollback Triggers below)**

---

## PRODUCTION WATCH SIGNALS (Next 2 hours)

**Monitor these signals continuously. Set alerts to notify oncall engineer immediately.**

### Critical Signals (Rollback if triggered)

| Signal | Normal Range | Alert Threshold | Action |
|--------|---|---|---|
| Void operation latency | <100ms | >5s | Investigate lock contention, may indicate lock timeout |
| Yield application latency | <500ms | >10s | Investigate yield function performance |
| Reconciliation error count | 0 | >0 | Stop and investigate data integrity issue |
| Transaction success rate | >99.9% | <99% | Check for constraint violations or timeout errors |
| Database connection pool utilization | <70% | >90% | May indicate lock waits or slow queries |
| Supabase API error rate | <0.1% | >1% | Check for cascade failures or timeouts |

**Watch Logs:**
```bash
# Terminal 1: Monitor Supabase logs
supabase logs --project-id $PROD_PROJECT_ID --follow

# Terminal 2: Monitor specific transaction errors
# (custom query on audit_log or transaction_error table)
SELECT COUNT(*), error_message FROM transaction_errors
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY error_message
ORDER BY COUNT(*) DESC;
```

### Non-Critical Signals (Monitor, may need action)

| Signal | Action |
|---|---|
| Statement generation slower than usual | Check yield application performance (may have lock contention during yield batch runs) |
| Dashboard query latency increased | Check fund_daily_aum view performance, may need index review |
| Void operation takes >1s but succeeds | Expected under moderate load, normal; investigate if persists |

### Expected Behavior (Not an alert)

- Void operation latency 50-200ms (increased from <50ms pre-4A due to locks, expected)
- Yield application latency 200-500ms (added lock contention, expected)
- Brief reconciliation state "REPAIRING" (normal, should resolve within 5s)

---

## ROLLBACK TRIGGERS

**Rollback immediately if ANY of these occur:**

1. **Void Operation Fails**
   - Void operation returns error
   - Void operation succeeds but position doesn't update
   - Trigger: Execute void, wait 5s, check position. If not updated → ROLLBACK

2. **Reconciliation Broken**
   - v_ledger_reconciliation shows ERROR status (not REPAIRING)
   - v_aum_position_reconciliation shows mismatches
   - Trigger: Query returns >0 errors 5 min post-deploy → ROLLBACK

3. **Lock Deadlock Observed**
   - Void operation hangs >10s
   - Yield operation hangs >10s
   - Concurrent void + yield operation fails with "deadlock detected"
   - Trigger: Timeout or deadlock error in logs → ROLLBACK

4. **Data Corruption Detected**
   - Transaction duplicate detected (same txn_id appears twice)
   - Position balance < 0 (should never happen)
   - AUM < sum of all investor positions in fund (should never happen)
   - Trigger: Audit query shows anomaly → ROLLBACK immediately

5. **Statement Generation Broken**
   - Statement generation fails (no entry in statement_email_delivery)
   - Statement PDF cannot be generated
   - Trigger: Manual test fails → ROLLBACK

6. **Yield v5 Not Applied**
   - apply_adb_yield_distribution_v5() returns error
   - Yield distribution created but position not updated
   - Trigger: Yield test fails → ROLLBACK

---

## ROLLBACK PROCEDURE (5 min)

**If any trigger fires:**

```bash
# 1. Stop background jobs immediately
# (stop yield batch, reporting jobs, statement generation)

# 2. Identify latest pre-Phase-4 migration
# (should be: 20260414000003_drop_aum_views_batch_6.sql)
LAST_GOOD_MIGRATION=$(supabase migration list | grep "20260414000003")

# 3. Rollback all 4 Phase 4 migrations
supabase migration rollback --steps 4

# 4. Verify rollback complete
supabase migration list | grep -E "20260505|20260512|20260519|20260526"
# Should show as "Rolled back"

# 5. Verify database state
SELECT COUNT(*) FROM void_transaction_with_lock;
# Should return error (function doesn't exist in pre-Phase-4 state)

# 6. Resume background jobs

# 7. Notify team
# "Phase 4A-4C rollback complete. System back to pre-Phase-4 state."
```

**After Rollback:**
- Void operations revert to pre-isolation behavior (no fund-level locks)
- Yield applies via v5 (no change, v5 already active)
- Reporting uses dropped views (restored from pre-Phase-4A state)
- Data state preserved (no data loss, only schema rolled back)

**Escalation After Rollback:**
- Do NOT attempt re-deploy same day
- Investigate root cause of trigger
- File incident ticket with details
- Plan remediation for next business day
- Communicate to stakeholders

---

## POST-DEPLOY SUCCESS CRITERIA (after 2-hour watch window)

**If no rollback triggers fire, deployment is successful:**

- ✅ All void operations latency <5s, atomic (no lag)
- ✅ All yield operations latency <10s, position updates reflect yield
- ✅ All reconciliation views show 0 errors
- ✅ All statement generation completes on schedule
- ✅ Dashboard renders correctly
- ✅ Transaction success rate >99.9%
- ✅ No new FATAL errors in logs

**Sign-off:**
```
Phase 4A-4C Deployment: SUCCESS
Completed: [TIMESTAMP]
All systems stable. Monitor reconciliation until EOD.
```

---

## MONITORING UNTIL EOD RECONCILIATION (4-6 hours post-deploy)

**Continue monitoring until daily reconciliation process completes:**

- [ ] Void cascade audit log entries correct (count matches void operations)
- [ ] Position balance audit passes (all investor positions = transaction sum)
- [ ] AUM audit passes (fund AUM = sum of investor positions)
- [ ] Yield audit passes (all yield_distributions in audit_log)
- [ ] Statement generation audit passes (all statements generated successfully)

**If reconciliation errors appear post-deploy:**
- Likely data inconsistency from void isolation change
- Do NOT rollback immediately (data already updated)
- Investigate: may be pre-existing or trigger-dependent
- Fix via admin repair functions if safe
- File incident ticket

**If all reconciliation audits pass:**
- ✅ Phase 4A-4C deployment complete and verified
- ✅ System stable and consistent
- ✅ Ready for post-deployment monitoring period (2+ weeks)

---

## Command Cheat Sheet

**Pre-Deploy:**
```bash
git log --oneline -10 | grep -E "20260505|20260512|20260519|20260526"
git status  # no uncommitted files
```

**Staging Smoke Tests:**
```bash
supabase db reset --db-url $STAGING_DB_URL
supabase migration list --db-url $STAGING_DB_URL
psql $STAGING_DB_URL -f tests/migrations/void_unvoid_concurrency_tests.sql
psql $STAGING_DB_URL -f tests/migrations/yield_hardening_tests.sql
psql $STAGING_DB_URL -f tests/migrations/reporting_hardening_tests.sql
```

**Production Deploy:**
```bash
# Apply each migration in sequence
psql $PROD_DB_URL -f supabase/migrations/20260505000000_void_transaction_isolation.sql
psql $PROD_DB_URL -f supabase/migrations/20260512000000_void_fund_level_locking.sql
psql $PROD_DB_URL -f supabase/migrations/20260519000000_yield_domain_hardening_clean_state.sql
psql $PROD_DB_URL -f supabase/migrations/20260526000000_consolidate_reporting_views.sql
```

**Monitor Logs:**
```bash
supabase logs --project-id $PROD_PROJECT_ID --follow
# Or via Supabase console: Project → Logs → Filter by "migration" or "error"
```

**Rollback:**
```bash
supabase migration rollback --steps 4
```

---

## Timeline Summary

| Phase | Duration | Start | Gate |
|---|---|---|---|
| Local Pre-Deploy | 10 min | 0 min | Git state + migration syntax + type check |
| Staging Deploy | 30 min | 10 min | 5 smoke tests passing |
| Production Deploy | 60 min | 40 min | Post-deploy validation + 2h watch window |
| **Total to Success** | **2 hours** | **Now** | **All gates pass, no rollback triggers** |

---

## Final Checklist (Before Declaring Success)

- [ ] All 4 migrations applied to production without error
- [ ] All 5 critical flows validated post-deploy
- [ ] No new alerts or errors in logs (past 30 min)
- [ ] Void operations respond in <5s
- [ ] Reconciliation shows 0 errors
- [ ] Dashboard renders correctly
- [ ] Statement generation works
- [ ] 2-hour post-deploy watch window completed
- [ ] Team notified of successful deployment
- [ ] Incident ticket closed (or escalated if issues found)

**IF ALL CHECKED:** Phase 4A-4C deployment complete. System ready for 2-week monitoring period before Phase 4D planning begins.
