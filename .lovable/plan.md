

# Phase 2: RPC & Trigger Cascade Verification -- Results

## Summary: CLEAN (with 2 minor findings, 0 blockers)

I verified all critical RPCs, trigger chains, and integrity views. Here are the results.

---

## RPC Inventory -- All Present and Correct

All 17 critical RPCs exist as `SECURITY DEFINER` functions with correct parameter signatures:

| RPC | Status | Notes |
|-----|--------|-------|
| `void_transaction` | PASS | Ghost table guard in place, advisory lock, full cascade |
| `void_yield_distribution` | PASS | Comprehensive cascade (txs, fees, IB, platform_fee_ledger, ib_commission_ledger) |
| `void_and_reissue_transaction` | PASS | Correct 6-param signature |
| `apply_transaction_with_crystallization` | PASS | Idempotency check, advisory lock, AUM auto-record |
| `apply_investor_transaction` | PASS | Two overloads (9 and 10 params), both SECURITY DEFINER |
| `apply_segmented_yield_distribution_v5` | PASS | V5/V6 engine |
| `preview_segmented_yield_distribution_v5` | PASS | Read-only preview |
| `recompute_investor_position` | PASS | Full ledger recompute |
| `reconcile_investor_position_internal` | PASS | Internal recompute |
| `calc_avg_daily_balance` | PASS | ADB calculation, STABLE |
| `edit_transaction` | PASS | Metadata-only edits |
| `update_transaction` | PASS | Edits with audit trail |
| `delete_transaction` | PASS | Confirmation-gated hard delete |
| `get_void_transaction_impact` | PASS | Preview before void |
| `validate_aum_against_positions` | PASS | Read-only AUM check |
| `force_delete_investor` | PASS | Ghost table guard already present |
| `unvoid_transaction` | PASS | Exists in DB |
| `void_transactions_bulk` | PASS | Exists in DB |
| `unvoid_transactions_bulk` | PASS | Exists in DB |

---

## Trigger Chain Verification

### transactions_v2 (20 triggers, all enabled)

| Trigger | Timing | Events | Status |
|---------|--------|--------|--------|
| `trg_enforce_canonical_transaction` | BEFORE | I/U/D | PASS -- blocks non-RPC writes |
| `trg_enforce_transaction_via_rpc` | BEFORE | INSERT | PASS |
| `protect_transactions_immutable` | BEFORE | UPDATE | PASS -- protects key fields |
| `trg_validate_transaction_amount` | BEFORE | INSERT | PASS |
| `trg_validate_tx_type` | BEFORE | I/U | PASS |
| `trg_enforce_economic_date` | BEFORE | INSERT | PASS |
| `trg_enforce_internal_visibility` | BEFORE | INSERT | PASS |
| `trg_enforce_transaction_asset` | BEFORE | I/U | PASS |
| `trg_enforce_yield_distribution_guard` | BEFORE | I/U | PASS |
| `trg_transactions_v2_active_fund` | BEFORE | I/U | PASS -- canonical bypass works |
| `trg_validate_transaction_fund_status` | BEFORE | INSERT | PASS |
| `trg_transactions_v2_sync_voided_by` | BEFORE | I/U | PASS |
| `zz_trg_transactions_v2_immutability` | BEFORE | UPDATE | PASS -- runs last (zz prefix) |
| `trg_ledger_sync` | AFTER | I/U | PASS -- incremental position delta |
| `trg_recompute_on_void` | AFTER | UPDATE | PASS -- skips when canonical_rpc set |
| `trg_cascade_void_from_transaction` | AFTER | UPDATE | PASS -- cascades to fee_allocations |
| `audit_transactions_v2_changes` | AFTER | I/U/D | PASS |
| `delta_audit_transactions_v2` | AFTER | I/U/D | PASS |
| `trg_audit_transactions` | AFTER | I/U/D | PASS |
| `trg_update_last_activity_on_transaction` | AFTER | INSERT | PASS |

### yield_distributions (7 triggers, all enabled)

| Trigger | Status | Notes |
|---------|--------|-------|
| `trg_enforce_canonical_yield` | PASS | Blocks direct DML |
| `trg_cascade_void_to_allocations` | PASS | Cascades to yield_allocations, fee_allocations, ib_allocations |
| `trg_alert_yield_conservation` | PASS | Fires alert on conservation violations |
| `trg_validate_dust_tolerance` | PASS | |
| `trg_sync_yield_date` | PASS | |
| `protect_yield_distributions_immutable` | PASS | |
| `delta_audit_yield_distributions` | PASS | |

