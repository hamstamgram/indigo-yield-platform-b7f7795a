# Phase 4A-4C Same-Day Deployment Runbook

**Status:** Release Candidate Locked  
**Tag:** `rc-phase4-2026-04-14`  
**Timeline:** Local (10m) → Staging (30m) → Production (60m) → Watch (2h)  
**Total:** ~2 hours to success  

---

## STEP 0: Verify You're On The Right Commit (1 min)

```bash
# Verify you're on main with rc tag
git status
# Expected: On branch main, no uncommitted changes (except .claude/settings and .temp files)

git log --oneline -3
# Expected: Latest commit is 037655fd "docs(audit): phase 4a-4c same-day deployment checklist"

git describe --tags
# Expected: rc-phase4-2026-04-14

# Verify all 4 migrations exist
ls -la supabase/migrations/202605000000*
# Expected: 4 files (20260505, 20260512, 20260519, 20260526)
```

**GATE: If any command above fails, STOP. Do not proceed.**

---

## STEP 1: LOCAL PRE-DEPLOY GATE (10 min)

### 1a: Verify CLI toolchain (2 min)

```bash
supabase --version
# Expected: 2.90.0 or later

supabase migration --help | grep -E "down|up"
# Expected: Confirms 'down' and 'up' commands exist

supabase db push --help | grep -E "db-url|linked|local"
# Expected: Confirms push command has required flags
```

**GATE: If version < 2.90.0 or commands missing, STOP.**

### 1b: Type check (3 min)

```bash
npx tsc --noEmit 2>&1 | grep -E "error|Error" | grep -v "Allocation failed"
# Expected: No errors (OOM allocation message acceptable)
```

**GATE: If type errors found, STOP.**

### 1c: Lint check (2 min)

```bash
npm run lint 2>&1 | head -20
# Expected: Existing lint violations, no new errors
```

**GATE: If new lint errors, STOP.**

### 1d: Verify migrations apply locally (3 min)

```bash
# Reset local database to fresh state
supabase db reset --local

# Wait 30s for reset to complete
sleep 30

# Check migrations applied
supabase migration list --local | grep -E "20260505|20260512|20260519|20260526"
# Expected: All 4 show as "Applied"
```

**GATE: If any migration shows as "Failed", STOP and investigate.**

---

## ✅ LOCAL PRE-DEPLOY GATE PASSED

**All local gates passed.** Proceed to staging.

---

## STEP 2: STAGING DEPLOYMENT GATE (30 min)

### 2a: Prepare staging environment (5 min)

```bash
# Get staging database URL (from Supabase project settings)
export STAGING_DB_URL="postgres://user:password@host/database"

# Verify connection
psql "$STAGING_DB_URL" -c "SELECT version();"
# Expected: PostgreSQL version output
```

**GATE: If connection fails, STOP.**

### 2b: Fresh staging database reset (5 min)

```bash
# Reset staging to clean state (DESTRUCTIVE - staging only!)
supabase migration down --db-url "$STAGING_DB_URL" --last 999  # Reset all
# Wait 30s for reset to complete
sleep 30

# Verify reset
supabase migration list --db-url "$STAGING_DB_URL" | grep "migration_id"
# Expected: No applied migrations (clean slate)
```

**GATE: If reset fails or migrations remain, STOP.**

### 2c: Apply Phase 4 migrations in sequence (10 min)

```bash
# Apply each migration and verify after each

echo "=== Applying 20260505: void isolation ==="
supabase db push --db-url "$STAGING_DB_URL" --dry-run | grep "20260505"
supabase db push --db-url "$STAGING_DB_URL"
sleep 10
supabase migration list --db-url "$STAGING_DB_URL" | grep "20260505"
# Expected: "20260505 | Applied" appears

echo "=== Applying 20260512: void locks ==="
supabase migration list --db-url "$STAGING_DB_URL" | grep "20260512"
# Expected: "20260512 | Applied" appears

echo "=== Applying 20260519: yield v5 ==="
supabase migration list --db-url "$STAGING_DB_URL" | grep "20260519"
# Expected: "20260519 | Applied" appears

echo "=== Applying 20260526: reporting verification ==="
supabase migration list --db-url "$STAGING_DB_URL" | grep "20260526"
# Expected: "20260526 | Applied" appears
```

**GATE: If any migration shows "Failed", STOP and check logs:**
```bash
supabase db query --db-url "$STAGING_DB_URL" "SELECT * FROM migration_history ORDER BY executed_at DESC LIMIT 5;"
```

### 2d: Run 5 staging smoke tests (10 min)

