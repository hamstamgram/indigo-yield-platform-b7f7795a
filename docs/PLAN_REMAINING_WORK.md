# Indigo Yield — Remaining Work Plan
**Date**: 2026-04-08  
**Project**: `/Users/mama/ai-lab/repo/indigo-yield`  
**Supabase**: `nkfimvovosdehmyyjubn`

---

## COMPLETED TODAY

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Bug #1: shares hardcoded 0 | `supabase/migrations/20260408120000_fix_shares_and_void_and_backfill.sql` | ✅ Applied |
| 2 | Bug #2: void handler asymmetric | same | ✅ Applied |
| 3 | Bug #3: cost_basis clobbered on void | same | ✅ Applied |
| 4 | v_cost_basis_mismatch: 8 → 0 rows | `supabase/migrations/20260408130000_fix_dust_sweep_view_and_fees_reconciliation.sql` | ✅ Applied |
| 5 | audit_leakage_report() function | `supabase/migrations/20260408140000_audit_leakage_function.sql` | ⏳ Pending apply |
| 6 | TypeScript 0 errors | n/a | ✅ Done |

---

## REMAINING TASKS

---

### TASK 1 — Apply Migration #3 to Prod
**Priority**: CRITICAL — must be done before any other DB verification  
**Effort**: 2 min  
**File**: `supabase/migrations/20260408140000_audit_leakage_function.sql`

**How**: Via Supabase MCP tool (project_id: `nkfimvovosdehmyyjubn`)

**Verify**:
```sql
-- Should return a JSON report with overall_status = "pass"
SELECT jsonb_pretty(audit_leakage_report());
```

**Expected output**:
```json
{
  "overall_status": "pass",
  "summary": { "total_issues": 0 },
  "check_1_asymmetric_void": { "status": "pass", "count": 0 },
  "check_2_negative_cost_basis": { "status": "pass", "count": 0 },
  "check_3_fee_leakage": { "status": "pass", "count": 0 },
  "check_4_ib_commission_leakage": { "status": "pass", "count": 0 }
}
```

**Reference**: `docs/AUDIT_LEAKAGE_GUIDE.md`

---

### TASK 2 — Fix E2E Test Setup Failure
**Priority**: HIGH — tests cannot run until this is fixed  
**Effort**: 30–60 min  
**File**: `tests/e2e/yield-replay-xrp.spec.ts`, `tests/e2e/yield-replay-btc.spec.ts`, `tests/e2e/golive-lifecycle.spec.ts`

**Current failure**:
```
DB cleanup: fund purge failed: {"error":"Admin access required","success":false}
TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
Call log: waiting for locator('text=Command Center') to be visible
```

**3 root causes to investigate**:

1. **`purge_fund_data_for_testing()` RPC** — failing with "Admin access required"
   - QA credentials `qa.admin@indigo.fund / QaTest2026!` exist in `.env`
   - But the RPC is rejecting the call — check if `qa.admin` has admin role
   - Check: `SELECT is_admin() FROM auth.users WHERE email = 'qa.admin@indigo.fund';`
   - Fix: Grant admin role to qa.admin user in Supabase dashboard or via RPC

2. **`text=Command Center` not found** — admin UI may have changed the selector
   - Check: What text appears on the admin page at `/admin`?
   - File to update: `tests/e2e/golive-lifecycle.spec.ts` line 90
   - Fix: Update selector to match current UI heading

3. **App must be running** — tests expect the app to be accessible
   - Check: Is `npm run dev` or `npm run preview` running before tests?
   - Check: `playwright.config.ts` — does it start the server automatically?
   - File: `playwright.config.ts`

**Commands to investigate**:
```bash
cd ~/ai-lab/repo/indigo-yield

# Check playwright config for webServer setup
cat playwright.config.ts

# Check how login is done in the test
head -100 tests/e2e/yield-replay-xrp.spec.ts

# Try running just one test with --headed for visual debugging
npm run test:e2e -- --headed --project=chromium tests/e2e/yield-replay-xrp.spec.ts --grep "Login"
```

