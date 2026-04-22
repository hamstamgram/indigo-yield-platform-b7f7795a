# AGENTS.md — Indigo Yield Platform

## Project Overview
Financial crypto yield management platform. React 18 + TypeScript + Vite frontend, Supabase PostgreSQL + RLS + Edge Functions backend. Supabase project: `nkfimvovosdehmyyjubn`.

## Key Commands
```
npm run dev              # Dev server (port 8080, not 5173)
npm run build            # Production build
npx tsc --noEmit         # Type check (uses --max-old-space-size=8192)
npm run lint             # ESLint (max-warnings=0)
npm run test             # Vitest unit tests
npm run test:coverage    # Vitest with coverage
npm run test:e2e         # Playwright E2E
npm run test:integration # Vitest integration (vitest.integration.config.ts)
npm run contracts:verify # Verify enum/DB contracts
npm run contracts:scan   # Scan frontend queries vs DB schema
npm run integrity:check  # contracts:verify + sql:hygiene + gateway:check
npx supabase db reset    # Reset local DB from migrations
npx supabase db diff --linked  # Diff local vs remote schema
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Shadcn/UI + Decimal.js
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions)
- **State**: TanStack Query (server state), React Context (client state)
- **Money**: All financial values use `numeric(28,10)` in DB, `Decimal.js` in frontend
- **Auth**: Supabase Auth + RLS policies (`is_admin()`, `is_super_admin()`)
- **Path alias**: `@` → `./src` (defined in `vite.config.ts`)
- **Supabase types**: Auto-generated at `src/integrations/supabase/types.ts`

## Database Conventions
- **Migrations**: `supabase/migrations/` — ONLY directory for schema changes. Never use Dashboard SQL Editor
- **Naming**: `<timestamp>_<snake_case_description>.sql`
- **Squash history**: 131 migrations consolidated on 2026-04-15. Pre-squash archived to `supabase/archived_migrations/_pre_squash_20260415/`
- **SECURITY DEFINER functions** MUST have `is_admin()` or `require_admin()` gate. Pre-commit hook blocks commits without it
- **Core mutation functions** MUST set `canonical_rpc` flag via `set_config('indigo.canonical_rpc', 'true', true)`
- **Financial columns**: `numeric(28,10)` — never unbounded `numeric` (pre-commit hook blocks this)
- **Source column allowlist**: `transactions_v2.source` must be in trigger allowlist
- **`get_system_mode`** is intentionally ungated (internal triggers call it). `anon` EXECUTE revoked

## Critical Function Chain
Frontend → `apply_transaction_with_crystallization` → sets `canonical_rpc` → calls type-specific function → triggers `enforce_transaction_via_rpc` checks source allowlist

## Frontend Conventions

### Money (CRITICAL — agents WILL get this wrong without guidance)
- **NEVER** use `.toNumber()` for financial display. Use `parseFinancial(x).toString()` or `toDisplayString()`
- All money fields in TypeScript interfaces are `string` type (not `number`)
- Use `parseFinancial()` from `src/utils/financial.ts` to parse numeric values
- Use `Decimal.js` `.gt()`, `.lt()`, `.eq()` for comparisons — never `Number()` or `parseFloat()`
- Replace `.toNumber().toFixed(N)` with `parseFinancial(x).toFixed(N)`
- Replace `Number(x) > 0` with `parseFinancial(x).gt(0)`
- See `.opencode/plans/sprint-financial-integrity-security.md` for full Decimal.js migration plan

### Balance Reads (withdrawals, full-exit, AUM decisions)
`investor_positions.current_value` is a **derived/cached** column that can drift from the transaction ledger. For any financial decision (withdrawal amounts, full-exit previews, available-balance checks), read from the authoritative ledger via `get_investor_ledger_balance(p_investor_id, p_fund_id)` RPC — never directly from `investor_positions.current_value`.
- UI path: `fetchPositionsForWithdrawal` applies a ledger-override when drift > 0.0001
- Hook path: `useAvailableBalance` calls the RPC directly
- Both paths MUST agree. See migration `20260417210000_ledger_balance_rpc.sql` for rationale.

### Gateway Pattern (CI-enforced)
Supabase calls MUST go through canonical gateways:
- **RPC calls** → `src/lib/rpc.ts` — all `supabase.rpc()` calls go through this module
- **Database mutations** → `src/lib/db.ts` — all `.insert()`, `.update()`, `.delete()` go through this module
- **CI blocks** direct mutations on protected tables: `transactions_v2`, `yield_distributions`, `fund_aum_events`, `fund_daily_aum`
- **CI blocks** `.select('id')` on `investor_positions` (composite PK: `investor_id, fund_id`)

### Contracts System
- `src/contracts/dbEnums.ts` — source of truth for enum values (auto-generated)
- `src/contracts/dbSchema.ts` — DB schema types (auto-generated)
- `src/contracts/rpcSignatures.ts` — RPC function signatures (auto-generated)
- Run `npm run contracts:generate` after any DB schema change
- Run `npm run contracts:verify` in CI to check enum/DB alignment
- `FIRST_INVESTMENT` is UI-only — must map to `DEPOSIT` for DB via `mapUITypeToDb()`

### Void System
- `void_transaction`, `void_yield_distribution`, `void_and_reissue_transaction` all set `canonical_rpc`
- Each void cascade updates: transactions_v2, yield distributions, fee allocations, IB ledger, platform fee ledger, investor yield events, investor positions, fund_daily_aum
- `voided_by_profile_id` and `void_reason` columns being added to all void-capable tables (see `docs/superpowers/plans/2026-04-15-void-system-standardization.md`)
- `void_yield_distribution` sets `status='voided'` on distributions (required for unique index re-insert)

## Testing

### Test Structure
```
tests/
  e2e/                          # Playwright E2E specs
  migrations/                   # Raw SQL test files (run via psql)
  validation/                   # Disabled/pending specs
  *-phase0_setup.sql            # Seed data for E2E scenarios
  global-setup.ts               # Playwright auth setup
