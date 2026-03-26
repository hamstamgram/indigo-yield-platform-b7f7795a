

# Full-Stack Verification and Remaining Precision Fixes

## What Has Been Verified
- Type hardening in `yieldDistributionsPageService.ts` (financial fields now `number | string`)
- `FinancialValue.tsx` thousand separators and Decimal.js precision
- `YieldsTable.tsx` Position After uses `.toString()` instead of `.toNumber()`
- `VoidDistributionDialog.tsx` types aligned
- DB triggers confirmed present and enabled (42 triggers audited)
- All entered yield periods match Excel at full precision

## What Has NOT Been Verified / Still Broken

### A. Admin Investor Yield History uses `parseFloat` (precision loss)
**File**: `src/features/admin/investors/components/yields/InvestorYieldHistory.tsx`

Lines 269, 285, 293, 300, 305 all use `parseFloat(String(event.xxx))` and feed into a local `formatNumber(value.toLocaleString(..., 6 decimals))`. This bypasses `FinancialValue` entirely and uses `parseFloat` which causes IEEE 754 precision loss for large values.

**Fix**: Replace all `formatNumber(parseFloat(String(event.xxx)))` calls with `<FinancialValue value={event.xxx} asset={...} />` to match the rest of the admin portal.

### B. Admin Investor Yield Manager uses `.toFixed(4)` hardcoded
**File**: `src/features/admin/investors/components/yields/InvestorYieldManager.tsx` (line 155)

`totalYield.toFixed(4)` -- raw number formatting without `FinancialValue` or thousand separators.

**Fix**: Use `<FinancialValue value={totalYield} asset={asset} />`.

### C. Expert Positions Table uses raw `number` arithmetic
**File**: `src/features/admin/investors/components/expert/ExpertPositionsTable.tsx` (lines 288-291)

```typescript
const totalValue = assetPositions.reduce((sum, p) => sum + p.current_value, 0);
const totalCost = assetPositions.reduce((sum, p) => sum + p.cost_basis, 0);
```

These use JS `number` addition. If `current_value` comes as a string from the DB, this produces `"0string"` concatenation bugs. Even if numeric, large values lose precision.

**Fix**: Use `Decimal.js` for aggregation, render with `FinancialValue`.

### D. Investor Management Drawer uses hardcoded decimal logic
**File**: `src/features/admin/investors/components/detail/InvestorManagementDrawer.tsx` (lines 234, 405, 412)

```typescript
formatValue(pos.current_value, pos.asset === "BTC" ? 4 : 2)
```

Hardcoded `4` for BTC and `2` for everything else, ignoring `ASSET_CONFIGS`. No thousand separators.

**Fix**: Replace with `<FinancialValue value={pos.current_value} asset={pos.asset} />`.

### E. YieldDistributionsPage aggregation uses `Number()` sums
**File**: `src/features/admin/yields/pages/YieldDistributionsPage.tsx` (lines 719-727, 782)

```typescript
crystalDists.reduce((s, d) => s + Number(d.gross_yield), 0)
```

These summary calculations use `Number()` coercion. Should use `Decimal.js` for consistency.

**Fix**: Replace with `new Decimal(0)` accumulator pattern.

### F. Investor Portal uses `parseFinancial(...).toNumber()`
**File**: `src/features/investor/overview/pages/InvestorOverviewPage.tsx` (line 483)

```typescript
formatInvestorNumber(parseFinancial(tx.amount).toNumber())
```

This is the investor-facing view. The `toNumber()` call loses precision. While `formatInvestorNumber` only shows 3 decimals (acceptable for investors), the intermediate conversion is unsafe.

**Fix**: Pass the raw string to `formatInvestorNumber` (it already accepts `string | number`).

### G. DB Trigger Column Verification (read-only query)
Run a verification query to confirm all trigger functions reference columns that exist in their target tables. This catches schema drift if any column was renamed but a trigger function was not updated.

## Implementation Plan

### Step 1: Fix InvestorYieldHistory to use FinancialValue
Replace `formatNumber(parseFloat(...))` pattern with `<FinancialValue>` throughout the component. Remove the local `formatNumber` function.

### Step 2: Fix InvestorYieldManager totalYield display
Replace `.toFixed(4)` with `<FinancialValue>`.

### Step 3: Fix ExpertPositionsTable aggregation
Replace `p.current_value` numeric addition with `Decimal.js` sums. Guard against string values.

### Step 4: Fix InvestorManagementDrawer formatting
Replace hardcoded `formatValue(pos.current_value, ...)` with `<FinancialValue>`.

### Step 5: Fix YieldDistributionsPage summary aggregations
Replace `Number(d.gross_yield)` reduce patterns with `Decimal.js`.

### Step 6: Fix InvestorOverviewPage `.toNumber()` call
Pass raw string directly to `formatInvestorNumber`.

### Step 7: Run DB trigger column verification query
Query `pg_proc` / `information_schema` to confirm no trigger references missing columns.

### Step 8: TypeScript build verification
Run `npx tsc --noEmit` to confirm zero type errors after all changes.

## Files Changed

| File | Change |
|------|--------|
| `InvestorYieldHistory.tsx` | Replace `parseFloat`+`formatNumber` with `FinancialValue` |
| `InvestorYieldManager.tsx` | Replace `.toFixed(4)` with `FinancialValue` |
| `ExpertPositionsTable.tsx` | Use `Decimal.js` for position aggregation |
| `InvestorManagementDrawer.tsx` | Replace hardcoded decimals with `FinancialValue` |
| `YieldDistributionsPage.tsx` | Use `Decimal.js` for summary reduce patterns |
| `InvestorOverviewPage.tsx` | Remove `.toNumber()` intermediate conversion |

