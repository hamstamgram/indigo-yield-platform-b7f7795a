

# Fix: "Failed to Fetch" on Void Transaction

## Root Cause Found

After exhaustive investigation of the entire void trigger chain, I found **two critical issues**:

### Issue 1: SWAPPED PARAMETERS in `recompute_on_void` trigger (CRITICAL)

The `recompute_on_void` trigger calls:
```sql
PERFORM reconcile_investor_position_internal(
  NEW.fund_id,      -- WRONG! This is p_investor_id parameter
  NEW.investor_id   -- WRONG! This is p_fund_id parameter
);
```

The function signature is `reconcile_investor_position_internal(p_investor_id uuid, p_fund_id uuid)` -- investor first, fund second. The call passes them **backwards**. This causes:
- 3 full-table queries with impossible WHERE clauses (investor_id = fund_uuid)
- Attempted INSERT of a phantom position row with swapped IDs
- ~10 additional triggers fire on that phantom INSERT (audit, concentration risk checks, etc.)
- Massive unnecessary I/O that compounds the already heavy trigger chain

### Issue 2: Redundant double-processing

Both `fn_ledger_drives_position` (trg_ledger_sync) AND `recompute_on_void` fire on the same void event. The ledger sync already correctly handles the position delta. The recompute is redundant AND broken (swapped params).

### Why "Failed to Fetch"

The void of a single deposit fires **50+ trigger invocations** across 6+ tables (transactions_v2, investor_positions, audit_log, data_edit_audit, fee_allocations, risk_alerts). The swapped-param recompute adds ~15 more unnecessary trigger calls. Combined with Supabase's API gateway timeout (~60s), the operation exceeds the HTTP timeout, causing the browser to receive a dropped connection / "Failed to fetch".

## Fix: Single Migration

### Step 1: Fix `recompute_on_void` parameter order

Swap `NEW.fund_id, NEW.investor_id` to `NEW.investor_id, NEW.fund_id` in the `recompute_on_void()` function.

### Step 2: Add early-exit guard to `recompute_on_void`

Since `fn_ledger_drives_position` already handles the incremental position update correctly, make `recompute_on_void` skip when `fn_ledger_drives_position` has already run (check `indigo.canonical_rpc` flag or add a `indigo.ledger_sync_done` flag). This eliminates the redundant full recompute.

Alternatively, the simpler approach: just fix the param order and keep the redundant safety-net recompute. With correct params and only 340 transactions, it should complete well within timeout.

### Step 3: Add `validate_transaction_fund_status` canonical RPC bypass

This BEFORE INSERT trigger on transactions_v2 doesn't respect `indigo.canonical_rpc` (unlike its sibling `check_fund_is_active`). While it only affects INSERTs (not voids directly), the void-and-reissue flow does INSERT, so this is needed for consistency.

### Step 4: Clean up phantom position rows (if any exist)

Query check showed no phantom rows yet (void never completed), but add a safety DELETE in the migration.

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Fix `recompute_on_void` param order, add canonical bypass to `validate_transaction_fund_status`, optional: add skip-if-already-synced guard |

## Risk Assessment

- **Low risk**: Only changing trigger functions, not table structure
- **No frontend changes needed**: The client code is correct
- **Backward compatible**: Fixed recompute produces identical results to the already-correct `fn_ledger_drives_position`