```
- **No `tests/unit/` or `tests/qa/` directories exist** — package.json references them but they haven't been created
- **Vitest config is inside `vite.config.ts`** (no separate vitest.config), excludes `tests/e2e/**`

### E2E Auth
- Playwright `globalSetup` in `tests/e2e/global-setup.ts`
- Uses `QA_EMAIL` and `QA_PASSWORD` environment variables
- Storage states saved to `tests/.auth/` (gitignored)

### Running SQL Tests
```bash
psql "$DATABASE_URL" -f tests/migrations/<file>.sql   # Run against remote
```

### Key Fixture IDs (for E2E tests)
| Entity | UUID prefix |
|--------|------------|
| XRP Fund | `2c123c4f` |
| SOL Fund | `7574bc81` |
| INDIGO LP | `711bfdc9` |
| Sam Johnson | `c7b18014` |
| Paul Johnson | `96fbdf46` |
| Alex Jacobs | `4ca7a856` |
| Ryan Van Der Wall | `40c33d59` |
| INDIGO Fees | `b464a3f7` |
| Admin | `e438bfff` |

## Security
- No hardcoded secrets — env vars only. No PII in logs
- All RPC mutations require admin check
- RLS enabled on all tables
- Pre-commit hook checks: migration naming, SECDEF admin gates, unbounded numeric, console.log warning
- CI checks: SECDEF admin gates, financial column precision, yield conservation, protected table mutation enforcement, composite PK misuse, FIRST_INVESTMENT enum, contract verification, SQL hygiene, gateway usage
- `can_access_investor` includes `canonical_rpc` bypass — SECDEF batch functions bypass per-investor access checks
- `enforce_profiles_safe_columns` trigger blocks non-admin changes to 15 sensitive profile columns
- See `docs/superpowers/plans/2026-04-20-go-live-hardening.md` Phase 6 for SECDEF/anon sweeps

## Active Plans & Technical Debt
- **Go-live hardening**: `docs/superpowers/plans/2026-04-20-go-live-hardening.md` — E2E harness, trigger matrix, security sweep
- **Position sync phase 2**: `docs/superpowers/plans/2026-04-21-position-sync-phase-2.md` — Invariant definitions, validation consolidation, repair isolation
- **Financial architecture hardening**: `docs/superpowers/plans/2026-05-05-financial-architecture-hardening.md` — Void/unvoid isolation, yield cleanup, reporting hardening
- **Void system standardization**: `docs/superpowers/plans/2026-04-15-void-system-standardization.md` — `voided_by_profile_id` + `void_reason` on all void-capable tables
- **Financial integrity sprint**: `.opencode/plans/sprint-financial-integrity-security.md` — Decimal.js enforcement, stale closure fix, is_active/is_voided filters
- **P0: void_and_reissue migration needs remote apply**: `docs/POST_LAUNCH_TECH_DEBT.md`
- **Remaining work**: `docs/PLAN_REMAINING_WORK.md`

## File Limits
- Max 400 lines typical, 800 hard max
- Functions <50 lines
- No deep nesting (>4 levels)
- Immutability: always return new objects, never mutate