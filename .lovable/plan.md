

# Phases 5-8: Operational Audit Results

## PHASE 5: Financial Edge Cases & Yield Engine Tests -- PASS

### Test Suite Inventory (14 scenarios)
The `tests/integration/yield-engine/` directory contains 14 test files covering all critical yield scenarios:

| # | Test File | Scenario |
|---|-----------|----------|
| 01 | adb-mid-deposit | Mid-period deposit ADB weighting |
| 02 | adb-mid-withdrawal | Mid-period withdrawal ADB weighting |
| 03 | crystallization-timing | Yield crystallization before flows |
| 04 | multi-investor-split | Multi-investor proportional split |
| 05 | ib-commission-waterfall | IB commission from fee waterfall |
| 06 | zero-balance-exclusion | Zero-balance investors excluded |
| 07 | dust-to-fees | Dust routes to fees_account |
| 08 | void-distribution | Void + cascade reversal |
| 09 | numeric-precision | NUMERIC(28,10) precision preservation |
| 10 | fee-hierarchy | Fee schedule precedence |
| 11 | concurrent-yield | Concurrent yield distribution locks |
| 12 | concurrent-deposit-yield | Concurrent deposit + yield race |
| 13 | concurrent-withdrawals | Concurrent withdrawal race |
| 14 | fees-account-earns-yield | Fees account yield exclusion |

All tests verify the conservation identity: `gross = net + fee + ib + dust`.

### Ghost Dust Positions
**CLEAN.** Query returned `count: 0, sum: null`. No active positions with values below 0.0000001 threshold.

### Finding 5.1 (P3 -- Test Precision): Test file 09-numeric-precision uses `numeric(28,10)` in comments but the live DB uses `numeric(38,18)`. Tests still pass but the test descriptions are stale. Documentation-only issue.

---

## PHASE 6: Row Level Security & API Hardening -- PASS (1 finding)

### RLS Policy Audit

**transactions_v2:**
- Admin: `ALL` with `is_admin()` -- PASS
- Investor: `SELECT` only, filtered by `investor_id = auth.uid() AND visibility_scope = 'investor_visible'` -- PASS (investors cannot see admin-only transactions like DUST, IB_CREDIT)

**investor_positions:**
- Admin: `ALL` with `is_admin()` -- PASS
- Investor: `SELECT` own via `investor_id = auth.uid()` -- PASS
- IB: `SELECT` referral positions via `ib_parent_id` subquery -- PASS

**yield_distributions:**
- Admin: `ALL` with `is_admin()` -- PASS
- Additional INSERT/UPDATE/SELECT policies using `check_is_admin(auth.uid())` -- redundant but safe
- **No investor SELECT policy** -- PASS (investors should NOT see distribution internals)

### RPC Admin Guards
All critical SECURITY DEFINER RPCs verified to use `is_admin()` check:
- `approve_and_complete_withdrawal`: `IF NOT public.is_admin() THEN RAISE`
- `void_transaction`: uses `check_is_admin(p_admin_id)` (param-based, correct for RPC)
- `apply_segmented_yield_distribution_v5`: `check_is_admin(p_admin_id)`
- `apply_investor_transaction`: `check_is_admin(p_admin_id)`

### Finding 6.1 (P2 -- Redundant RLS on yield_distributions)
`yield_distributions` has 4 overlapping policies (one `ALL` + separate INSERT/UPDATE/SELECT). The `ALL` policy already covers everything. The extras are harmless but add unnecessary RLS evaluation overhead. Low priority cleanup.

---

## PHASE 7: Automated Jobs & Edge Functions -- PASS (1 finding)

### Edge Functions (31 deployed)
All critical functions present:
- `generate-monthly-statements` -- PRESENT
- `send-investor-report` -- PRESENT
- `integrity-monitor` -- PRESENT
- `mailersend-webhook` -- PRESENT
- `monthly-report-scheduler` -- PRESENT
- `process-withdrawal` -- PRESENT
- `notify-yield-applied` -- PRESENT
- `send-notification-email` -- PRESENT
- `session-cleanup` -- PRESENT

### pg_cron Jobs (3 active)

| Job | Schedule | Purpose | Status |
|-----|----------|---------|--------|
| 1 | `0 2 * * *` | `integrity-monitor` (daily 2AM) | ACTIVE |
| 4 | `5 0 * * *` | `create_daily_position_snapshot` (daily 12:05AM) | ACTIVE |
| 5 | `0 23 28-31 * *` | `monthly-report-scheduler` (month-end 11PM) | ACTIVE |

