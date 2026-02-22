

# Root Cause: AUM Not Changing After Yield

## The Critical Bug

The `apply_segmented_yield_distribution_v5` database function is **missing the transaction creation step entirely**. It creates:
- yield_distributions header (done)
- yield_allocations per investor (done)
- fee_allocations (done)
- ib_allocations (done)

But it **never inserts into `transactions_v2`**. This is the single root cause of all symptoms:

1. **AUM doesn't change** -- because AUM is updated by the `sync_aum_on_transaction` trigger, which fires on `transactions_v2` inserts
2. **Investor positions don't change** -- because positions are updated by `fn_ledger_drives_position` trigger on `transactions_v2` inserts
3. **10 duplicate distributions exist** -- because with no idempotency guard (reference_id uniqueness), the function silently creates duplicates on retry

The `void_yield_distribution` function confirms transactions SHOULD exist -- it searches for patterns like `yield_v5_<dist_id>_<investor_id>` in `reference_id`.

## Data State

For fund `7574bc81` (IND-SOL):
- 10 non-voided yield_distributions exist (all identical: opening_aum=1250, recorded_aum=1252, gross_yield=2)
- 0 non-voided YIELD transactions exist
- Investor position still shows current_value=1250 (unchanged)
- fund_daily_aum still shows 1250 (unchanged)

## Fix: Two-Part

### Part 1: Fix the RPC function (SQL migration)

Add transaction creation logic to `apply_segmented_yield_distribution_v5`, inserting after Step 5 (yield_allocations) and before the RETURN:

For each allocation from `calculate_yield_allocations` where `net > 0`:
```sql
-- YIELD transaction for investor
INSERT INTO transactions_v2 (
  fund_id, investor_id, tx_date, value_date, asset, fund_class,
  amount, type, source, distribution_id, reference_id,
  is_system_generated, purpose, visibility_scope, created_by
) VALUES (
  p_fund_id, investor_id, p_distribution_date, p_distribution_date,
  fund_asset, fund_class,
  net_amount, 'YIELD', 'yield_distribution', v_distribution_id,
  'yield_v5_' || v_distribution_id || '_' || investor_id,
  true, p_purpose, 'investor_visible', p_created_by
);
```

For fees account (FEE_CREDIT) and IB parents (IB_CREDIT), similar inserts with appropriate types and `admin_only` visibility.

The function also needs:
- Fetch the fund's `asset` and `fund_class` at the start
- Back-link the transaction IDs to `yield_allocations` (transaction_id, fee_credit_transaction_id, ib_credit_transaction_id columns)
- Call `upsert_fund_aum_after_yield` at the end for reporting-purpose AUM

### Part 2: Void the 10 duplicate distributions (data cleanup)

Before deploying the fix, void all 10 existing broken distributions since they have no transactions and represent phantom records. This uses the existing `void_yield_distribution` RPC.

### Part 3: Frontend -- no changes needed

The frontend `yieldApplyService.ts` fix from the last edit is correct. Transactions will now be created by the RPC, positions will update via triggers, and AUM will update via `sync_aum_on_transaction`.

## Technical Details: Complete RPC Rewrite

The `apply_segmented_yield_distribution_v5` function will be replaced with the following logic flow:

```text
1. Set canonical mutation guard
2. Establish context (period_start, fees_account_id, fund asset/class)
3. Calculate totals via calculate_yield_allocations
4. Insert distribution header
5. Insert yield_allocations
6. NEW: Insert YIELD transactions for each investor (net > 0)
7. NEW: Insert FEE_CREDIT transaction for fees account (if total_fees > 0)
8. NEW: Insert IB_CREDIT transactions for each IB parent (if ib_credit > 0)
9. NEW: Back-link transaction IDs to yield_allocations
10. Legacy sync: fee_allocations, ib_allocations
11. NEW: Upsert reporting AUM if purpose = 'reporting'
12. Clear canonical flag
13. Return distribution_id
```

Transaction triggers handle position and AUM updates automatically:
- `fn_ledger_drives_position` updates `investor_positions.current_value`
- `sync_aum_on_transaction` updates `fund_daily_aum`
- `trg_recompute_position_on_tx` calls `recompute_investor_position`

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Replace `apply_segmented_yield_distribution_v5` with transaction-creating version |
| Data cleanup SQL | Void 10 phantom yield_distributions for fund 7574bc81 |

No frontend changes needed.

