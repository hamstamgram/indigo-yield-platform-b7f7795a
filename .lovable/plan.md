

# Fix: Full Exit Dust Not Being Swept via Manual Transaction Dialog

## Diagnosis

Ryan's withdrawal went through the **manual AddTransactionDialog** (not the Withdrawal Request queue). Evidence: the transaction `reference_id` starts with `manual:` and there is no `withdrawal_requests` record for Ryan.

The manual dialog has client-side dust routing logic (lines 105-129 of `useTransactionSubmit.ts`) that:
1. Re-fetches the position balance after the withdrawal transaction
2. Calls `executeInternalRoute` to sweep dust to INDIGO Fees

**However**, the dust routing either silently failed or the `full_withdrawal` toggle was not activated. The `catch` block on line 126 only shows a warning toast — easy to miss. No dust sweep transactions exist in the ledger for Ryan.

There are **two separate problems**:

### Problem 1: Client-side dust routing is fragile
The manual transaction dialog creates the withdrawal first, then attempts dust routing as a separate client-side call. If the second call fails (network, RLS, timing), you get a partial state: withdrawal done, dust stranded.

### Problem 2: Amount auto-fill uses `Math.floor(balance * 1000) / 1000` 
When Full Exit is toggled ON (line 238), the amount is set to `Math.floor(currentBalance * 1000) / 1000`. If `currentBalance` was stale or the user manually typed `158.8` instead of using the auto-filled value, the dust calculation diverges.

## Fix

**Make the manual transaction dialog's Full Exit path use the same `approve_and_complete_withdrawal` RPC** that the Withdrawal Request flow uses. This ensures dust sweeping happens atomically in the database, not via two separate client-side calls.

### Changes

**`src/features/admin/transactions/hooks/useTransactionSubmit.ts`**:
- When `data.full_withdrawal && data.txn_type === "WITHDRAWAL"`:
  - Instead of calling `createInvestorTransaction` + client-side `executeInternalRoute`
  - Create a withdrawal request via direct insert, then call `approve_and_complete_withdrawal` RPC with `p_is_full_exit=true` and `p_processed_amount` set to the entered amount
  - This ensures dust sweep happens atomically in one DB transaction
  - Remove the fragile client-side dust routing code

**Alternative (simpler, lower risk)**: Keep the current two-step approach but make it more robust:
- After the withdrawal transaction succeeds, re-fetch position balance
- If balance > 0 and `full_withdrawal` is true, call `internal_route_to_fees` RPC
- If dust routing fails, **automatically retry once** and if still failing, show an error (not just a warning)
- Add the dust amount to the success toast so admin can verify

### Recommended approach: Alternative (simpler)

The full RPC rewrite is cleaner but riskier — it changes how the manual dialog works. The simpler fix addresses the silent failure and makes the existing path reliable:

1. **Improve error handling**: Change the `catch` from `toast.warning` to `toast.error` with the actual error message
2. **Add retry logic**: One automatic retry before giving up
3. **Log the actual error**: The current code logs to console but doesn't surface the real failure reason
4. **Verify `full_withdrawal` flag reaches submit**: Confirm the form data properly passes the boolean

## Files to Change

| File | Change |
|------|--------|
| `src/features/admin/transactions/hooks/useTransactionSubmit.ts` | Improve dust routing: better error handling, retry, surface real errors |

