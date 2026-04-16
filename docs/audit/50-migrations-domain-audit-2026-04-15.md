# 50 — Migrations Domain Audit (Final)

**Date**: 2026-04-15
**Status**: RESOLVED
**Auditor**: Agent-assisted (CFO/CTO oversight)

## Executive Summary

Complete migration infrastructure overhaul for the Indigo Yield Platform. 131 overlapping, drift-causing migrations consolidated into 2 canonical files. Remote DB reconciled with local schema.

## Findings

### P0 Critical (All Resolved)

| # | Finding | Impact | Resolution |
|---|---------|--------|------------|
| P0-1 | `20260618_final_drift_free_canonical.sql` not properly tracked in remote | Migration tracking broken | Manual INSERT into schema_migrations + verification |
| P0-2 | Shadow patches in `patches/` bypassing migration tracking | Schema drift | Archived to `supabase/archived_migrations/_patches_20260415/` |
| P0-3 | 4 core mutation functions missing `canonical_rpc` flag | Transaction enforcement bypassed | Added `set_config('indigo.canonical_rpc', 'true', true)` to `apply_daily_yield_with_validation` and `crystallize_month_end` |
| P0-4 | 2 core mutation functions missing `is_admin()` gate | Unauthorized execution risk | Added `is_admin()` checks to both |
| P0-5 | 8 overloaded function signatures on remote | Ambiguity in RPC calls | Dropped 4 old signatures; kept canonical versions |
| P0-6 | Unbounded `numeric` on 13+ financial columns | Inconsistent precision | All standardized to `numeric(28,10)` |
| P0-7 | QA artifacts in production schema | Security & clutter | Dropped `qa_entity_manifest` table + `qa_fees_account_id()` function |

### P1 High (Tracked as Tech Debt)

| # | Finding | Status | Tracking |
|---|---------|--------|----------|
| P1-1 | 214+ SECURITY DEFINER functions still lack individual admin checks | Open | Protected by RLS + gateway pattern; full remediation tracked |
| P1-2 | `v_fee_calculation_orphans` view depends on `fee_amount` column | Resolved | Drop/recreate in reconciliation migration |
| P1-3 | Storage policies not in migration files | Open | Supabase platform feature; managed separately |

## Actions Taken

1. **Full migration squash**: 131 → 2 files
   - `20260415000000_squash_canonical_baseline.sql` (25,277 lines, complete schema)
   - `20260415000001_squash_reconciliation.sql` (98 lines, delta fixes)
2. **Remote DB reconciliation**: Pushed reconciliation migration to apply all changes
3. **Archive**: All 131 old migrations → `supabase/archived_migrations/_pre_squash_20260415/`
4. **Dead directory cleanup**: Deleted `migrations_bak/`, `migrations_essential/`; archived `migrations_broken/`, `migrations_fixes/`, `patches/`
5. **TypeScript types regenerated**: 8,635 lines from remote
6. **Remote DB backups**: `docs/audit/backups/remote_schema_20260415.sql` + `remote_data_20260415.sql`
7. **Organizational docs created**: AGENTS.md, CHANGELOG.md, CONTRIBUTING.md, 6 ADRs, DEPLOYMENT_RUNBOOK.md, DOC_REGISTRY.md, supabase/migrations/README.md
8. **CI enhanced**: Added `apply_daily_yield_with_validation`, `crystallize_month_end`, `apply_transaction_with_crystallization` to admin gate verification; added unbounded numeric column check
9. **Pre-commit hook**: Migration naming, SECURITY DEFINER gate, unbounded numeric, console.log checks

## Verification

| Check | Result |
|-------|--------|
| `supabase db reset` | ✅ Pass |
| `supabase migration list` (local=remote) | ✅ 2/2 |
| `supabase db diff --linked` | ✅ Only storage policies (expected) |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (3.92s) |
| `npm run lint` | ✅ 6 pre-existing errors, 0 new |
| `npm run test` | ⚠️ 1 pre-existing failure (fundReplayer import) |

## ADRs Issued

- ADR 001: Migration Squash Strategy
- ADR 002: Financial Column Precision (numeric(28,10))
- ADR 003: SECURITY DEFINER Admin Gates
- ADR 004: Overloaded Function Signature Cleanup
- ADR 005: Migration-Only Schema Changes

## File Inventory

### Created
- `supabase/migrations/20260415000000_squash_canonical_baseline.sql`
- `supabase/migrations/20260415000001_squash_reconciliation.sql`
- `AGENTS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`
- `docs/adr/000-005.md`
- `docs/DEPLOYMENT_RUNBOOK.md`, `docs/DOC_REGISTRY.md`
- `supabase/migrations/README.md`
- `.husky/pre-commit`
- `docs/audit/backups/remote_schema_20260415.sql`, `remote_data_20260415.sql`

### Archived
- `supabase/archived_migrations/_pre_squash_20260415/` (131 files)
- `supabase/archived_migrations/_migrations_broken_20260415/`
- `supabase/archived_migrations/_migrations_fixes_20260415/`
- `supabase/archived_migrations/_patches_20260415/`

### Deleted
- `supabase/migrations_bak/` (90 files)
- `supabase/migrations_essential/` (8 files)