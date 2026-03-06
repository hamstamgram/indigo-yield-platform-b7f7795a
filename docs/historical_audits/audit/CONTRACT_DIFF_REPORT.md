# Phase 0C: Contract Diff Report

> **Generated**: 2026-02-02
> **Sources**: `src/contracts/rpcSignatures.ts` (frontend), `pg_proc` (DB), `supabase/functions/` (edge functions)
> **Scope**: RPC contract alignment, edge function source coverage, anti-pattern detection

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Frontend contract RPCs (`rpcSignatures.ts`) | 256 |
| Database RPCs (`pg_proc` unique names) | 355 |
| Common (present in both) | 253 |
| Ghost RPCs (frontend only, no DB match) | **3** |
| DB-only RPCs (total) | **102** |
| -- Trigger/hook functions | 78 |
| -- Internal utilities | 19 |
| -- Missing from contract (callable, used in services) | **5** |
| Deployed edge functions | 50 |
| Edge functions with local source | 27 |
| Edge functions without local source | **23** |
| Anti-pattern violations | **4 files, 13 call sites** |

---

## 1. Ghost RPCs (In Contract, NOT in Database)

These RPCs are registered in `rpcSignatures.ts` but do not exist in the database. They will cause runtime errors if called.

| RPC Name | Status | Impact |
|----------|--------|--------|
| `fix_cost_basis_anomalies` | **GHOST** | Not in `types.ts`, not called by any service. Dead entry. |
| `fix_doubled_cost_basis` | **GHOST** | Not in `types.ts`, not called by any service. Dead entry. |
| `fix_position_metadata` | **GHOST** | Not in `types.ts`, not called by any service. Dead entry. |

**Analysis**: All 3 ghost RPCs appear to be one-time migration/fix scripts that were dropped from the database but never cleaned from the contract. They exist only in `rpcSignatures.ts` lines 97-99 and their metadata blocks (~lines 954-978). No service, hook, or component references them.

**Recommended fix**: Remove all 3 entries from `RPC_FUNCTIONS` array and `RPC_SIGNATURES` object in `src/contracts/rpcSignatures.ts`. Regenerate types if applicable.

---

## 2. Missing from Contract (Callable RPCs in DB, Used by Services)

These RPCs exist in the database AND are actively called from `src/services/` but are **not** registered in the frontend contract. This breaks the gateway pattern's compile-time safety.

| RPC Name | Called From | Call Count | Risk |
|----------|------------|------------|------|
| `get_ib_referrals` | `src/services/ib/referrals.ts:31`, `src/services/ib/ibService.ts:154,329,390`, `src/services/ib/allocations.ts:141` | 5 | **HIGH** - Core IB portal function |
| `get_ib_parent_candidates` | `src/services/ib/referrals.ts:55` | 1 | **HIGH** - IB assignment UI |
| `get_ib_referral_count` | `src/services/ib/ibService.ts:313` | 1 | **MEDIUM** - IB dashboard KPI |
| `get_ib_referral_detail` | `src/services/ib/ibService.ts:408` | 1 | **MEDIUM** - IB detail view |
| `apply_daily_yield_to_fund_v2` | None (type exists in `types.ts:10095`) | 0 | **LOW** - Superseded by v3, type still generated |

**Analysis**: The 4 `get_ib_*` RPCs are actively used in the IB service layer and have proper type definitions in `types.ts`. They were likely added to the database after the last contract generation but the contract was never regenerated. `apply_daily_yield_to_fund_v2` is a legacy version superseded by v3; its type is auto-generated but it has no service callers.

**Recommended fix**:
- Add `get_ib_referrals`, `get_ib_parent_candidates`, `get_ib_referral_count`, `get_ib_referral_detail` to `rpcSignatures.ts`.
- Optionally add `apply_daily_yield_to_fund_v2` for completeness, or deprecate it in the DB.

---

## 3. Trigger and Hook Functions (DB-Only, Rightfully Excluded)

These 78 functions are trigger handlers, enforcement hooks, sync triggers, and audit functions. They are invoked by PostgreSQL trigger machinery, not by the frontend. They are **correctly excluded** from the contract.

### 3a. Enforcement Triggers (13)

