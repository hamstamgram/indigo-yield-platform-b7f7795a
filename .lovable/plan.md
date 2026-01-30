
# Fix: void_transaction Must Match by reference_id, NOT transaction_id UUID

## Root Cause Analysis

The `void_transaction` RPC has a **fundamental linkage bug**:

### How Transactions and AUM Events are Linked

When a deposit is created via `apply_deposit_with_crystallization`:
1. A `trigger_reference` string is generated: `DEP-{investor_id}-{date}-{random}`
2. This string is stored in **both**:
   - `transactions_v2.reference_id` = `'DEP-ec182081-...-cace8cff'`
   - `fund_aum_events.trigger_reference` = `'DEP-ec182081-...-cace8cff'`

### The Bug

Current `void_transaction` code:
```sql
-- WRONG: Searching for transaction UUID in trigger_reference
trigger_reference LIKE '%' || p_transaction_id::text || '%'
-- This searches for: '6a1822e6-1538-4b3b-b238-8dbcaf3de72f'
-- But trigger_reference contains: 'DEP-ec182081-...-cace8cff'
-- Result: NEVER MATCHES
```

Should be:
```sql
-- CORRECT: Match by the shared reference_id string
trigger_reference = v_tx.reference_id
-- This compares: 'DEP-ec182081-...-cace8cff' = 'DEP-ec182081-...-cace8cff'
-- Result: EXACT MATCH
```

### Evidence

| Transaction | reference_id | Voided | AUM Event | trigger_reference | Voided |
|-------------|--------------|--------|-----------|-------------------|--------|
| `6a1822e6...` | `DEP-ec182...-cace8cff` | **Yes** | `42e777ff...` | `DEP-ec182...-cace8cff` | **No** |

The strings match exactly, but the void cascade failed because it was looking for the wrong value.

## Solution

### Part 1: Fix void_transaction RPC

Update the cascade logic to match by `reference_id`:

```sql
-- Cascade void to related fund_aum_events for DEPOSIT/WITHDRAWAL transactions
IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL', 'FIRST_INVESTMENT', 'TOP_UP') 
   AND v_tx.reference_id IS NOT NULL THEN
  UPDATE public.fund_aum_events
  SET 
    is_voided = true,
    voided_at = now(),
    voided_by = p_admin_id,
    voided_by_profile_id = p_admin_id,
    void_reason = 'Cascade void: transaction ' || p_transaction_id::text || ' voided'
  WHERE fund_id = v_tx.fund_id
    AND is_voided = false
    AND trigger_reference = v_tx.reference_id;  -- EXACT MATCH on shared key
  
  GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
END IF;
```

### Part 2: Data Fix for Current Orphan

Void the existing orphaned AUM event that was missed:

```sql
-- Fix the currently orphaned AUM event
UPDATE fund_aum_events fae
SET 
  is_voided = true,
  voided_at = now(),
  void_reason = 'Data fix: transaction with matching reference_id was voided'
WHERE fae.is_voided = false
  AND EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.is_voided = true
      AND t.reference_id IS NOT NULL
      AND t.reference_id = fae.trigger_reference  -- CORRECT linkage
  );
```

### Part 3: Also Handle Legacy Fallback

For older records that might not have matching reference_id, add a date-based fallback:

```sql
WHERE fund_id = v_tx.fund_id
  AND is_voided = false
  AND (
    -- Primary: Exact match on shared reference key
    trigger_reference = v_tx.reference_id
    -- Fallback: Same fund/date if no reference (legacy records)
    OR (v_tx.reference_id IS NULL 
        AND trigger_reference IS NULL 
        AND event_date = v_tx.tx_date)
  );
```

## Technical Implementation

### Migration File

The migration will:
1. Replace `void_transaction` with corrected matching logic
2. Fix existing orphaned `fund_aum_events` by matching on `reference_id`
3. Include proper canonical flag bypass for the data fix

### Files to Create

- `supabase/migrations/20260130_fix_void_transaction_reference_id_match.sql`

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| AUM events not voided when transaction voided | Wrong field used for matching (UUID vs string) | Match by `reference_id = trigger_reference` |
| Stale Opening AUM in yield preview | Orphaned AUM events from failed cascades | Data fix + correct matching going forward |
| Deposit blocked by negative yield | Preview reads non-voided stale AUM events | Fix linkage so events are properly voided |

## Expected Result After Fix

1. Transaction `6a1822e6...` is voided (already done)
2. AUM event `42e777ff...` is voided (will be fixed by data migration)
3. Future voids cascade correctly using `reference_id` matching
4. Yield Preview shows:
   - Opening AUM: 0 SOL
   - Pre-deposit yield: 0 SOL
   - Yield %: 0%
5. New deposits can proceed normally

## Testing After Implementation

1. Verify the orphaned AUM event is now voided
2. Refresh the Add Transaction page
3. Confirm Opening AUM shows 0 SOL
4. Create a new deposit
5. Void the deposit
6. Verify both transaction AND AUM event are voided
7. Create another deposit to confirm flow works
