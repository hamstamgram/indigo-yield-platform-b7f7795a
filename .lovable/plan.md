

# Delete Orphaned Withdrawal Requests

## What's happening

Two withdrawal requests for investor "Vivie & Liana" are stuck in `completed` status, but every single transaction backing them has already been voided. There is zero financial data leakage — all positions are at 0 and inactive, all allocations are voided, no statements or documents exist.

The only cleanup needed is updating these 2 records from `completed` → `cancelled`.

## Why a migration is needed

The `trg_guard_withdrawal_state` trigger blocks direct status changes to/from `completed` without the `indigo.canonical_rpc` flag. A migration can bypass this since it runs as the database owner.

## Implementation

**Single migration** that:

1. Sets `indigo.canonical_rpc = 'true'` session flag to bypass the guard trigger
2. Updates withdrawal request `3f340119-d14c-46d3-8347-cb33a989518d` (the $1,000 one) to `cancelled`
3. Updates withdrawal request `275d54e2-4cfb-4dc6-803f-ecb8753e62e3` (the $209 one) to `cancelled`
4. Inserts an audit_log entry documenting the cleanup
5. Resets the session flag

**Post-migration verification**: Query `v_missing_withdrawal_transactions` — should return 0 rows, confirming zero orphans remain platform-wide.

