

# Verify Every Line: Excel vs Database vs UI Rounding Audit

## Problem Identified

There are **two layers** where numbers can drift from the Excel:

### Layer 1: Database Types (Precision Loss)
The `DistributionRow` and `AllocationRow` types in `yieldDistributionsPageService.ts` declare all financial fields as JavaScript `number` (lines 25-31, 41-51). When Supabase returns `numeric(38,18)` values, the JS client silently converts them to IEEE 754 doubles (~15 significant digits). For most values this is fine, but for high-precision crypto amounts it can introduce micro-drift.

### Layer 2: UI Display Rounding
`FinancialValue.tsx` (the component used throughout the Yields table) calls `Decimal.toFixed(displayDecimals)` where `displayDecimals` comes from `ASSET_CONFIGS`:
- **BTC**: 8 decimals
- **ETH**: 6 decimals (but storage is 8)
- **SOL**: 4 decimals (storage is 9)
- **XRP**: 4 decimals (storage is 6)
- **USDT**: 2 decimals (storage is 6)

This means:
- A BTC allocation of `0.00345678901` displays as `0.00345679` (rounded at 8th decimal)
- A USDT balance of `109,538.514` displays as `109538.51` (rounded at 2nd decimal) -- and critically, **no thousand separators** because `FinancialValue` uses `Decimal.toFixed()` not `Intl.NumberFormat`

The Excel likely uses different rounding rules (e.g., showing 6 decimals for USDT, or truncating instead of rounding for BTC).

## Plan

### Step 1: Parse Excel and Query DB for All Matching Periods
- Parse every fund sheet from the uploaded accounting Excel
- For each yield period that exists in the platform, extract: AUM Before, AUM After, Gross Performance, and per-investor allocations
- Query `yield_distributions`, `yield_allocations`, `investor_positions`, and `transactions_v2` for the same periods
- Compare every single value at full precision (18 decimals)

### Step 2: Generate a Line-by-Line Comparison Report
Create a detailed CSV/Excel showing for each distribution and each investor allocation:

| Field | Excel Value | DB Value | UI Display | Match? | Delta |
|-------|------------|----------|------------|--------|-------|

This covers:
- Distribution-level: gross_yield, net_yield, total_fees, total_ib, recorded_aum
- Allocation-level: gross_amount, fee_amount, ib_amount, net_amount, position_value_at_calc
- Position-level: current_value (ending balance per investor)

### Step 3: Fix Type Safety (number to string)
Change all financial fields in `DistributionRow` and `AllocationRow` from `number` to `string` to preserve full database precision through the service layer. Update `FinancialValue` calls accordingly (it already accepts `string | number`).

**Files changed:**
- `src/services/admin/yields/yieldDistributionsPageService.ts` -- change type declarations
- No component changes needed (`FinancialValue` already handles both)

### Step 4: Align Display Decimals with Excel
Based on findings from Step 2, adjust `displayDecimals` in `ASSET_CONFIGS` (in `src/types/asset.ts`) if the Excel uses different precision than what the UI shows. For example, if the Excel shows USDT to 6 decimals but the UI shows 2, we either:
- Match the Excel (change displayDecimals)
- Or accept the rounding difference as intentional (admin sees full precision on hover via tooltip)

### Step 5: Add Thousand Separators to FinancialValue
Currently `FinancialValue` outputs raw `Decimal.toFixed()` without locale formatting (no commas). This makes large USDT values like `109538.51` hard to read vs the Excel's `109,538.51`. Add `Intl.NumberFormat` formatting while preserving Decimal.js precision.

**File changed:**
- `src/components/common/FinancialValue.tsx` -- format with locale after Decimal.toFixed

## Technical Details

### Current Display Pipeline
```text
DB: numeric(38,18) "109538.514321000000"
  -> Supabase JS: number 109538.514321  (precision loss possible)
  -> FinancialValue: Decimal("109538.514321").toFixed(2) = "109538.51"
  -> Rendered: "109538.51 USDT" (no commas)
```

### Proposed Pipeline
```text
DB: numeric(38,18) "109538.514321000000"
  -> Supabase JS: string "109538.514321000000" (full precision preserved)
  -> FinancialValue: Decimal("109538.514321").toFixed(2) = "109538.51"
  -> Intl.NumberFormat: "109,538.51"
  -> Rendered: "109,538.51 USDT"
```

### Risk Assessment
- Type change from `number` to `string` is safe -- all downstream consumers (`FinancialValue`, `Decimal.js`) already accept both
- Thousand separators are a display-only change, no data impact
- Display decimal changes need careful review against Excel to pick the right values

