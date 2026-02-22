
# Fix: Apply Yield RPC Missing Transaction Creation + Data Cleanup

## Problem
The previous migration to fix `apply_segmented_yield_distribution_v5` was never applied to the database. The function still lacks transaction creation logic, so:
- 10 phantom yield_distributions exist (all non-voided, identical: opening_aum=1250, recorded_aum=1252, gross_yield=2)
- 0 YIELD transactions exist in `transactions_v2`
- Investor position remains at 1250 (unchanged)
- AUM remains at 1250 (unchanged)
- All yield_allocations have `transaction_id = NULL`

## Fix (single SQL migration)

### Step 1: Void all 10 phantom distributions and their allocations
Mark all non-voided yield_distributions and yield_allocations for fund `7574bc81` as voided since they have no backing transactions.

### Step 2: Rewrite `apply_segmented_yield_distribution_v5`
Add transaction creation after the yield_allocations insert (Step 5). The function will:

1. Fetch fund `asset` and `fund_class` at the start
2. After inserting yield_allocations, loop through allocations where `net_amount > 0`:
   - Insert a `YIELD` transaction (source=`yield_distribution`, visibility=`investor_visible`)
   - Insert a `FEE_CREDIT` transaction for the fees account if total fees > 0 (visibility=`admin_only`)
   - Insert `IB_CREDIT` transactions for each IB parent with credit > 0 (visibility=`admin_only`)
3. Back-link `transaction_id`, `fee_credit_transaction_id`, `ib_credit_transaction_id` on yield_allocations
4. Update `closing_aum` on the distribution header
5. Call `upsert_fund_aum_after_yield` for reporting-purpose AUM records

The `reference_id` pattern `yield_v5_{distribution_id}_{investor_id}` matches what `void_yield_distribution` expects, and the unique partial index on `reference_id` prevents duplicates on retry.

Transaction triggers handle the rest automatically:
- `fn_ledger_drives_position` / `trg_recompute_position_on_tx` updates investor positions
- `sync_aum_on_transaction` updates fund_daily_aum
- `enforce_transaction_via_rpc` allows source=`yield_distribution`

### No frontend changes needed
The `yieldApplyService.ts` fix from the previous edit correctly handles the UUID return and fetches the distribution row.

## Technical: Key enum values confirmed
- `type`: YIELD, FEE_CREDIT, IB_CREDIT
- `source`: yield_distribution
- `visibility_scope`: investor_visible, admin_only
- `purpose`: reporting, transaction (aum_purpose enum)
