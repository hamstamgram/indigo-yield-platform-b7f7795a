

# Platform-Wide Database Health Audit and Hardening Plan

## Current State Summary

I ran the Supabase linter, queried all triggers/functions/views, and verified every integrity view. Here is what the database looks like right now:

**Integrity Views: ALL CLEAN (0 violations)**
- `v_ledger_reconciliation` = 0
- `v_cost_basis_mismatch` = 0
- `v_orphaned_transactions` = 0
- `v_yield_conservation_violations` = 0
- `v_transaction_distribution_orphans` = 0
- `v_fee_allocation_orphans` = 0

**Linter Results: 74 issues found**
- 26 ERRORS: All are SECURITY DEFINER views (integrity views that need to bypass RLS by design)
- 48 WARNINGS: All are functions missing `SET search_path = 'public'` (security hygiene)

**Infrastructure Counts:**
- 20+ tables with RLS
- ~50 triggers across all tables
- ~150+ RPC functions
- 28 views (0 materialized views)
- 17 edge functions

---

## Critical Findings

### FINDING 1: `transactions_v2` has 20 triggers -- performance risk

This is the hottest table. Every INSERT fires 11 BEFORE triggers + 9 AFTER triggers. Three of those AFTER triggers are redundant audit loggers:

| Trigger | Function | Event | Redundant? |
|---------|----------|-------|------------|
| `audit_transactions_v2_changes` | `log_data_edit()` | INSERT+UPDATE+DELETE | Writes to `data_edit_audit` |
| `delta_audit_transactions_v2` | `audit_delta_trigger()` | INSERT+UPDATE+DELETE | Writes to `audit_log` |
| `trg_audit_transactions` | `audit_transaction_changes()` | INSERT+UPDATE+DELETE | Writes to `audit_log` |

Two of these write to `audit_log` on the same events. This is triple-auditing each transaction mutation.

### FINDING 2: `apply_investor_transaction` has 2 overloaded signatures

The 9-param and 10-param versions coexist. The 10-param version includes `p_distribution_id`. This is intentional but could cause ambiguity if called from frontend without explicit parameter naming.

### FINDING 3: 1 disabled trigger

`trg_ib_commission_to_ledger` on `ib_commission_ledger` is DISABLED (`tgenabled = 'D'`). Needs verification -- was it intentionally disabled or orphaned?

### FINDING 4: 30+ SECURITY DEFINER functions missing `search_path`

Including critical ones: `recompute_investor_position`, `void_yield_distribution`, `preview_segmented_yield_distribution_v5`, `check_aum_reconciliation`, `get_funds_with_aum`, `guard_withdrawal_state_transitions`.

### FINDING 5: `investor_positions` has 10 triggers

5 BEFORE + 5 AFTER on every position write. Since `recompute_investor_position` rewrites positions on every yield/transaction, this creates significant overhead.

---

## Remediation Plan (6 Phases)

### PHASE 1: Eliminate Redundant Audit Triggers (Performance)

**Problem**: 3 audit triggers fire on every `transactions_v2` mutation, writing duplicate records.

**Fix**: 
- Drop `trg_audit_transactions` (the legacy one calling `audit_transaction_changes()`)
- Keep `delta_audit_transactions_v2` (the structured delta trigger) and `audit_transactions_v2_changes` (the data_edit_audit logger)
- Apply the same dedup to `investor_positions` (has both `audit_investor_positions_changes` + `delta_audit_investor_positions`)
- Verify no downstream reads depend on the dropped trigger's outputs

### PHASE 2: Harden SECURITY DEFINER Functions (Security)

**Problem**: 30+ SECURITY DEFINER functions lack `SET search_path = 'public'`, making them vulnerable to search-path injection.

**Fix**: Single migration that adds `SET search_path TO 'public'` to all affected functions. Priority functions:
- `recompute_investor_position`
- `void_yield_distribution` 
- `preview_segmented_yield_distribution_v5`
- `check_aum_reconciliation`
- `get_funds_with_aum`
- `guard_withdrawal_state_transitions`
- All `fn_*` trigger functions
- All `get_*` query functions

### PHASE 3: Convert SECURITY DEFINER Views to INVOKER (Security)