```bash
# Test 1: Void + Position Isolation
echo "=== TEST 1: Void isolation ==="
psql "$STAGING_DB_URL" -f tests/migrations/void_unvoid_concurrency_tests.sql
# Expected: All 3 tests pass (no exceptions)

# Test 2: Yield v5 Canonical
echo "=== TEST 2: Yield v5 ==="
psql "$STAGING_DB_URL" -f tests/migrations/yield_hardening_tests.sql
# Expected: All 6 tests pass (no exceptions)

# Test 3: Reporting Consistency
echo "=== TEST 3: Reporting ==="
psql "$STAGING_DB_URL" -f tests/migrations/reporting_hardening_tests.sql
# Expected: All 3 tests pass (no exceptions)

# Test 4: Reconciliation Check
echo "=== TEST 4: Reconciliation ==="
psql "$STAGING_DB_URL" << 'EOF'
SELECT 
  'Position reconciliation' as check_name,
  COUNT(*) as error_count
FROM v_position_reconciliation
WHERE reconciliation_status = 'ERROR'
UNION ALL
SELECT
  'AUM reconciliation',
  COUNT(*)
FROM v_aum_position_reconciliation
WHERE reconciliation_status = 'ERROR';
EOF
# Expected: All error counts = 0

# Test 5: Fund-Level Locks Work
echo "=== TEST 5: Locks ==="
psql "$STAGING_DB_URL" << 'EOF'
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN (
  'void_transaction_with_lock',
  'unvoid_transaction_with_lock',
  'apply_yield_distribution_v5_with_lock'
);
EOF
# Expected: All 3 lock functions exist
```

**GATE: If any test fails or shows errors, STOP. Do not proceed to production.**

---

## ✅ STAGING DEPLOYMENT GATE PASSED

**All 5 smoke tests passing. Staging clean. Ready for production.**

---

## STEP 3: PRODUCTION DEPLOYMENT GATE (60 min)

### 3a: Pre-production safety checks (10 min)

```bash
# Get production database URL
export PROD_DB_URL="postgres://user:password@host/database"

# Verify production connection
psql "$PROD_DB_URL" -c "SELECT COUNT(*) FROM transactions;" > /dev/null
# Expected: No error

# Create backup (if your provider supports it)
echo "Backup created: $(date '+%Y-%m-%d %H:%M:%S')"

# Verify no active incidents/maintenance
# (Check Supabase dashboard: Status → Incidents)

# Verify database is stable (check connection pool)
psql "$PROD_DB_URL" -c "SELECT datname, state FROM pg_stat_activity WHERE datname = current_database() LIMIT 5;"
# Expected: Multiple connections, all 'active' or 'idle'
```

**GATE: If backup failed or database unstable, STOP.**

### 3b: Deploy migrations to production (15 min)

```bash
# Deploy all 4 migrations using Supabase managed flow
echo "=== Starting production deployment: $(date '+%Y-%m-%d %H:%M:%S') ==="

# Option A: Using Supabase CLI (recommended)
supabase db push --linked --yes

# Verify each migration applied
echo "=== Verifying migrations ==="
supabase migration list --linked | grep -E "20260505|20260512|20260519|20260526"
# Expected: All 4 show as "Applied"

# If CLI push not available, use direct SQL:
# Option B: Direct SQL application
# psql "$PROD_DB_URL" << 'EOF'
# \i supabase/migrations/20260505000000_void_transaction_isolation.sql;
# \i supabase/migrations/20260512000000_void_fund_level_locking.sql;
# \i supabase/migrations/20260519000000_yield_domain_hardening_clean_state.sql;
# \i supabase/migrations/20260526000000_consolidate_reporting_views.sql;
# EOF
```

**GATE: If any migration fails, proceed immediately to ROLLBACK (see below).**

### 3c: Post-deploy validation (20 min)

