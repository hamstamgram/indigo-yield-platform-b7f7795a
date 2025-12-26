# Deposit Flow

## Overview
Admin creates deposits for investors, which update positions and fund AUM.

## RPC: `admin_create_transaction`

**Preconditions**: Admin authenticated, investor exists, fund exists
**Inputs**: investor_id, fund_id, amount, type='deposit', effective_date
**Writes**: transactions_v2, investor_positions, fund_daily_aum
**Idempotency**: reference_id unique constraint
**Postconditions**: Position = Sum(Ledger), AUM updated

## Cache Invalidation
```typescript
queryClient.invalidateQueries({ queryKey: ['deposits'] });
queryClient.invalidateQueries({ queryKey: ['transactions'] });
queryClient.invalidateQueries({ queryKey: ['investor-positions'] });
```

## Status: ✅ PASS
