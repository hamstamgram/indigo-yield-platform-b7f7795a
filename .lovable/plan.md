

# Expert Verification: Triggers, Schema, UI Operations & Data Integrity

## Context
After the recent type hardening (`number` to `number | string`) in `yieldDistributionsPageService.ts` and the thousand-separator formatting in `FinancialValue.tsx`, we need to verify that nothing is broken across the full stack: DB triggers, schema alignment, UI operations (dialogs, previews), and column data rendering.

## Verification Scope

### 1. Fix Precision Bug in YieldsTable Position After Calculation
**File**: `src/features/admin/yields/components/YieldsTable.tsx` (line 451-453)

Current code calls `.toNumber()` on the Decimal result, which re-introduces IEEE 754 precision loss:
```typescript
value={new Decimal(alloc.position_value_at_calc || 0)
  .plus(new Decimal(alloc.net_amount || 0))
  .toNumber()}
```
Change to `.toString()` so `FinancialValue` receives a full-precision string:
```typescript
value={new Decimal(alloc.position_value_at_calc || 0)
  .plus(new Decimal(alloc.net_amount || 0))
  .toString()}
```

### 2. Fix VoidDistributionDialog Type Mismatch
**File**: `src/features/admin/yields/components/VoidDistributionDialog.tsx` (line 30-41)

The `DistributionSummary` interface uses `number` for financial fields, but both `YieldHistoryPage` and `YieldDistributionsPage` feed it values via `Number(distribution.gross_yield)` coercion. This works but should be aligned to accept `number | string` for consistency. Update the interface:
```typescript
gross_yield: number | string;
net_yield: number | string;
total_fees: number | string;
total_ib: number | string;
```

Then update the `FinancialValue` usage in the dialog (already accepts `number | string` -- no change needed there). The callers in `YieldHistoryPage.tsx` (line 88-90) and `YieldDistributionsPage.tsx` (line 333-336) can then stop using `Number()` coercion, preserving precision.

### 3. Fix VoidTarget Type in YieldHistoryPage and YieldDistributionsPage
**Files**: 
- `src/features/admin/yields/pages/YieldHistoryPage.tsx` (lines 42-53)
- `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (lines 289-300)

Both declare `voidTarget` state with `number` types. Update to `number | string` and remove the `Number()` wrapping in `handleVoidOpen` callbacks to pass through raw DB precision.

### 4. Fix FeeAllocationsTable Net Calculation
**File**: `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (line 132)

Current code:
```typescript
<FinancialValue value={Number(fa.base_net_income) - Number(fa.fee_amount)} asset={asset} />
```
Replace with Decimal.js for precision:
```typescript
<FinancialValue value={new Decimal(fa.base_net_income).minus(new Decimal(fa.fee_amount)).toString()} asset={asset} />
```

### 5. Fix CrystallizationEventsTable Number Coercion
**File**: `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (lines 181, 187)

`formatPercentage(Number(evt.investor_share_pct), 4)` and `formatPercentage(Number(evt.fee_pct || 0), 2)` -- these are safe since percentages are small numbers, but for consistency use `toNum()` from `@/utils/numeric`.

### 6. Fix RouteToFees Fee Amount Extraction
**File**: `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (line 473)

```typescript
const feeAmount = Number(allocation.fee_amount || 0);
```
This is used for an RPC call parameter. Ensure the coercion preserves the value correctly. Replace with `toNum(allocation.fee_amount)`.

### 7. Verify YieldPreviewResults (No Changes Needed)
**File**: `src/features/admin/yields/components/YieldPreviewResults.tsx`

This component uses `toNum()` and `formatValue()` which accept `number`. The data source is `YieldCalculationResult` (from the preview RPC), which returns JS numbers from the RPC call. No type change needed here since the preview data doesn't go through the `DistributionRow` types.

### 8. Verify DB Triggers Match Schema
Run a database query to verify all critical triggers exist and reference correct columns:
- `trg_ledger_sync` on `transactions_v2` -- references `current_value`, `cost_basis`, `cumulative_yield_earned`
- `enforce_canonical_yield_mutation` on `yield_distributions` -- blocks direct DML
- `delta_audit_*` triggers on `transactions_v2`, `investor_positions`, `yield_distributions`
- `protect_*_immutable` triggers on `transactions_v2`, `fee_allocations`, `ib_allocations`

This is a read-only verification query against `pg_trigger` and `pg_proc` to confirm no column name mismatches exist.

### 9. Verify Export Columns Match New Types
**File**: `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (lines 204-216)

The `distributionExportColumns` reference keys like `gross_yield`, `net_yield`, `total_fees` etc. The CSV export utility needs to handle `number | string` values. Check `ExportButton` and `csv-export` to confirm they stringify values correctly (they should, since CSV is text-based).

## Summary of Files Changed

| File | Change |
|------|--------|
| `YieldsTable.tsx` | `.toNumber()` to `.toString()` in Position After calc |
| `VoidDistributionDialog.tsx` | Update `DistributionSummary` types to `number \| string` |
| `YieldHistoryPage.tsx` | Update `voidTarget` types, remove `Number()` coercion |
| `YieldDistributionsPage.tsx` | Update `voidTarget`/`routeTarget` types, fix Decimal math in FeeAllocationsTable, use `toNum()` consistently |

## Verification Steps (Post-Implementation)
1. Open Yield History page -- confirm all distributions render with thousand separators
2. Expand a distribution row -- confirm Position After shows correct precision
3. Open Void dialog -- confirm financial values display correctly
4. Open Yield Distributions page -- confirm FeeAllocationsTable Net column is precise
5. Run `npx tsc --noEmit` to confirm no type errors
6. Query DB triggers to confirm no schema drift