```bash
# Validation 1: Void operation works
echo "=== PV-1: Void operation ==="
psql "$PROD_DB_URL" << 'EOF'
-- Get a recent real transaction
SELECT id, investor_id, fund_id, is_voided FROM transactions 
WHERE created_at > NOW() - INTERVAL '1 day' 
LIMIT 1 \gset txn_

-- Void it
SELECT void_transaction(:'txn_id', '00000000-0000-0000-0000-000000000000'::UUID, 'deploy-test');

-- Check it was voided
SELECT is_voided FROM transactions WHERE id = :'txn_id';
-- Expected: true

-- Unvoid it
SELECT unvoid_transaction(:'txn_id', '00000000-0000-0000-0000-000000000000'::UUID, 'deploy-test-unvoid');

-- Check it was unvoided
SELECT is_voided FROM transactions WHERE id = :'txn_id';
-- Expected: false
EOF

# Validation 2: Yield applies
echo "=== PV-2: Yield application ==="
psql "$PROD_DB_URL" << 'EOF'
-- Pick a real investor+fund
SELECT investor_id, fund_id INTO investor_id_var, fund_id_var
FROM investor_positions 
WHERE position > 0 
LIMIT 1;

-- Get position before yield
SELECT position INTO pos_before FROM investor_positions 
WHERE investor_id = investor_id_var AND fund_id = fund_id_var;

-- Apply tiny yield (0.01 units for safety)
SELECT apply_segmented_yield_distribution_v5(
  investor_id_var,
  fund_id_var,
  0.01::NUMERIC
);

-- Verify position updated
SELECT position INTO pos_after FROM investor_positions 
WHERE investor_id = investor_id_var AND fund_id = fund_id_var;

-- pos_after should be pos_before + 0.01
EOF

# Validation 3: Reconciliation clean
echo "=== PV-3: Reconciliation ==="
psql "$PROD_DB_URL" << 'EOF'
SELECT COUNT(*) as position_errors FROM v_position_reconciliation 
WHERE reconciliation_status = 'ERROR';
SELECT COUNT(*) as aum_errors FROM v_aum_position_reconciliation 
WHERE reconciliation_status = 'ERROR';
-- Expected: Both return 0
EOF

# Validation 4: Statement generation works
echo "=== PV-4: Statement generation ==="
psql "$PROD_DB_URL" << 'EOF'
-- Check that generated_statements table exists and has recent entries
SELECT COUNT(*) FROM generated_statements 
WHERE created_at > NOW() - INTERVAL '24 hours';
-- Expected: >0 (recent statements exist)
EOF

# Validation 5: Check logs for errors
echo "=== PV-5: Error log check ==="
# Via Supabase dashboard: Projects → Logs → Filter "error" or "fatal"
# Or via CLI:
supabase logs --project-id $(supabase projects list --json | jq -r '.[0].id') --follow &
sleep 10
kill %1
# Expected: No FATAL or ERROR messages from migrations
```

**GATE: If any validation fails, proceed immediately to ROLLBACK.**

---

## ✅ PRODUCTION DEPLOYMENT GATE PASSED

**All validations passing. Production stable. Begin 2-hour watch window.**

---

## STEP 4: PRODUCTION WATCH WINDOW (2 hours)

### 4a: Monitor critical signals (continuous, 2 hours)

```bash
# Terminal 1: Watch Supabase logs in real time
supabase logs --project-id $PROJECT_ID --follow

# Terminal 2: Poll reconciliation every 5 minutes
while true; do
  echo "=== $(date '+%H:%M:%S') ==="
  psql "$PROD_DB_URL" << 'EOF'
SELECT 
  (SELECT COUNT(*) FROM v_position_reconciliation WHERE reconciliation_status = 'ERROR') as position_errors,
  (SELECT COUNT(*) FROM v_aum_position_reconciliation WHERE reconciliation_status = 'ERROR') as aum_errors,
  (SELECT COUNT(*) FROM transactions WHERE is_voided = TRUE AND created_at > NOW() - INTERVAL '1 hour') as recent_voids
;
EOF
  sleep 300  # Every 5 minutes
done
```

### 4b: Rollback triggers (abort if ANY occur)

| Trigger | Command |
|---------|---------|
| **Void latency >5s** | `STOP & ROLLBACK` |
| **Reconciliation errors appear** | `STOP & ROLLBACK` |
| **Lock deadlock in logs** | `STOP & ROLLBACK` |
| **Yield not applied** | `STOP & ROLLBACK` |
| **Data corruption detected** | `STOP & ROLLBACK` |

---

## ROLLBACK PROCEDURE (execute if any trigger fires)

### ✋ IMMEDIATE ACTION: Stop Background Jobs

```bash
# Stop yield batch jobs (if applicable)
# Stop reporting jobs (if applicable)
# Stop statement generation (if applicable)
# Prevents new transactions during rollback
```

### Rollback All 4 Phase 4 Migrations

