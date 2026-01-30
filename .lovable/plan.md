
# Fix: `void_transaction` Config Not Propagating Due to Nested SECURITY DEFINER

## Root Cause Analysis

The void operation is failing with:
```
CANONICAL_MUTATION_REQUIRED: Direct UPDATE on fund_aum_events is blocked
```

### Why The Bypass Isn't Working

The `set_canonical_rpc()` wrapper function uses `SECURITY DEFINER` which creates an **isolated execution context**:

```text
void_transaction (SECURITY DEFINER)
  |
  +-> set_canonical_rpc(true) (SECURITY DEFINER)
  |     |
  |     +-> set_config('indigo.canonical_rpc', 'true', true)
  |     |   ^^^ LOCAL scope: applies ONLY to this inner function
  |     |
  |     +-> RETURN (config is discarded)
  |
  +-> UPDATE fund_aum_events (config no longer visible!)
      |
      +-> enforce_canonical_aum_event_mutation() TRIGGER
          |
          +-> is_canonical_rpc() returns FALSE
          |
          +-> RAISE EXCEPTION
```

The third parameter of `set_config(..., true)` means LOCAL scope, which is discarded when `set_canonical_rpc()` returns because it's `SECURITY DEFINER`.

### Evidence

Database logs show:
```
ERROR: CANONICAL_MUTATION_REQUIRED: Direct UPDATE on fund_aum_events is blocked
```

This proves the config isn't visible when the trigger fires.

## Solution

Replace the wrapper function call with a **direct `set_config()` call** inside `void_transaction`:

```sql
-- BEFORE (broken):
PERFORM public.set_canonical_rpc(true);  -- Nested SECURITY DEFINER

-- AFTER (working):
PERFORM set_config('indigo.canonical_rpc', 'true', true);  -- Direct call
PERFORM set_config('app.canonical_rpc', 'true', true);     -- Backup namespace
```

This keeps the config in the **same execution context** as the UPDATE statement.

## Migration Details

### 1. Fix `void_transaction` RPC

```sql
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided int := 0;
BEGIN
  -- CRITICAL FIX: Set config DIRECTLY, not via wrapper function
  -- This ensures the config is visible in THIS function's context
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Admin check
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- Get transaction record
  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;

  IF v_tx.is_voided THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction already voided'
    );
  END IF;

  -- Void the transaction
  UPDATE public.transactions_v2
  SET 
    is_voided = true,
    voided_at = now(),
    voided_by = p_admin_id,
    voided_by_profile_id = p_admin_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Cascade void to related fund_aum_events
  -- Match by reference_id (shared key), NOT by transaction UUID
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL', 'FIRST_INVESTMENT', 'TOP_UP') THEN
    UPDATE public.fund_aum_events
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: transaction ' || p_transaction_id::text || ' voided'
    WHERE fund_id = v_tx.fund_id
      AND is_voided = false
      AND (
        (v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
        OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL AND event_date = v_tx.tx_date)
      );
    
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- Log the void action
  INSERT INTO public.audit_log (
    action, entity, entity_id, actor_user,
    old_values, new_values, meta
  ) VALUES (
    'VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object(
      'is_voided', false,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'fund_id', v_tx.fund_id,
      'investor_id', v_tx.investor_id,
      'reference_id', v_tx.reference_id
    ),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_at', now(),
      'aum_events_voided', v_aum_events_voided
    ),
    jsonb_build_object(
      'source', 'void_transaction_rpc',
      'admin_id', p_admin_id,
      'cascade_match_field', 'reference_id',
      'config_fix', 'direct_set_config'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', now(),
    'aum_events_voided', v_aum_events_voided,
    'message', 'Transaction voided successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
```

### 2. Void Currently Orphaned AUM Event

The migration will also include a data fix for the existing orphaned record:

```sql
-- Void the currently orphaned fund_aum_events record
PERFORM set_config('indigo.canonical_rpc', 'true', true);
PERFORM set_config('app.canonical_rpc', 'true', true);

UPDATE fund_aum_events fae
SET 
  is_voided = true,
  voided_at = now(),
  void_reason = 'Data fix: orphaned from previous void failure'
WHERE fae.is_voided = false
  AND EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.is_voided = true
      AND t.reference_id IS NOT NULL
      AND t.reference_id = fae.trigger_reference
  );
```

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Void fails with CANONICAL_MUTATION_REQUIRED | `set_canonical_rpc()` wrapper uses SECURITY DEFINER, config scoped to that function | Use `set_config()` directly in `void_transaction` |
| Orphaned AUM events | Previous voids failed mid-way | Data migration to void orphans |
| Stale Opening AUM | Orphaned AUM events not voided | Fixed by cascade + data cleanup |

## Files to Create

- `supabase/migrations/20260130_fix_void_transaction_direct_config.sql`

## Testing After Implementation

1. Refresh the app
2. Create a new deposit transaction
3. Void the deposit
4. Verify **both** transaction AND fund_aum_events are voided
5. Confirm Opening AUM shows 0 SOL
6. Create another deposit to verify flow works end-to-end
