# Go-Live Hardening — Design Spec

- **Date:** 2026-04-20
- **Owner:** Hamza (single operator), Claude drives tooling
- **Target project:** Supabase `nkfimvovosdehmyyjubn` (Indigo Yield prod)
- **Launch candidate tag:** `golive-2026-04-20`
- **Approach:** Pipeline-serial, 7 phases compressed into a single day

## 1. Purpose

Harden the Indigo Yield platform to a go-live bar in one day. The platform shipped 20+ migrations in the last 72h (void/reissue correctness, invariant-check hardening, SECDEF gates, anon EXECUTE revocation). This spec defines the test matrix, gates, DR posture, and cutover sequence required to sign off with confidence that:

1. All 20 DB invariants pass on live state after the full transaction cascade
2. Every user-visible flow works in Playwright on desktop + mobile
3. Every mutation trigger behaves correctly across every `transactions_v2.source` × `canonical_rpc` combination
4. A documented rollback path exists with verified backup evidence

## 2. Scope

**In scope**
- Supabase project `nkfimvovosdehmyyjubn` schema + data (hybrid preserve/reset strategy below)
- Frontend routes under `src/routing/routes/admin/*` and `src/routing/routes/investor/*`
- Playwright E2E suite in `tests/e2e/*` (reuse existing where possible, add 5 net-new specs)
- DB trigger matrix tests in `tests/migrations/trigger_matrix_*.sql`
- `run_invariant_checks()` 20-row output
- Rollback runbook at `docs/runbooks/rollback.md`

**Out of scope**
- OpenClaw orchestration (port 18789)
- n8n / Vapi automations
- KYC/AML provider integration
- Legal / T&Cs sign-off
- Public marketing launch and CDN warmup
- Load testing beyond a N=50 perf smoke

## 3. Data strategy (hybrid)

**Preserve** — `profiles`, `funds`, `fund_config`, `investor_accounts`, Supabase Auth credentials, storage buckets, RLS policies, all schema objects, all views/functions.

**Reset to known-good baseline** — `transactions_v2`, `investor_positions`, `yield_allocations`, `fee_allocations`, `ib_commission_ledger`, `platform_fee_ledger`, `investor_yield_events`, `yield_distributions`, `fund_daily_aum`, `withdrawal_requests`, `audit_log` rows scoped to the reset.

**Seed on top** — run `tests/sol_phase0_setup.sql` + `tests/xrp_phase0_setup.sql` + a new `tests/btc_phase0_setup.sql` to return the ledger to verified opening balances.

**Safety** — the reset is a `SECURITY DEFINER` function with **two** gates, both required:

1. `PERFORM require_admin();` at function entry (AGENTS.md-mandated for every new SECDEF)
2. `IF current_setting('indigo.test_mode', true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION …;`

Absent either gate the function raises and the transaction rolls back. The `indigo.test_mode` flag is set `LOCAL` only so it cannot leak across sessions. Anon `EXECUTE` is revoked; only `authenticated` + `service_role` may call.

### Canonical key IDs (fixtures in seed)

| Entity | UUID prefix |
|---|---|
| XRP Fund | `2c123c4f` |
| SOL Fund | `7574bc81` |
| INDIGO LP | `711bfdc9` |
| Sam Johnson | `c7b18014` |
| Paul Johnson | `96fbdf46` |
| Alex Jacobs | `4ca7a856` |
| Ryan Van Der Wall | `40c33d59` |
| INDIGO Fees | `b464a3f7` |
| Admin | `e438bfff` |

### Verified baselines (XRP and SOL confirmed; BTC to be established)

- **XRP E2E** — Sam Johnson +284 / +298.31 · Ryan +14.20 / +14.93 · INDIGO Fees +56.80 / +59.76
- **SOL E2E** — INDIGO LP +2 / +11.65 · Paul +1.85 · Alex +0.0327 · INDIGO Fees +0.2942
- **BTC** — no verified baseline exists; Phase 3 establishes one

## 4. Identity strategy for E2E

Migration `<timestamp>_e2e_test_accounts.sql` provisions:

- `e2e_admin@indigo.test` → linked to canonical Admin profile
- `e2e_investor_sam@indigo.test` → Sam Johnson
- `e2e_investor_paul@indigo.test` → Paul Johnson
- `e2e_investor_alex@indigo.test` → Alex Jacobs
- `e2e_investor_ryan@indigo.test` → Ryan Van Der Wall

Deterministic passwords sourced from `E2E_PASSWORD_*` env vars, never committed. `email_confirmed_at` set at insert so no email confirmation step blocks tests. `scripts/seed-e2e-auth.ts` is updated to idempotently reset the password from env on each run.

Playwright `globalSetup` captures storage state once per role into `tests/.auth/<role>.json`, reused by every spec — avoids 1 login per test.

