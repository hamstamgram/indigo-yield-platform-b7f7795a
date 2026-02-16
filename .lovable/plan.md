
# CFO/CTO Audit Report: Yield Distribution Engine

## Executive Summary

The audit uncovered **3 remaining issues** (1 critical, 1 medium, 1 low) alongside **4 already-fixed items** from prior sessions. The critical issue is that the `preview_segmented_yield_distribution_v5` RPC migration **failed to remove** the fees_account exclusion filter in the final output loop, meaning INDIGO FEES still won't appear in the preview/confirmation table despite being calculated internally.

---

## Phase 1: CFO Audit Findings

### 1. Fee-to-Capital Pipeline

**Status: PARTIALLY FIXED -- 1 critical gap remains**

What works:
- `get_active_funds_summary` RPC: FIXED. Now uses `SUM(ip.current_value)` for AUM (all account types).
- `get_fund_composition` RPC: FIXED. Removed `account_type = 'investor'` filter. All accounts with balance > 0 appear.
- `getCurrentFundAUM` frontend: FIXED. Now includes `fees_account` in the filter.
- V5 preview engine **internal calculation**: CORRECT. The per-segment loop includes `fees_account` in yield allocation at 0% fee (line: `IF v_inv.account_type = 'fees_account' THEN v_fee_pct := 0`). IB accounts also participate.

**CRITICAL BUG (still present):** The V5 preview RPC output loop at approx. line 295 still contains:

```sql
WHERE t.total_gross > 0
  AND t.investor_id != v_fees_account_id  -- THIS LINE MUST GO
```

This means INDIGO FEES is calculated correctly internally (earns yield, compounds) but is **excluded from the JSON allocations output**. The frontend preview/confirmation table will never show INDIGO FEES as a row. The previous migration did NOT fix this.

**Fix required:** Remove `AND t.investor_id != v_fees_account_id` from the final output loop of `preview_segmented_yield_distribution_v5`.

### 2. Conservation of Value Equation

**Status: PASS (with caveat)**

- Opening AUM is now correctly computed as `SUM(ALL balances)` = 229,358 XRP (verified via live query).
- The conservation check in the V5 return: `v_total_gross = v_total_net + v_total_fees + v_total_ib` is present.
- **Caveat:** The running totals (`v_total_gross`, `v_total_fees`, etc.) **exclude** fees_account's own yield from the header totals (by design -- its yield is "internal compounding"). This is architecturally correct since the gross/fees/net displayed to the admin only reflect real investor economics. The fees_account yield is a separate compounding event.

### 3. Precision and Rounding

**Status: PASS**

- All backend SQL uses `ROUND(... ::numeric, 8)` for 8-decimal precision on every allocation step.
- Frontend uses `Decimal.js` via `parseFinancial()` utility throughout all financial calculations.
- No `Number()` or `parseFloat()` used for financial math in service layers.
- **Minor UI issue:** `handleNewAUMChange` in `YieldInputForm.tsx` line 127 sets yield display to empty string for negative yield instead of showing the negative number. This is cosmetic, not a calculation error.

### 4. Zero and Negative Yield Scenarios

**Status: PARTIALLY FIXED**

- **Zero yield frontend block:** FIXED (previous session). The validation preventing `newAUM == currentAUM` has been removed from `useYieldCalculation.ts`.
- **Negative yield (backend):** The V5 engine has `IF v_seg_yield > 0` guards in both preview and apply RPCs. **Segments with negative yield are skipped entirely** (marked `skipped: true` in segment output). This means losses are NOT distributed proportionally to investors -- they are simply ignored.
- **Negative yield (frontend):** `YieldInputForm.tsx` line 127 hides the yield amount display when negative (`yieldDec.isNegative() ? "" : yieldDec.toString()`).

This is a design decision, not necessarily a bug: the platform doesn't distribute losses, it only distributes gains. But the UI should at minimum display the negative yield amount to the admin for awareness.

---

## Phase 2: CTO Audit Findings

### 5. Database Query Integrity (Eligible Investors)

