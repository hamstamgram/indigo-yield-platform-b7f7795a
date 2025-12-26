# IB (Introducing Broker) Flow

## Overview
IBs earn commissions from referred investor yields. IB relationships stored on profiles.

## Operations

### Assign IB Parent
**Update**: profiles.ib_parent_id, profiles.ib_percentage
**Effect**: Future yield distributions create ib_allocations

### Reassign IB
**Update**: profiles.ib_parent_id
**Effect**: Historical allocations unchanged, future allocations go to new IB

### Mark Payout Paid
**Update**: ib_allocations.payout_status = 'paid', paid_at, paid_by
**Idempotency**: allocation.id

## Commission Calculation
```sql
ib_fee_amount = source_net_income * ib_percentage
```

## Cache Invalidation
```typescript
queryClient.invalidateQueries({ queryKey: ['ib-allocations'] });
queryClient.invalidateQueries({ queryKey: ['investors'] });
```

## Status: ✅ PASS
