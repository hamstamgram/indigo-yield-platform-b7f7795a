

# Full System Audit & Verification Report

## STATUS: System Core is CLEAN -- 3 Live Data Issues + 3 Minor Code Issues Remain

All 45+ fixes from prior rounds are verified intact. No regressions. The ledger-to-position reconciliation is zero-drift across all funds. Cost basis integrity is clean. No orphaned allocations. No negative positions. No zero-balance active positions. No direct table mutations from frontend. No `profiles.is_admin` references. Security hardening (REVOKE on anon, is_admin() guards) all confirmed.

---

## CRITICAL (P0): 2 Live AUM Data Issues

### 1. IND-BTC AUM Snapshot is Stale (10.38 vs actual 20.00)

The Feb 27 yield distribution (applied today at 17:07 UTC) correctly updated AUM for Feb 27 (20.0) and Feb 28 (20.0), but the AUM snapshots for March 12-27 were written BEFORE the yield was applied and still show the pre-yield value of 10.38. The `recalculate_fund_aum_for_date` only recalculates for the distribution's effective_date, not for all subsequent dates.

**Impact**: Admin dashboard, yield preview, and fund cards show BTC AUM as 10.38 instead of 20.0. Next yield distribution will use wrong Opening AUM.

**Fix**: Run `recalculate_fund_aum_for_date` for IND-BTC for today's date (2026-03-27). This is a one-time data heal. Long-term, the yield apply flow should refresh AUM for CURRENT_DATE after applying historical yields.

### 2. IND-ETH Has No AUM Snapshots Beyond July 2025

Latest ETH AUM snapshot is from 2025-07-31. The fund has 6 active positions summing to 308.45 but no recent AUM record. This means ETH won't appear correctly in AUM-dependent views.

**Fix**: Run `recalculate_fund_aum_for_date` for IND-ETH for today's date.

---

## HIGH (P1): 28 Historical Conservation Violations

28 yield distributions have `gross_yield_amount` (header) that doesn't match `SUM(allocation gross) - these are historical distributions from before the V5 precision tightening. The allocation-level gross amounts were rounded to whole numbers (e.g., 6.0, 27.0, 355.0) while the header stored the precise value (e.g., 5.997576811200).

**Impact**: The integrity monitor's conservation check may flag these as violations. However, the ledger itself is correct (positions match transaction sums with zero drift). These are display/audit artifacts, not financial errors.

**Fix**: Two options:
- Option A (recommended): Update the conservation check view to use a wider threshold for distributions created before a cutoff date (e.g., 2026-03-01)
- Option B: Backfill `gross_yield_amount` on the 28 distribution headers to match the actual allocation sums

---

## MEDIUM (P2): 3 Code Quality Issues

### 3. `feeSettingsService.ts` Uses Bare `Number()` on Financial Value (line 26)

`Number(val)` on `global_fee_settings.value` (a platform fee percentage like 0.20). Low risk since it's a small config value, but inconsistent with standards.

**Fix**: Replace with `parseFinancial(val).toNumber()`.

### 4. `yieldHistoryService.ts` Has `console.warn` in Production (line 176)

A `console.warn()` call remains in production code when a fund ID is missing during yield history fetch.

**Fix**: Replace with `logWarn("yieldHistoryService.mapFunds", { fund: code || name })`.

### 5. `yieldApplyService.ts` Does NOT Refresh AUM for Current Date After Historical Yield

When a yield distribution is applied for a past date (e.g., Feb 27), the RPC refreshes AUM for that date but the frontend service doesn't trigger an AUM refresh for today's date. This is the root cause of P0 issue #1.

**Fix**: After `applyYieldDistribution` succeeds, call `recalculate_fund_aum_for_date(fundId, CURRENT_DATE)` via RPC to ensure the latest snapshot reflects the new position balances.

---

## VERIFIED CLEAN (No Action Needed)

| Area | Status |
|------|--------|
| Ledger-to-position reconciliation | 0 mismatches |
| Cost basis integrity | 0 mismatches |
| Orphaned allocations (yield/fee/ib) | 0 |
| Negative positions | 0 |
| Zero-balance active positions | 0 |
| Direct table mutations from frontend | None |
| `profiles.is_admin` usage | Removed |
| `parseFloat()` in services | Removed (all parseFinancial) |
| `console.log/error` in features | Removed |
| Decimal precision (40) | Correct everywhere |
| Void cascade (yield/fee/ib allocations) | Fixed |
| Full-exit position deactivation | Fixed |
| Dead code (`approveWithdrawal`) | Removed |
| Security REVOKE on anon | Applied to 20 RPCs |
| Advisory locks | All critical RPCs covered |
| csv-export precision | Fixed (parseFinancial) |
| Edge function precision | Fixed (40) |

---

## Implementation Plan

### Phase 1: Data Heal (SQL - run via Supabase SQL Editor)
1. Recalculate BTC AUM for today: `SELECT recalculate_fund_aum_for_date((SELECT id FROM funds WHERE code = 'IND-BTC'), CURRENT_DATE)`
2. Recalculate ETH AUM for today: `SELECT recalculate_fund_aum_for_date((SELECT id FROM funds WHERE code = 'IND-ETH'), CURRENT_DATE)`

### Phase 2: Prevent Future Stale AUM (1 TS file)
Add a post-yield AUM refresh call in `yieldApplyService.ts` that calls `recalculate_fund_aum_for_date(fundId, CURRENT_DATE)` after every successful yield application.

### Phase 3: Code Cleanup (2 TS files)
1. `feeSettingsService.ts`: `Number(val)` to `parseFinancial(val).toNumber()`
2. `yieldHistoryService.ts`: `console.warn` to `logWarn`

### Phase 4: Conservation Check Tolerance (1 SQL migration)
Update the conservation check view or integrity monitor to use a wider tolerance for pre-V5 distributions, preventing false-positive alerts on the 28 historical records.

**Total: 1 SQL migration + 3 TypeScript files + 2 manual SQL commands**