### Finding 7.1 (P1 -- Stale Anon Key in Cron Job 1)
The `integrity-monitor` cron job (jobid 1) uses an **old anon key** (`eyJ...WE1OTB...`) that differs from the current project anon key (`eyJ...Q1OTh...`). The key expiry dates differ (2051 vs 2062). If the old key has been rotated/invalidated, the nightly integrity monitor will fail silently.

**Recommendation:** Update cron job 1 to use the current anon key. This requires a `cron.unschedule(1)` + re-schedule with the new key.

---

## PHASE 8: Frontend Precision & Dangerous Math -- 3 findings

### Centralized Safety (Good)
- `src/utils/numeric.ts`: Uses `parseFloat` internally but returns `number` -- acceptable for display-only formatting utilities
- `src/utils/formatters/index.ts`: Uses `parseFinancial().toNumber()` (Decimal.js) -- SAFE for display
- `src/components/common/NumericInput.tsx`: Uses `parseFloat` for input validation only, not arithmetic -- SAFE

### Finding 8.1 (P1 -- Critical: `performanceService.ts` lines 504-533)
`Number()` is used directly on 24 financial fields (mtd/qtd/ytd/itd beginning_balance, additions, redemptions, net_income, ending_balance, rate_of_return). These are investor-facing statement values from `investor_fund_performance`.

**Risk:** For whale investors with balances exceeding 15 significant digits (e.g., `1234567890.123456789`), `Number()` silently truncates precision. This affects investor statements and portfolio displays.

**Fix:** Replace all `Number(r.xxx || 0)` with `parseFinancial(r.xxx || '0').toNumber()` (using Decimal.js for parsing, then `.toNumber()` for the UI display type). Alternatively, if the display type interface can accept `string`, pass as strings.

### Finding 8.2 (P2 -- `useAvailableBalance.ts` lines 59-63)
Uses raw `parseFloat()` for withdrawal balance calculations. If an investor's position is a very precise number, this could cause the available balance to be off by fractions of a satoshi, potentially allowing a withdrawal slightly larger than the actual balance.

**Fix:** Replace with `parseFinancial()` from the Decimal.js wrapper.

### Finding 8.3 (P2 -- `useAssetData.ts` lines 61-62)
Uses `Number(position.current_value || 0)` for investor portfolio display. Same precision risk as 8.1.

**Fix:** Replace with `parseFinancial()`.

### Finding 8.4 (P2 -- `kpiCalculations.ts` lines 127-138)
Uses `Number()` on 12 performance fields for KPI display cards.

**Fix:** Replace with `parseFinancial()`.

---

## Summary of All Findings (Phases 5-8)

| # | Phase | Finding | Severity | Action |
|---|-------|---------|----------|--------|
| 5.1 | Yield Tests | Test comments reference numeric(28,10) not (38,18) | P3 | Update test docs |
| 6.1 | RLS | Redundant yield_distributions policies | P3 | Cleanup |
| 7.1 | Cron | Stale anon key in integrity-monitor cron job | **P1** | Re-schedule cron job |
| 8.1 | Precision | `performanceService.ts` uses `Number()` on 24 financial fields | **P1** | Replace with Decimal.js |
| 8.2 | Precision | `useAvailableBalance.ts` uses `parseFloat()` for balance math | **P2** | Replace with parseFinancial |
| 8.3 | Precision | `useAssetData.ts` uses `Number()` on balance/cost_basis | P2 | Replace with parseFinancial |
| 8.4 | Precision | `kpiCalculations.ts` uses `Number()` on 12 fields | P2 | Replace with parseFinancial |

## Implementation Plan

**Migration 1 (P1 -- Cron Key Fix):** SQL `INSERT` (not migration) to unschedule job 1 and re-register with current anon key.

**Code Fix 1 (P1 -- `performanceService.ts`):** Replace all `Number(r.xxx || 0)` with `parseFinancial(r.xxx || '0').toNumber()` in the performance mapping block (lines 504-534).

**Code Fix 2 (P2 -- `useAvailableBalance.ts`):** Replace `parseFloat(String(...))` with `parseFinancial(...)` on lines 59-62.

**Code Fix 3 (P2 -- `useAssetData.ts`):** Replace `Number(position.xxx || 0)` with `parseFinancial(position.xxx || '0').toNumber()` on lines 61-62.

**Code Fix 4 (P2 -- `kpiCalculations.ts`):** Replace `Number(perf.xxx || 0)` with `parseFinancial(perf.xxx || '0').toNumber()` on lines 127-138.

Ready to implement all fixes upon approval.

