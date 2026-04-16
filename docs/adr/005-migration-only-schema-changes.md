# ADR 005: Migration-Only Schema Changes

## Status
Accepted

## Context
Historically, some schema changes were applied via Supabase Dashboard SQL Editor, bypassing migration tracking:
- `patches/20260415_critical_fixes.sql` — 633 lines executed directly, content differs from corresponding tracked migration
- `fix_database_schema.sql` — ad-hoc patch in supabase/ root
- `verify_rpcs_p19.sql` — ad-hoc verification script in supabase/ root

This caused drift between migration tracking and actual remote schema, making `supabase db diff` unreliable and `supabase db reset` potentially producing a different schema than remote.

## Decision
1. **ALL schema changes MUST go through `supabase/migrations/`** — never Dashboard SQL Editor
2. Create migration: `npx supabase migration new <description>`
3. Test locally: `npx supabase db reset`
4. Push to remote: `npx supabase db push --linked`
5. Regenerate types: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
6. No standalone SQL files in `supabase/` root — only `migrations/`, `seed/`, `seeds/`, `functions/`, `config.toml`

## Consequences
- Single source of truth for schema changes
- `supabase db diff` remains reliable
- `supabase db reset` always produces schema matching remote
- Emergency hotfixes still go through migration files (faster than Dashboard anyway)
- Enforced by pre-commit hooks (migration file naming) and code review