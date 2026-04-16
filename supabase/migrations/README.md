# Migrations README

## Structure
- `20260415000000_squash_canonical_baseline.sql` — Full canonical schema (generated from remote via `supabase db dump --linked`)
- `20260415000001_squash_reconciliation.sql` — Delta changes applied on top of existing remote

## History
- **2026-04-15**: Full squash — 131 migrations consolidated into 2 canonical files
- Pre-squash migrations archived to `supabase/archived_migrations/_pre_squash_20260415/`

## Rules
1. Never use Dashboard SQL Editor for schema changes
2. Always create migrations via `npx supabase migration new <description>`
3. SECURITY DEFINER functions MUST have `is_admin()` or `require_admin()` gate
4. Core mutation functions MUST set `canonical_rpc` flag
5. Financial columns MUST use `numeric(28,10)` — never unbounded `numeric`
6. Test locally with `npx supabase db reset` before pushing
7. Push with `npx supabase db push --linked`
8. Regenerate types after push: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`