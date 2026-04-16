# Contributing to Indigo Yield Platform

## Getting Started
1. Clone the repo
2. `npm install`
3. `npx supabase start` — start local DB
4. `npx supabase db reset` — apply migrations + seeds
5. `npm run dev` — start dev server

## Branch Convention
- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — code cleanup
- `chore/<description>` — tooling, CI, docs

## Commit Format
```
<type>: <description>
```
Types: feat, fix, refactor, docs, test, chore, perf, ci

## Database Changes
- **ALL schema changes go through migrations** — never use Dashboard SQL Editor
- Create migration: `npx supabase migration new <description>`
- Naming: `<timestamp>_<snake_case_description>.sql`
- Test locally: `npx supabase db reset`
- Push to remote: `npx supabase db push --linked`
- Regenerate types: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`

### SECURITY DEFINER Functions
- Every `SECURITY DEFINER` function MUST include an `is_admin()` or `require_admin()` check
- Core mutation functions MUST set `canonical_rpc` flag: `PERFORM set_config('indigo.canonical_rpc', 'true', true);`

### Financial Columns
- Use `numeric(28,10)` for all money/percentage columns
- Never use unbounded `numeric`
- Use Decimal.js on frontend — never floating point for money

## Code Style
- TypeScript strict mode, no `any`
- Max 400 lines per file (800 hard limit)
- Functions <50 lines
- Immutable patterns — always return new objects
- No comments unless asked
- No hardcoded secrets — env vars only

## Testing
- Write tests first (TDD): Red → Green → Improve
- Min 80% coverage
- SQL migration tests in `tests/migrations/`
- E2E tests in `tests/e2e/`

## Pull Requests
1. Create feature branch from main
2. Make changes + add tests
3. Run `npx tsc --noEmit && npm run lint && npm run test`
4. Push with `-u` flag if new branch
5. Create PR with comprehensive summary