

## Fix: "Amount must be positive" blocks zero/negative yield distributions

### Root Cause

The live `apply_investor_transaction` function has a blanket guard:

```sql
IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive';
```

This blocks ALL amounts <= 0 regardless of transaction type. But the V5 yield RPC passes `v_alloc.net` as the amount for YIELD transactions, which is legitimately zero or negative when:
- The new AUM equals the opening AUM (zero yield)
- The new AUM is less than the opening AUM (negative yield / loss month)
- Fees consume all of an investor's gross yield (net = 0)

The sign convention for YIELD in this function is `v_balance_after := v_balance_before + p_amount` — it uses the raw value, so negative amounts correctly reduce the balance. The INSERT also passes `p_amount` as-is for YIELD types. The function already handles negative yield correctly — the guard is just too strict.

### Fix

One migration to update `apply_investor_transaction`:

**Replace the blanket `p_amount <= 0` check with a type-aware check:**

```sql
-- Allow zero/negative amounts for yield-family types (negative yield, fee consumption)
-- Block zero/negative for capital flow types (DEPOSIT, WITHDRAWAL, etc.)
IF p_amount <= 0 AND p_tx_type NOT IN (
  'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE'
) THEN
  RAISE EXCEPTION 'Amount must be positive for % transactions', p_tx_type
    USING ERRCODE = 'P0001';
END IF;
```

This preserves the safety guard for deposits/withdrawals while allowing the yield engine to pass zero and negative amounts for yield-related types.

**Also fix the DUST call in V5 RPC:** The dust amount (`v_residual`) can be negative. The current V5 RPC already guards with `IF v_residual <> 0` but `apply_investor_transaction` uses `p_amount` directly for DUST (falls into the ELSE branch). Need to confirm the DUST case uses the correct sign — it should, since DUST is in the ELSE branch: `v_balance_after := v_balance_before + p_amount`.

### What This Fixes

- Zero yield distributions (new AUM = opening AUM)
- Negative yield / loss months (new AUM < opening AUM)
- Edge case where fees consume 100% of an investor's gross yield

### Risk

Low — only relaxes the guard for yield-family types. Capital flow types (DEPOSIT, WITHDRAWAL) retain the strict positive-amount check. The function's sign handling for YIELD types already correctly uses the raw amount value.