**Status: FIXED**

- `get_active_funds_summary`: No account_type filter on AUM sum. PASS.
- `get_fund_composition`: No account_type filter. PASS.
- V5 per-segment allocation loop: Includes all accounts with `balance > 0`. PASS.
- V5 output loop: **FAIL** -- still filters out `v_fees_account_id` (see Bug 1 above).

### 6. State Transition Integrity (Apply RPC)

**Status: PASS**

The `apply_segmented_yield_distribution_v5` RPC correctly:
- Creates YIELD transactions for each investor (including fees_account internally).
- Creates FEE_CREDIT transactions for the fees account.
- Creates IB_CREDIT transactions for IB accounts.
- Updates `investor_positions.current_value` for all affected accounts.
- The fees_account balance compounds: yield earned in Period T becomes principal in Period T+1 (via position update).
- Dust residual is assigned to the largest non-fees investor.

### 7. UI/UX Consistency

**Status: FIXED**

- Transaction Date hidden when `isReporting`: CONFIRMED at line 359: `{!isReporting && (`.
- Zero yield validation removed: CONFIRMED in `useYieldCalculation.ts` (no `baseAum` comparison blocking).
- **Stale comment:** `yieldHistoryService.ts` lines 265-269 still say "NOTE: Composition is investor-only by design (fees/IB omitted)" -- this is now incorrect after the fix and should be updated.

### 8. `run_integrity_pack` Bug

**Status: BROKEN**

The function references `WHERE ABS(variance) > 0.01` but the `v_ledger_reconciliation` view uses column name `drift`, not `variance`. This causes a runtime error when called.

---

## Fix Plan (3 items)

### Fix 1: CRITICAL -- V5 Preview Output Loop (Database Migration)

Remove the fees_account exclusion from the final allocations output in `preview_segmented_yield_distribution_v5`.

Change the query:
```sql
-- BEFORE (broken):
WHERE t.total_gross > 0 AND t.investor_id != v_fees_account_id

-- AFTER (fixed):
WHERE t.total_gross > 0
```

This ensures INDIGO FEES appears as a visible row in the preview/confirmation table alongside Sam and Ryan.

Note: The running totals (`v_total_gross`, etc.) correctly exclude fees_account yield from the header already, so no double-counting occurs.

### Fix 2: MEDIUM -- `run_integrity_pack` Column Name (Database Migration)

Fix the column reference:
```sql
-- BEFORE (broken):
WHERE ABS(variance) > 0.01

-- AFTER (fixed):
WHERE ABS(drift) > 0.01
```

### Fix 3: LOW -- Stale Comments (Frontend)

Update `yieldHistoryService.ts` lines 265-269 to remove the outdated "investor-only" comments since the composition now includes all account types.

---

## Verification: December 8th Simulation

After Fix 1, run this test:

| Check | Expected | Current Status |
|-------|----------|----------------|
| Total AUM displayed | 229,358 XRP | PASS (verified: `get_active_funds_summary` returns 229,358) |
| Investor table rows | 3 (Sam, Ryan, INDIGO) | FAIL until Fix 1 (preview output excludes INDIGO) |
| 1% yield to Sam | +2,292.87 | Correct (proportional to 229,287/229,358) |
| 1% yield to Ryan | +0.142 | Correct (proportional to 14.20/229,358) |
| 1% yield to INDIGO | +0.568 | Calculated internally, not shown until Fix 1 |
| INDIGO closing balance | 57.368 | Correct after apply (position update includes yield) |
| Conservation check | gross = net + fees + ib | PASS (built into RPC return) |

---

## Files To Change

| File / RPC | Change | Priority |
|------------|--------|----------|
| `preview_segmented_yield_distribution_v5` (DB) | Remove `AND t.investor_id != v_fees_account_id` from output loop | CRITICAL |
| `run_integrity_pack` (DB) | Change `variance` to `drift` | MEDIUM |
| `src/services/admin/yields/yieldHistoryService.ts` | Update stale comments (lines 265-269) | LOW |
