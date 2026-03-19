

## Fix: `chk_yield_conservation` constraint violation

### Root Cause

The `yield_distributions` table has a check constraint:
```sql
abs(gross_yield - total_net_amount - total_fee_amount - COALESCE(total_ib_amount, 0)) < 0.01
```

The RPC stores:
- `gross_yield` = total fund yield (includes fees account's proportional share)
- `total_net_amount` = investor-only net (excludes fees account)
- `total_fee_amount` / `total_ib_amount` = investor-only fees/IB

Since the fees account now holds a position (56.80 from the previous FEE_CREDIT), it receives a proportional gross yield allocation. This share is excluded from `total_net_amount` but included in `gross_yield`, creating a gap that exceeds 0.01.

Example with current positions (Sam: 229,287 + Fees: 56.80 + Ryan: 14.20):
- Fees account gross share: ~0.109 XRP (56.80/229,358 * new yield)
- Constraint sees: `gross_yield - net - fee - ib = 0.109` > 0.01 -- fails

### Fix

One migration with two changes:

1. **Update the constraint** to use `gross_yield_amount` (investor-only gross) instead of `gross_yield` (fund-total). This is the correct column since `total_net_amount`, `total_fee_amount`, and `total_ib_amount` are all investor-only figures:
   ```sql
   DROP CONSTRAINT chk_yield_conservation;
   ADD CONSTRAINT chk_yield_conservation CHECK (
     is_voided = true
     OR gross_yield = 0
     OR total_net_amount = 0
     OR abs(gross_yield_amount - total_net_amount - total_fee_amount) < 0.01
     OR abs(gross_yield_amount - total_net_amount - total_fee_amount
            - COALESCE(total_ib_amount, 0)) < 0.01
   );
   ```

2. No RPC changes needed. No frontend changes.

### Why `gross_yield_amount`?

The RPC already sets:
- `gross_yield_amount = v_total_gross - v_fees_account_gross` (investor-only)
- `total_net_amount = v_total_net - v_fees_account_net` (investor-only)

These two are in the same basis (investor-only), so the conservation identity `gross_yield_amount = net + fee + ib` holds correctly.