---

### TASK 3 — Per-Fund Reconciliation (vs Excel)
**Priority**: HIGH — required to confirm Excel parity  
**Effort**: 30 min per fund × 7 funds = ~3 hours  
**Reference**: `docs/HANDOFF_2026-04-08.md` → "TASK 5: Per-Fund Reconciliation"

**Funds to reconcile (in priority order)**:
1. IND-XRP `2c123c4f-76b4-4504-867e-059649855417` — was previously verified, confirm still clean
2. IND-BTC `0a048d9b-c4cf-46eb-b428-59e10307df93` — BTC E2E test ran 55 epochs, verify output
3. IND-SOL `7574bc81-aab3-4175-9e7f-803aa6f9eb8f` — 3 investors cleaned up + fees account fixed
4. IND-ETH `717614a2-9e24-4abc-a89d-02209a3a772a`
5. IND-USDT `8ef9dc49-e76c-4882-84ab-a449ef4326db`
6. IND-EURC `58f8bcad-56b0-4369-a6c6-34c5d4aaa961`
7. IND-xAUT `eabc3bc7-4b23-42b5-b831-e1f9e79038ab`

**For each fund, run these 3 queries**:
```sql
-- A: Fund-level AUM
SELECT f.code,
  COUNT(DISTINCT ip.investor_id) as investors,
  SUM(ip.current_value) as total_aum,
  SUM(ip.cost_basis) as total_cost_basis
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
WHERE f.id = '<fund_id>' AND ip.is_active = true
GROUP BY f.code;

-- B: Per-investor positions
SELECT p.email, p.first_name || ' ' || p.last_name as name,
  ip.current_value, ip.cost_basis, ip.shares, ip.is_active
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.fund_id = '<fund_id>'
ORDER BY ip.is_active DESC, p.email;

-- C: Integrity check
SELECT COUNT(*) FROM v_cost_basis_mismatch WHERE fund_id = '<fund_id>';
-- Expected: 0
```

**Pass criteria**: 
- `v_cost_basis_mismatch` count = 0 for this fund
- Total AUM matches Excel "Total Fund Balance" column
- Per-investor balances match Excel "Investments" sheet rows

**If mismatch found**: Run `audit_leakage_report()`, identify which check fails, follow remediation in `docs/AUDIT_LEAKAGE_GUIDE.md`

---

### TASK 4 — UI Audit (Admin Pages)
**Priority**: HIGH — must work before launch  
**Effort**: 2–3 hours  
**Reference**: `docs/HANDOFF_2026-04-08.md` → "TASK 4: Page-by-page UI audit fixes"

**Pages to audit (in priority order)**:

| Page | URL | Key Check |
|------|-----|-----------|
| Yield Distribution | `/admin/yield` | Triggers `apply_adb_yield_distribution_v3()`, shows fund AUM, investor list |
| Distribution History | `/admin/yield-distributions` | Shows past distributions, void button works |
| Investor Detail | `/admin/investors/:id` | Shows positions, transaction history, correct balances |
| Investor Portal | `/investor` | Logged in as investor — shows correct balance and yield history |

**What to check on each page**:
1. Page loads without console errors
2. Data matches DB state (not hardcoded)
3. Buttons trigger real RPCs (not no-ops)
4. After yield distribution: positions update in real-time
5. After void: positions roll back correctly

**How to audit**:
```bash
# Start app
cd ~/ai-lab/repo/indigo-yield
npm run dev

# Open browser → DevTools → Network tab
# Navigate to each page
# Look for: 4xx/5xx errors, failed API calls, empty responses

# For code audit:
grep -r "supabase\." src/pages/ src/components/ \
  --include="*.tsx" --include="*.ts" | \
  grep -v "service\|useSupabase\|supabaseClient" | head -20
# Flag any direct Supabase calls bypassing the service layer
```

