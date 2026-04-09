

## Fix: Cascade Void Status to Withdrawal Requests

### Problem
When a WITHDRAWAL or DUST_SWEEP transaction is voided via `void_transaction`, the linked `withdrawal_requests` record stays "completed" — creating a ghost state where the management UI shows a successful withdrawal that the ledger has reversed. Found 3 affected records, all for the same investor.

### Root Cause
The `void_transaction` RPC cascades to 6 tables (fee_allocations, ib_commission_ledger, platform_fee_ledger, fund_daily_aum, investor_yield_events, dust transactions) but has **zero logic** to cascade back to `withdrawal_requests`. The `cascade_void_from_transaction` trigger also omits this table.

### Fix (3 parts, single migration)

**Part 1 — Extend the state machine to allow `completed -> voided`**

Update `validate_withdrawal_transition` to add:
```
processing → completed | cancelled | voided
completed → voided   (NEW — only via canonical RPC)
```
The `trg_guard_withdrawal_state` trigger already blocks non-canonical transitions to/from completed, so this is safe.

**Part 2 — Add withdrawal cascade to `void_transaction` RPC**

After the existing DUST cascade block (line ~108), add:
```sql
-- CASCADE: withdrawal_requests (for WITHDRAWAL/DUST_SWEEP types)
IF v_tx.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
  UPDATE withdrawal_requests
  SET status = 'voided'
  WHERE status = 'completed'
    AND id::text = ANY(
      -- Extract request ID from reference patterns: WR-{id}, WDR-{id}
      regexp_matches(v_tx.reference_id, '(?:WR-|WDR-)([0-9a-f-]{36})')
    );
END IF;
```
Also add matching logic in `cascade_void_from_transaction` trigger as a backup.

**Part 3 — Fix existing 3 records**

Data fix via canonical RPC context for the 3 orphaned withdrawal_requests:
- `8b440397-a0a3-449c-b4fd-bfebf3e47d57`
- `91a41a37-366e-4aca-8cbb-e7735b63044f`
- `a953883a-9fe8-41d4-ad4d-d9be229f7782`

Set status to `voided` with audit trail.

**Part 4 — Add integrity view**

Create `v_ghost_completed_withdrawals` to detect any future mismatches where `withdrawal_requests.status = 'completed'` but all linked transactions are voided. Wire into `run_integrity_pack`.

### What is NOT changed
- No frontend code changes needed (withdrawal tables already display status from DB)
- No changes to `approve_and_complete_withdrawal`, deposit flows, or yield engine
- No changes to position recomputation (already handled by void_transaction's existing cascade)

### Risk assessment
- The state machine guard requires `indigo.canonical_rpc` for transitions from `completed` — the `void_transaction` RPC already sets this flag, so the cascade will pass the guard
- Advisory lock in `void_transaction` prevents concurrent race conditions
- The fix is purely additive to the existing void cascade chain

