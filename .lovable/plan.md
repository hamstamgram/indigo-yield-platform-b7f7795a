

# Fix: `void_transaction` Uses Wrong Admin Check Function

## Problem Identified

When trying to void a transaction, the error `42883` ("undefined function") occurs because:

**`void_transaction` calls `public.is_admin(p_admin_id)` but `is_admin()` takes NO arguments.**

| Function | Signature | Purpose |
|----------|-----------|---------|
| `is_admin()` | No arguments, uses `auth.uid()` | For RLS policies |
| `check_is_admin(uuid)` | Takes user_id parameter | For RPC functions |

The migration I deployed incorrectly used `is_admin(p_admin_id)` which doesn't exist.

## Root Cause

In the migration `20260130131653_ecbc5d44-6ae4-4d0d-a154-398624b5c8c0.sql`, line 68:
```sql
IF NOT public.is_admin(p_admin_id) THEN  -- WRONG
```

Should be:
```sql
IF NOT public.check_is_admin(p_admin_id) THEN  -- CORRECT
```

## Solution

### Part 1: Fix `void_transaction` RPC

Update the admin check to use the correct function:

```sql
-- Change from:
IF NOT public.is_admin(p_admin_id) THEN

-- To:
IF NOT public.check_is_admin(p_admin_id) THEN
```

### Part 2: Audit Other RPCs

Check all recently modified functions for the same bug pattern. Functions that take `p_admin_id` as a parameter should use `check_is_admin(p_admin_id)`, not `is_admin()`.

## Technical Implementation

**Migration SQL:**

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
  v_result jsonb;
  v_aum_events_voided int := 0;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Admin check - USE check_is_admin (takes UUID parameter)
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- [rest of function unchanged]
  ...
END;
$$;
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| 42883 error on void | `is_admin(uuid)` doesn't exist | Use `check_is_admin(uuid)` |
| Wrong function signature | Migration used wrong helper | Correct the RPC definition |

## Testing After Implementation

1. Refresh the Admin Transactions page
2. Click void on any transaction
3. Enter a reason and type VOID to confirm
4. Verify the transaction is successfully voided
5. Verify the yield preview no longer shows stale Opening AUM