**Common issues to catch**:
- Hardcoded `current_value` or `aum` instead of DB queries
- `onClick` handlers that `console.log` instead of calling RPCs
- Missing error handling on form submissions
- Stale data not refreshing after mutations

---

### TASK 5 — Schema Cleanup (Dead Tables/Columns)
**Priority**: MEDIUM — can defer post-launch  
**Effort**: 1–2 hours  
**Reference**: `docs/HANDOFF_2026-04-08.md` → "TASK 5: Schema cleanup"

**Approach**:
```bash
# Step 1: Get all table/column names from schema
cd ~/ai-lab/repo/indigo-yield
grep -h "^CREATE TABLE" supabase/migrations/20260307000000_definitive_baseline.sql | \
  awk '{print $3}' | tr -d '"' | sort

# Step 2: For each table, grep src/ for references
grep -r "table_name" src/ --include="*.ts" --include="*.tsx" | wc -l
# If 0 → likely unused

# Step 3: Create migration to DROP confirmed-unused
# File naming: supabase/migrations/20260408150000_drop_dead_schema.sql
```

**NEVER drop without**:
1. Confirming 0 references in `src/`
2. Checking migrations for views/functions that reference the column
3. Running `npm run test:e2e` after each drop

---

### TASK 6 — Set Up Monthly Monitoring Cron
**Priority**: MEDIUM — required before go-live for ongoing health  
**Effort**: 20 min  
**Reference**: `docs/AUDIT_LEAKAGE_GUIDE.md` → "Monthly Monitoring"

**Option A: OpenClaw cron job**
```json
{
  "name": "Monthly Audit: Leakage Detection",
  "schedule": "0 1 1 * *",
  "action": "Execute SQL on nkfimvovosdehmyyjubn",
  "sql": "SELECT jsonb_pretty(audit_leakage_report());",
  "on_failure": "Alert #security channel"
}
```

**Option B: n8n workflow**
- Trigger: Cron `0 1 1 * *`
- Action: HTTP POST `https://nkfimvovosdehmyyjubn.supabase.co/rest/v1/rpc/audit_leakage_report`
- Headers: `Authorization: Bearer <service_role_jwt>`, `apikey: <anon_key>`
- Condition: If `overall_status != "pass"` → send Slack alert with full JSON report

**Post-yield-distribution cron** (more frequent):
```json
{
  "name": "Post-Distribution Audit",
  "trigger": "30 minutes after any yield distribution RPC call",
  "sql": "SELECT * FROM v_audit_summary;",
  "alert_if": "total_issues > 0"
}
```

---

### TASK 7 — Final Pre-Launch Verification
**Priority**: CRITICAL — must pass before going live  
**Effort**: 1 hour  
**Dependency**: All tasks 1–5 must be complete first

**Complete checklist**:
```bash
# 1. DB Integrity
SELECT COUNT(*) FROM v_cost_basis_mismatch;                    -- Expected: 0
SELECT jsonb_pretty(audit_leakage_report());                   -- Expected: "pass"
SELECT COUNT(*) FROM v_ledger_reconciliation WHERE ABS(variance) > 0.01; -- Expected: 0
SELECT COUNT(*) FROM v_orphaned_positions;                      -- Expected: 0
SELECT COUNT(*) FROM v_yield_conservation_violations;           -- Expected: 0

# 2. Code Quality  
cd ~/ai-lab/repo/indigo-yield
npx tsc --noEmit                                               # Expected: 0 errors
npm run lint                                                   # Expected: 0 errors

# 3. E2E Tests (after TASK 2 fix)
npm run test:e2e                                               # Expected: 75/75 pass

# 4. Per-Fund Reconciliation (after TASK 3)
# For each of 7 funds: AUM matches Excel, 0 mismatches

# 5. UI Smoke Test (after TASK 4)
# Login as qa.admin → /admin/yield → distribute 1 SOL yield
# Verify investor balance updates
# Verify audit_leakage_report() still passes after distribution

# 6. Monitoring Ready (after TASK 6)
# Cron job scheduled and tested with manual trigger
```

