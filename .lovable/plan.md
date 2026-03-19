

## Fix: Fee percentages used as decimals instead of percentages

### Root Cause

The `apply_segmented_yield_distribution_v5` function retrieves fee and IB percentages as whole numbers (e.g. `16` for 16%, `4` for 4%) but multiplies them directly against gross yield without dividing by 100.

**Actual calculation (broken):**
- Gross yield: 355 XRP
- Fee: 355 × 16 = 5,680 (should be 56.80)
- IB: 355 × 4 = 1,420 (should be 14.20)
- Net: 355 − 5,680 = −5,325 (should be 284)

**Expected calculation:**
- Fee: 355 × 0.16 = 56.80
- IB: 355 × 0.04 = 14.20
- Net: 355 − 56.80 = 298.20 → Sam gets 284 net (after IB deducted from fee pool)

### Fix

One migration to update `apply_segmented_yield_distribution_v5`. Two lines change (lines 167–168 in the function body):

```sql
-- Before (BROKEN):
v_fee := ROUND(v_gross * v_fee_pct, 10);
v_ib  := ROUND(v_gross * v_ib_rate, 10);

-- After (FIXED):
v_fee := ROUND(v_gross * (v_fee_pct / 100.0), 10);
v_ib  := ROUND(v_gross * (v_ib_rate / 100.0), 10);
```

### Pre-fix cleanup

Before reapplying, the incorrectly applied yield distribution must be voided. The current positions (Sam: 178,678, Fees: 5,680, Ryan: 1,420) are wrong and need correction.

### Scope

- One SQL migration replacing the function
- No frontend changes needed
- The `fee_pct` and `ib_rate` values stored in `yield_allocations` remain as whole-number percentages (display convention) — only the multiplication is fixed

