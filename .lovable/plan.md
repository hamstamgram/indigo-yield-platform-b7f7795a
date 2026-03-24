

# Yield Precision Audit Results

## Findings

The recent migration (`20260324124705`) updated **two** functions to `ROUND(..., 18)`:
1. `calculate_yield_allocations` -- used by the preview UI helper
2. `apply_segmented_yield_distribution_v5` -- the main apply RPC

**However, three functions still use `ROUND(..., 8)` and were never updated:**

| Function | Location | Status |
|----------|----------|--------|
| `preview_segmented_yield_distribution_v5` | `20260307000008` (latest) | ROUND(..., 8) in 6 places |
| `calc_avg_daily_balance` | Baseline only | ROUND(..., 8) on return value |
| `preview_daily_yield_to_fund_v3` | Baseline only | ROUND(..., 8) in 4+ places |

### Impact

- **`preview_segmented_yield_distribution_v5`**: This is the **primary preview RPC** called from the UI (`yieldPreviewService.ts`). It truncates all allocation amounts to 8 decimal places before returning them. The apply function then recalculates independently with 18dp, so preview and apply can show slightly different numbers.

- **`calc_avg_daily_balance`**: Returns `ROUND(result, 8)`. This helper is used inside `preview_daily_yield_to_fund_v3` (the older ADB-based preview). Rounding the ADB to 8dp cascades into allocation calculations.

- **`preview_daily_yield_to_fund_v3`**: The older preview RPC. Still registered in `rpcSignatures.ts` but appears secondary to the V5 segmented preview.

### Frontend Display

The `formatAssetAmount` function correctly handles display-only rounding based on asset type. No changes needed on the frontend.

## Fix Plan

**One new migration** that re-creates the three stale functions with `ROUND(..., 18)`:

1. **`preview_segmented_yield_distribution_v5`**: Copy body from migration `20260307000008`, replace all 6 occurrences of `ROUND(..., 8)` with `ROUND(..., 18)`
2. **`calc_avg_daily_balance`**: Replace `ROUND(v_result, 8)` with `ROUND(v_result, 18)` 
3. **`preview_daily_yield_to_fund_v3`**: Replace all `ROUND(..., 8)` with `ROUND(..., 18)` for consistency

### Files to Change

| File | Change |
|------|--------|
| New migration SQL | `CREATE OR REPLACE` for all three functions, `ROUND(..., 8)` → `ROUND(..., 18)` |

No frontend changes needed. This ensures preview and apply use identical precision, and all intermediate calculations preserve full `NUMERIC(38,18)` fidelity.