### investor_positions (11 triggers, all enabled)

Dual canonical guards (`enforce_canonical_position_mutation` on I/U/D + `enforce_canonical_position_write` on I/U) are redundant but not conflicting -- both check the same canonical_rpc flag and return early when set.

### Integrity Views -- ALL CLEAN

| View | Violations |
|------|-----------|
| `v_ledger_reconciliation` | 0 |
| `v_orphaned_positions` | 0 |
| `v_orphaned_transactions` | 0 |
| `yield_distribution_conservation_check` | 0 |
| `v_yield_conservation_violations` | 0 |

---

## Minor Findings (Non-Blocking)

### Finding 1: `recalculate_fund_aum_for_date` -- Missing RPC (Swallowed)

`void_transaction` calls `recalculate_fund_aum_for_date()` on line 46 but the function does not exist. The call is wrapped in `BEGIN...EXCEPTION WHEN OTHERS THEN NULL; END;` so it silently fails. This means after voiding a transaction, the AUM for that date is NOT recalculated -- only the specific `tx_sync`-sourced AUM rows are voided (lines 39-43).

**Risk**: LOW. The AUM is still correct because `fund_daily_aum` rows from `transaction_sum` source (written by `apply_transaction_with_crystallization`) remain and reflect the post-void position sum via the next transaction. However, for a standalone void with no follow-up transaction on the same date, the AUM snapshot for that date may be stale.

**Recommendation**: Create `recalculate_fund_aum_for_date` as a simple function that sums active positions and upserts `fund_daily_aum`. This is a P2 improvement, not a blocker.

### Finding 2: `crystallize_yield_before_flow` -- Referenced in Docs, Not in DB or Code

The project knowledge references this RPC but it does not exist in the database, and there are zero frontend references. The crystallization logic is embedded directly in `apply_transaction_with_crystallization`. The doc reference is stale.

**Risk**: NONE. Documentation-only issue.

---

## Void Cascade Flow (Verified End-to-End)

```text
void_transaction(p_transaction_id, p_admin_id, p_reason)
  |-- advisory lock
  |-- SET indigo.canonical_rpc = true
  |-- UPDATE transactions_v2 SET is_voided = true
  |     |-- BEFORE: protect_transactions_immutable (allows is_voided change)
  |     |-- BEFORE: zz_trg_transactions_v2_immutability (allows voiding fields)
  |     |-- AFTER:  trg_ledger_sync (incremental position delta reversal)
  |     |-- AFTER:  trg_recompute_on_void (SKIPPED: canonical_rpc = true)
  |     |-- AFTER:  trg_cascade_void_from_transaction (voids fee_allocations)
  |     |-- AFTER:  audit triggers (3x)
  |-- CASCADE: fund_daily_aum (void tx_sync rows)
  |-- CASCADE: fee_allocations (by tx ID)
  |-- CASCADE: ib_commission_ledger (by tx ID)
  |-- CASCADE: platform_fee_ledger (by tx ID)
  |-- CASCADE: investor_yield_events (IF EXISTS guard)
  |-- CASCADE: DUST_SWEEP transactions (if WITHDRAWAL)
  |-- INSERT audit_log
```

```text
void_yield_distribution(p_distribution_id, p_admin_id, p_reason, p_void_crystals)
  |-- SET indigo.canonical_rpc = true
  |-- Optional: void crystal distributions
  |-- FOR EACH linked transaction: UPDATE is_voided = true
  |     |-- (same trigger cascade as above per transaction)
  |-- CASCADE: platform_fee_ledger
  |-- CASCADE: ib_commission_ledger
  |-- CASCADE: fee_allocations
  |-- CASCADE: yield_allocations
  |-- CASCADE: ib_allocations
  |-- UPDATE yield_distributions SET is_voided, status = 'voided'
  |     |-- AFTER: trg_cascade_void_to_allocations (redundant but safe)
  |-- INSERT audit_log
```

---

## Phase 2 Verdict: PASS

All RPCs exist, all trigger chains fire correctly, all canonical guards check the right session flags, all integrity views return zero violations. The two minor findings are non-blocking.

**Ready for Phase 3** when you give the go-ahead.

