

# Full Precision Audit: Remaining Issues

## Already Fixed (Previous Rounds)
- DistributeYieldDialog: `grossYield` now receives raw string (comma truncation fix)
- YieldPreviewResults: `trueTotalGross` uses Decimal accumulator
- AdminStatementGenerator: summary totals use Decimal accumulator (lines 90-91)
- YieldInputForm: uses `toNum()` instead of `parseFloat()`
- MonthlyReportsTable: uses Decimal for save
- ExpertPositionsTable: uses `parseFloat()` for edit inputs

## Still Broken -- Precision Loss Affecting Excel Parity

### P1: DistributeYieldDialog Ending Balance (line 257)
`toNum(asOfAum || 0) + toNum(grossYield)` -- JS `+` on two floats. For large AUM (e.g., 109538.51 + 5803.10) this is safe at current scale, but violates the Decimal-everywhere standard. Should use `new Decimal(asOfAum || 0).plus(new Decimal(grossYield)).toNumber()` for the `formatValue()` call.

### P2: YieldHistoryPage accumulation loop (lines 276-284)
Each iteration converts back to `number` via `.toNumber()` then re-wraps in `parseFinancial()` next iteration. This defeats Decimal precision. The `fg.totals` object stores numbers, so every add cycle goes Decimal -> Number -> Decimal -> Number.
**Fix**: Store `fg.totals` as Decimal objects, only `.toNumber()` at render time.

### P3: AdminStatementGenerator position rows (lines 97-102)
While the summary uses Decimal, individual position rows still use `Number(r.mtd_beginning_balance || 0)` etc. (6 fields). These feed into PDF generation.
**Fix**: Use `parseFinancial(...).toNumber()` for safe handling of numeric(38,18) strings.

### P4: FundPositionCard edit handler (line 91)
`parseFloat(value) || 0` feeds into edit state and then mutation. The Decimal auto-calc on lines 96-101 operates on these floats.
**Fix**: Use `toNum(value)` (which handles edge cases better) or keep string and parse with Decimal.

### P5: FeeRevenueKPIs accumulation (line 26)
`(map.get(fee.asset) || 0) + toNumber(fee.amount)` -- JS float accumulation across many fees.
**Fix**: Use Decimal accumulator, `.toNumber()` only for display.

### P6: investorPositionService `mapPositionToExpert` (lines 112-117)
`parseFinancial(...).toNumber()` for `shares`, `cost_basis`, `current_value`, `total_earnings`. The comment on line 118-120 acknowledges this is acceptable at soft-launch scale but should migrate to strings. The `ExpertPosition` type uses `number`, so this requires a type change too.
**Status**: Documented tech debt, not blocking Excel parity since these are display values already rounded by DB.

### P7: CSV Export (csv-export.ts lines 215-297)
All `parseFloat(v).toFixed(4)` formatters. For CSV export this is acceptable (4dp output), but could silently truncate if values have >15 significant digits.
**Status**: Low risk at current scale.

### P8: withdrawalService (lines 448, 627)
`Number(params.amount)` -- amount goes into DB insert. Should use string or parseFinancial.
**Fix**: Pass `params.amount` as string directly (DB column is numeric, accepts strings).

---

## Implementation Plan (6 files, ordered by impact)

### File 1: `DistributeYieldDialog.tsx` (line 257)
Replace `toNum(asOfAum || 0) + toNum(grossYield)` with Decimal addition:
```ts
new Decimal(asOfAum || 0).plus(new Decimal(grossYield || 0)).toNumber()
```

### File 2: `YieldHistoryPage.tsx` (lines 265-284)
Change `fg.totals` from `{ gross: number, fees: number, net: number }` to `{ gross: Decimal, fees: Decimal, net: Decimal }`. Accumulate with `.plus()`. Only `.toNumber()` at the render call sites.

### File 3: `AdminStatementGenerator.tsx` (lines 97-102)
Replace 6 `Number(r.field)` calls with `parseFinancial(r.field).toNumber()`.

### File 4: `FundPositionCard.tsx` (line 91)
Replace `parseFloat(value) || 0` with `toNum(value)` in edit handler.

### File 5: `FeeRevenueKPIs.tsx` (lines 23-31)
Replace JS float accumulation with Decimal:
```ts
const map = new Map<string, Decimal>();
for (const fee of fees) {
  const prev = map.get(fee.asset) || new Decimal(0);
  map.set(fee.asset, prev.plus(new Decimal(fee.amount || 0)));
}
```

### File 6: `withdrawalService.ts` (lines 448, 627)
Replace `Number(params.amount)` with `parseFinancial(params.amount).toNumber()` or pass string directly.

**Total: 6 files, ~20 line changes, 0 SQL migrations**

