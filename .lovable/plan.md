

# Fix: "Permission denied for function void_transaction"

## Problem

The database logs clearly show repeated errors:
```
permission denied for function void_transaction
```

This means the `void_transaction` RPC function exists but the `authenticated` role (used by logged-in users via Supabase) does not have `EXECUTE` permission on it. Every attempt to void a deposit (or any transaction) from the Admin Transactions page fails with this error.

The same issue also affects `get_void_transaction_impact` (the impact preview), and `get_investor_reports_v2`.

## Root Cause

The function was likely created with `SECURITY DEFINER` but the `GRANT EXECUTE` statement was either missing or was lost during a migration.

## Fix

Run a single SQL migration to grant execute permissions on the affected functions:

```sql
-- Grant execute on void_transaction and related functions to authenticated role
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_void_transaction_impact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investor_reports_v2(uuid, uuid) TO authenticated;
```

Note: The exact parameter signatures may need verification. I will check the precise signatures from the database types before running the migration.

## Technical Details

- **Affected functions**: `void_transaction`, `get_void_transaction_impact`, `get_investor_reports_v2`
- **Required grant**: `EXECUTE` to `authenticated` role
- **No code changes needed** -- the frontend service layer (`adminTransactionHistoryService.voidTransaction`) and the `VoidTransactionDialog` component are correctly implemented
- **Security**: The functions themselves contain internal `is_admin()` / `check_is_admin()` guards, so granting `EXECUTE` to `authenticated` is safe -- non-admin users will still be rejected inside the function body

## Steps
1. Verify exact function signatures from `supabase/types`
2. Run SQL migration with `GRANT EXECUTE` statements
3. Test voiding a deposit from the Admin Transactions page