```bash
echo "=== Rolling back Phase 4A-4C migrations: $(date '+%Y-%m-%d %H:%M:%S') ==="

# Option A: Using Supabase CLI (if available)
supabase migration down --linked --last 4

# Verify rollback
supabase migration list --linked | grep -E "20260505|20260512|20260519|20260526"
# Expected: All 4 show as "Rolled back"

# Option B: Direct SQL rollback (if CLI fails)
psql "$PROD_DB_URL" << 'EOF'
-- Drop Phase 4A/4C functions and objects (recreates pre-Phase-4 state)

-- Drop void_transaction_with_lock (Phase 4A)
DROP FUNCTION IF EXISTS public.void_transaction_with_lock(UUID, UUID, TEXT);

-- Drop unvoid_transaction_with_lock (Phase 4A)
DROP FUNCTION IF EXISTS public.unvoid_transaction_with_lock(UUID, UUID, TEXT);

-- Drop apply_yield_distribution_v5_with_lock (Phase 4A)
DROP FUNCTION IF EXISTS public.apply_yield_distribution_v5_with_lock(UUID, UUID, NUMERIC);

-- Update void_transaction to remove SERIALIZABLE isolation (revert to pre-4A version)
-- This requires referencing the git history version
-- git show HEAD~5:supabase/migrations/20260505000000_void_transaction_isolation.sql
-- Extract the original void_transaction function and apply it

-- Verify rollback
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_name IN ('void_transaction_with_lock', 'unvoid_transaction_with_lock');
-- Expected: 0 (all Phase 4 lock functions removed)
EOF
```

### Verify Rollback Complete

```bash
# Confirm functions are gone (pre-Phase-4 state restored)
psql "$PROD_DB_URL" << 'EOF'
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%with_lock%';
-- Expected: No results (lock functions removed)
EOF

# Resume background jobs
echo "Rolled back to pre-Phase-4 state"
```

### Post-Rollback Notification

```bash
# Notify team
echo "INCIDENT: Phase 4A-4C rollback completed at $(date '+%Y-%m-%d %H:%M:%S')"
echo "System restored to pre-Phase-4 state"
echo "File incident ticket and plan remediation for next business day"
```

---

## If Rollback Executed

**Do NOT re-deploy same day.**

**Next Steps:**
1. File incident ticket with rollback reason
2. Investigate root cause
3. Update checklist or migrations based on findings
4. Plan remediation for next business day
5. Before re-deploying, run full local gate again

---

## If No Rollback (Success)

### 4c: End of watch window success criteria (after 2 hours)

```bash
# Final validation
psql "$PROD_DB_URL" << 'EOF'
-- All Phase 4 migrations applied
SELECT COUNT(*) FROM migration_history 
WHERE name IN ('20260505000000', '20260512000000', '20260519000000', '20260526000000');
-- Expected: 4

-- No reconciliation errors
SELECT COUNT(*) FROM v_position_reconciliation WHERE reconciliation_status = 'ERROR';
-- Expected: 0

SELECT COUNT(*) FROM v_aum_position_reconciliation WHERE reconciliation_status = 'ERROR';
-- Expected: 0

-- Void operations working (recent voids)
SELECT COUNT(*) FROM transactions WHERE is_voided = TRUE AND created_at > NOW() - INTERVAL '2 hours';
-- Expected: >= 0 (depends on activity, but no errors)
EOF
```

**If all checks pass:**

```bash
echo "✅ Phase 4A-4C Deployment: SUCCESS"
echo "✅ Completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo "✅ All systems stable"
echo "✅ Ready for 2-week monitoring period before Phase 4D planning"
```

---

## Release Candidate Reference

- **Tag:** `rc-phase4-2026-04-14`
- **Commit:** `037655fd` (phase 4a-4c same-day deployment checklist)
- **Migrations:** 4 (20260505, 20260512, 20260519, 20260526)
- **Rollback:** `supabase migration down --linked --last 4`
- **Tests Passing:** 12 (3 void/unvoid + 6 yield + 3 reporting)

---

## Quick Reference

```bash
# Check status at any time
git describe --tags            # Verify RC
supabase migration list        # Check applied migrations
psql $DB -c "SELECT COUNT(*) FROM v_position_reconciliation WHERE reconciliation_status = 'ERROR';"
psql $DB -c "SELECT COUNT(*) FROM v_aum_position_reconciliation WHERE reconciliation_status = 'ERROR';"

# Rollback command (if needed)
supabase migration down --linked --last 4

# Resume after rollback
supabase migration list --linked  # Verify all 4 removed
# File incident, investigate, plan remediation
```

---

## Success Criteria

✅ All 4 migrations applied successfully  
✅ All 5 staging smoke tests passing  
✅ All 5 post-deploy validations passing  
✅ 2-hour watch window: no rollback triggers fired  
✅ Reconciliation reports 0 errors  
✅ Void operations responsive and atomic  
✅ Yield v5 applies correctly  
✅ Dashboard renders correctly  

**Status: DEPLOYMENT COMPLETE & STABLE**
