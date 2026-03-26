

# Full-Stack Integrity Audit: Remaining Risks After Precision Hardening

## What Was Already Fixed (3 prior rounds)
- `yieldDistributionsPageService.ts` types hardened to `number | string`
- `FinancialValue.tsx` thousand separators added
- `YieldsTable.tsx` Position After uses `.toString()`
- `VoidDistributionDialog.tsx` types aligned
- `InvestorYieldHistory.tsx` / `InvestorYieldManager.tsx` switched to `FinancialValue`
- `ExpertPositionsTable.tsx` aggregation uses `Decimal.js`
- `InvestorManagementDrawer.tsx` partial fix (lines 403-420 use `FinancialValue`)
- `YieldDistributionsPage.tsx` summary aggregations use `Decimal.js`
- `InvestorOverviewPage.tsx` removed `.toNumber()` intermediate
- 42 DB triggers verified present and enabled

## What Is Still Broken / At Risk

### A. InvestorManagementDrawer Line 236 -- Still Hardcoded
Line 236 still uses `formatValue(pos.current_value, pos.asset === "BTC" ? 4 : 2)` with hardcoded decimals. Lines 403-420 were fixed but this one was missed.

**Fix**: Replace with `<FinancialValue value={pos.current_value} asset={pos.asset} />`

### B. ExpertPositionsTable `.toNumber()` Re-introduces Precision Loss
Lines 289-293 use `Decimal.js` for aggregation but immediately call `.toNumber()`, converting back to IEEE 754 doubles. The `formatAssetValue()` calls on lines 308-326 then format these lossy numbers.

Also line 161: `position.shares.toFixed(4)` -- hardcoded 4 decimals for shares.
Line 231: `pnlPercent.toFixed(2)` -- acceptable for percentages.

**Fix**: Keep `.toNumber()` for percentage calculations (safe for small numbers), but pass `.toString()` to `FinancialValue` for monetary values (totalValue, totalCost, totalEarnings, totalPnL).

### C. StatementsPage -- 25+ `parseFloat()` Calls on Financial Data
Lines 60-111 and 235-281 use `parseFloat()` on every financial field (begin_balance, end_balance, additions, redemptions, net_income, rate_of_return for MTD/QTD/YTD/ITD). This is the investor-facing statement page.

For balances, `parseFloat` loses precision beyond ~15 significant digits. For the PDF generator, these feed into `formatValue()` which already handles formatting.

**Fix**: Replace `parseFloat` with `toNum()` (consistent with project pattern) for display values. For the PDF generator data object, the values are small enough that precision loss is negligible, but consistency matters.

### D. InvestorTransactionsPage Line 108 -- `parseFloat(String(item.amount))`
Uses `parseFloat` on transaction amounts for investor-facing display.

**Fix**: Use `toNum()` for sign check, pass raw `item.amount` to `formatInvestorAmount`.

### E. YieldPreviewResults Line 346 -- `toNum()` Addition for Closing Balance
```typescript
formatValue(toNum(inv.openingBalance || 0) + toNum(inv.netYield), asset)
```
This uses JS `+` operator on `toNum()` results. Should use `Decimal.js` for the addition, then pass string to `formatValue`.

Same pattern on lines 287, 298, 303, 314, 324, 341 -- all use `toNum()` for display which is acceptable since `formatValue` handles formatting, but the line 346 arithmetic should use Decimal.

### F. YieldDistributionsPage Line 474 -- `Number()` for RPC Parameter
```typescript
const feeAmount = Number(allocation.fee_amount || 0);
```
This feeds into `executeInternalRoute({ amount: feeAmount })`. If the RPC expects a number, this is fine for typical fee amounts. But for consistency with the precision-preserving cast pattern (memory: `as unknown as number`), should pass the string directly.

### G. Bulk Action Dialogs -- 6 Files with `parseFloat(amount)`
`BulkUnvoidDialog`, `BulkActionToolbar`, `WithdrawalBulkActionToolbar`, `BulkVoidWithdrawalsDialog`, `BulkRestoreWithdrawalsDialog`, `BulkDeleteWithdrawalsDialog` all use `formatAssetValue(parseFloat(amount), asset)`. These are display-only and amounts are typically small, but should use `toNum()` for consistency.

### H. InvestorCompositionSheet Line 231 -- `ownership_pct.toFixed(2)`
Acceptable -- percentages are small numbers, no precision risk.

### I. QuickYieldEntry Line 181 -- `yieldCalc.percentage.toFixed(2)`
Acceptable -- computed percentage, not a financial amount.

---

## Implementation Plan

### Step 1: Fix InvestorManagementDrawer (missed line 236)
Replace hardcoded `formatValue` with `<FinancialValue>`.

### Step 2: Fix ExpertPositionsTable monetary `.toNumber()` calls
Use `.toString()` and `<FinancialValue>` for Value/Cost/Earnings/PnL in the summary cards (lines 308-326). Keep `.toNumber()` for percentage display.

### Step 3: Fix StatementsPage `parseFloat` pattern
Replace all 25+ `parseFloat()` calls with `toNum()` for consistency. No functional difference for typical amounts but eliminates the anti-pattern.

### Step 4: Fix InvestorTransactionsPage `parseFloat`
Replace with `toNum()` for sign check, pass raw string to formatter.

### Step 5: Fix YieldPreviewResults closing balance arithmetic
Replace `toNum(a) + toNum(b)` with `new Decimal(a).plus(b).toString()` on line 346.

### Step 6: Fix YieldDistributionsPage fee routing (line 474)
Pass string directly with precision-preserving cast pattern for the RPC call.

### Step 7: Fix bulk action dialogs (6 files)
Replace `parseFloat(amount)` with `toNum(amount)` across all 6 bulk dialog/toolbar files. Display-only change.

### Step 8: TypeScript build verification
Run `npx tsc --noEmit` to confirm zero errors.

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `InvestorManagementDrawer.tsx` | Line 236: `FinancialValue` | Low |
| `ExpertPositionsTable.tsx` | Summary cards: `.toString()` + `FinancialValue` | Medium |
| `StatementsPage.tsx` | 25x `parseFloat` to `toNum` | Low |
| `InvestorTransactionsPage.tsx` | `parseFloat` to `toNum` | Low |
| `YieldPreviewResults.tsx` | Line 346: Decimal.js addition | Medium |
| `YieldDistributionsPage.tsx` | Line 474: string passthrough | Low |
| `BulkUnvoidDialog.tsx` | `parseFloat` to `toNum` | Low |
| `BulkActionToolbar.tsx` | `parseFloat` to `toNum` | Low |
| `WithdrawalBulkActionToolbar.tsx` | `parseFloat` to `toNum` | Low |
| `BulkVoidWithdrawalsDialog.tsx` | `parseFloat` to `toNum` | Low |
| `BulkRestoreWithdrawalsDialog.tsx` | `parseFloat` to `toNum` | Low |
| `BulkDeleteWithdrawalsDialog.tsx` | `parseFloat` to `toNum` | Low |

## What Does NOT Need Fixing
- `NumericInput.tsx` -- input formatting, `parseFloat` is correct here
- `toNumber()` in `utils/numeric.ts` -- utility function, not a consumer
- `feesService.ts` `.toFixed(10)` -- service layer formatting, acceptable
- Percentage `.toFixed(2)` calls -- small numbers, no precision risk
- `statementGenerator.ts` -- PDF template, uses `formatValue` which handles formatting
- DB triggers -- verified in prior round, all 42 present and enabled

