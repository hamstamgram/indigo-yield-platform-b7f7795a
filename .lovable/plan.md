

# Platform Certification & Parity Report

## Methodology
Traced financial values from PostgreSQL `NUMERIC(38,18)` columns through Supabase RPCs, React Query cache, service layer, and into UI rendering. Cross-referenced against the architecture's Decimal.js standard and the 18-decimal precision requirement.

---

## VECTOR 1: Precision Leaks & Parity Discrepancies

### P1-01: `toFinancialString()` truncates to 10dp -- database is 18dp

**File:** `src/utils/financial.ts`, line 393
**Issue:** `toFinancialString()` calls `.toFixed(10)` but database columns are `NUMERIC(38,18)`. Any value round-tripped through this function loses 8 decimal places. Comment on line 390 still says "matching NUMERIC(28,10)" -- the schema was upgraded to 38,18 but this function was never updated.
**Blast Radius:** `yieldMath.ts` uses `toFinancialString()` for `grossYield` and `calculateEndingBalance` results. Any UI component consuming these functions gets values truncated at 10dp.
**Fix:** Change line 393 to `.toFixed(18)` and update the comment to reference `NUMERIC(38,18)`.

### P1-02: PDF Statement Generator uses `Number()` for all financial values

**File:** `src/services/shared/profileService.ts`, lines 272-276
**Issue:** `getStatementPositionData()` converts all performance fields via `Number(record.mtd_beginning_balance || 0)`. These values feed into `src/lib/pdf/statementGenerator.ts` which then calls `.toFixed(4)` (lines 489-493). Two precision loss points: (1) `Number()` on 18dp strings, (2) `.toFixed(4)` truncates to 4dp regardless of asset type (BTC needs 8dp).
**Blast Radius:** All investor PDF statements show values truncated to 4 decimal places. BTC investors with sub-satoshi balances see incorrect statements.
**Fix:**
- `profileService.ts` lines 272-276: Replace `Number(...)` with `parseFinancial(...).toNumber()` (safe parse with Decimal).
- `statementGenerator.ts` lines 489-493: Use asset-aware decimal places from `ASSET_CONFIGS` instead of hardcoded `.toFixed(4)`.

### P1-03: Crystallization Service accumulates via Decimal-to-Number loop

**File:** `src/services/admin/yields/yieldCrystallizationService.ts`, lines 183-194
**Issue:** Each iteration converts to `.toNumber()`, stores as `number` in the map, then re-parses with `parseFinancial()` next iteration. This Decimal -> Number -> Decimal -> Number loop compounds IEEE 754 errors across many crystallization events per investor.
**Blast Radius:** Crystallization totals shown in admin UI drift from database truth.
**Fix:** Store `total_gross_yield`, `total_fees`, `total_net_yield` as `Decimal` objects in the Map. Only `.toNumber()` at final return.

### P1-04: Decimal.js precision set to 20, should be 40+

**File:** `src/utils/financial.ts`, line 20
**Issue:** `Decimal.set({ precision: 20 })` provides 20 significant digits. `NUMERIC(38,18)` can represent values with up to 38 significant digits. A value like `12345678901234567890.123456789012345678` (38 digits) would be silently truncated by Decimal.js to 20 significant digits.
**Blast Radius:** At current AUM scale (sub-$1M) this is harmless. At scale with 20+ digit values, precision loss occurs.
**Fix:** Change `precision: 20` to `precision: 40` to exceed the 38-digit database maximum.

---

## VECTOR 2: Cache & UI State Vulnerabilities

### P2-01: YieldDistributionsPage void/restore handlers missing full cache invalidation

**File:** `src/features/admin/yields/pages/YieldDistributionsPage.tsx`
**Lines:** 354, 375, 414, 445, 493
**Issue:** All five mutation success handlers only invalidate `QUERY_KEYS.yieldDistributions()`. They do NOT call `invalidateAfterYieldOp()`, which also clears positions, transactions, AUM, fee allocations, IB allocations, ledger reconciliation, and per-asset stats.
**Blast Radius:** After voiding a yield distribution from this page, all position cards, AUM dashboards, and transaction tables show stale pre-void data until manual refresh.
**Fix:** Replace each `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.yieldDistributions() })` with `await invalidateAfterYieldOp(queryClient)`.

### P2-02: VoidYieldDialog fetches stale impact preview from deprecated function

**File:** `src/features/admin/yields/components/VoidYieldDialog.tsx`, line 68
**Issue:** Calls `getYieldVoidImpact(record.id)` which is explicitly `@deprecated` and returns `{ success: false }` (line 263-264 of yieldManagementService.ts). The impact preview always shows empty/broken data.
**Blast Radius:** Admin sees no meaningful impact preview before voiding a yield record. Decision made blind.
**Fix:** Either (a) remove the impact preview section entirely since the void flow works through `void_yield_distribution` RPC, or (b) implement a real preview using `get_void_transaction_impact` RPC logic.

---

## VECTOR 3: Trigger & Concurrency Analysis