| Function | Purpose |
|----------|---------|
| `enforce_canonical_aum_event_mutation` | Block direct AUM event writes |
| `enforce_canonical_daily_aum_mutation` | Block direct daily AUM writes |
| `enforce_canonical_position_mutation` | Block direct position writes |
| `enforce_canonical_position_write` | Block direct position writes (v2) |
| `enforce_canonical_transaction_mutation` | Block direct transaction writes |
| `enforce_canonical_yield_mutation` | Block direct yield distribution writes |
| `enforce_economic_date` | Validate economic dates on insert |
| `enforce_fees_account_zero_fee` | Ensure fees accounts have 0% fee |
| `enforce_internal_tx_visibility` | Control internal transaction visibility |
| `enforce_transaction_asset_match` | Validate transaction asset matches fund |
| `enforce_transaction_via_rpc` | Block direct transaction inserts |
| `enforce_transactions_v2_immutability` | Immutability guard on transactions_v2 |
| `enforce_yield_distribution_guard` | Guard yield distribution mutations |

### 3b. Audit Triggers (7)

| Function | Purpose |
|----------|---------|
| `audit_delta_trigger` | Generic delta audit logger |
| `audit_fee_schedule_changes` | Log fee schedule changes |
| `audit_ib_allocation_payout` | Log IB allocation payouts |
| `audit_investor_fund_performance_changes` | Log performance data changes |
| `audit_transaction_changes` | Log transaction mutations |
| `audit_user_role_changes` | Log role changes |
| `enforce_yield_event_date` | Validate yield event dates |

### 3c. Sync Triggers (21)

| Function | Purpose |
|----------|---------|
| `sync_aum_on_position_change` | Recalculate AUM when positions change |
| `sync_aum_on_transaction` | Update AUM on new transaction |
| `sync_documents_profile_ids` | Sync document profile references |
| `sync_fee_allocations_voided_by_profile` | Cascade void to fee allocations |
| `sync_fund_aum_after_position` | Recalculate fund AUM after position change |
| `sync_fund_aum_events_voided_by_profile` | Cascade void to AUM events |
| `sync_fund_daily_aum_voided_by_profile` | Cascade void to daily AUM |
| `sync_ib_account_type` | Sync IB account type on role change |
| `sync_ib_allocations_from_commission_ledger` | Sync IB allocations from ledger |
| `sync_ib_allocations_voided_by_profile` | Cascade void to IB allocations |
| `sync_position_last_tx_date` | Update position last transaction date |
| `sync_profile_is_admin` | Sync admin flag on profile |
| `sync_profile_last_activity` | Update last activity timestamp |
| `sync_profile_role_from_profiles` | Sync role from profiles table |
| `sync_profile_role_from_roles` | Sync role from roles table |
| `sync_statements_investor_profile_id` | Sync statement profile IDs |
| `sync_transactions_v2_voided_by_profile` | Cascade void to transactions_v2 |
| `sync_yield_date` | Sync yield date on insert |
| `sync_yield_distribution_legacy_totals` | Backfill legacy total columns |
| `sync_yield_to_investor_yield_events` | Cascade yield to investor events |
| `ensure_crystallization_date` | Set crystallization date on position create |

### 3d. Cascade/Void Triggers (3)

| Function | Purpose |
|----------|---------|
| `cascade_void_from_transaction` | Cascade void from parent transaction |
| `cascade_void_to_allocations` | Cascade void to fee allocations |
| `cascade_void_to_yield_events` | Cascade void to yield events |

### 3e. Protection Triggers (4)

| Function | Purpose |
|----------|---------|
| `protect_allocation_immutable_fields` | Block edits to immutable allocation fields |
| `protect_audit_immutable_fields` | Block edits to immutable audit fields |
| `protect_audit_log_immutable_fields` | Block edits to audit_log |
| `protect_transaction_immutable_fields` | Block edits to immutable transaction fields |

### 3f. Lifecycle/Utility Triggers (16)

| Function | Purpose |
|----------|---------|
| `alert_on_aum_position_mismatch` | Alert when AUM diverges from positions |
| `alert_on_ledger_position_drift` | Alert on ledger vs position drift |
| `alert_on_yield_conservation_violation` | Alert on yield conservation failure |
| `auto_close_previous_fee_schedule` | Close old fee schedule on new one |
| `auto_heal_aum_drift` | Auto-correct small AUM drift |
| `block_test_profiles` | Block test profiles in production |
| `create_profile_on_signup` | Create profile record on auth signup |
| `compute_profile_role` | Compute derived profile role |
| `cleanup_withdrawal_audit_on_cancel` | Clean audit on withdrawal cancel |
| `increment_version` | Increment row version on update |
| `log_access_event` | Log data access events |
| `log_aum_position_mismatch` | Log AUM/position mismatches |
| `log_cancel_on_status_change` | Log cancellation status changes |
| `log_data_edit` | Log data edit events |
| `log_delivery_status_change` | Log delivery status transitions |
| `log_withdrawal_creation` | Log new withdrawal requests |

### 3g. Update Timestamp Triggers (8)