## 5. Phase-by-phase execution (all same-day 2026-04-20)

### Phase 1 — Freeze & foundation
- Complete Supabase MCP OAuth callback
- `git status` triage: commit the 12 modified files in categories or stash them with named stash
- Take full `pg_dump` of project, upload off-repo, record timestamp in `docs/runbooks/rollback.md`
- Verify PITR window accessible via Supabase dashboard
- `git tag pre-golive-hardening-2026-04-20`
- Decide `tests/qa/` fate (scaffold minimal files or delete 7 `test:qa:*` scripts from `package.json`). Default: delete.
- Add `mobile-chrome` + `webkit` projects to `playwright.config.ts`, enable `fullyParallel` per-project with `workers: 2`
- `docs/runbooks/rollback.md` v1 draft

### Phase 2 — Test-harness bring-up
- Commit new migration `<ts>_e2e_test_accounts.sql`
- Commit new migration `<ts>_test_mode_reset_helper.sql` — function `_test_reset_transactional_state()` gated by `indigo.test_mode`
- Update `scripts/seed-e2e-auth.ts` for idempotent password reset from env
- Add `tests/globalSetup.ts` that logs each role in once and saves storage state
- Wire `use: { storageState: 'tests/.auth/<role>.json' }` per spec group
- Run existing smoke suite against remote to confirm harness: `smoke-login`, `smoke-navigation`, `smoke-critical-flows`

### Phase 3 — Admin surface full matrix
New specs:
- `tests/e2e/ui-admin-investor-lifecycle-full.spec.ts` — create → KYC → fee_pct → ib_percentage → ib_parent_id → account_type → status → deactivate; non-admin escalation attempts asserted to fail via RLS/trigger
- `tests/e2e/ui-admin-btc-cascade-verified.spec.ts` — establish BTC verified baseline analogous to XRP/SOL
- `tests/e2e/ui-admin-reporting-full.spec.ts` — dashboard → AUM → performance → yield history with all fee columns → PDF open → export

Reuse:
- `ui-admin-data-integrity`, `ui-admin-financial-actions`, `ui-void-cascade`, `ui-withdrawal-full-exit`
- XRP + SOL lifecycle specs

After each cascade, run `SELECT * FROM run_invariant_checks()` via MCP, assert all 20 rows pass.

### Phase 4 — Investor portal full matrix
New specs:
- `tests/e2e/ui-investor-portal-full.spec.ts` — login → overview → performance → yield history → portfolio → funds → documents → transactions → new withdrawal → statements PDF from storage
- `tests/e2e/ui-investor-rls-isolation.spec.ts` — investor A authenticated client attempts to read investor B rows across 10+ tables; all must deny or return 0 rows

Runs on desktop-chromium + mobile-chrome + webkit projects. Console errors fail the test.

### Phase 5 — Trigger matrix + invariant sweep
Per trigger, one file in `tests/migrations/trigger_matrix_<trigger>.sql`. Each file asserts the trigger fires/blocks correctly for every source allowlist value × `canonical_rpc ∈ {on, off}`.

Triggers covered:
1. `enforce_transaction_via_rpc`
2. `fn_ledger_drives_position` (all tx_types: DEPOSIT, WITHDRAWAL, YIELD_CREDIT, FEE, IB_DEBIT, DUST, DUST_SWEEP)
3. `protect_profile_sensitive_fields` (13 protected columns)
4. `enforce_economic_date`
5. `enforce_yield_event_date`
6. `trg_ledger_sync`
7. `trg_enforce_canonical_daily_aum`
8. `enforce_profiles_safe_columns` (consolidation regression check)

After matrix green → run `run_invariant_checks()` on live state. 20/20 captured as artifact.

### Phase 6 — Security closure + DR drill + perf smoke
- Re-run pre-commit SECDEF gate against every 2026-04-16/17 migration (scripted sweep of all new SECDEF functions)
- Anon EXECUTE sweep: `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND has_function_privilege('anon', p.oid, 'EXECUTE') AND p.prosecdef;` must return 0 rows
- RLS smoke: anon client attempts `SELECT *` on each table — 0 rows or denied
- Storage RLS check on `statements` bucket
- DR drill (today-compressed): verify pg_dump accessible + PITR window present, draft/commit v2 rollback runbook. **No actual restore test today** — flagged as follow-up work
- Perf smoke (optional, cuttable): seed N=50 investors in a scratch fund, run `apply_segmented_yield_distribution_v5`, record end-to-end latency and lock duration

