

## Dust Routing Fix: Audit and Plan

### Problem Summary

Paul Johnson's full exit withdrawal left **0.000660460000000000** residual dust. Two issues caused this:

1. **Race condition in frontend dust routing**: `useTransactionSubmit.ts` reads `currentBalance` (a prop) to calculate dust, but this value is stale — it was captured before the withdrawal transaction was inserted. After the withdrawal INSERT, the `trg_recompute_position_on_tx` trigger updates the position, but the frontend doesn't re-read it before calculating dust.

2. **Revenue page filter gap**: `feesService.ts` queries only `FEE_CREDIT, IB_CREDIT, YIELD, DUST, DUST_SWEEP` — missing `INTERNAL_CREDIT` and `INTERNAL_WITHDRAWAL`, so any dust routed via `internal_route_to_fees` (which creates those types) would not appear.

### Trigger/Function Audit

| Trigger/Function | Impact | Status |
|---|---|---|
| `validate_transaction_type` (trg_validate_tx_type) | Only checks balance for `WITHDRAWAL` type; `DUST_SWEEP` and `INTERNAL_WITHDRAWAL` pass through | Safe — no change needed |
| `enforce_internal_tx_visibility` | Forces `admin_only` for `INTERNAL_WITHDRAWAL`, `INTERNAL_CREDIT`, `FEE_CREDIT` | Safe — correct behavior |
| `enforce_canonical_transaction_mutation` | Allows `INTERNAL_CREDIT`, `INTERNAL_WITHDRAWAL` in allowed types array | Safe |
| `enforce_transaction_via_rpc` | Allows `internal_routing` source | Safe |
| `recompute_investor_position` | Sums ALL transaction amounts including `DUST_SWEEP`, `DUST`, `INTERNAL_WITHDRAWAL`, `INTERNAL_CREDIT` correctly | Safe |
| `complete_withdrawal` RPC | Uses `DUST_SWEEP`/`DUST` types for dust — works correctly | Safe |
| `internal_route_to_fees` RPC | Uses `INTERNAL_WITHDRAWAL`/`INTERNAL_CREDIT` types — works correctly | Safe |
| `check_historical_lock` | Called by `internal_route_to_fees` — could block dust routing if a yield distribution is locked on that date | Potential blocker — but not the current issue |

### Fix Plan

**1. Fix the race condition in `useTransactionSubmit.ts`**

After the withdrawal transaction succeeds, fetch the **live position balance** from the database instead of using the stale `currentBalance` prop. This ensures the dust amount is calculated from the actual post-withdrawal position.

```
// After successful withdrawal, re-fetch actual position balance
const { data: positionData } = await supabase
  .from("investor_positions")
  .select("current_value")
  .eq("investor_id", currentInvestorId)
  .eq("fund_id", data.fund_id)
  .single();

const actualDust = positionData?.current_value ?? 0;
if (actualDust > 0 && actualDust < dustThreshold) {
  // Route dust
}
```

**2. Add `INTERNAL_CREDIT` to Revenue page queries in `feesService.ts`**

- Line 117: Add `INTERNAL_CREDIT` to the `.or()` filter
- Line 344: Add `INTERNAL_CREDIT` and `INTERNAL_WITHDRAWAL` to the `.in()` filter

**3. Add badge for `INTERNAL_CREDIT` in `FeeTransactionsTable.tsx`**

Add a case in `getTypeBadge()` for `INTERNAL_CREDIT` displaying as "Dust Route" or similar.

**4. Data fix: Re-sweep Paul Johnson's residual dust**

Execute `internal_route_to_fees` to sweep the remaining `0.000660460000000000` from Paul Johnson's position (investor `d1f8c666`, fund `7574bc81`) to the INDIGO Fees account, zeroing out his position.

### Files Changed

| File | Change |
|---|---|
| `src/features/admin/transactions/hooks/useTransactionSubmit.ts` | Re-fetch live position balance after withdrawal before dust calculation |
| `src/services/admin/feesService.ts` | Add `INTERNAL_CREDIT` to both query filters |
| `src/features/admin/fees/components/FeeTransactionsTable.tsx` | Add `INTERNAL_CREDIT` badge case |

### What This Does NOT Touch

- No database migrations needed — all tx_type enum values already exist
- No trigger modifications — all BEFORE INSERT triggers already handle these types correctly
- No changes to `complete_withdrawal` or `internal_route_to_fees` RPCs — both work correctly
- No changes to `recompute_investor_position` — it already handles all types

