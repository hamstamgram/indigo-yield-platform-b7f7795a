

# Platform Certification Report -- Audit & Remediation Plan

## STATUS: 45+ prior fixes verified CLEAN. 12 new findings across 4 vectors.

---

## VECTOR 1: Precision & Parity Fixes

### P0-01: `YieldEventsTable.tsx` -- Accumulation drift via repeated `.toNumber()` in reduce

**File:** `src/features/admin/yields/components/YieldEventsTable.tsx` (lines 89-95)

The `reduce` calls `.toNumber()` on every iteration, converting back to `number` and losing Decimal precision across iterations. With many events this accumulates IEEE 754 rounding drift.

**Fix:** Accumulate as Decimal, call `.toNumber()` once at the end:
```typescript
const totalYield = filteredEvents
  .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount || 0)), parseFinancial(0))
  .toNumber();
```

### P0-02: `YieldPreviewResults.tsx` -- `.toNumber()` before display

**File:** `src/features/admin/yields/components/YieldPreviewResults.tsx` (lines 69-72)

`trueTotalGross` calls `.toNumber()` -- this is at the display boundary so acceptable, but should use `.toString()` and pass to `FinancialValue` for consistency with the precision standard.

**Fix:** Keep as `.toString()` and pass to `FinancialValue` component instead of `formatValue(trueTotalGross)`.

### P0-03: `DistributeYieldDialog.tsx` -- `.toNumber()` in Ending Balance calc

**File:** `src/features/admin/yields/components/DistributeYieldDialog.tsx` (line 258)

Ending Balance is computed via `new Decimal(...).plus(...).toNumber()` then passed to `formatValue`. Should stay as string.

**Fix:** Use `.toString()` and pass to `FinancialValue` component or `formatValue` with the string directly.

### P1-01: `investorPortfolioSummaryService.ts` -- `assetBreakdown` uses native `+=`

**File:** `src/features/investor/portfolio/services/investorPortfolioSummaryService.ts` (line 93)

`assetBreakdown[pos.asset] += pos.currentValue` uses native JS addition on a `number` typed field that comes from a position. The `InvestorPositionDetail.currentValue` is typed as `number` (already converted), so the `+=` accumulation is a precision risk for large portfolios.

**Fix:** Use Decimal accumulation:
```typescript
const assetBreakdown: Record<string, number> = {};
positions.forEach((pos) => {
  const key = pos.asset;
  assetBreakdown[key] = parseFinancial(assetBreakdown[key] || 0)
    .plus(parseFinancial(pos.currentValue || 0))
    .toNumber();
});
```

### P1-02: `investorPortfolioSummaryService.ts` -- `Number()` on line 179-181

**File:** `src/features/investor/portfolio/services/investorPortfolioSummaryService.ts` (lines 179-181)

`Number(investor.totalAUM || 0)` -- bare `Number()` on financial values from RPC.

**Fix:** Replace with `parseFinancial(investor.totalAUM || 0).toNumber()`.

### P2-01: `YieldDistributionsPage.tsx` -- `Number()` on fee percentages

**File:** `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (lines 130, 185, 191)

`formatPercentage(Number(fa.fee_percentage), 2)` -- these are percentage values (0-100 range), not financial amounts. Low precision risk but inconsistent with standards.

**Fix:** Replace with `parseFinancial(fa.fee_percentage || 0).toNumber()`.

### P2-02: Display components (`KPI.tsx`, `FormattedNumber.tsx`, `ActivityFeed.tsx`) use `parseFloat`

These are display-boundary components that convert strings to numbers purely for `Intl.NumberFormat`. Since they perform no arithmetic and are the final rendering step, this is **acceptable** per the standard ("`.toNumber()` only at the final display boundary"). No change needed.

### P2-03: `withdrawalService.ts` -- `Number()` on `requestedAmount`

**File:** `src/features/investor/withdrawals/services/withdrawalService.ts` (line 485)

`Number(params.requestedAmount)` before writing to Supabase. Should use string to preserve precision for the `NUMERIC(38,18)` column.

**Fix:** Replace `Number(params.requestedAmount)` with `String(params.requestedAmount)`.

---

## VECTOR 2: React Query Cache & UI State Hydration

### Assessment: CLEAN

The `cacheInvalidation.ts` module is well-architected with a dependency graph approach. Key findings:

- `invalidateAfterYieldOp` covers positions, ledger reconciliation, perAssetStats, integrity, and force-refetches AUM. **PASS**
- `invalidateAfterTransaction` covers all transaction-derived keys and force-refetches AUM. **PASS**
- `invalidateAfterWithdrawal` chains into `invalidateAfterTransaction`. **PASS**
- `DistributeYieldDialog` imports `Decimal` and uses live props (`asOfAum`, `grossYield`). It does NOT cache stale data. **PASS**

**No additional cache invalidation fixes needed.**

---

## VECTOR 3: Trigger Cascades & Concurrency

### Assessment: CLEAN (verified from prior audit rounds)

- `void_yield_distribution`: advisory lock by distribution_id, full cascade to yield_allocations, fee_allocations, ib_allocations, platform_fee_ledger, ib_commission_ledger. **PASS**
- `apply_segmented_yield_distribution_v5`: advisory lock on fund_id + period. **PASS**
- `apply_investor_transaction`: advisory lock by hash of investor_id + fund_id. **PASS**
- `approve_and_complete_withdrawal`: atomic within RPC, dust sweep for full exits. **PASS**
- AUM refresh after yield apply: now calls `recalculate_fund_aum_for_date(fundId, CURRENT_DATE)`. **PASS**

**No additional database fixes needed.**

---

## VECTOR 4: Dead Code Eradication

### 4A: Ghost RPC Signatures in `rpcSignatures.ts`

`crystallize_month_end` (line 67, 607-614) -- This RPC was dropped in the V6 migration. The signature remains in contracts but is never called from application code.

**Fix:** Remove from the `RPC_SIGNATURES` list and object in `src/contracts/rpcSignatures.ts`.

### 4B: Ghost Table Schema in `dbSchema.ts`

`fund_yield_snapshots` (lines 190-209) -- This table was dropped. The schema entry remains.

**Fix:** Remove the `fund_yield_snapshots` entry from `src/contracts/dbSchema.ts`.

### 4C: Deprecated Hook Stub

`useFundYieldSnapshots` in `src/features/admin/yields/hooks/useYieldCrystallization.ts` (lines 140-151) -- Marked `@deprecated`, returns empty array with `enabled: false`. Dead code.

**Fix:** Remove the function entirely. Search confirms zero external callers.

### 4D: `investor_yield_events` References in Frontend

All 4 frontend files referencing `investor_yield_events` are **comment-only** (documenting the V6 architecture change). These are informational and do NOT reference the table in queries. **No action needed** -- the comments are accurate documentation.

---

## Implementation Summary

| Vector | Files | Severity | Type |
|--------|-------|----------|------|
| V1: YieldEventsTable reduce drift | 1 TS | P0 | Precision |
| V1: YieldPreviewResults `.toNumber()` | 1 TSX | P0 | Precision |
| V1: DistributeYieldDialog Ending Balance | 1 TSX | P0 | Precision |
| V1: Portfolio `assetBreakdown` `+=` | 1 TS | P1 | Precision |
| V1: Portfolio `Number()` on financial | 1 TS | P1 | Precision |
| V1: YieldDistributionsPage `Number()` | 1 TSX | P2 | Consistency