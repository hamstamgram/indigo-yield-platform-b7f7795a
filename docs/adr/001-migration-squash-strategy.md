# ADR 001: Migration Squash Strategy

## Status
Accepted

## Context
The project accumulated 131 migration files over its lifetime, causing:
- Drift between local and remote schemas
- Shadow patches applied via Dashboard SQL Editor bypassing migration tracking
- Dead directories (migrations_bak, migrations_essential, etc.) confusing developers
- Overloaded function signatures on remote not matching local expectations
- Unbounded `numeric` columns in some tables vs `numeric(28,10)` in others
- 2 of 4 core mutation functions missing `canonical_rpc` flag and `is_admin` gates
- QA/test artifacts (qa_entity_manifest table, qa_fees_account_id function) in production schema

## Decision
1. **Full squash**: Replace all 131 migrations with a single canonical baseline generated from remote DB via `supabase db dump --linked`
2. **Reconciliation migration**: Apply targeted fixes (drop overloads, standardize columns, add security gates, drop QA artifacts) in a second migration
3. **Archive**: Move all old migrations to `supabase/archived_migrations/_pre_squash_20260415/` for historical reference
4. **Cleanup**: Delete fully-dead directories (migrations_bak, migrations_essential), archive partially-dead ones (migrations_broken, migrations_fixes, patches)

## Consequences
- Fresh `supabase db reset` builds DB from 2 files instead of 131
- Future migrations start from a clean slate
- Remote DB now matches local exactly (except storage policies)
- All 4 core mutation functions now have canonical_rpc + is_admin gates
- All financial columns standardized to numeric(28,10)
- Historical context preserved in archive directory