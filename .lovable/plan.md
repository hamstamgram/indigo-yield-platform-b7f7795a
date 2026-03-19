

## Fix: `yield_allocations` Column Name Mismatch

### Problem

The `apply_segmented_yield_distribution_v5` RPC inserts into `yield_allocations` (line 219-229) using column names that don't match the actual table schema.

| RPC uses | Table has |
|---|---|
| `gross_yield` | `gross_amount` |
| `net_yield` | `net_amount` |
| `fee_percentage` | `fee_pct` |
| `ib_percentage` | `ib_pct` |
| `opening_balance` | `position_value_at_calc` |
| `purpose` | does not exist |
| `created_by` | does not exist |

Also missing: `ownership_pct` (exists in table, not being set).

### Fix

One migration to recreate `apply_segmented_yield_distribution_v5` with the corrected INSERT statement:

```sql
INSERT INTO yield_allocations (
  distribution_id, investor_id, fund_id,
  gross_amount, net_amount, fee_amount, ib_amount,
  fee_pct, ib_pct, position_value_at_calc,
  ownership_pct, transaction_id
) VALUES (
  v_distribution_id, v_alloc.investor_id, p_fund_id,
  v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
  v_alloc.fee_pct, v_alloc.ib_rate, v_alloc.current_value,
  v_share, v_yield_tx_id
);
```

Changes:
- Rename 5 columns to match actual table schema
- Remove `purpose` and `created_by` (columns don't exist)
- Add `ownership_pct` (set to the calculated share)
- The `v_share` variable needs to be persisted into the temp table or recalculated — currently it's overwritten each loop iteration, so we store it inline as `v_alloc.current_value / NULLIF(v_opening_aum, 0)`

### Risk

Low — this is a pure column name correction. The data being written is identical; only the column targets change. No frontend changes needed.

