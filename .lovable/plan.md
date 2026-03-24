

# Fix: Withdrawal Decimal Input + Yield Precision Limits

## Issue 1: Withdrawal Input Treats Comma as Thousand Separator

**What's happening**: When you type `1,01` (European decimal notation), the `NumericInput` component strips the comma (treating it as a thousand separator) via `parseNumericInput()`, turning `1,01` into `101`. On blur, this becomes `1.01` but during typing it shows `101` or `1.001`.

**Root cause**: `parseNumericInput()` at line 50-52 of `NumericInput.tsx` does `value.replace(/[,\s]/g, "")` -- it unconditionally removes ALL commas. The `handleChange` regex `/^-?\d*\.?\d*$/` only accepts dots as decimal separators.

**Fix in `src/components/common/NumericInput.tsx`**:
- In `parseNumericInput()`, detect if a comma is being used as a decimal separator (e.g., `1,01` has exactly one comma and no dot) and convert it to a dot
- Rule: if the string contains a single comma and no dot, and the part after the comma has 1-6 digits, treat the comma as a decimal separator
- If there are multiple commas (thousand separators like `1,000,000`), strip them as today

---

## Issue 2: Yield Calculations Truncate at 8 Decimals

**What's happening**: The preview and apply RPCs use `ROUND(..., 8)` which truncates results to 8 decimal places. The database columns are `NUMERIC(38,18)`, so there's no reason to round at 8.

**Root cause**: Two database functions have hardcoded precision:
1. **`preview_segmented_yield_distribution_v5`** (baseline `20260307000008`): Uses `ROUND(..., 8)` in 3 places
2. **`apply_segmented_yield_distribution_v5`** (latest `20260319153751`): Uses `ROUND(..., 10)` in 3 places

Both should use `ROUND(..., 18)` to match the column precision.

**Fix**: One new migration that re-creates both functions, changing all `ROUND(..., 8)` and `ROUND(..., 10)` calls to `ROUND(..., 18)`.

Additionally, the `ASSET_PRECISION` map in `src/types/asset.ts` and the `formatAssetAmount` function in `src/utils/assets.ts` cap display precision (e.g., SOL at 6, BTC at 8). These are **display** limits and are correct for UI rendering -- they do NOT affect calculations. No changes needed there.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/common/NumericInput.tsx` | Smart comma-as-decimal detection in `parseNumericInput()` |
| New migration SQL | Update both `preview_segmented_yield_distribution_v5` and `apply_segmented_yield_distribution_v5` to use `ROUND(..., 18)` |

## Migration Details

The migration will:
1. `CREATE OR REPLACE` the preview function, copying the current body from `20260307000008` but replacing `ROUND(..., 8)` with `ROUND(..., 18)`
2. `CREATE OR REPLACE` the apply function, copying the current body from `20260319153751` but replacing `ROUND(..., 10)` with `ROUND(..., 18)`

This is safe because columns already support `NUMERIC(38,18)` and increasing internal precision cannot break existing data.