| Function | Purpose |
|----------|---------|
| `maintain_high_water_mark` | Update high water mark on yield |
| `prevent_auto_aum_creation` | Prevent auto AUM record creation |
| `recompute_on_void` | Recompute position on transaction void |
| `set_position_is_active` | Set position active flag |
| `set_updated_at` | Generic updated_at trigger |
| `trg_auto_recompute_position_fn` | Auto recompute position trigger |
| `trg_auto_update_aum_fn` | Auto update AUM trigger |
| `trigger_recompute_position` | Trigger position recompute |
| `update_delivery_updated_at` | Update delivery timestamp |
| `update_investor_last_activity` | Update investor last activity |
| `update_investor_last_activity_withdrawal` | Update activity on withdrawal |
| `update_last_activity_on_statement` | Update activity on statement |
| `update_updated_at` | Generic updated_at (variant) |
| `update_updated_at_column` | Generic updated_at (variant 2) |

---

## 4. Internal Utility Functions (DB-Only, Rightfully Excluded)

These 19 functions are called internally by other RPCs or used as constraint check functions. They are not intended for direct frontend invocation.

| Function | Classification |
|----------|---------------|
| `assign_admin_role_from_invite` | Internal: called by invite flow RPCs |
| `calculate_unrealized_pnl` | Internal: helper for portfolio calculations |
| `check_concentration_risk` | Internal: risk check within deposit flow |
| `check_duplicate_profile` | Internal: constraint check |
| `check_email_uniqueness` | Internal: constraint check |
| `check_fund_is_active` | Internal: validation helper |
| `run_invariant_checks` | Internal: called by integrity pack |
| `validate_aum_against_positions_at_date` | Internal: AUM validation variant |
| `validate_dust_tolerance` | Internal: dust tolerance constraint |
| `validate_fees_account_fee_pct` | Internal: fee account constraint |
| `validate_ib_parent_has_role` | Internal: IB assignment constraint |
| `validate_manual_aum_entry` | Internal: manual AUM constraint |
| `validate_manual_aum_event` | Internal: manual AUM event constraint |
| `validate_position_fund_status` | Internal: position validation |
| `validate_transaction_amount` | Internal: transaction amount constraint |
| `validate_transaction_fund_status` | Internal: transaction fund status check |
| `validate_transaction_has_aum` | Internal: transaction AUM check |
| `validate_transaction_type` | Internal: transaction type constraint |
| `validate_withdrawal_request` | Internal: withdrawal request constraint |

---

## 5. Edge Function Source Gaps

### 5a. Deployed with Local Source (27 functions)

All 27 edge functions in `supabase/functions/` have corresponding deployments. No orphaned source.

### 5b. Deployed WITHOUT Local Source (23 functions)

These edge functions are deployed to Supabase but have **no source code** in the `supabase/functions/` directory. They may have been deployed via the Supabase dashboard, Lovable, or a prior codebase version.

| Edge Function | Risk Assessment |
|---------------|-----------------|
| `admin-backfill-historical` | LOW - One-time admin utility |
| `calculate-performance` | **MEDIUM** - Active performance calculation |
| `calculate-yield` | **HIGH** - Core yield calculation |
| `check-admin-status` | **MEDIUM** - Auth check |
| `create-admin-user` | LOW - One-time setup utility |
| `daily-yield-calculation` | **HIGH** - Core daily yield pipeline |
| `get-crypto-prices` | **MEDIUM** - Price feed |
| `init-crypto-assets` | LOW - One-time initialization |
| `mfa-totp-disable` | **MEDIUM** - Security function |
| `mfa-totp-initiate` | **MEDIUM** - Security function |
| `mfa-totp-status` | **MEDIUM** - Security function |
| `mfa-totp-verify` | **MEDIUM** - Security function |
| `portfolio-api` | **HIGH** - Core portfolio data API |
| `price-proxy` | **MEDIUM** - Price feed proxy |
| `process-deposit` | **HIGH** - Core deposit processing |
| `process-webhooks` | **MEDIUM** - Webhook handler |
| `run-compliance-checks` | **MEDIUM** - Compliance pipeline |
| `setup-test-users` | LOW - Test utility |
| `sign-statement-url` | **MEDIUM** - Statement URL signing |
| `submit-to-airtable` | LOW - External integration |
| `sync-airtable` | LOW - External integration |
| `update-prices` | **MEDIUM** - Price update pipeline |
| `verify_recaptcha` | LOW - reCAPTCHA verification |

**Analysis**: 23 out of 50 deployed edge functions (46%) have no local source. Among these, 4 are classified HIGH risk (`calculate-yield`, `daily-yield-calculation`, `portfolio-api`, `process-deposit`) because they implement core financial logic without version-controlled source.

