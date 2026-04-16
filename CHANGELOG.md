# Changelog

All notable changes to the Indigo Yield Platform will be documented in this file.

## [1.0.8] - 2026-04-16

### P0+P1 Remediation — Cross-Domain Audit Fixes

#### Invariant Checks Hardening
- **Check 2 fixed**: Replaced informational placeholder with actual `fund_daily_aum.total_aum = SUM(investor_positions.current_value)` verification
- **Check 17**: Yield idempotency — no duplicate non-voided distributions for same fund/period/purpose
- **Check 18**: Transaction `reference_id` uniqueness across non-voided transactions
- **Check 19**: Balance chain — `current_value = cost_basis + cumulative_yield_earned`
- **Check 20**: Fee conservation — platform fees match `fee_pct * gross_yield`
- **Total checks**: 16 → 20

#### Dead Code Cleanup
- **Dropped 13 dead DB functions**: `batch_crystallize_fund`, 3 V3 yield functions, `sync_position_last_tx_date`, `sync_profile_last_activity`, `cleanup_dormant_positions`, `export_investor_data`, `initialize_crystallization_dates`, `initialize_fund_aum_from_positions`, `batch_initialize_fund_aum`, `reset_all_data_keep_profiles`, `create_profile_on_signup`
- **Dropped `rate_limit_config` table** — zero rows, no code references
- **Deleted 2 dead barrel files**: `src/services/ib/index.ts`, `src/services/core/index.ts`
- **Removed 11 dead function entries** from `rpcSignatures.ts`
- **Removed `reset_all_data_keep_profiles`** from CI CRITICAL_RPCS
- **Added DEPRECATED comments** to 7 redundant sync functions + `force_delete_investor`

#### Gateway Bypass Migration
- **Migrated 22 gateway bypasses** across 9 service files from direct `supabase.from().insert/update/delete` to `db.*` gateway
- Compound filter operations kept as direct Supabase calls (gateway only supports single-column filters)
- **Fixed `investor_id` bug** in `investorInviteService.ts` — was inserting non-existent column

