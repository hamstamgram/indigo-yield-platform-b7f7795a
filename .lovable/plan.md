

# Full UI Financial Data Audit -- Indigo Yield Platform

## Methodology

Audited every component that reads from financial database tables and displays numeric values. Traced each value from database column through service/hook to UI rendering function, checking for precision loss, formatting bugs, and display inconsistencies.

---

## Component Inventory by Data Source

### A. `investor_positions` (current_value, cost_basis, shares, cumulative_yield_earned)

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `InvestorOverviewTab` | Admin | `FinancialValue` with `displayDecimals={4}` | OK -- Decimal.js |
| `InvestorPositionsTab` | Admin | `FinancialValue` | OK -- Decimal.js |
| `ExpertPositionsTable` | Admin | `formatAssetValue()` + `toFixed(4)` for shares, `toFixed(2)` for PnL % | P2: `shares` uses JS `.toFixed()` on a number -- loses precision beyond ~15 digits |
| `FundPositionCard` | Admin | `formatPercent()` using `(value * 100).toFixed(2)` + `parseFloat()` for edits | P2: `parseFloat()` on line 90 feeds edited values into mutation -- precision loss on position edits |
| `InvestorPortfolioPage` | Investor | `formatInvestorAmount()` / `formatSignedInvestorAmount()` | OK -- uses `toNum()` then `toLocaleString()` |
| `InvestorOverviewPage` | Investor | `formatInvestorNumber()` | OK -- 3 decimal places, uses `toLocaleString()` |
| `ApproveWithdrawalDialog` | Admin | `formatAssetAmount()` | OK for display; position loaded via direct `supabase.from()` (bypasses service gateway) |
| `WithdrawalRequestForm` | Investor | `Number(requestedAmount)` for validation | OK -- validation only |

### B. `transactions_v2` (amount, running_balance)

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `LedgerTable` | Admin | `FinancialValue` | OK -- Decimal.js |
| `InvestorTransactionsTab` | Admin | `toNum()` + `formatAssetAmount()` | OK |
| `InvestorOverviewPage` (recent txns) | Investor | `formatInvestorNumber()` | OK |
| `VoidTransactionDialog` | Admin | `FinancialValue` | OK |
| `UnvoidTransactionDialog` | Admin | `FinancialValue` | OK |
| `BulkActionToolbar` | Admin | `formatAssetValue(toNum(amount))` | OK |

### C. `yield_distributions` / `yield_allocations` (gross_yield, net_yield, fee_amount, ib_amount)

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `YieldPreviewResults` | Admin | `formatValue(toNum(...))` | **P1: `trueTotalGross` computed via `reduce` + `toNum()` -- floating-point accumulation error on many investors** |
| `DistributeYieldDialog` | Admin | `formatValue(toNum(grossYield))` | **FIXED** (was P0 -- comma truncation). Now receives raw string. |
| `YieldConfirmDialog` | Admin | `formatValue(toNum(...))` | OK post-fix |
| `YieldsTable` | Admin | `FinancialValue` | OK -- Decimal.js |
| `VoidDistributionDialog` | Admin | `FinancialValue` | OK |
| `InvestorYieldHistory` | Admin | `FinancialValue` + `parseFinancial()` for stats | OK |
| `YieldInputForm` | Admin | `formatValue(parseFloat(yieldAmount))` | **P2: Uses `parseFloat()` 4 times on yieldAmount (lines 301-307)** -- yieldAmount comes from `Decimal.toString()` so no comma issue, but JS float arithmetic means the displayed yield preview could differ from the actual Decimal computation by dust |

### D. `fund_daily_aum` / Dashboard AUM

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `FundSnapshotCard` | Admin | `formatAUM()` | OK |
| `AdminDashboard` fund cards | Admin | `ops.formatValue()` | OK |
| `YieldInputForm` AUM display | Admin | `formatValue(displayedAum)` | OK -- `displayedAum` is a number from hook |
| `PlatformMetricsPanel` | Admin | `toLocaleString()` | OK |

### E. `investor_fund_performance` (MTD/QTD/YTD/ITD balances and returns)

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `FundPositionCard` | Admin | `formatPercent()` with `(value * 100).toFixed(2)` + edit via `parseFloat()` | **P2: Edit path uses `parseFloat()` -> `Number` arithmetic for net income auto-calc (lines 94-99)** |
| `MonthlyReportsTable` | Admin | `toFixed(2)` for rates, `parseFloat(editValue)` for cell edits | **P2: `parseFloat()` on save feeds into mutation** |
| `AdminStatementGenerator` | Admin | `Number(r.mtd_ending_balance)` in reduce | **P2: Uses `Number()` for aggregation (lines 89-101)** -- accumulated precision loss across many reports |
| `MyPerformanceHistory` | Investor | `report.rate.toFixed(3)` | OK -- rate is small number |
| `InvestorPortfolioPage` | Investor | `item.itdReturn.toFixed(3)` | OK -- rate |
| `PerformanceCard` | Investor | Display only | OK |

### F. `statements` table

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `StatementsPage` | Investor | `toNum()` + `formatInvestorAmount()` | OK for display |
| `StatementsPage` rate display | Investor | `toNum(statement.rate_of_return_mtd).toFixed(3)` | OK -- rate |
| `StatementsPage` PDF data | Investor | `toNum()` for 20+ fields (lines 61-112) | **P3: All statement values converted to JS `number` before passing to PDF generator. For BTC positions >10M, this could cause dust-level display errors in PDFs** |

