

# Fix: Apply Yield "Invalid response from server"

## Root Cause

The PostgreSQL function `apply_segmented_yield_distribution_v5` returns a **UUID** (the `distribution_id`), not a JSON object. The frontend code casts the result to `V5YieldRPCResult` (expecting `{ success: true, gross_yield: ..., ... }`), but since `data` is actually a UUID string, `result.success` is `undefined`, which triggers the error on line 78:

```
throw new Error(result?.error || "Apply failed: Invalid response from server");
```

The **preview** RPC works fine because `preview_segmented_yield_distribution_v5` returns `Json`.

## Fix

Rewrite `src/services/admin/yields/yieldApplyService.ts` lines 75-79 to:

1. Accept the UUID return value as the `distribution_id`
2. Query the `yield_distributions` table to fetch the actual result data (which was already inserted by the RPC)
3. Build the `YieldCalculationResult` from the queried row instead of from the RPC response

```text
Before (broken):
  const result = data as unknown as V5YieldRPCResult;
  if (!result || !result.success) {
    throw new Error(result?.error || "Apply failed: Invalid response from server");
  }

After (fixed):
  const distributionId = data as unknown as string;
  if (!distributionId) {
    throw new Error("Apply failed: no distribution ID returned");
  }

  // Fetch the distribution row the RPC just created
  const { data: dist, error: fetchErr } = await supabase
    .from("yield_distributions")
    .select("*")
    .eq("id", distributionId)
    .single();

  if (fetchErr || !dist) {
    throw new Error("Apply succeeded but failed to fetch distribution details");
  }
```

Then replace all `result.xxx` references (lines 104-166) with `dist.xxx` field names from the `yield_distributions` table:
- `result.opening_aum` becomes `dist.opening_aum`
- `result.gross_yield` becomes `dist.gross_yield`
- `result.net_yield` becomes `dist.net_yield`
- `result.total_fees` becomes `dist.total_fees`
- `result.total_ib` becomes `dist.total_ib`
- `result.investor_count` becomes `dist.investor_count`
- `result.recorded_aum` becomes `dist.recorded_aum`
- `result.period_start` becomes `dist.period_start`
- `result.period_end` becomes `dist.period_end`
- `result.dust_amount` becomes `dist.dust_amount`
- `result.fund_code` / `result.fund_asset` -- not in the distribution table, will use fund query (already fetched as `fundInfo`)
- `result.conservation_check` / `result.segment_count` / `result.crystals_consolidated` / `result.features` -- not stored in distribution table, use sensible defaults

## Technical Details

**File**: `src/services/admin/yields/yieldApplyService.ts`

The full rewrite of lines 75-167 replaces the broken `V5YieldRPCResult` cast with a query to `yield_distributions` using the returned UUID, and maps all fields from the queried row. The `V5YieldRPCResult` import can be removed since it's no longer used in this file.

**No database changes needed.** The RPC and table are correct; only the frontend interpretation was wrong.

