

## Fix: Double fee deduction in yield distribution

### Problem

The `apply_segmented_yield_distribution_v5` function creates a **FEE transaction on the investor** (stored as -56.80) in addition to recording the YIELD as `net` (which is already `gross - fee - ib`). Since `recompute_investor_position` sums ALL transaction amounts, the fee is deducted twice:

```text
Sam's transactions:
  YIELD:  +284.00  (net = 355 - 56.80 - 14.20)
  FEE:    -56.80   (double deduction!)
  ─────────────────
  Total:  +227.20  (should be +284.00)

Fees account: FEE_CREDIT +56.80
IB (Ryan):    IB_CREDIT  +14.20
─────────────────────────────────
Grand total:  +298.20  (should be +355.00 = gross yield)
```

This causes the 42.6 XRP discrepancy (184,315.4 vs 184,358).

### Fix

In `apply_segmented_yield_distribution_v5`, **remove the FEE transaction on the investor** (lines 240–291 in the current function). The fee is already deducted via the net calculation. Keep the `fee_allocations`, `platform_fee_ledger`, and `FEE_CREDIT` records — those are correct audit/accounting entries.

**Specific changes:**

1. **Remove** the `apply_investor_transaction(..., 'FEE', v_alloc.fee, ...)` call that debits the investor
2. **Keep** the `fee_allocations` INSERT (audit trail) — but without `debit_transaction_id` (set to NULL)
3. **Keep** the `platform_fee_ledger` INSERT (fee tracking)
4. **Keep** the `FEE_CREDIT` to fees account (correct — this is the platform's fee income)
5. **Keep** the `IB_CREDIT` to IB parent (correct — this is the IB's commission)

After fix:
```text
Sam:     YIELD    +284.00  (net)
Fees:    FEE_CREDIT +56.80
Ryan:    IB_CREDIT  +14.20
─────────────────────────────
Total:              +355.00  = gross yield ✓
AUM: 184,003 + 355 = 184,358 ✓
```

### Pre-requisite

The incorrectly applied yield distribution must be **voided** before reapplying, to reverse the wrong positions.

### Scope

- One SQL migration replacing `apply_segmented_yield_distribution_v5`
- No frontend changes
- Conservation identity preserved: `net + fee_credit + ib_credit = gross`

