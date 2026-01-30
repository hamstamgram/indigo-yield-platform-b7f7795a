

# Fix: Orphaned `fund_aum_events` Record Still Blocking Deposits

## Problem

One `fund_aum_events` record remains non-voided because the void was attempted before the RPC fix was deployed:

| Record ID | Event Date | Post Flow AUM | Is Voided | Transaction Status |
|-----------|------------|---------------|-----------|-------------------|
| `b1fd1b8f-7414-4171-97a0-f2d9f51f94d5` | 2025-09-04 | 1250 SOL | **false** | Transaction voided |

This stale record is being returned by the yield preview query, causing:
- Opening AUM: 1250 SOL (should be 0)
- Pre-deposit yield: -1250 SOL (false negative)

## Solution

Run a simple data fix migration to void this orphaned record:

```sql
-- Fix orphaned fund_aum_events for the SOL fund
-- Record created before void_transaction RPC was fixed

UPDATE fund_aum_events
SET 
  is_voided = true,
  void_reason = 'Data fix: orphaned record from transaction voided before RPC fix'
WHERE id = 'b1fd1b8f-7414-4171-97a0-f2d9f51f94d5'
  AND is_voided = false;
```

Alternatively, a broader cleanup to catch any similar cases:

```sql
-- Void any fund_aum_events that reference voided transactions
UPDATE fund_aum_events fae
SET 
  is_voided = true,
  void_reason = 'Data fix: transaction was voided'
WHERE fae.is_voided = false
  AND EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.is_voided = true
      AND fae.trigger_reference LIKE '%' || t.id::text || '%'
  );
```

## Implementation

1. Create migration with canonical flag bypass
2. Void the orphaned `fund_aum_events` record
3. Verify no more non-voided records exist for funds with all-voided transactions

## Expected Result

After fix:
- Opening AUM: 0 SOL (no valid checkpoints)
- Pre-deposit yield: 0 SOL
- Yield %: 0%
- Deposit can proceed normally

