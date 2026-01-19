# Yield Distribution Flow

## Overview
Monthly yield distribution to investors with fee and IB allocation.

## RPCs

### `preview_daily_yield_to_fund_v3`
**Reads**: investor_positions, profiles (fee%, IB relationships)
**Returns**: JSON preview of allocations (no writes)

### `apply_daily_yield_to_fund_v3`
**Preconditions**: Admin authenticated, fund active, valid date
**Inputs**: fund_id, date, gross_yield_pct, admin_id, purpose (aum_purpose enum)
**Writes**: yield_distributions, transactions_v2, fee_allocations, ib_allocations, investor_positions, fund_daily_aum
**Idempotency**: reference_id unique on transactions_v2, distribution_id + investor_id unique on allocations
**Postconditions**: Conservation (gross = net + fees), Position = Ledger

## Invariant
```sql
yield_distributions.gross_yield = SUM(interest) + SUM(fee_allocations.fee_amount)
```

## Cache Invalidation
```typescript
queryClient.invalidateQueries({ queryKey: ['yield-distributions'] });
queryClient.invalidateQueries({ queryKey: ['transactions'] });
queryClient.invalidateQueries({ queryKey: ['investor-positions'] });
queryClient.invalidateQueries({ queryKey: ['ib-allocations'] });
```

## Status: ✅ PASS

## Related Documentation
- [YIELD_FUNCTIONS.md](../patterns/YIELD_FUNCTIONS.md) - Canonical function reference