**Recommended fix**: Export source for all 23 functions using `supabase functions download <name>` and commit to `supabase/functions/`. Prioritize the HIGH-risk functions.

---

## 6. Anti-Pattern Violations

Direct `supabase.from()` or `supabase.rpc()` calls found outside `src/services/`. Per project conventions, all Supabase access should go through the gateway pattern in `src/services/`.

### 6a. `src/hooks/data/shared/useInvestorEnrichment.ts`

**Severity**: MEDIUM (read-only queries, no mutations)

| Line | Call | Table | Operation |
|------|------|-------|-----------|
| 52 | `supabase.from("withdrawal_requests")` | `withdrawal_requests` | SELECT (pending count) |
| 57 | `supabase.from("profiles")` | `profiles` | SELECT (last_activity_at) |
| 60 | `supabase.from("generated_statements")` | `generated_statements` | SELECT (latest reports) |
| 66 | `supabase.from("profiles")` | `profiles` | SELECT (ib_parent_id) |
| 105 | `supabase.from("profiles")` | `profiles` | SELECT (IB parent names) |

**Recommended fix**: Create an enrichment service in `src/services/admin/` that wraps these queries and call it from the hook.

### 6b. `src/features/admin/reports/hooks/useStatementData.ts`

**Severity**: HIGH (includes DELETE mutation bypassing gateway)

| Line | Call | Table | Operation |
|------|------|-------|-----------|
| 63 | `supabase.from("statement_periods")` | `statement_periods` | SELECT |
| 81 | `supabase.from("generated_statements")` | `generated_statements` | SELECT with joins |
| 136 | `supabase.from("generated_statements")` | `generated_statements` | SELECT |
| **173** | **`supabase.from("generated_statements").delete()`** | **`generated_statements`** | **DELETE** |
| 195 | `supabase.from("generated_statements")` | `generated_statements` | SELECT (count) |

**Recommended fix**: Move all statement queries and the delete mutation into a statement service in `src/services/admin/`. The DELETE on line 173 is the highest priority since it bypasses audit logging.

### 6c. `src/utils/authorizationHelper.ts`

**Severity**: LOW (auth utility, read-only)

| Line | Call | Table | Operation |
|------|------|-------|-----------|
| 49 | `supabase.from("user_roles")` | `user_roles` | SELECT (role lookup) |

**Recommended fix**: Consider using the existing `has_role` RPC instead, or accept this as a justified exception for the auth utility layer.

### 6d. `src/hooks/usePlatformError.ts` (Line 68)

**Severity**: NONE (comment/docstring only, not executable code)

The `supabase.rpc()` call on line 68 is inside a JSDoc `@example` block. It is not an actual anti-pattern violation.

---

## 7. Summary of Recommended Actions

### Priority 1 (Contract Integrity)
1. **Remove 3 ghost RPCs** from `rpcSignatures.ts`: `fix_cost_basis_anomalies`, `fix_doubled_cost_basis`, `fix_position_metadata`
2. **Add 4 missing IB RPCs** to `rpcSignatures.ts`: `get_ib_referrals`, `get_ib_parent_candidates`, `get_ib_referral_count`, `get_ib_referral_detail`

### Priority 2 (Source Control)
3. **Download and commit source** for 4 HIGH-risk edge functions: `calculate-yield`, `daily-yield-calculation`, `portfolio-api`, `process-deposit`
4. **Download and commit source** for remaining 19 sourceless edge functions

### Priority 3 (Anti-Pattern Remediation)
5. **Move statement data access** from `src/features/admin/reports/hooks/useStatementData.ts` to a service (especially the DELETE on line 173)
6. **Move enrichment queries** from `src/hooks/data/shared/useInvestorEnrichment.ts` to a service
7. **Evaluate** `src/utils/authorizationHelper.ts` -- consider using `has_role` RPC or mark as accepted exception

### Priority 4 (Cleanup)
8. **Decide on `apply_daily_yield_to_fund_v2`** -- either add to contract for completeness or drop from DB since v3 supersedes it
9. **Run `npm run contracts:generate`** after making contract changes to ensure consistency

---

## Appendix: Full DB-Only RPC List (102 entries)

<details>
<summary>Click to expand full list</summary>