#### Lint + Pre-commit + CI
- **0 lint errors** (was 4): fixed `undefined` param name, `prefer-const`, added `docs/**`/`supabase/functions/**` to eslint ignores
- **SECDEF gate blocking** in pre-commit (was warning-only, now `exit 1`)
- **Added `run_invariant_checks()` execution** to CI sql-checks job
- **Removed phantom `is_admin_for_jwt` and `is_admin_safe`** from rpcSignatures.ts (functions don't exist in DB)

## [1.0.7] - 2026-04-16

### Security — Tier 3.5+4 Cross-Tenant Read Gap Fixes (5 SECDEF functions)
- **CRITICAL**: Added `can_access_investor()` access check to `get_investor_fee_pct` and `get_investor_ib_pct` — these SECDEF functions accepted arbitrary investor UUIDs and bypassed RLS, exposing any investor's fee/IB rates to any caller
- **MEDIUM**: Added `auth.uid()` self-query restriction to `get_user_admin_status` — prevented admin identity probing by arbitrary UUID
- **MEDIUM**: Added `can_access_investor()` access check to `_resolve_investor_fee_pct` and `_resolve_investor_ib_pct` internal helpers — defense-in-depth
- **HOTFIX**: Reverted `is_admin()` gate on `get_system_mode` — gating would break triggers (`enforce_economic_date`, `enforce_yield_event_date`) that check system mode during investor DML operations. `get_system_mode` remains ungated but `anon` EXECUTE revoked.
- **Revoked `anon` EXECUTE grants** on `get_investor_fee_pct`, `get_investor_ib_pct`, `get_user_admin_status`, `get_system_mode`
- **5 SQL functions converted to PL/pgSQL** for access control logic
- **Total gated SECDEF functions**: 114 of 282 (40%)
- **Expanded CI `CRITICAL_RPCS`** to 49 functions

## [1.0.6] - 2026-04-16

### Security — Tier 3 Read Function Gates (11 SECDEF functions)
- **Added `is_admin()` JWT gate** to 11 sensitive SECDEF read functions that bypass RLS
- **Category A — Cross-tenant data (5)**: `get_all_investors_summary`, `get_all_dust_tolerances`, `get_aum_position_reconciliation`, `get_funds_daily_flows`, `verify_aum_purpose_usage`
- **Category B — Fund-scoped data (6)**: `get_fund_aum_as_of`, `get_fund_base_asset`, `get_fund_net_flows`, `get_transaction_aum`, `preview_crystallization`, `preview_merge_duplicate_profiles`
- **5 SQL functions converted to PL/pgSQL** to support `PERFORM is_admin()` pattern
- **Excluded from gating (safe)**: 2 internal-only functions (`get_dust_tolerance_for_fund`, `get_existing_preflow_aum` — called by gated parents), 5 single-entity helpers, 2 special functions (`get_system_mode`, `get_user_admin_status`), 2 DEPRECATED functions
- **Total gated SECDEF functions**: 109 of 282 (39%)
- **Frontend impact**: None — `get_all_investors_summary` only called from admin pages despite investor-side export existing
- **Expanded CI `CRITICAL_RPCS`** to 46 functions

## [1.0.5] - 2026-04-16

### Security — Tier 2 Admin Gates (20 more SECDEF functions)
- **Fixed `is_admin_for_jwt()` bug** — 3 functions referenced non-existent function (latent runtime error from squash): `add_fund_to_investor`, `can_access_investor`, `get_statement_signed_url`
- **Added `is_admin()` JWT gate** to 17 admin-only mutative functions: `apply_daily_yield_with_validation`, `apply_deposit_with_crystallization`, `apply_withdrawal_with_crystallization`, `apply_transaction_with_crystallization`, `crystallize_month_end`, `complete_withdrawal`, `delete_transaction`, `finalize_statement_period`, `reopen_yield_period`, `start_processing_withdrawal`, `void_fund_daily_aum`, `set_fund_daily_aum`, `backfill_balance_chain_fix`, `batch_reconcile_all_positions`
- **Added `is_super_admin()` JWT gate** to 3 dangerous functions: `reset_all_data_keep_profiles`, `reset_all_investor_positions`, `set_account_type_for_ib`
- **Added `canonical_rpc` flag** to 12 functions missing it
- **Expanded CI `CRITICAL_RPCS`** from 21 to 35 functions

## [1.0.4] - 2026-04-16

### Security — Tier 1 Admin Gates (13 SECDEF functions)
- **Added `is_admin()` JWT gate** to 4 functions with NO admin check: `apply_segmented_yield_distribution_v5`, `finalize_month_yield`, `unvoid_transactions_bulk`, `void_and_reissue_full_exit`
- **Added `is_admin()` JWT defense-in-depth** to 8 functions with param-based checks only: `edit_transaction`, `update_transaction`, `void_transactions_bulk`, `unvoid_transaction`, `force_delete_investor`, `void_and_reissue_transaction`, `route_withdrawal_to_fees`, `update_admin_role` (uses `is_super_admin()`)
- **Added `canonical_rpc` flag** to 4 functions missing it: `finalize_month_yield`, `update_transaction`, `void_transactions_bulk`, `reject_withdrawal`, `update_admin_role`
- **Expanded CI `CRITICAL_RPCS`** from 8 to 21 functions
- **Updated squash baseline** to reflect all changes
- **Security audit** frozen at `docs/audit/52-security-domain-audit.md`

## [1.0.3] - 2026-04-16

### Financial Logic Audit — P1 Frontend Fixes
- **Removed `as any` casts** in `adminTransactionHistoryService.ts` — `void_and_reissue_full_exit` now called via typed `rpc.call()`, params use `.toNumber()`
- **Removed `callRPC as any`** in `yieldApplyService.ts` — uses typed `callRPC()` with `.toNumber()` for numeric params
- **Removed `data as any`** in `adminTransactionHistoryService.ts` — replaced with `Record<string, unknown>` typed access
- **Enhanced unvoid cascade warning** in `UnvoidTransactionDialog.tsx` — explicitly states cascade-voided records are NOT restored
- **Documented unvoid cascade gap** in `DEPLOYMENT_RUNBOOK.md` under Known Operational Gaps

### Financial Logic Audit — P2 Database Fixes (Migration 20260416055420)
- **FL-5**: Fixed `run_invariant_checks()` Check 3 + Check 12 — removed `purpose = 'reporting'` filter so yield conservation covers all distribution purposes including `transaction` (from `crystallize_yield_before_flow`)
- **FL-7**: Removed duplicate `set_config` calls from `void_transaction()` — second set after UPDATE was redundant
- **FL-1**: Marked 3 V3 yield functions as DEPRECATED (`apply_adb_yield_distribution_v3`, `preview_adb_yield_distribution_v3`, `preview_daily_yield_to_fund_v3`)
- **FL-8**: Added `security_invoker = on` to 3 reconciliation views (`v_fee_calculation_orphans`, `v_ledger_position_mismatches`, `v_orphaned_transactions`)
- **Updated squash baseline** (`20260415000000_squash_canonical_baseline.sql`) to reflect P2 changes
- **Regenerated TypeScript types** from remote DB (8,564 lines)

## [1.0.2] - 2026-04-15

### Migration Squash (BREAKING — migration infrastructure only)
- **Consolidated 131 migrations into 2**: `20260415000000_squash_canonical_baseline.sql` (full schema from remote) + `20260415000001_squash_reconciliation.sql` (delta changes)
- **Dropped 4 overloaded function signatures**: old `apply_investor_transaction`, old `adjust_investor_position`, old `check_aum_reconciliation`, old `set_account_type_for_ib` (single-arg)
- **Dropped QA infrastructure**: `qa_entity_manifest` table, `qa_fees_account_id()` function
- **Added canonical_rpc + is_admin gates** to `apply_daily_yield_with_validation` and `crystallize_month_end`
- **Standardized financial columns** to `numeric(28,10)`: `fee_allocations.fee_amount`, `fee_allocations.fee_percentage`, `investor_positions.aum_percentage`, `investor_positions.cumulative_yield_earned`, all `investor_yield_events` amount/pct columns
- **Archived old migrations** to `supabase/archived_migrations/_pre_squash_20260415/`
- **Deleted dead directories**: `migrations_bak/`, `migrations_essential/`
- **Archived dead directories**: `migrations_broken/`, `migrations_fixes/`, `patches/`
- **Regenerated TypeScript types** from remote DB (8,635 lines)
- **Created remote DB backups**: `docs/audit/backups/remote_schema_20260415.sql`, `docs/audit/backups/remote_data_20260415.sql`

### Security
- 2 previously unprotected SECURITY DEFINER functions now have admin gates
- canonical_rpc flag now set on all 4 core mutation functions (was missing on 2)

### Prior Migration History
Pre-squash migration history available in `supabase/archived_migrations/_pre_squash_20260415/`