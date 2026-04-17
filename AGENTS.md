# AGENTS.md — Indigo Yield Platform

## Project Overview
Financial crypto yield management platform. React/TypeScript/Vite frontend + Supabase PostgreSQL backend.

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npx tsc --noEmit` — Type check
- `npm run lint` — Lint
- `npm run test` — Run tests
- `npx supabase db reset` — Reset local DB from migrations
- `npx supabase db diff --linked` — Diff local vs remote schema
- `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts` — Regenerate DB types

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Shadcn/UI
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions)
- **State**: TanStack Query (server state), React Context (client state)
- **Money**: All financial values use `numeric(28,10)` in DB, Decimal.js in frontend
- **Auth**: Supabase Auth + RLS policies (is_admin(), is_super_admin())

## Database Conventions
- **Migrations**: `supabase/migrations/` — ONLY directory for schema changes
- **Naming**: `<timestamp>_<snake_case_description>.sql`
- **Never use Dashboard SQL Editor** for schema changes
- **SECURITY DEFINER functions** MUST have `is_admin()` or `require_admin()` gate
- **Core mutation functions** MUST set `canonical_rpc` flag via `set_config('indigo.canonical_rpc', 'true', true)`
- **Financial columns**: `numeric(28,10)` — never unbounded `numeric`
- **Source column allowlist**: transactions_v2.source must be in trigger allowlist

## Critical Function Chain
Frontend → `apply_transaction_with_crystallization` → sets canonical_rpc → calls type-specific function → triggers enforce_transaction_via_rpc checks source allowlist

## File Limits
- Max 400 lines typical, 800 hard max
- Functions <50 lines
- No deep nesting (>4 levels)
- Immutability: always return new objects, never mutate

## Testing
- Min 80% coverage
- TDD: Red → Green → Improve
- `tests/migrations/` — SQL-based migration tests
- `tests/e2e/` — Playwright E2E specs
- `tests/qa/` — invariants, scenarios

## Security
- No hardcoded secrets — env vars only
- No PII in logs
- All RPC mutations require admin check
- RLS enabled on all tables
- **Tier 3+3.5+4**: 20 SECDEF read functions gated — 5 cross-tenant, 6 fund-scoped, 2 investor-scoped (can_access_investor), 2 _resolve helpers (can_access_investor), 1 get_user_admin_status (self-or-admin). Plus 4 anon EXECUTE revocations. Total gated: 114 of 282 (40% + 13 dead dropped = 269)
- **Anon EXECUTE revocation (Tier 5)**: 100+ SECDEF functions had EXECUTE granted to anon/PUBLIC. Migration `20260417080000` revoked ALL from PUBLIC and explicitly from anon, then granted EXECUTE to authenticated+service_role only. Total gated: 114 of 282 (40%) + 100+ anon-revoked (now only authenticated+service_role can call)
- **Lovable Security Fixes**: Profiles RLS escalation fixed (trigger `enforce_profiles_safe_columns` blocks non-admin changes to is_admin, role, kyc_status, fee_pct, ib_percentage, ib_parent_id, status, totp_enabled, totp_verified, is_system_account, include_in_reporting, ib_commission_source, account_type, email, onboarding_date); fund_aum_events public read replaced with authenticated-only; statements storage investor access added; search_path set on apply_yield_distribution_v5_with_lock
- `get_system_mode` is intentionally ungated — internal triggers (`enforce_economic_date`, `enforce_yield_event_date`) call it during non-admin sessions. `anon` EXECUTE revoked.
- **Pre-commit**: SECDEF gate is BLOCKING (`exit 1`) — all new SECURITY DEFINER functions must have `is_admin`/`require_admin`
- **CI sql-checks**: Runs `run_invariant_checks()` post-migration (20 checks)
- **Dead functions dropped**: 13 zero-caller functions removed in `20260416190000_dead_code_cleanup.sql`
- **DEPRECATED markers**: 7 sync functions + `force_delete_investor` marked in `20260416191000_deprecated_markers.sql`

- **can_access_investor**: Now includes `canonical_rpc` bypass — SECDEF batch functions that set `indigo.canonical_rpc = 'true'` bypass per-investor access checks (already verified admin via is_admin())

## Migration History
- **2026-04-17**: P0 — `20260417000000_fix_can_access_investor_canonical_bypass.sql` (added canonical_rpc bypass to can_access_investor for SECDEF batch functions)
- **2026-04-17**: P0 — `20260417010000_fix_yield_distribution_restore_baseline.sql` (restored apply_segmented_yield_distribution_v5 from baseline — Tier 1 version had 4 broken schema references: investor_ib_schedule, fee_percentage, account_type on investor_positions, status on investor_fee_schedule)
- **2026-04-17**: P0 — `20260417020000_fix_preview_yield_admin_gate.sql` (added is_admin() gate + canonical_rpc to preview_segmented_yield_distribution_v5)
- **2026-04-17**: P0 — `20260417030000_fix_withdrawal_full_exit_honor_amount.sql` (approve_and_complete_withdrawal honors p_processed_amount for full exits; dust tolerance for position deactivation; crystallization errors logged instead of swallowed)
- **2026-04-17**: P1 — `20260417040000_fix_void_and_reissue_full_exit.sql` (added source/asset columns, removed double-credit to fees account, added dust tolerance for position deactivation)
- **2026-04-17**: P2 — `20260417050000_fix_recalculate_fund_aum_admin_gate.sql` (added is_admin() gate to recalculate_fund_aum_for_date)
- **2026-04-17**: P0 — `20260417080000_fix_invariant_checks_and_revoke_anon.sql` (fixed run_invariant_checks: yield_allocations.net_yield_amount→net_amount, ib_allocations.ib_id→ib_investor_id/ib_fee_amount, FEE_DEBIT→FEE; revoked anon EXECUTE on 100+ ungated SECDEF functions — now only authenticated+service_role can call)
- **2026-04-17**: P2 — `20260417090000_fix_dust_sweep_handler_and_disable_redundant_trigger.sql` (added explicit DUST_SWEEP/FEE/IB_DEBIT/DUST handlers to fn_ledger_drives_position; disabled redundant trg_recompute_position_on_tx)
- **2026-04-17**: Data fix — `20260417100000_fix_stale_aum_records.sql` (fixed 3 stale fund_daily_aum records where total_aum didn't match position sum after withdrawals; temporarily disabled trg_enforce_canonical_daily_aum for the fix)
- **2026-04-17**: P0 — `20260417070000_fix_void_transaction_baseline_restore.sql` (restored void_transaction from baseline — fixed 4 column/table reference bugs: ib_commission_ledger.credit_transaction_id→transaction_id, platform_fees→platform_fee_ledger, investor_yield_events.transaction_id→trigger_transaction_id/reference_id, yield_distributions.credit_transaction_id→distribution_id from v_tx; removed updated_at=NOW() on 3 tables that lack the column; fixed run_invariant_checks Check 9 ib_commission_ledger.credit_transaction_id→transaction_id)
- **2026-04-17**: P0 — `20260417060000_fix_missing_void_columns.sql` (squash baseline used CREATE TABLE IF NOT EXISTS which doesn't ALTER existing tables — added 15+ missing columns on remote: voided_at/voided_by/voided_by_profile_id/void_reason on yield_allocations, credit_transaction_id/debit_transaction_id/voided_by_profile_id/void_reason on fee_allocations, void columns on ib_commission_ledger, investor_yield_events, platform_fee_ledger, yield_distributions, is_full_exit on withdrawal_requests, etc.)
- **2026-04-17**: P2 — `20260417050000_fix_recalculate_fund_aum_admin_gate.sql` (added is_admin() gate to recalculate_fund_aum_for_date)
- **2026-04-17**: P1 — `20260417040000_fix_void_and_reissue_full_exit.sql` (added source/asset columns, removed double-credit to fees account, added dust tolerance for position deactivation)
- **2026-04-17**: P0 — `20260417030000_fix_withdrawal_full_exit_honor_amount.sql` (approve_and_complete_withdrawal honors p_processed_amount for full exits; dust tolerance for position deactivation; crystallization errors logged instead of swallowed)
- **2026-04-17**: P0 — `20260417020000_fix_preview_yield_admin_gate.sql` (added is_admin() gate + canonical_rpc to preview_segmented_yield_distribution_v5)
- **2026-04-17**: P0 — `20260417010000_fix_yield_distribution_restore_baseline.sql` (restored apply_segmented_yield_distribution_v5 from baseline — Tier 1 version had 4 broken schema references)
- **2026-04-17**: P0 — `20260417000000_fix_can_access_investor_canonical_bypass.sql` (added canonical_rpc bypass to can_access_investor for SECDEF batch functions)
- **2026-04-16**: Lovable P0/P1 — `20260416200000_fix_profiles_rls_escalation.sql` (profiles self-update restricted via trigger)
- **2026-04-16**: Lovable P0 — `20260416210000_fix_fund_aum_events_public_read.sql` (USING(true) → authenticated only)
- **2026-04-16**: Lovable P1 — `20260416220000_fix_statements_storage_access.sql` (investor SELECT on own PDFs)
- **2026-04-16**: Lovable P1 — `20260416230000_fix_search_path_mutable.sql` (search_path on apply_yield_distribution_v5_with_lock)
- **2026-04-16**: Consolidation — `20260416240000_consolidate_profiles_triggers.sql` (merged enforce_profiles_safe_columns into protect_profile_sensitive_fields)
- **2026-04-16**: P1 — `20260416190000_dead_code_cleanup.sql` (13 dead functions + rate_limit_config table)
- **2026-04-16**: P1 — `20260416191000_deprecated_markers.sql` (7 sync functions + force_delete_investor DEPRECATED)
- **2026-04-16**: P0 — `20260416180000_invariant_checks_hardening.sql` (Check 2 fix + Checks 17-20)
- **2026-04-16**: Tier 4 hotfix — `20260416170000_security_tier4_fix_system_mode.sql` (reverted is_admin gate on get_system_mode — breaks triggers)
- **2026-04-16**: Tier 4 — `20260416160000_security_tier4_read_gates.sql` (5 ungated SECDEF read function gates)
- **2026-04-16**: Tier 3.5 — `20260416150000_security_tier35_cross_tenant_gaps.sql` (3 cross-tenant read gap fixes)
- **2026-04-16**: Tier 3 — `20260416140000_security_tier3_read_gates.sql` (11 read function admin gates)
- **2026-04-15**: Full squash — 131 migrations consolidated into single canonical baseline
- All pre-squash migrations archived to `supabase/archived_migrations/_pre_squash_20260415/`
- Dead directories removed: `migrations_bak/`, `migrations_essential/`
- Dead directories archived: `migrations_broken/`, `migrations_fixes/`, `patches/`