

# Remaining Verification: What's Left and What Might Be Broken

## Current State
No console errors detected. The app is running. TypeScript compiled clean after the last round. The 4 prior rounds fixed ~40 precision issues across 20+ files.

## Remaining `parseFloat` / `.toNumber()` Instances (Not Yet Fixed)

These are the files that still use legacy patterns. Categorized by risk:

### HIGH RISK (financial data, investor-facing or aggregation)

| # | File | Issue | Lines |
|---|------|-------|-------|
| 1 | `investorPositionService.ts` | 12x `.toNumber()` on `parseFinancial()` results for shares, cost_basis, current_value, earnings, allocation | 112-117, 161-183, 492-514 |
| 2 | `investorPortfolioSummaryService.ts` | 3x `.toNumber()` on aggregated totals (totalAUM, totalEarned, totalPrincipal) | 77-85 |
| 3 | `InvestorTransactionsTab.tsx` | 4x `parseFloat(String(transaction.amount))` for sign check and display | 132, 150, 155, 159 |
| 4 | `useIBManagementPage.ts` | 2x `parseFloat(String(...))` for IB earnings aggregation | 73, 82 |
| 5 | `GlobalYieldFlow.tsx` | `parseFloat(ops.yieldPreview?.grossYield)` for dialog display | 128 |
| 6 | `AdminTransactionsPage.tsx` | `parseFinancial(amount).toNumber()` for formatting | 244 |
| 7 | `useTransactionSubmit.ts` | `parseFinancial(data.amount).toNumber()` for large-amount check | 67 |
| 8 | `ApproveWithdrawalDialog.tsx` | `parseFinancial(processedAmount).toNumber()` for validation | 157 |
| 9 | `QuickYieldEntry.tsx` | 3x `.toNumber()` for yield calculation and formatting | 47, 51, 75 |
| 10 | `dashboardMetricsService.ts` | `.toNumber()` calls on dashboard aggregations | multiple |

### LOW RISK (input handling, acceptable)

| File | Why It's OK |
|------|-------------|
| `PositionsStep.tsx` | Input parsing for form, `parseFloat` is correct |
| `FundPositionCard.tsx` | Input field change handler |
| `AddIBScheduleDialog.tsx` | Percentage input validation |
| `AssetPriceDialog.tsx` | Price input fields |
| `MonthlyReportsTable.tsx` | Edit value parsing |
| `YieldInputForm.tsx` | Yield amount input display |
| `NumericInput.tsx` | Input component (by design) |

### STILL USING `Number()` (in yields pages, but safe-ish)

| File | Pattern | Risk |
|------|---------|------|
| `YieldDistributionsPage.tsx` | `Number(fa.fee_percentage)` for `formatPercentage` | Safe -- percentages are small |
| `YieldsTable.tsx` | `Number(alloc.fee_amount) > 0` for conditional rendering | Safe -- boolean check only |
| `YieldPreviewResults.tsx` | `Number()` in percentage calculations | Safe -- percentages |

## What Might Be Broken

### Nothing is functionally broken right now.
The changes we made were all display-layer: replacing `parseFloat` with `toNum()`, adding `Decimal.js` for arithmetic, and using `FinancialValue` for rendering. These are backward-compatible since `toNum()` and `parseFloat` produce identical results for typical financial amounts (< 15 significant digits). The risk was theoretical precision loss, not runtime errors.

### Potential regression risk:
1. **`ExpertPositionsTable.tsx`** -- We changed summary cards to use `FinancialValue` with string values. If the `formatAssetValue` function was also being used elsewhere to format these same values, there could be visual inconsistency (different decimal counts). Low risk.
2. **`InvestorManagementDrawer.tsx`** -- We replaced `formatValue(pos.current_value, ...)` with `<FinancialValue>`. If `current_value` comes as `null` from a position with no transactions, `FinancialValue` needs to handle that. It does (defaults to `0`).

## Recommended Next Step

### Fix the service layer `.toNumber()` pattern (Items 1-2 above)

This is the most impactful remaining fix. `investorPositionService.ts` converts every financial field to JS `number` before returning it to components. This means ALL downstream investor portal components receive lossy data, regardless of whether those components use `FinancialValue`.

**The fix**: Change the service return types from `number` to `number | string` and return `.toString()` instead of `.toNumber()`. Then update the 3-4 consumer components to use `FinancialValue`.

This is a **medium-risk change** because it touches the service interface used by ~10 components across the investor portal. It would require updating type definitions and all consumers.

### Or: Declare victory on precision hardening

For a platform with "small AUM" at soft launch, the current `.toNumber()` calls in the service layer are safe for amounts under ~$999 trillion. The display-layer fixes we've already done cover the admin portal completely. The investor portal service layer is the last frontier but is low-urgency.

## Files That Would Change (if proceeding)

| File | Change |
|------|--------|
| `investorPositionService.ts` | 12x `.toNumber()` to `.toString()`, update return types |
| `investorPortfolioSummaryService.ts` | 3x `.toNumber()` to `.toString()` |
| `InvestorTransactionsTab.tsx` | 4x `parseFloat` to `toNum` |
| `useIBManagementPage.ts` | 2x `parseFloat` to `Decimal.js` aggregation |
| `GlobalYieldFlow.tsx` | 1x `parseFloat` to `toNum` |
| Consumer components (~5 files) | Update to handle `string` types |