### G. `fee_allocations` / `ib_allocations` / `ib_commission_ledger`

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `FeeRevenueKPIs` | Admin | `toNumber(fee.amount)` in reduce | **P3: Float accumulation across many fee records** |
| `WithdrawalStats` | Admin | Display counts only | OK |

### H. `withdrawal_requests`

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `WithdrawalsTable` | Admin | `FinancialValue` | OK |
| `ApproveWithdrawalDialog` | Admin | `Decimal` for dust calc, `formatAssetAmount` for display | OK |
| `CreateWithdrawalDialog` | Admin | `parseFinancial().toNumber()` for validation | OK -- comparison only |

### I. Investor Yield History (`investor_yield_events` view)

| Component | Portal | Rendering Method | Issues |
|---|---|---|---|
| `YieldHistoryPage` | Investor | `parseFinancial().toNumber()` for totals + `formatInvestorNumber()` | **P2: Lines 275-281 and 408-410 use `.toNumber()` after Decimal accumulation -- the accumulated Decimal is correct but converting to `number` at the end loses precision for display** |

---

## Categorized Issues

### P1 -- Arithmetic Bugs Affecting Displayed Numbers

| # | File | Line(s) | Issue | Fix |
|---|---|---|---|---|
| 1 | `YieldPreviewResults.tsx` | 70-71 | `trueTotalGross` computed via JS `+` operator in `.reduce()` -- float accumulation error across many investors | Use `Decimal` accumulator: `distributions.reduce((acc, inv) => acc.plus(new Decimal(inv.grossYield)), new Decimal(0))` |

### P2 -- Precision Loss in Edit/Mutation Paths

| # | File | Line(s) | Issue | Fix |
|---|---|---|---|---|
| 2 | `FundPositionCard.tsx` | 90 | `parseFloat(value)` feeds into performance mutation | Replace with `parseFinancial(value).toNumber()` or keep as string |
| 3 | `MonthlyReportsTable.tsx` | 106 | `parseFloat(editValue)` for cell save | Replace with `parseFinancial(editValue)` |
| 4 | `ExpertPositionsTable.tsx` | 156, 175, 196 | `Number(e.target.value)` for position edits | Replace with `parseFloat()` minimum or `parseFinancial()` |
| 5 | `YieldInputForm.tsx` | 301-307 | `parseFloat(yieldAmount)` for display preview | Replace with `toNum(yieldAmount)` (consistent with rest of codebase) |
| 6 | `AdminStatementGenerator.tsx` | 89-101 | `Number()` for report aggregation | Use `Decimal` accumulator |
| 7 | `YieldHistoryPage.tsx` | 275-281, 408-410 | `parseFinancial().toNumber()` in accumulation loop | Keep Decimal throughout; only `.toNumber()` at final display |

### P3 -- Low Risk Display Precision

| # | File | Line(s) | Issue | Fix |
|---|---|---|---|---|
| 8 | `StatementsPage.tsx` | 61-112 | All 20+ statement values converted to JS `number` for PDF | For current AUM scale (sub-$1M), dust is below display threshold. Monitor as AUM grows. |
| 9 | `FeeRevenueKPIs.tsx` | 26 | Float accumulation of fee amounts | Same -- monitor at scale |

### Clean -- Components Using Safe Patterns

The following components use `FinancialValue` (Decimal.js internally) or `formatAssetAmount`/`formatInvestorAmount` which are safe for display:

- `LedgerTable`, `WithdrawalsTable`, `YieldsTable`, `VoidDistributionDialog`, `VoidTransactionDialog`, `UnvoidTransactionDialog`, `InvestorPositionsTab`, `InvestorOverviewTab`, `InvestorOverviewPage`, `InvestorPortfolioPage`, `ApproveWithdrawalDialog` display path, `FundSnapshotCard`

---

## Gateway Violations (Direct Supabase Calls from Components)

| File | Line | Call | Should Use |
|---|---|---|---|
| `ApproveWithdrawalDialog.tsx` | 106-121 | `supabase.from("investor_positions").select()` | `investorPositionService` or hook |

---

## Implementation Plan

### Phase 1: Fix P1 (1 file)
- `YieldPreviewResults.tsx`: Replace JS `.reduce()` accumulation with `Decimal` accumulator for `trueTotalGross`

### Phase 2: Fix P2 Edit Paths (5 files)
- `FundPositionCard.tsx`: Replace `parseFloat()` with `parseFinancial()` in edit handler
- `MonthlyReportsTable.tsx`: Replace `parseFloat()` with `parseFinancial()` in save handler
- `ExpertPositionsTable.tsx`: Replace `Number()` with `parseFloat()` in edit inputs
- `YieldInputForm.tsx`: Replace `parseFloat(yieldAmount)` with `toNum(yieldAmount)`
- `AdminStatementGenerator.tsx`: Use `Decimal` for report aggregation

### Phase 3: Fix P2 Display Accumulation (1 file)
- `YieldHistoryPage.tsx`: Keep Decimal throughout accumulation, only `.toNumber()` at final render

### Phase 4: Gateway Fix (1 file)
- `ApproveWithdrawalDialog.tsx`: Extract position fetch to service/hook

**Total: 8 files, 0 SQL migrations, 0 new components**

