

# Fix: Yield Distribution Shows "0.000 BTC distributed to 0 investors"

## Root Cause

The `apply_segmented_yield_distribution_v5` RPC returns JSON with these field names:
- `gross`, `net`, `fees`, `ib`, `allocations`

But `yieldApplyService.ts` (lines 88-96) reads:
- `gross_yield`, `net_yield`, `total_fees`, `total_ib`, `allocation_count`

Every field falls through to the `?? 0` default, so the result always shows 0 yield and 0 investors despite the distribution actually succeeding in the database.

## Fix

**File**: `src/features/admin/yields/services/yields/yieldApplyService.ts` lines 88-96

Update the `distData` mapping to read the correct RPC field names:

```ts
const distData = {
  opening_aum: String(rpcResult.opening_aum ?? 0),
  recorded_aum: String(rpcResult.recorded_aum ?? 0),
  gross_yield: String(rpcResult.gross ?? rpcResult.gross_yield ?? 0),
  net_yield: String(rpcResult.net ?? rpcResult.net_yield ?? 0),
  total_fees: String(rpcResult.fees ?? rpcResult.total_fees ?? 0),
  total_ib: String(rpcResult.ib ?? rpcResult.total_ib ?? 0),
  total_fee_credit: "0",
  total_ib_credit: "0",
  investor_count: Number(rpcResult.allocations ?? rpcResult.allocation_count ?? 0),
  period_start: rpcResult.period_start as string,
  period_end: rpcResult.period_end as string,
  dust_amount: String(rpcResult.dust_amount ?? 0),
};
```

Uses fallback pattern (`rpcResult.gross ?? rpcResult.gross_yield`) so it works regardless of which RPC version is deployed.

## Impact

- The success dialog and toast will now show the correct gross yield amount and investor count
- No database changes needed — the RPC is working correctly, only the frontend field mapping is wrong
- Single file, ~5 lines changed