**Problem**: 26 views use SECURITY DEFINER, flagged as errors by linter. These are integrity views only queried by admins.

**Fix**: 
- For admin-only integrity views (`v_ledger_reconciliation`, `v_cost_basis_mismatch`, etc.): Convert to `SECURITY INVOKER` and ensure the underlying tables have RLS policies allowing admin SELECT
- For views that legitimately need to bypass RLS (cross-table joins): Add explicit GRANT + RLS on the view itself
- Test each view still returns correct results for admin users after conversion

### PHASE 4: Clean Up Orphaned/Disabled Objects (Housekeeping)

**Fix**:
- Investigate `trg_ib_commission_to_ledger` (disabled) -- either drop it or re-enable with justification
- Drop the legacy `apply_investor_transaction` 9-param overload if the 10-param version is the canonical one
- Drop orphaned overloads of `log_audit_event` (3 signatures), `finalize_month_yield` (2), `check_historical_lock` (2)
- Drop `_fast_wipe` and `reset_all_data_keep_profiles` from production (dev-only functions)
- Drop `sync_ib_account_type` trigger function (documented as removed in GO_LIVE_READINESS but function still exists)

### PHASE 5: Full Lifecycle Cascade Verification (Functional)

End-to-end verification of every mutation path:

**A. Onboarding Flow**
- Profile creation -> `trg_check_duplicate_profile`, `trg_check_email_uniqueness`, `trg_sync_profile_role_from_profiles` fire correctly
- First deposit -> `apply_investor_transaction` -> position created via `recompute_investor_position` -> `trg_enforce_canonical_position_write` permits it

**B. Yield Distribution Flow**
- `apply_segmented_yield_distribution_v5` -> creates YIELD + FEE_CREDIT + IB_CREDIT transactions -> `trg_ledger_sync` fires -> positions update -> `trg_alert_yield_conservation` validates conservation

**C. Withdrawal Flow**
- Withdrawal request -> `validate_withdrawal_request_trigger` -> `trg_guard_withdrawal_state` enforces state machine -> `approve_and_complete_withdrawal` -> dust sweep for full exits -> position deactivated

**D. Void Cascade Flow**
- `void_transaction` -> `trg_cascade_void_from_transaction` + `trg_recompute_on_void` -> position recomputed
- `void_yield_distribution` -> `trg_cascade_void_to_allocations` -> all fee_allocations, ib_allocations, platform_fee_ledger, ib_commission_ledger voided -> investor positions recomputed

**E. Reporting Flow**
- Statement generation -> `trg_update_last_activity_on_statement` -> investor_fund_performance records -> statement_periods finalization

**Verification method**: Run `assert_integrity_or_raise()` after each operation. Confirm all integrity views return 0 rows.

### PHASE 6: Tech Debt Items from POST_LAUNCH_TECH_DEBT.md

- Add `'transaction'` to `fund_aum_events.trigger_type` CHECK constraint
- Fix `v_missing_withdrawal_transactions` false positives (add DUST_SWEEP_OUT pattern)
- Fix `v_position_transaction_variance` to include YIELD, FEE_CREDIT, IB_CREDIT types

---

## Implementation Order

| Phase | Migration | Risk | Effort |
|-------|-----------|------|--------|
| 1. Dedup audit triggers | Single migration | Low (read-only audit, no financial impact) | 30 min |
| 2. Harden search_path | Single migration | Low (additive, no behavior change) | 1 hour |
| 3. Fix SECURITY DEFINER views | Single migration | Medium (must verify admin access still works) | 2 hours |
| 4. Clean orphaned objects | Single migration | Low (removing dead code) | 30 min |
| 5. Lifecycle cascade tests | Script + manual verification | None (read-only verification) | 2 hours |
| 6. Tech debt views | Single migration | Low | 1 hour |

## Verification Gate

After all phases, the following must all pass:
- `run_integrity_pack()` = 0 violations
- `audit_leakage_report()` = `overall_status: "pass"`
- Supabase linter = 0 ERRORS, warnings reduced from 48 to <5
- All 28 views return valid results
- Full E2E lifecycle test passes (onboard -> deposit -> yield -> withdraw -> void -> restore)