```
alert_on_aum_position_mismatch          (trigger)
alert_on_ledger_position_drift          (trigger)
alert_on_yield_conservation_violation   (trigger)
apply_daily_yield_to_fund_v2            (missing_from_contract)
assign_admin_role_from_invite           (internal_utility)
audit_delta_trigger                     (trigger)
audit_fee_schedule_changes              (trigger)
audit_ib_allocation_payout              (trigger)
audit_investor_fund_performance_changes (trigger)
audit_transaction_changes               (trigger)
audit_user_role_changes                 (trigger)
auto_close_previous_fee_schedule        (trigger)
auto_heal_aum_drift                     (trigger)
block_test_profiles                     (trigger)
calculate_unrealized_pnl                (internal_utility)
cascade_void_from_transaction           (trigger)
cascade_void_to_allocations             (trigger)
cascade_void_to_yield_events            (trigger)
check_concentration_risk                (internal_utility)
check_duplicate_profile                 (internal_utility)
check_email_uniqueness                  (internal_utility)
check_fund_is_active                    (internal_utility)
cleanup_withdrawal_audit_on_cancel      (trigger)
compute_profile_role                    (trigger)
create_profile_on_signup                (trigger)
enforce_canonical_aum_event_mutation    (trigger)
enforce_canonical_daily_aum_mutation    (trigger)
enforce_canonical_position_mutation     (trigger)
enforce_canonical_position_write        (trigger)
enforce_canonical_transaction_mutation  (trigger)
enforce_canonical_yield_mutation        (trigger)
enforce_economic_date                   (trigger)
enforce_fees_account_zero_fee           (trigger)
enforce_internal_tx_visibility          (trigger)
enforce_transaction_asset_match         (trigger)
enforce_transaction_via_rpc             (trigger)
enforce_transactions_v2_immutability    (trigger)
enforce_yield_distribution_guard        (trigger)
enforce_yield_event_date                (trigger)
ensure_crystallization_date             (trigger)
get_ib_parent_candidates                (missing_from_contract)
get_ib_referral_count                   (missing_from_contract)
get_ib_referral_detail                  (missing_from_contract)
get_ib_referrals                        (missing_from_contract)
increment_version                       (trigger)
log_access_event                        (trigger)
log_aum_position_mismatch               (trigger)
log_cancel_on_status_change             (trigger)
log_data_edit                           (trigger)
log_delivery_status_change              (trigger)
log_withdrawal_creation                 (trigger)
maintain_high_water_mark                (trigger)
prevent_auto_aum_creation               (trigger)
protect_allocation_immutable_fields     (trigger)
protect_audit_immutable_fields          (trigger)
protect_audit_log_immutable_fields      (trigger)
protect_transaction_immutable_fields    (trigger)
recompute_on_void                       (trigger)
run_invariant_checks                    (internal_utility)
set_position_is_active                  (trigger)
set_updated_at                          (trigger)
sync_aum_on_position_change             (trigger)
sync_aum_on_transaction                 (trigger)
sync_documents_profile_ids              (trigger)
sync_fee_allocations_voided_by_profile  (trigger)
sync_fund_aum_after_position            (trigger)
sync_fund_aum_events_voided_by_profile  (trigger)
sync_fund_daily_aum_voided_by_profile   (trigger)
sync_ib_account_type                    (trigger)
sync_ib_allocations_from_commission_ledger (trigger)
sync_ib_allocations_voided_by_profile   (trigger)
sync_position_last_tx_date              (trigger)
sync_profile_is_admin                   (trigger)
sync_profile_last_activity              (trigger)
sync_profile_role_from_profiles         (trigger)
sync_profile_role_from_roles            (trigger)
sync_statements_investor_profile_id     (trigger)
sync_transactions_v2_voided_by_profile  (trigger)
sync_yield_date                         (trigger)
sync_yield_distribution_legacy_totals   (trigger)
sync_yield_to_investor_yield_events     (trigger)
trg_auto_recompute_position_fn          (trigger)
trg_auto_update_aum_fn                  (trigger)
trigger_recompute_position              (trigger)
update_delivery_updated_at              (trigger)
update_investor_last_activity           (trigger)
update_investor_last_activity_withdrawal (trigger)
update_last_activity_on_statement       (trigger)
update_updated_at                       (trigger)
update_updated_at_column                (trigger)
validate_aum_against_positions_at_date  (internal_utility)
validate_dust_tolerance                 (internal_utility)
validate_fees_account_fee_pct           (internal_utility)
validate_ib_parent_has_role             (internal_utility)
validate_manual_aum_entry               (internal_utility)
validate_manual_aum_event               (internal_utility)
validate_position_fund_status           (internal_utility)
validate_transaction_amount             (internal_utility)
validate_transaction_fund_status        (internal_utility)
validate_transaction_has_aum            (internal_utility)
validate_transaction_type               (internal_utility)
validate_withdrawal_request             (internal_utility)
```

</details>