### Phase 7 — Cutover rehearsal + go/no-go
- Freeze migrations directory (no new commits)
- End-to-end run against remote: reset → seed → full cascade (XRP + SOL + BTC) → 20/20 invariants → full Playwright green desktop + mobile
- Capture invariant output and Playwright JSON report as artifacts under `docs/verification/golive-2026-04-20/`
- Go/no-go checklist (Section 6) must be fully green
- If green: `git tag golive-2026-04-20`, announce
- If red: triage, fix via a new hotfix migration, re-run from Phase 5

## 6. Acceptance gates (must all be green to ship)

- [ ] 20/20 invariants pass on final Phase-7 sweep against remote
- [ ] 5 net-new Playwright specs green on desktop + mobile
- [ ] Existing E2E smoke + lifecycle specs green on desktop + mobile
- [ ] Trigger matrix: 100% of cases pass
- [ ] `package.json` has no scripts pointing at nonexistent files
- [ ] Phase-1 pg_dump timestamp recorded in rollback runbook
- [ ] `docs/runbooks/rollback.md` committed
- [ ] Anon EXECUTE sweep returns 0 rows
- [ ] `git tag golive-2026-04-20` created on the last green commit

## 7. DR + rollback

`docs/runbooks/rollback.md` contains:

1. **Backup evidence** — location + timestamp of Phase-1 pg_dump
2. **PITR window** — confirmed accessible via Supabase dashboard (screenshot/artifact)
3. **Rollback options**
   - Code-only bug: `git revert <sha>` + redeploy
   - Schema bug from last migration: drop functions/objects from the bad migration, restore previous definitions from `supabase/migrations/_pre_squash_20260415/` baseline
   - Data corruption: PITR restore to a scratch project branch, cherry-pick clean rows back
4. **Decision tree** — symptom → option
5. **Oncall contact** — Hamza primary

## 8. Security closure

- Pre-commit SECDEF gate re-run against all migrations dated 2026-04-16 and 2026-04-17
- Anon EXECUTE sweep — expected zero
- RLS smoke per table — expected zero leaked rows from anon
- `get_system_mode` — verified ungated from `is_admin()` (by design for triggers) but anon EXECUTE revoked
- Profile escalation — verified `protect_profile_sensitive_fields` blocks non-admin UPDATE on all 13 protected columns
- Storage — verified `statements` bucket RLS scopes to the owning investor

## 9. Architecture constraints reaffirmed from AGENTS.md

- Migrations are the only path for schema changes; Dashboard SQL Editor is forbidden
- All new SECURITY DEFINER functions must have `is_admin()` / `require_admin()` gate (pre-commit blocking)
- Core mutation functions must set `canonical_rpc` flag via `set_config('indigo.canonical_rpc', 'true', true)`
- Financial columns remain `numeric(28,10)`; frontend uses Decimal.js
- `transactions_v2.source` must be in the trigger allowlist
- File size limits: 400 lines typical, 800 hard max; functions <50 lines

## 10. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Single-day compression leaves no rehearsal buffer | ≥80% of E2E coverage already exists; only 5 net-new specs are critical-path |
| Supabase MCP OAuth callback not yet completed | Non-blocking for Phases 1–2; fall back to `psql $DATABASE_URL` if MCP stays unauthenticated |
| `indigo.test_mode` flag leaking to real sessions | `SET LOCAL` only + function refuses to run without flag + ROLLBACK on failure + pg_dump taken pre-reset |
| 20260417* migration churn hides a latent regression | Trigger matrix in Phase 5 is designed to surface these; red = stop, do not ship |
| BTC has no verified baseline | Phase 3 establishes it; if BTC cascade fails, BTC fund is withheld from launch while XRP + SOL ship |
| Working-tree has 12 modified + 22 untracked migrations | Phase 1 first action: triage + commit/stash + tag |
| DR drill not actually exercising a restore | Documented as a follow-up; Phase 6 verifies backup + PITR accessibility only |
| Perf smoke cut under time pressure | Acceptable — not a hard gate; if cut, tracked as post-launch follow-up |

## 11. Assumptions

- Hamza is sole operator today; Claude drives tools
- `APP_URL` = `http://localhost:8080` (local dev server running `npm run dev`)
- Supabase Auth email-confirmation can be bypassed for `*@indigo.test` accounts via `email_confirmed_at`
- It is acceptable to delete the 7 `test:qa:*` scripts from `package.json` rather than scaffold the missing files
- Launch announcement, legal sign-off, KYC/AML wiring are handled outside this plan

## 12. Follow-ups (post-launch)

- Execute an actual PITR restore to a scratch branch (full DR drill)
- Establish perf baseline at N=50 / N=100 / N=200 investors
- Scaffold `tests/qa/` properly or remove permanently from the codebase
- Backfill BTC verified-baseline line into AGENTS.md after Phase 3 success
- Wire CI to run `npm run test:e2e` nightly with storage-state reuse
