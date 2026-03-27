

# Fix: Remove Orphaned `investor_yield_events` Reference from `void_transaction`

## Problem

`void_transaction` crashes with `relation "public.investor_yield_events" does not exist` because lines 72-77 unconditionally UPDATE the table, which was dropped during the V5 yield engine refactor.

## Root Cause

- `void_transaction` has a bare `UPDATE public.investor_yield_events ...` with no existence guard
- `force_delete_investor` already handles this correctly with `IF EXISTS (SELECT FROM pg_tables ...)`
- The table was dropped but the RPC was never updated

## Fix (Single Migration)

**File**: `supabase/migrations/20260327_fix_void_transaction_ghost_table.sql`

Recreate `void_transaction` with the `investor_yield_events` block wrapped in an `IF EXISTS` guard, matching the pattern already used by `force_delete_investor`:

```text
Before (crashes):
  -- CASCADE: investor_yield_events
  UPDATE public.investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE ...

After (safe):
  -- CASCADE: investor_yield_events (guarded - table may not exist post-V5)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE public.investor_yield_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id
    WHERE (trigger_transaction_id = p_transaction_id OR reference_id = v_tx.reference_id)
      AND is_voided = false;
    GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;
  END IF;
```

No other functions need changes:
- `force_delete_investor` -- already guarded
- `void_yield_distribution` -- no reference to the table

## Risk Assessment

- **Zero risk** -- adds a defensive guard only; no behavioral change when table is absent
- **Forward-compatible** -- if the table is ever re-created, the cascade will resume automatically

