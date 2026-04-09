

## Expert CTO Audit: Functions & Triggers Gap Analysis

### Finding 1 — CRITICAL: `crystallize_yield_before_flow` writes to dropped table `investor_yield_events`

**Risk**: Runtime crash on every deposit/withdrawal that triggers crystallization.

The function contains an **unguarded** `INSERT INTO investor_yield_events (...)` statement. The table `investor_yield_events` **does not exist** (confirmed via `information_schema`). Unlike `void_transaction` and `force_delete_investor` which have `IF EXISTS` guards, this function has none.

**Why it hasn't crashed yet**: The code path only executes when crystallization actually distributes yield (non-zero yield with active investors in a fund that has accrued since last checkpoint). If all deposits/withdrawals so far happened on days without accumulated yield, the INSERT was never reached.

**Fix**: Wrap the `INSERT INTO investor_yield_events` block in an `IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events')` guard, or remove the dead code entirely since the table was intentionally dropped.

**Recommended**: Remove the entire `investor_yield_events` INSERT block — the data it would capture is already recorded in `yield_distributions` and `transactions_v2`.

---

### Finding 2 — MEDIUM: `run_integrity_pack` only checks 5 of 13 integrity views

The integrity pack currently checks:
1. `v_ledger_reconciliation`
2. `fund_aum_mismatch`
3. `yield_distribution_conservation_check`
4. `v_orphaned_transactions`
5. `v_ghost_completed_withdrawals`

**Missing** (8 views not wired in):
- `v_cost_basis_mismatch` — detects position/ledger cost basis drift
- `v_fee_allocation_orphans` — fee allocations without matching distributions
- `v_ib_allocation_orphans` — IB allocations without matching distributions
- `v_yield_allocation_orphans` — yield allocations without matching distributions
- `v_missing_withdrawal_transactions` — completed withdrawals without ledger entries
- `v_orphaned_positions` — positions without any transactions
- `v_ledger_position_mismatches` — position values diverged from ledger sums
- `v_transaction_distribution_orphans` — transactions referencing non-existent distributions

**Risk**: Silent data corruption goes undetected by automated monitoring. The nightly integrity job and admin dashboard only surface 5 categories of violations.

**Fix**: Add FOR loops for each missing view to `run_integrity_pack`, following the same pattern as existing checks.

---

### Finding 3 — LOW: Redundant canonical position triggers

Two BEFORE triggers fire on every INSERT/UPDATE to `investor_positions`:
- `trg_enforce_canonical_position` → `enforce_canonical_position_mutation` (blocks ALL ops unless canonical)
- `trg_enforce_canonical_position_write` → `enforce_canonical_position_write` (blocks cost_basis/current_value/shares changes unless canonical)

On INSERT/UPDATE, the first trigger already blocks everything. The second is redundant but harmless — it adds audit logging of blocked attempts. On DELETE, only the first fires. **No fix needed**, but note this adds ~1ms overhead per position write.

---

### Finding 4 — LOW: `get_health_trend` and `get_latest_health_status` are stub functions

Both return empty result sets (the `system_health_snapshots` table was dropped). If any UI component calls these, it gets empty data silently.

**Fix**: Either drop these functions entirely or verify no frontend code calls them. If called, remove the UI references.

---

### Finding 5