---

## SUMMARY TABLE

| # | Task | Priority | Effort | Dependency | Status |
|---|------|----------|--------|------------|--------|
| 1 | Apply Migration #3 | CRITICAL | 2 min | Supabase MCP | ⏳ |
| 2 | Fix E2E test setup | HIGH | 30–60 min | None | ❌ |
| 3 | Per-fund reconciliation | HIGH | 3 hrs | Migration #3 | ❌ |
| 4 | UI audit (admin pages) | HIGH | 2–3 hrs | None | ❌ |
| 5 | Schema cleanup | MEDIUM | 1–2 hrs | None (optional) | ❌ |
| 6 | Monthly monitoring cron | MEDIUM | 20 min | Migration #3 | ❌ |
| 7 | Final pre-launch verification | CRITICAL | 1 hr | All above | ❌ |

**Estimated total**: ~8 hours of work to full launch-ready

---

## KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `supabase/migrations/20260408120000_fix_shares_and_void_and_backfill.sql` | Bug fixes #1-3 (applied) |
| `supabase/migrations/20260408130000_fix_dust_sweep_view_and_fees_reconciliation.sql` | View fix + Indigo Fees reconciliation (applied) |
| `supabase/migrations/20260408140000_audit_leakage_function.sql` | audit_leakage_report() function (PENDING apply) |
| `docs/HANDOFF_2026-04-08.md` | Full session context + task details |
| `docs/AUDIT_LEAKAGE_GUIDE.md` | Audit function usage, failure remediation |
| `docs/LEAKAGE_PREVENTION_SUMMARY.md` | Architecture overview, 3-layer defense |
| `tests/e2e/yield-replay-xrp.spec.ts` | XRP fund E2E replay test |
| `tests/e2e/yield-replay-btc.spec.ts` | BTC fund E2E replay test (55 epochs) |
| `tests/e2e/golive-lifecycle.spec.ts` | Go-live lifecycle test |
| `playwright.config.ts` | E2E test config (check webServer setup) |

---

## LOCAL LLM HANDOFF PROMPT

```
You are continuing work on the Indigo Yield platform.
Project: /Users/mama/ai-lab/repo/indigo-yield
Supabase project ID: nkfimvovosdehmyyjubn
QA credentials: qa.admin@indigo.fund / QaTest2026!

COMPLETED:
- 3 database bugs fixed + all migrations applied to prod
- v_cost_basis_mismatch = 0 rows (all 8 resolved)
- audit_leakage_report() written but PENDING apply (Migration #3)
- TypeScript: 0 errors

YOUR TASKS (in order):

1. APPLY MIGRATION #3 via Supabase MCP:
   File: supabase/migrations/20260408140000_audit_leakage_function.sql
   Verify: SELECT jsonb_pretty(audit_leakage_report()); → "pass"

2. FIX E2E TEST FAILURE:
   Error: purge_fund_data_for_testing() returns "Admin access required"
   Error: page.waitForSelector 'text=Command Center' timeout
   File: tests/e2e/golive-lifecycle.spec.ts
   Fix admin role for qa.admin user + update selector if UI changed

3. PER-FUND RECONCILIATION:
   For each fund (XRP, BTC, SOL, ETH, USDT, EURC, xAUT):
   Run: SELECT COUNT(*) FROM v_cost_basis_mismatch WHERE fund_id = '<id>';
   Expected: 0. Compare AUM to Excel source.

4. UI AUDIT:
   Pages: /admin/yield, /admin/yield-distributions, /admin/investors/:id, /investor
   Check: data is live from DB, buttons call real RPCs, no console errors

5. PRE-LAUNCH VERIFICATION:
   Run all checks in docs/PLAN_REMAINING_WORK.md → TASK 7

Full plan: docs/PLAN_REMAINING_WORK.md
Full context: docs/HANDOFF_2026-04-08.md
Audit guide: docs/AUDIT_LEAKAGE_GUIDE.md
```
