

# Fix: Full Exit Dust Sweep Not Routing Remainder to INDIGO Fees

## Root Cause

The `approve_and_complete_withdrawal` RPC has a logic gap when `p_is_full_exit = true`:

```sql
IF p_is_full_exit THEN
    v_final_amount := TRUNC(v_balance, p_send_precision);  -- ignores user-entered amount!
    v_dust := v_balance - v_final_amount;
```

It **always** auto-computes the send amount via `TRUNC(balance, 3)`, completely ignoring `p_processed_amount`. So if the admin manually types `158.8` (wanting to send exactly that and sweep the rest), the RPC overrides it with `TRUNC(158.8307, 3) = 158.830`.

Conversely, if the admin enters `158.8` **without** toggling Full Exit, the RPC sends exactly `158.8` with **zero dust sweep**, leaving `0.0307` stranded on the account.

Either path produces a wrong result when the admin wants to send a custom amount and sweep the remainder.

## Fix

**Database migration** -- Update `approve_and_complete_withdrawal` to respect `p_processed_amount` when provided during a full exit:

```sql
IF p_is_full_exit THEN
    -- If admin provided a specific amount, use it; otherwise auto-truncate
    IF p_processed_amount IS NOT NULL THEN
      v_final_amount := p_processed_amount;
    ELSE
      v_final_amount := TRUNC(v_balance, p_send_precision);
    END IF;
    v_dust := v_balance - v_final_amount;
    -- Safety checks remain the same...
```

This way:
- Admin enters `158.8` + Full Exit ON → sends `158.8`, sweeps `0.0307` as dust to INDIGO Fees
- Admin leaves amount blank + Full Exit ON → auto-computes `TRUNC(balance, 3)` as before
- Full Exit OFF → works exactly as today (no dust sweep)

No frontend changes needed -- the UI already passes `processedAmount` and `isFullExit` correctly to the service.

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | Update `approve_and_complete_withdrawal` to use `p_processed_amount` when provided with `p_is_full_exit=true`, falling back to `TRUNC(v_balance, p_send_precision)` |

## Safety

- Only changes behavior when `p_is_full_exit = true` AND `p_processed_amount IS NOT NULL`
- Existing auto-truncate path (no explicit amount) is unchanged
- Non-full-exit path is completely unchanged
- Dust sweep logic (DUST_SWEEP transactions, position deactivation) remains identical

