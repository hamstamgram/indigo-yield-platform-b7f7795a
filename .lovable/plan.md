

## Fix: IB not subtracted from investor net yield

### Root Cause

Line 182 in the latest `apply_segmented_yield_distribution_v5` migration:

```sql
-- Current (broken):
v_net := v_gross - v_fee;

-- Should be:
v_net := v_gross - v_fee - v_ib;
```

The IB commission (14.20) is credited to Ryan's account but never deducted from Sam's net yield, creating 14.20 XRP from nothing.

### Math After Fix

```text
Sam:   YIELD    +284.00  (355 - 56.80 - 14.20)
Fees:  FEE_CREDIT +56.80
Ryan:  IB_CREDIT  +14.20
───────────────────────────
Total:           +355.00 = gross yield ✓
AUM: 184,003 + 355 = 184,358 ✓
```

### Changes

1. **One SQL migration**: Replace `apply_segmented_yield_distribution_v5`, changing only line 182 from `v_net := v_gross - v_fee` to `v_net := v_gross - v_fee - v_ib`

### Pre-requisite

Void the current incorrect distribution, then reapply after the fix.