### P3-01: Confirmed -- YieldDistributionsPage void handlers are the primary concurrency UI gap

The database-level advisory locks in `void_yield_distribution` and `approve_and_complete_withdrawal` are correctly scoped (confirmed in prior audit). The primary risk is the UI cache desync from P2-01 above, where an admin acts on stale position data after another admin's void completes.

### P3-02: Temporal boundary -- T-1 AUM snapshot uses live positions

Confirmed from prior audit (V2-01). `apply_segmented_yield_distribution_v5` reads live `investor_positions.current_value`. The advisory lock serializes concurrent mutations within the same fund, so once locked, positions are stable. The gap is between preview (unlocked) and apply (locked). No new findings beyond prior audit.

---

## VECTOR 4: Dead Code Inventory

### Functions that throw on call (deprecated no-ops)

| File | Function | Line | Status |
|---|---|---|---|
| `src/services/admin/yields/yieldManagementService.ts` | `voidYieldRecord()` | 93 | Throws "deprecated" |
| `src/services/admin/yields/yieldManagementService.ts` | `updateYieldAum()` | 165 | Throws "deprecated" |
| `src/services/admin/yields/yieldManagementService.ts` | `getYieldVoidImpact()` | 263 | Returns `{ success: false }` |
| `src/services/admin/recordedYieldsService.ts` | `updateYieldRecord()` | 164 | Throws "deprecated" |
| `src/services/admin/recordedYieldsService.ts` | `getYieldEditHistory()` | 177 | Returns `[]` |
| `src/services/admin/transactionDetailsService.ts` | `checkAumExists()` | 181 | Returns `{ exists: true }` always |

### Hooks consuming dead functions

| File | Hook | Consumes |
|---|---|---|
| `src/hooks/data/shared/useYieldData.ts` | `useUpdateYieldRecord()` | `updateYieldRecord` (throws) |
| `src/hooks/data/shared/useYieldData.ts` | `useVoidYieldRecord()` | `voidYieldRecord` (throws) |
| `src/features/admin/yields/hooks/useRecordedYieldsPage.ts` | `useVoidYieldRecord()` | `voidYieldRecord` (throws) |
| `src/features/admin/yields/hooks/useRecordedYieldsPage.ts` | `useUpdateYieldAum()` | `updateYieldAum` (throws) |

### Re-export chains keeping dead code alive

| File | Exports |
|---|---|
| `src/services/admin/yields/index.ts` | `voidYieldRecord`, `updateYieldAum`, `getYieldVoidImpact` |
| `src/services/admin/index.ts` | `updateYieldRecord`, `getYieldEditHistory` |
| `src/hooks/data/admin/exports/yields.ts` | `useVoidYieldMutation`, `useUpdateYieldAum` |

### Action required
Delete the 6 deprecated functions, 4 hooks, and clean up the 3 re-export files. The live void flow uses `voidYieldDistribution()` (not `voidYieldRecord()`).

---

## VECTOR 5: Architectural Enhancements

### E-01: Enforce `invalidateAfterYieldOp` at the service layer

Instead of relying on each page to remember correct invalidation, move cache invalidation into `voidYieldDistribution()` itself by accepting an optional `queryClient` parameter, or create a wrapper mutation hook (`useVoidYieldDistributionMutation`) that all pages import.

### E-02: Asset-aware PDF formatter

Create a `formatForPdf(value: string, assetCode: string)` helper that reads `ASSET_CONFIGS` decimal places and formats using `parseFinancial`. Replace all `.toFixed(4)` in statementGenerator.ts.

### E-03: Automated precision regression test

Add a unit test that verifies no `Number()` or `parseFloat()` calls exist in the financial data pipeline files (services, hooks, statement generators) using AST scanning or grep-based CI checks.

---

## Summary Matrix

| ID | Severity | Vector | Issue | Files |
|----|----------|--------|-------|-------|
| P1-01 | **P1** | Precision | `toFinancialString` truncates to 10dp vs 18dp DB | `financial.ts` |
| P1-02 | **P1** | Precision | PDF statements use `Number()` + `.toFixed(4)` | `profileService.ts`, `statementGenerator.ts` |
| P1-03 | **P1** | Precision | Crystallization service Decimal-Number-Decimal loop | `yieldCrystallizationService.ts` |
| P1-04 | **P2** | Precision | Decimal.js precision=20 vs 38-digit DB max | `financial.ts` |
| P2-01 | **P1** | Cache | 5 yield void/restore handlers missing full invalidation | `YieldDistributionsPage.tsx` |
| P2-02 | **P2** | Cache | VoidYieldDialog uses deprecated impact preview | `VoidYieldDialog.tsx` |
| Dead | **P2** | Dead Code | 6 deprecated functions, 4 dead hooks, 3 stale re-exports | 9 files |

**Critical Path:** P1-01 (toFinancialString 10dp truncation) and P2-01 (missing cache invalidation on yield voids) are the highest-impact items requiring immediate patching.

