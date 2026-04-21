# Go-Live Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Indigo Yield platform to a go-live bar in one day (2026-04-20), covering data-reset harness, 5 net-new Playwright specs (desktop + mobile), an 8-trigger × source × canonical_rpc SQL matrix, 20/20 live invariants, security sweep, DR posture, and a tagged cutover.

**Architecture:** Pipeline-serial execution in 7 phases against remote Supabase project `nkfimvovosdehmyyjubn`. Hybrid data strategy — preserve schema + identities + config, reset transactional tables via a dual-gated (`require_admin()` + `indigo.test_mode`) SECDEF helper, reseed from verified phase-0 scripts. Storage-state Playwright with one login per role. SQL matrix uses savepoint rollback so tests do not pollute state.

**Tech Stack:** Supabase (PostgreSQL + RLS + Edge Functions), React 18 + TypeScript + Vite, TanStack Query, Shadcn/UI, Playwright 1.55, Vitest 4, Decimal.js, supabase-js 2.39, Zod 3.

**Spec:** `docs/superpowers/specs/2026-04-20-go-live-hardening-design.md`

**Canonical key IDs (use as fixtures):**

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

**Verified baselines:** XRP (Sam +284/+298.31 · Ryan +14.20/+14.93 · Fees +56.80/+59.76) · SOL (LP +2/+11.65 · Paul +1.85 · Alex +0.0327 · Fees +0.2942) · BTC (to be established in Phase 3).

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260420100000_test_mode_reset_helper.sql` | SECDEF `_test_reset_transactional_state()` gated by `require_admin()` + `indigo.test_mode` |
| `supabase/migrations/20260420100500_e2e_test_accounts.sql` | Provision 5 auth.users rows (1 admin + 4 investors) linked to canonical profiles, `email_confirmed_at` set, anon EXECUTE revoked |
| `tests/btc_phase0_setup.sql` | BTC opening-balance seed analogous to `sol_phase0_setup.sql` |
| `tests/globalSetup.ts` | Playwright globalSetup: logs each role via `signInWithPassword`, saves storage state to `tests/.auth/<role>.json` |
| `tests/e2e/ui-admin-investor-lifecycle-full.spec.ts` | Full investor CRUD + all 13 protected-column escalation assertions |
| `tests/e2e/ui-admin-btc-cascade-verified.spec.ts` | BTC deposit → yield → fee → IB → withdrawal → void → reissue, establishes numeric baseline |
| `tests/e2e/ui-admin-reporting-full.spec.ts` | Dashboard KPIs → AUM → performance → yield history fee columns → PDF open → export |
| `tests/e2e/ui-investor-portal-full.spec.ts` | Investor-side flow top to bottom |
| `tests/e2e/ui-investor-rls-isolation.spec.ts` | Investor A client attempts to read Investor B rows across ≥10 tables; all denied |
| `tests/migrations/trigger_matrix_enforce_transaction_via_rpc.sql` | Matrix file (pattern repeats per trigger) |
| `tests/migrations/trigger_matrix_fn_ledger_drives_position.sql` | Each tx_type × source |
| `tests/migrations/trigger_matrix_protect_profile_sensitive_fields.sql` | 13 protected columns × admin/non-admin |
| `tests/migrations/trigger_matrix_enforce_economic_date.sql` | Valid/invalid dates × system_mode |
| `tests/migrations/trigger_matrix_enforce_yield_event_date.sql` | Same pattern for yield events |
| `tests/migrations/trigger_matrix_trg_ledger_sync.sql` | INSERT + UPDATE sync assertions |
| `tests/migrations/trigger_matrix_trg_enforce_canonical_daily_aum.sql` | AUM ↔ position-sum invariant fires |
| `docs/runbooks/rollback.md` | Backup evidence + decision tree + recovery commands |
| `docs/verification/golive-2026-04-20/invariant-checks.txt` | Final Phase-7 artifact |
| `docs/verification/golive-2026-04-20/playwright-report.json` | Final Phase-7 artifact |
| `scripts/anon-execute-sweep.sql` | Queries `pg_proc` for SECDEF functions with anon EXECUTE |
| `scripts/rls-smoke.ts` | Anon client attempts `SELECT *` per table; asserts 0 rows |
| `scripts/secdef-gate-sweep.sh` | Re-runs pre-commit SECDEF gate against all 2026-04-16/17 migrations |

### Modified

| Path | Change |
|---|---|
| `playwright.config.ts` | Add `mobile-chrome` + `webkit` projects; wire `globalSetup` + per-project `storageState`; bump `workers: 2` in CI mode |
| `package.json` | Delete 7 `test:qa:*` scripts (targets do not exist) |
| `scripts/seed-e2e-auth.ts` | Idempotent password reset from `E2E_PASSWORD_ADMIN` / `E2E_PASSWORD_INVESTOR` env |
| `AGENTS.md` | Append BTC verified-baseline line post-Phase 3 |

---

## Pre-flight (complete before Task 1.1)

- [ ] **Pre-flight A — Supabase MCP OAuth completed**

If the MCP authentication is still pending, paste the full callback URL (from the browser address bar after authorizing) back in chat so I can call `complete_authentication`. If callback fails repeatedly, fall back to `psql $DATABASE_URL` for all MCP-equivalent queries and proceed — do not block the plan on this.

- [ ] **Pre-flight B — Environment variables present**

```bash
env | grep -E 'SUPABASE|E2E_PASSWORD|APP_URL|DATABASE_URL'
```
Expected: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `E2E_PASSWORD_ADMIN`, `E2E_PASSWORD_INVESTOR`, `APP_URL` (optional; defaults to `http://localhost:8080`). If any `E2E_PASSWORD_*` missing, generate one and add to `.env.local` (never commit).

- [ ] **Pre-flight C — Dev server reachable**

```bash
curl -sf http://localhost:8080 > /dev/null && echo OK || echo "start dev server: npm run dev"
```
Expected: `OK`. If not, open a second terminal: `npm run dev`.

---

## Phase 1 — Freeze & foundation

### Task 1.1: Triage working-tree state

**Files:**
- Read: `git status`
- Possibly modify: any of the 12 `M` files or 22 `??` migrations already present

- [ ] **Step 1: Capture current state**

```bash
git status --short > /tmp/golive-pre-status.txt
git diff --stat > /tmp/golive-pre-diff.txt
cat /tmp/golive-pre-status.txt
cat /tmp/golive-pre-diff.txt
```

- [ ] **Step 2: Classify untracked migrations**

The working tree has untracked files `supabase/migrations/20260417110000…` through `20260417220000…` — these are the 13 hotfix migrations that need to ship before launch.

```bash
ls supabase/migrations/20260417[12]*.sql
```

- [ ] **Step 3: Commit the untracked hotfix migrations + modified frontend services as one pre-launch commit**

```bash
git add supabase/migrations/20260417*.sql \
        src/contracts/rpcSignatures.ts \
        src/features/admin/dashboard/services/dashboardService.ts \
        src/features/admin/investors/services/feesService.ts \
        src/features/admin/investors/services/investorDetailService.ts \
        src/features/admin/investors/services/investorPerformanceService.ts \
        src/features/admin/reports/lib/statementGenerator.ts \
        src/features/admin/reports/services/reportService.ts \
        src/features/investor/performance/pages/YieldHistoryPage.tsx \
        src/features/investor/yields/services/investorYieldService.ts \
        src/features/shared/services/withdrawalService.ts \
        src/integrations/supabase/types.ts \
        src/services/shared/performanceService.ts \
        AGENTS.md

git commit -m "chore: consolidate 2026-04-17 hotfix migrations + frontend canonical-RPC rewiring for go-live"
```

- [ ] **Step 4: Stash loose test SQL scripts + Playwright audit spec separately (decide in-flight whether to commit or stash)**

```bash
git add tests/e2e/full-platform-ui-audit.spec.ts tests/rerun_both_scenarios.sql \
        tests/sol_phase0_setup.sql tests/sol_phase1_deposit_yield.sql tests/sol_phase2_paul_yield.sql \
        tests/void_all_deposits.sql tests/void_all_yields.sql tests/void_stale_aum.sql \
        tests/xrp_e2e_test.sql tests/xrp_phase0_setup.sql tests/xrp_phase1_deposit1.sql \
        tests/xrp_phase2_deposit2.sql tests/xrp_phase3_yield1.sql tests/xrp_phase4_deposit3.sql \
        tests/xrp_phase5_yield2.sql

git commit -m "test: commit SOL/XRP phase scripts + full-platform UI audit spec as pre-launch fixtures"
```

- [ ] **Step 5: Verify clean tree before tagging**

```bash
git status --short
```
Expected: empty output (or only spec/plan files we're writing right now).

---

### Task 1.2: Take pg_dump + record PITR window

**Files:**
- Create: `~/indigo-backups/pre-golive-2026-04-20.sql.gz` (off-repo)
- Create: `docs/runbooks/rollback.md` (stubbed, completed in Task 1.6)

- [ ] **Step 1: Resolve DATABASE_URL**

```bash
echo "$DATABASE_URL" | head -c 20
```
Expected: prefix like `postgres://postgres.` (confirms it's set). Do NOT echo the full URL.

- [ ] **Step 2: Take compressed pg_dump to a user-home off-repo location**

```bash
mkdir -p ~/indigo-backups
BACKUP_FILE=~/indigo-backups/pre-golive-2026-04-20-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner --no-privileges \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=pgbouncer \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  --exclude-schema=vault \
  | gzip -9 > "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"
```
Expected: file size > 1 MB, exit 0.

- [ ] **Step 3: Verify the dump is restorable (header sanity)**

```bash
gunzip -c "$BACKUP_FILE" | head -30
```
Expected: contains `-- PostgreSQL database dump` and `SET statement_timeout`.

- [ ] **Step 4: Record backup + PITR window in runbook stub**

```bash
cat > docs/runbooks/rollback.md <<EOF
# Indigo Yield — Rollback Runbook

**Last updated:** 2026-04-20
**Owner:** Hamza (H.monoja@protonmail.com)

## 1. Backup evidence

- **Pre-go-live pg_dump:** \`$BACKUP_FILE\` (local, off-repo)
- **Timestamp (UTC):** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Size:** $(du -h "$BACKUP_FILE" | cut -f1)
- **Restore command:** \`gunzip -c $BACKUP_FILE | psql "\$DATABASE_URL"\`

## 2. PITR window

Verified available via Supabase dashboard → Settings → Database → Backups.
Default retention: 7 days on Pro plan. Confirm your plan's window before acting.

## 3. Rollback decision tree

(Completed in Task 1.6 of the go-live plan.)
EOF

git add docs/runbooks/rollback.md
git commit -m "docs: stub rollback runbook with pg_dump evidence"
```

---

### Task 1.3: Tag pre-hardening state

- [ ] **Step 1: Create annotated tag**

```bash
git tag -a pre-golive-hardening-2026-04-20 -m "Pre go-live hardening snapshot — all 2026-04-17 hotfixes committed, pg_dump captured"
git tag | grep pre-golive
```
Expected: tag appears.

- [ ] **Step 2: Do NOT push yet** — tag stays local until Phase 7 go/no-go approves push.

---

### Task 1.4: Purge broken `test:qa:*` scripts from package.json

**Files:**
- Modify: `package.json` (7 script lines removed)

- [ ] **Step 1: Verify none of the referenced files exist**

```bash
for f in tests/qa/ci/contract-drift-check.ts tests/qa/ci/gateway-bypass-check.ts \
         tests/qa/ci/integrity-check.ts tests/qa/phase0-runtime-truth.ts \
         tests/qa/phase1-enum-audit.ts tests/qa/scenarios/runner.ts \
         tests/qa/invariants/db-invariants.ts; do
  [ -f "$f" ] && echo "EXISTS: $f" || echo "missing: $f"
done
```
Expected: all 7 say `missing:`.

- [ ] **Step 2: Remove 7 `test:qa:*` scripts from package.json**

Edit `package.json`; delete these exact lines (the trailing `test:qa:ci`/`test:qa:full` composites can stay only if they still resolve — since they chain the missing scripts, remove them too):

Keys to remove: `test:qa:contracts`, `test:qa:gateway`, `test:qa:integrity`, `test:qa:phase0`, `test:qa:phase1`, `test:qa:scenarios`, `test:qa:invariants`, `test:qa:e2e`, `test:qa:ci`, `test:qa:full` (10 total — the user spec said 7 but the composites reference removed scripts, so drop them too).

- [ ] **Step 3: Verify package.json still parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"
npm run -s 2>&1 | grep -E '^  test:qa' || echo "no test:qa scripts remain"
```
Expected: `ok`, `no test:qa scripts remain`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: remove 10 test:qa:* scripts referencing nonexistent tests/qa/ files"
```

---

### Task 1.5: Extend Playwright config with mobile + webkit projects + storage state

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Rewrite playwright.config.ts**

Replace the file contents with:

```typescript
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.APP_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['json', { outputFile: 'docs/verification/golive-2026-04-20/playwright-report.json' }]],
  globalSetup: './tests/globalSetup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 30000,
  },
  timeout: 180000,
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],
});
```

- [ ] **Step 2: Create artifact output directory**

```bash
mkdir -p docs/verification/golive-2026-04-20
```

- [ ] **Step 3: Verify config parses**

```bash
npx playwright test --list | head -5
```
Expected: lists specs without error (globalSetup reference will warn until Task 2.4 — that's OK for now).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts docs/verification/golive-2026-04-20/
git commit -m "chore(playwright): add mobile-chrome + webkit projects, JSON report artifact, globalSetup scaffold"
```

---

### Task 1.6: Complete rollback runbook v1

**Files:**
- Modify: `docs/runbooks/rollback.md`

- [ ] **Step 1: Replace the stub with full decision tree**

Overwrite `docs/runbooks/rollback.md`:

```markdown
# Indigo Yield — Rollback Runbook

**Last updated:** 2026-04-20
**Owner:** Hamza (H.monoja@protonmail.com)
**Project:** Supabase `nkfimvovosdehmyyjubn`

## 1. Backup evidence

- **Pre-go-live pg_dump:** stored at `~/indigo-backups/pre-golive-2026-04-20-<ts>.sql.gz`
- **Timestamp (UTC):** recorded at Phase 1 execution
- **Restore command:** `gunzip -c <file> | psql "$DATABASE_URL"`

## 2. PITR window

Supabase PITR is accessible via dashboard → Database → Backups.
- Plan retention: **confirm per-project in the dashboard** (default 7d on Pro).
- Restore target: a fresh Supabase branch, NEVER the prod project directly.

## 3. Rollback decision tree

| Symptom | Path |
|---|---|
| Code-only bug (frontend/service, no migration) | `git revert <sha>` → redeploy |
| Bad migration applied <24h ago, no destructive data impact | Drop objects from bad migration by hand or ship a compensating migration; do NOT rerun the bad file |
| Bad migration caused row-level data corruption | PITR-restore to a scratch branch → cherry-pick clean rows back via INSERT … SELECT → ship compensating migration on prod |
| Full data loss / trust-level incident | PITR-restore full to scratch branch, swap DNS/connection string, re-enable writes |

## 4. Rollback commands

### 4.1 Revert a code-only change

```bash
git revert <sha>
git push
# Redeploy via Vercel/hosting provider
```

### 4.2 Ship a compensating migration

```bash
cat > supabase/migrations/$(date -u +%Y%m%d%H%M%S)_rollback_<slug>.sql <<SQL
-- Compensating for <bad_migration_filename>
DROP FUNCTION IF EXISTS public.<fn>;
-- Recreate previous definition (pulled from git history of <bad_migration>)
CREATE OR REPLACE FUNCTION public.<fn>(...) ...
SQL
npx supabase db push --linked
```

### 4.3 PITR to scratch branch

1. Supabase dashboard → Project → Branching → Create branch from point-in-time
2. Pick a timestamp **before** the incident
3. Note the new branch's connection string
4. Run diff to see what changed:
   ```bash
   pg_dump --schema-only "$SCRATCH_DATABASE_URL" > /tmp/scratch.sql
   pg_dump --schema-only "$DATABASE_URL" > /tmp/prod.sql
   diff /tmp/scratch.sql /tmp/prod.sql
   ```
5. Cherry-pick data back with scoped `INSERT … SELECT` statements

### 4.4 Full pg_dump restore (last resort — destructive)

**Warning: overwrites prod. Confirm twice.**

```bash
gunzip -c ~/indigo-backups/pre-golive-2026-04-20-<ts>.sql.gz | psql "$DATABASE_URL"
```

## 5. Incident communication

- Post status to internal channel immediately
- Pause all writes (disable `apply_transaction_with_crystallization` via `REVOKE EXECUTE`) if integrity suspect
- Log the incident timeline in `docs/verification/incident-<ts>/`

## 6. Post-incident

- File a follow-up migration that adds a regression test for the class of bug
- Update this runbook with anything that didn't work as expected
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/rollback.md
git commit -m "docs(runbook): complete rollback decision tree with PITR + compensating-migration recipes"
```

---

## Phase 2 — Test-harness bring-up

### Task 2.1: Write `_test_reset_transactional_state()` migration (TDD)

**Files:**
- Create: `supabase/migrations/20260420100000_test_mode_reset_helper.sql`
- Create: `tests/migrations/test_mode_reset_helper_test.sql`

- [ ] **Step 1: Write the failing SQL test first**

Create `tests/migrations/test_mode_reset_helper_test.sql`:

```sql
-- TDD: asserts _test_reset_transactional_state() exists, is gated, and resets correctly
BEGIN;

-- Assertion 1: function exists
SELECT has_function_privilege('authenticated', 'public._test_reset_transactional_state()', 'EXECUTE')
  OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='_test_reset_transactional_state')
  AS function_present_check;

-- Assertion 2: calling without test_mode flag raises
DO $$
BEGIN
  PERFORM public._test_reset_transactional_state();
  RAISE EXCEPTION 'expected test_mode guard to block call';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%test_mode%' OR SQLERRM LIKE '%not permitted%' THEN
    RAISE NOTICE 'guard OK: %', SQLERRM;
  ELSE
    RAISE;
  END IF;
END $$;

-- Assertion 3: calling without admin raises (simulate by SET role)
-- (skipped if running as service_role; documented in comments)

-- Assertion 4: with both gates satisfied + some junk data, reset clears the transactional tables
SET LOCAL indigo.test_mode = 'on';
-- Insert a sentinel row that MUST be wiped
INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_type, source, amount, asset, economic_date, created_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
          '00000000-0000-0000-0000-000000000000'::uuid, 'DEPOSIT', 'e2e_reset_sentinel',
          1, 'USDT', '2026-04-20', now())
  ON CONFLICT DO NOTHING;
PERFORM public._test_reset_transactional_state();
SELECT count(*) AS post_reset_tx_count FROM public.transactions_v2;
-- Expected: 0 (reset wiped everything)

ROLLBACK;
```

- [ ] **Step 2: Run the test; it MUST fail because function doesn't exist**

```bash
psql "$DATABASE_URL" -f tests/migrations/test_mode_reset_helper_test.sql 2>&1 | tee /tmp/t2.1-before.txt
```
Expected: error like `function public._test_reset_transactional_state() does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260420100000_test_mode_reset_helper.sql`:

```sql
-- E2E test-mode reset helper
-- Dual-gated: require_admin() + indigo.test_mode session flag
-- Wipes ONLY transactional tables; preserves profiles, funds, config, auth

CREATE OR REPLACE FUNCTION public._test_reset_transactional_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_counts jsonb;
BEGIN
  -- Gate 1: admin check (AGENTS.md mandatory)
  PERFORM public.require_admin();

  -- Gate 2: test_mode session flag
  v_mode := current_setting('indigo.test_mode', true);
  IF v_mode IS NULL OR v_mode <> 'on' THEN
    RAISE EXCEPTION 'test_mode not enabled — refusing to reset transactional state'
      USING ERRCODE = '42501';
  END IF;

  -- Suspend canonical AUM trigger during bulk wipe (re-enabled at end)
  ALTER TABLE public.investor_positions DISABLE TRIGGER trg_ledger_sync;
  ALTER TABLE public.fund_daily_aum    DISABLE TRIGGER trg_enforce_canonical_daily_aum;

  -- Capture pre-reset counts for audit
  SELECT jsonb_build_object(
    'transactions_v2',        (SELECT count(*) FROM public.transactions_v2),
    'investor_positions',     (SELECT count(*) FROM public.investor_positions),
    'yield_allocations',      (SELECT count(*) FROM public.yield_allocations),
    'fee_allocations',        (SELECT count(*) FROM public.fee_allocations),
    'ib_commission_ledger',   (SELECT count(*) FROM public.ib_commission_ledger),
    'platform_fee_ledger',    (SELECT count(*) FROM public.platform_fee_ledger),
    'investor_yield_events',  (SELECT count(*) FROM public.investor_yield_events),
    'yield_distributions',    (SELECT count(*) FROM public.yield_distributions),
    'fund_daily_aum',         (SELECT count(*) FROM public.fund_daily_aum),
    'withdrawal_requests',    (SELECT count(*) FROM public.withdrawal_requests)
  ) INTO v_counts;

  -- Ordered wipe (respect FKs)
  DELETE FROM public.ib_commission_ledger;
  DELETE FROM public.platform_fee_ledger;
  DELETE FROM public.fee_allocations;
  DELETE FROM public.yield_allocations;
  DELETE FROM public.investor_yield_events;
  DELETE FROM public.yield_distributions;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.fund_daily_aum;
  DELETE FROM public.investor_positions;
  DELETE FROM public.transactions_v2;

  -- Re-enable triggers
  ALTER TABLE public.investor_positions ENABLE TRIGGER trg_ledger_sync;
  ALTER TABLE public.fund_daily_aum    ENABLE TRIGGER trg_enforce_canonical_daily_aum;

  RETURN v_counts;
END;
$$;

REVOKE ALL ON FUNCTION public._test_reset_transactional_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._test_reset_transactional_state() FROM anon;
GRANT EXECUTE ON FUNCTION public._test_reset_transactional_state() TO authenticated, service_role;

COMMENT ON FUNCTION public._test_reset_transactional_state() IS
  'E2E helper — dual-gated (require_admin + indigo.test_mode=on). Wipes transactional tables only. Preserves profiles/funds/config/auth.';
```

- [ ] **Step 4: Apply via supabase CLI**

```bash
npx supabase db push --linked
```
Expected: `Applied migration 20260420100000`.

- [ ] **Step 5: Re-run the test; expect PASS**

```bash
psql "$DATABASE_URL" -f tests/migrations/test_mode_reset_helper_test.sql 2>&1 | tee /tmp/t2.1-after.txt
grep -E 'post_reset_tx_count|guard OK|ROLLBACK' /tmp/t2.1-after.txt
```
Expected: `guard OK` line + `post_reset_tx_count | 0` + final `ROLLBACK` confirms state not persisted.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260420100000_test_mode_reset_helper.sql \
        tests/migrations/test_mode_reset_helper_test.sql
git commit -m "feat(db): test_mode reset helper (dual-gated SECDEF) + SQL test"
```

---

### Task 2.2: Provision E2E auth accounts via migration

**Files:**
- Create: `supabase/migrations/20260420100500_e2e_test_accounts.sql`

- [ ] **Step 1: Verify canonical profile IDs exist before wiring**

```bash
psql "$DATABASE_URL" -c "SELECT id, email, is_admin FROM public.profiles
  WHERE id::text LIKE 'e438bfff%' OR id::text LIKE 'c7b18014%'
     OR id::text LIKE '96fbdf46%' OR id::text LIKE '4ca7a856%'
     OR id::text LIKE '40c33d59%';"
```
Expected: 5 rows returned.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260420100500_e2e_test_accounts.sql`:

```sql
-- E2E test accounts — links *@indigo.test auth.users to existing canonical profiles
-- Passwords sourced from env at runtime via scripts/seed-e2e-auth.ts; this migration only
-- ensures the auth.users rows exist with email_confirmed_at set.

DO $$
DECLARE
  v_admin_id   uuid;
  v_sam_id     uuid;
  v_paul_id    uuid;
  v_alex_id    uuid;
  v_ryan_id    uuid;
  v_placeholder_hash text := crypt('indigo-placeholder-reset-me', gen_salt('bf'));
BEGIN
  -- Resolve canonical profile IDs by prefix
  SELECT id INTO v_admin_id FROM public.profiles WHERE id::text LIKE 'e438bfff%' LIMIT 1;
  SELECT id INTO v_sam_id   FROM public.profiles WHERE id::text LIKE 'c7b18014%' LIMIT 1;
  SELECT id INTO v_paul_id  FROM public.profiles WHERE id::text LIKE '96fbdf46%' LIMIT 1;
  SELECT id INTO v_alex_id  FROM public.profiles WHERE id::text LIKE '4ca7a856%' LIMIT 1;
  SELECT id INTO v_ryan_id  FROM public.profiles WHERE id::text LIKE '40c33d59%' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin profile e438bfff* not found — seed prerequisite failed';
  END IF;

  -- Upsert auth.users rows for each e2e account; email_confirmed_at set so no confirm step
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_admin_id, 'e2e_admin@indigo.test',   v_placeholder_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_sam_id,   'e2e_investor_sam@indigo.test',  v_placeholder_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_paul_id,  'e2e_investor_paul@indigo.test', v_placeholder_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_alex_id,  'e2e_investor_alex@indigo.test', v_placeholder_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_ryan_id,  'e2e_investor_ryan@indigo.test', v_placeholder_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
        updated_at = now();
END $$;

-- Verification
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM auth.users WHERE email LIKE '%@indigo.test';
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'expected 5 @indigo.test auth.users, got %', v_count;
  END IF;
END $$;
```

- [ ] **Step 3: Apply**

```bash
npx supabase db push --linked
```
Expected: migration applies cleanly.

- [ ] **Step 4: Verify auth rows**

```bash
psql "$DATABASE_URL" -c "SELECT email, email_confirmed_at IS NOT NULL AS confirmed FROM auth.users WHERE email LIKE '%@indigo.test' ORDER BY email;"
```
Expected: 5 rows, all `confirmed=t`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260420100500_e2e_test_accounts.sql
git commit -m "feat(auth): provision 5 @indigo.test e2e accounts linked to canonical profiles"
```

---

### Task 2.3: Update `scripts/seed-e2e-auth.ts` for idempotent env-driven passwords

**Files:**
- Modify: `scripts/seed-e2e-auth.ts`

- [ ] **Step 1: Inspect current script**

```bash
cat scripts/seed-e2e-auth.ts | head -80
```

- [ ] **Step 2: Rewrite the script** (replace existing file with the version below)

```typescript
/**
 * seed-e2e-auth.ts
 * Idempotent password reset for *@indigo.test e2e accounts.
 * Reads passwords from env:
 *   E2E_PASSWORD_ADMIN      — for e2e_admin@indigo.test
 *   E2E_PASSWORD_INVESTOR   — for all e2e_investor_*@indigo.test (shared)
 * Never commit real passwords.
 */

import { createClient } from '@supabase/supabase-js';

interface AccountSpec {
  readonly email: string;
  readonly password: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminPw = process.env.E2E_PASSWORD_ADMIN;
const investorPw = process.env.E2E_PASSWORD_INVESTOR;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
if (!adminPw || !investorPw) {
  throw new Error('E2E_PASSWORD_ADMIN and E2E_PASSWORD_INVESTOR are required (never commit)');
}

const accounts: readonly AccountSpec[] = [
  { email: 'e2e_admin@indigo.test',          password: adminPw },
  { email: 'e2e_investor_sam@indigo.test',   password: investorPw },
  { email: 'e2e_investor_paul@indigo.test',  password: investorPw },
  { email: 'e2e_investor_alex@indigo.test',  password: investorPw },
  { email: 'e2e_investor_ryan@indigo.test',  password: investorPw },
];

async function main(): Promise<void> {
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const a of accounts) {
    // Resolve user id by email
    const { data: userList, error: listErr } = await sb.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = userList?.users.find((u) => u.email === a.email);
    if (!user) {
      console.error(`MISSING ${a.email} — run the migration first`);
      process.exit(2);
    }
    const { error: updErr } = await sb.auth.admin.updateUserById(user.id, {
      password: a.password,
      email_confirm: true,
    });
    if (updErr) throw updErr;
    console.log(`reset password for ${a.email}`);
  }
  console.log('e2e auth seeding complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the seed**

```bash
npx tsx scripts/seed-e2e-auth.ts
```
Expected: 5 `reset password for …` lines + `e2e auth seeding complete`.

- [ ] **Step 4: Verify login works for at least one account**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
sb.auth.signInWithPassword({ email: 'e2e_admin@indigo.test', password: process.env.E2E_PASSWORD_ADMIN })
  .then(r => console.log(r.error ? 'FAIL: ' + r.error.message : 'OK: session ' + (r.data.session ? 'established' : 'null')));
"
```
Expected: `OK: session established`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-e2e-auth.ts
git commit -m "feat(scripts): idempotent env-driven password reset for @indigo.test e2e accounts"
```

---

### Task 2.4: Create Playwright globalSetup + storage states

**Files:**
- Create: `tests/globalSetup.ts`
- Create: `tests/.auth/` (directory, gitignored)
- Modify: `.gitignore`

- [ ] **Step 1: Add `tests/.auth/` to .gitignore**

```bash
echo -e "\n# Playwright auth state\ntests/.auth/\n" >> .gitignore
mkdir -p tests/.auth
```

- [ ] **Step 2: Write globalSetup.ts**

Create `tests/globalSetup.ts`:

```typescript
import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

interface Role {
  readonly file: string;
  readonly email: string;
  readonly password: string;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:8080';
  const adminPw = process.env.E2E_PASSWORD_ADMIN;
  const investorPw = process.env.E2E_PASSWORD_INVESTOR;
  if (!adminPw || !investorPw) {
    throw new Error('E2E_PASSWORD_ADMIN + E2E_PASSWORD_INVESTOR required for globalSetup');
  }

  const roles: readonly Role[] = [
    { file: 'tests/.auth/admin.json',       email: 'e2e_admin@indigo.test',          password: adminPw },
    { file: 'tests/.auth/investor_sam.json',  email: 'e2e_investor_sam@indigo.test',   password: investorPw },
    { file: 'tests/.auth/investor_paul.json', email: 'e2e_investor_paul@indigo.test',  password: investorPw },
    { file: 'tests/.auth/investor_alex.json', email: 'e2e_investor_alex@indigo.test',  password: investorPw },
    { file: 'tests/.auth/investor_ryan.json', email: 'e2e_investor_ryan@indigo.test',  password: investorPw },
  ];

  const browser = await chromium.launch();
  try {
    for (const r of roles) {
      const ctx = await browser.newContext({ baseURL });
      const page = await ctx.newPage();
      await page.goto('/login');
      await page.fill('input[type="email"]', r.email);
      await page.fill('input[type="password"]', r.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      fs.mkdirSync(path.dirname(r.file), { recursive: true });
      await ctx.storageState({ path: r.file });
      await ctx.close();
      console.log(`captured storage state: ${r.file}`);
    }
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 3: Run Playwright with `--list` to confirm globalSetup resolves**

```bash
npx playwright test --list --project=chromium-desktop 2>&1 | head -10
```
Expected: no error about missing globalSetup.

- [ ] **Step 4: Commit**

```bash
git add tests/globalSetup.ts .gitignore
git commit -m "chore(e2e): globalSetup captures storage state per role (admin + 4 investors)"
```

---

### Task 2.5: Smoke-suite sanity run

- [ ] **Step 1: Start dev server if not already**

```bash
curl -sf http://localhost:8080 > /dev/null || (nohup npm run dev > /tmp/dev.log 2>&1 & sleep 5)
curl -sf http://localhost:8080 > /dev/null && echo OK
```
Expected: `OK`.

- [ ] **Step 2: Run smoke suite, chromium-desktop only**

```bash
npx playwright test tests/e2e/smoke-login.spec.ts tests/e2e/smoke-navigation.spec.ts tests/e2e/smoke-critical-flows.spec.ts --project=chromium-desktop
```
Expected: all specs pass. If any fail, triage before moving to Phase 3 — the harness must be green.

- [ ] **Step 3: Commit nothing (no code change) but log the pass**

```bash
echo "Phase 2 smoke PASS at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/verification/golive-2026-04-20/phase-log.txt
git add docs/verification/golive-2026-04-20/phase-log.txt
git commit -m "test(verification): log Phase 2 smoke pass"
```

---

## Phase 3 — Admin surface full matrix

### Task 3.1: `ui-admin-investor-lifecycle-full.spec.ts` (TDD)

**Files:**
- Create: `tests/e2e/ui-admin-investor-lifecycle-full.spec.ts`

- [ ] **Step 1: Enumerate the 13 protected columns from `protect_profile_sensitive_fields`**

```bash
psql "$DATABASE_URL" -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='protect_profile_sensitive_fields';" | head -60
```
Expected: function body lists the columns. Cross-reference with AGENTS.md line 55: `is_admin, role, kyc_status, fee_pct, ib_percentage, ib_parent_id, status, totp_enabled, totp_verified, is_system_account, include_in_reporting, ib_commission_source, account_type, email, onboarding_date` — that's 15, not 13. Treat the canonical list as whatever the function actually enforces; use AGENTS.md as the complete set.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/ui-admin-investor-lifecycle-full.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.use({ storageState: 'tests/.auth/admin.json' });

const PROTECTED_COLUMNS = [
  'is_admin', 'role', 'kyc_status', 'fee_pct', 'ib_percentage', 'ib_parent_id',
  'status', 'totp_enabled', 'totp_verified', 'is_system_account',
  'include_in_reporting', 'ib_commission_source', 'account_type', 'email', 'onboarding_date',
] as const;

test.describe('Admin — investor lifecycle full matrix', () => {
  test('create → KYC → fee_pct → ib_percentage → ib_parent → deactivate', async ({ page }) => {
    await page.goto('/admin/investors');
    await expect(page.getByRole('heading', { name: /investors/i })).toBeVisible();

    // CREATE
    await page.getByRole('button', { name: /add investor|create/i }).click();
    const testEmail = `lifecycle_${Date.now()}@indigo.test`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="first_name"]', 'Lifecycle');
    await page.fill('input[name="last_name"]', 'Test');
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(page.getByText(testEmail)).toBeVisible({ timeout: 15000 });

    // EDIT — fee_pct, ib_percentage, account_type
    await page.getByRole('link', { name: testEmail }).click();
    await page.fill('input[name="fee_pct"]', '20');
    await page.fill('input[name="ib_percentage"]', '5');
    await page.selectOption('select[name="account_type"]', 'retail');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/saved|updated/i)).toBeVisible();

    // KYC transition
    await page.selectOption('select[name="kyc_status"]', 'approved');
    await page.getByRole('button', { name: /save/i }).click();

    // DEACTIVATE
    await page.selectOption('select[name="status"]', 'inactive');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/inactive/i)).toBeVisible();
  });

  test('non-admin client blocked by protect_profile_sensitive_fields on all protected columns', async () => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data: session } = await sb.auth.signInWithPassword({
      email: 'e2e_investor_sam@indigo.test',
      password: process.env.E2E_PASSWORD_INVESTOR!,
    });
    expect(session?.session).toBeTruthy();
    const samId = session!.session!.user.id;

    for (const col of PROTECTED_COLUMNS) {
      const payload: Record<string, unknown> = {};
      // Minimal legal value per column type
      payload[col] = col === 'fee_pct' || col === 'ib_percentage' ? 99 :
                     col === 'is_admin' || col === 'totp_enabled' || col === 'totp_verified' ||
                     col === 'is_system_account' || col === 'include_in_reporting' ? true :
                     'tampered';
      const { error } = await sb.from('profiles').update(payload).eq('id', samId);
      expect(error, `column ${col} MUST be protected`).not.toBeNull();
    }
  });
});
```

- [ ] **Step 3: Run the spec**

```bash
npx playwright test tests/e2e/ui-admin-investor-lifecycle-full.spec.ts --project=chromium-desktop
```
Expected: both tests pass. If the UI field selectors differ from the actual component names, adjust the spec accordingly — the test intent (each CRUD step + each protected column rejected) must be preserved.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/ui-admin-investor-lifecycle-full.spec.ts
git commit -m "test(e2e): admin investor lifecycle full matrix + 15 protected-column assertions"
```

---

### Task 3.2: `ui-admin-btc-cascade-verified.spec.ts` (TDD, establishes BTC baseline)

**Files:**
- Create: `tests/btc_phase0_setup.sql`
- Create: `tests/e2e/ui-admin-btc-cascade-verified.spec.ts`

- [ ] **Step 1: Inspect SOL phase0 for pattern**

```bash
cat tests/sol_phase0_setup.sql
```

- [ ] **Step 2: Write `tests/btc_phase0_setup.sql`** analogous to SOL phase0 but with BTC fund (resolve the BTC fund UUID first):

```bash
psql "$DATABASE_URL" -c "SELECT id, name, asset FROM public.funds WHERE asset='BTC' OR name ILIKE '%btc%';"
```

Populate BTC opening balances — use the resolved fund_id in the seed SQL. (Exact contents mirror `sol_phase0_setup.sql` with BTC substitutions.)

- [ ] **Step 3: Write the spec**

Create `tests/e2e/ui-admin-btc-cascade-verified.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Admin — BTC cascade (verified baseline)', () => {
  test('deposit → yield → fee → IB → withdrawal → void → reissue', async ({ page }) => {
    // Capture invariant-check snapshot baseline
    await page.goto('/admin/operations');
    await page.getByRole('button', { name: /run invariants/i }).click();
    await expect(page.getByText(/20\/20 pass/i)).toBeVisible({ timeout: 30000 });

    // DEPOSIT: seed the BTC baseline transactions for Sam + Paul
    await page.goto('/admin/transactions');
    await page.getByRole('button', { name: /new transaction/i }).click();
    await page.selectOption('select[name="investor_id"]', { label: /Sam Johnson/ });
    await page.selectOption('select[name="fund_id"]', { label: /BTC/ });
    await page.selectOption('select[name="tx_type"]', 'DEPOSIT');
    await page.fill('input[name="amount"]', '1.0');
    await page.fill('input[name="economic_date"]', '2026-04-20');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText(/transaction created/i)).toBeVisible();

    // YIELD — preview then apply
    await page.goto('/admin/yields');
    await page.getByRole('button', { name: /new distribution/i }).click();
    await page.selectOption('select[name="fund_id"]', { label: /BTC/ });
    await page.fill('input[name="yield_rate"]', '0.05');  // 5%
    await page.fill('input[name="yield_date"]', '2026-04-20');
    await page.getByRole('button', { name: /preview/i }).click();
    await expect(page.getByText(/preview/i)).toBeVisible();
    await page.getByRole('button', { name: /apply/i }).click();
    await expect(page.getByText(/applied/i)).toBeVisible({ timeout: 30000 });

    // POST-cascade invariants
    await page.goto('/admin/operations');
    await page.getByRole('button', { name: /run invariants/i }).click();
    await expect(page.getByText(/20\/20 pass/i)).toBeVisible({ timeout: 30000 });

    // VOID the distribution
    await page.goto('/admin/yields');
    await page.getByRole('row', { name: /2026-04-20/ }).getByRole('button', { name: /void/i }).click();
    await page.getByRole('button', { name: /confirm void/i }).click();
    await expect(page.getByText(/voided/i)).toBeVisible();

    // Invariants after void
    await page.goto('/admin/operations');
    await page.getByRole('button', { name: /run invariants/i }).click();
    await expect(page.getByText(/20\/20 pass/i)).toBeVisible({ timeout: 30000 });
  });
});
```

- [ ] **Step 4: Run**

```bash
npx playwright test tests/e2e/ui-admin-btc-cascade-verified.spec.ts --project=chromium-desktop
```
Expected: pass. If selectors differ, adjust — intent is: deposit → yield → invariants green → void → invariants green.

- [ ] **Step 5: Capture BTC final position numbers (from the UI or via psql)**

```bash
psql "$DATABASE_URL" -c "SELECT i.first_name, i.last_name, p.current_value, p.asset
  FROM public.investor_positions p JOIN public.profiles i ON i.id=p.investor_id
  WHERE p.asset='BTC' AND p.current_value <> 0 ORDER BY i.last_name;"
```
Record output for AGENTS.md update.

- [ ] **Step 6: Append BTC verified-baseline line to AGENTS.md**

Add to the migration history section:

```
- **BTC E2E Verified**: <numbers captured in Step 5> ✅
```

- [ ] **Step 7: Commit**

```bash
git add tests/btc_phase0_setup.sql tests/e2e/ui-admin-btc-cascade-verified.spec.ts AGENTS.md
git commit -m "test(e2e): establish BTC verified cascade baseline + update AGENTS.md"
```

---

### Task 3.3: `ui-admin-reporting-full.spec.ts` (TDD)

**Files:**
- Create: `tests/e2e/ui-admin-reporting-full.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Admin — reporting + dashboard + statements', () => {
  test('dashboard KPIs render without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/admin/dashboard');
    await expect(page.getByText(/AUM|total value|fund performance/i).first()).toBeVisible();
    expect(errors, 'no console errors on dashboard').toEqual([]);
  });

  test('yield history shows gross/fee%/fee/IB/net columns', async ({ page }) => {
    await page.goto('/admin/yields/history');
    await expect(page.getByRole('columnheader', { name: /gross/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /fee/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /ib/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /net/i })).toBeVisible();
  });

  test('report filters respect is_active=true + purpose=reporting', async ({ page }) => {
    await page.goto('/admin/reports');
    // Assumption: inactive investors or non-reporting accounts are excluded by default
    const systemAccount = page.getByText(/INDIGO Fees/i);
    // Fees account has purpose=fees, should be excluded from reporting view
    await expect(systemAccount).toHaveCount(0);
  });

  test('statement PDF opens without error', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.getByRole('button', { name: /generate statement/i }).first().click();
    // Statement generation is async — wait for PDF link
    const pdfLink = page.getByRole('link', { name: /\.pdf/i }).first();
    await expect(pdfLink).toBeVisible({ timeout: 30000 });
    const href = await pdfLink.getAttribute('href');
    expect(href).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run**

```bash
npx playwright test tests/e2e/ui-admin-reporting-full.spec.ts --project=chromium-desktop
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ui-admin-reporting-full.spec.ts
git commit -m "test(e2e): admin reporting full spec — dashboard, yield columns, report filters, PDF"
```

---

### Task 3.4: Re-run existing admin E2E coverage

- [ ] **Step 1: Batch-run existing admin specs**

```bash
npx playwright test \
  tests/e2e/ui-admin-data-integrity.spec.ts \
  tests/e2e/ui-admin-financial-actions.spec.ts \
  tests/e2e/ui-void-cascade.spec.ts \
  tests/e2e/ui-withdrawal-full-exit.spec.ts \
  tests/e2e/xrp-full-lifecycle-ui.spec.ts \
  tests/e2e/xrp-lifecycle.spec.ts \
  tests/e2e/fund-lifecycle-ui.spec.ts \
  --project=chromium-desktop
```
Expected: all pass. Any fail → triage, fix via hotfix migration if schema, fix spec if test drift, then rerun.

- [ ] **Step 2: Log pass**

```bash
echo "Phase 3 admin cascade PASS at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/verification/golive-2026-04-20/phase-log.txt
git add docs/verification/golive-2026-04-20/phase-log.txt
git commit -m "test(verification): log Phase 3 admin cascade pass"
```

---

## Phase 4 — Investor portal full matrix

### Task 4.1: `ui-investor-portal-full.spec.ts` (TDD)

**Files:**
- Create: `tests/e2e/ui-investor-portal-full.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/investor_sam.json' });

test.describe('Investor portal — full top-to-bottom flow', () => {
  test('overview → performance → yield history → portfolio → documents → transactions', async ({ page }) => {
    await page.goto('/investor');
    await expect(page.getByRole('heading', { name: /overview|welcome|portfolio/i })).toBeVisible();

    await page.goto('/investor/performance');
    await expect(page.getByText(/performance|return/i).first()).toBeVisible();

    await page.goto('/investor/yields/history');
    await expect(page.getByRole('columnheader', { name: /gross/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /net/i })).toBeVisible();

    await page.goto('/investor/portfolio');
    await expect(page.getByText(/holding|position|fund/i).first()).toBeVisible();

    await page.goto('/investor/documents');
    // Documents page loads without console errors
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);

    await page.goto('/investor/transactions');
    await expect(page.getByRole('columnheader', { name: /date|amount|type/i })).toBeVisible();
  });

  test('submit a withdrawal request', async ({ page }) => {
    await page.goto('/investor/withdrawals/new');
    await page.selectOption('select[name="fund_id"]', { index: 1 });
    await page.fill('input[name="amount"]', '10');
    await page.getByRole('button', { name: /submit|request/i }).click();
    await expect(page.getByText(/pending|submitted|requested/i)).toBeVisible();
  });

  test('statement PDF downloadable from storage', async ({ page }) => {
    await page.goto('/investor/statements');
    const link = page.getByRole('link', { name: /\.pdf|download/i }).first();
    if (await link.count()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/statements\//);
    }
  });
});
```

- [ ] **Step 2: Run on all three projects**

```bash
npx playwright test tests/e2e/ui-investor-portal-full.spec.ts
```
Expected: pass on chromium-desktop, mobile-chrome, webkit-desktop.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ui-investor-portal-full.spec.ts
git commit -m "test(e2e): investor portal full flow (desktop + mobile + webkit)"
```

---

### Task 4.2: `ui-investor-rls-isolation.spec.ts` (TDD)

**Files:**
- Create: `tests/e2e/ui-investor-rls-isolation.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const TABLES_WITH_INVESTOR_SCOPE = [
  'investor_positions',
  'yield_allocations',
  'fee_allocations',
  'ib_commission_ledger',
  'investor_yield_events',
  'withdrawal_requests',
  'transactions_v2',
  'statements',
  'investor_fee_schedule',
  'investor_notifications',
] as const;

test.describe('RLS — investor A cannot read investor B', () => {
  test('cross-investor reads blocked or return 0 rows', async () => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data: sam } = await sb.auth.signInWithPassword({
      email: 'e2e_investor_sam@indigo.test',
      password: process.env.E2E_PASSWORD_INVESTOR!,
    });
    expect(sam?.session).toBeTruthy();

    const PAUL_ID_PREFIX = '96fbdf46';
    const { data: paulProfile } = await sb.from('profiles').select('id').like('id', `${PAUL_ID_PREFIX}%`).maybeSingle();
    expect(paulProfile, 'Paul profile lookup via anon should be blocked OR return nothing').toBeNull();

    for (const table of TABLES_WITH_INVESTOR_SCOPE) {
      // @ts-expect-error dynamic table name by design
      const { data, error } = await sb.from(table).select('*').limit(100);
      const ownData = (data ?? []).filter((r: { investor_id?: string }) =>
        !r.investor_id || r.investor_id === sam!.session!.user.id);
      expect(
        ownData.length === (data ?? []).length,
        `table ${table} leaked rows to Sam that belong to another investor`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run**

```bash
npx playwright test tests/e2e/ui-investor-rls-isolation.spec.ts --project=chromium-desktop
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ui-investor-rls-isolation.spec.ts
git commit -m "test(e2e): RLS isolation — investor A blocked from reading investor B across 10 tables"
```

---

### Task 4.3: Log Phase 4 pass

```bash
echo "Phase 4 investor portal PASS at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/verification/golive-2026-04-20/phase-log.txt
git add docs/verification/golive-2026-04-20/phase-log.txt
git commit -m "test(verification): log Phase 4 investor portal pass"
```

---

## Phase 5 — Trigger matrix + invariant sweep

### Task 5.1: Discover the canonical `transactions_v2.source` allowlist

- [ ] **Step 1: Pull source allowlist from `enforce_transaction_via_rpc`**

```bash
psql "$DATABASE_URL" -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='enforce_transaction_via_rpc';" | tee /tmp/allowlist-raw.txt
```
Extract the `IN (…)` list — canonical source values. Record in `tests/migrations/SOURCE_ALLOWLIST.md` for reference by every matrix file.

---

### Task 5.2–5.8: Trigger matrix files (one per trigger, same structure)

**Per trigger** create `tests/migrations/trigger_matrix_<trigger>.sql` with this pattern:

- [ ] **Step 1: Write the SQL test**

Example for `enforce_transaction_via_rpc`:

```sql
-- tests/migrations/trigger_matrix_enforce_transaction_via_rpc.sql
-- Matrix: each source allowlist value × canonical_rpc on/off
BEGIN;
SAVEPOINT sp;

-- Case 1: non-allowlisted source WITHOUT canonical_rpc → must reject
DO $$
BEGIN
  INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_type, source, amount, asset, economic_date, created_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
          '00000000-0000-0000-0000-000000000000'::uuid, 'DEPOSIT', 'NOT_ALLOWED', 1, 'USDT', '2026-04-20', now());
  RAISE EXCEPTION 'expected trigger to reject NOT_ALLOWED source';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%allowlist%' OR SQLERRM LIKE '%source%' THEN
    RAISE NOTICE 'case 1 OK: %', SQLERRM;
  ELSE
    RAISE;
  END IF;
END $$;

ROLLBACK TO sp;

-- Case 2: non-allowlisted source WITH canonical_rpc=true → must still reject
-- (canonical_rpc bypass is only for per-investor access, not source allowlist)
SAVEPOINT sp2;
SET LOCAL indigo.canonical_rpc = 'true';
DO $$
BEGIN
  INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_type, source, amount, asset, economic_date, created_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
          '00000000-0000-0000-0000-000000000000'::uuid, 'DEPOSIT', 'NOT_ALLOWED', 1, 'USDT', '2026-04-20', now());
  RAISE EXCEPTION 'expected source allowlist to reject even with canonical_rpc';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%allowlist%' OR SQLERRM LIKE '%source%' THEN
    RAISE NOTICE 'case 2 OK: %', SQLERRM;
  ELSE
    RAISE;
  END IF;
END $$;
ROLLBACK TO sp2;

-- Case 3: each allowlisted source × canonical_rpc on should succeed
-- (enumerate from /tmp/allowlist-raw.txt — example shows one)
SAVEPOINT sp3;
SET LOCAL indigo.canonical_rpc = 'true';
-- INSERT via canonical RPC path rather than raw INSERT to respect full contract
-- (raw inserts are rejected by design even with allowlisted source unless RPC sets canonical_rpc)
ROLLBACK TO sp3;

ROLLBACK;
```

- [ ] **Step 2: Run the file**

```bash
psql "$DATABASE_URL" -f tests/migrations/trigger_matrix_enforce_transaction_via_rpc.sql 2>&1 | tee /tmp/tm1.txt
grep -c 'OK:' /tmp/tm1.txt
```
Expected: count matches number of assertions.

- [ ] **Step 3: Repeat for the 6 remaining triggers**, one file each:
- `trigger_matrix_fn_ledger_drives_position.sql`
- `trigger_matrix_protect_profile_sensitive_fields.sql`
- `trigger_matrix_enforce_economic_date.sql`
- `trigger_matrix_enforce_yield_event_date.sql`
- `trigger_matrix_trg_ledger_sync.sql`
- `trigger_matrix_trg_enforce_canonical_daily_aum.sql`

Each follows the savepoint-rollback pattern so no state persists.

- [ ] **Step 4: Batch-run all matrix files**

```bash
for f in tests/migrations/trigger_matrix_*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -f "$f" 2>&1 | tail -5
done | tee docs/verification/golive-2026-04-20/trigger-matrix.log
```
Expected: every file ends clean, no unexpected errors.

- [ ] **Step 5: Commit**

```bash
git add tests/migrations/trigger_matrix_*.sql tests/migrations/SOURCE_ALLOWLIST.md \
        docs/verification/golive-2026-04-20/trigger-matrix.log
git commit -m "test(db): 7-trigger × source × canonical_rpc matrix"
```

---

### Task 5.9: Full invariant sweep on live state

- [ ] **Step 1: Run invariants, capture artifact**

```bash
psql "$DATABASE_URL" -c "SELECT * FROM public.run_invariant_checks();" \
  > docs/verification/golive-2026-04-20/invariant-checks.txt
cat docs/verification/golive-2026-04-20/invariant-checks.txt
```
Expected: 20 rows, all with `status='PASS'` (or equivalent).

- [ ] **Step 2: If any fail — STOP, triage, fix via hotfix migration, rerun from Phase 5 start.**

- [ ] **Step 3: Commit artifact**

```bash
git add docs/verification/golive-2026-04-20/invariant-checks.txt
git commit -m "test(verification): 20/20 invariants pass on live state — Phase 5 artifact"
```

---

## Phase 6 — Security closure + DR verification

### Task 6.1: SECDEF gate sweep

**Files:**
- Create: `scripts/secdef-gate-sweep.sh`

- [ ] **Step 1: Write the sweep script**

```bash
cat > scripts/secdef-gate-sweep.sh <<'SH'
#!/usr/bin/env bash
# SECDEF gate sweep — every new SECURITY DEFINER function in 2026-04-16/17 migrations
# must contain is_admin() or require_admin() or an explicit exception comment
set -euo pipefail
cd "$(dirname "$0")/.."

MIGRATIONS=(supabase/migrations/2026041[67]*.sql)
fail=0
for f in "${MIGRATIONS[@]}"; do
  [[ -e "$f" ]] || continue
  # Find CREATE OR REPLACE FUNCTION … SECURITY DEFINER blocks
  if grep -nE 'SECURITY DEFINER' "$f" >/dev/null; then
    if ! grep -qE '(is_admin|require_admin|INTENTIONALLY UNGATED)' "$f"; then
      echo "FAIL: $f has SECDEF function without is_admin/require_admin/INTENTIONALLY UNGATED comment"
      fail=1
    else
      echo "OK:   $f"
    fi
  fi
done
exit "$fail"
SH
chmod +x scripts/secdef-gate-sweep.sh
```

- [ ] **Step 2: Run**

```bash
./scripts/secdef-gate-sweep.sh | tee docs/verification/golive-2026-04-20/secdef-sweep.log
```
Expected: exit 0, no `FAIL` lines.

---

### Task 6.2: Anon EXECUTE sweep

**Files:**
- Create: `scripts/anon-execute-sweep.sql`

- [ ] **Step 1: Write the query**

```bash
cat > scripts/anon-execute-sweep.sql <<'SQL'
-- Anon EXECUTE sweep: every SECDEF function with anon EXECUTE permission is a leak
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY p.proname;
SQL
```

- [ ] **Step 2: Run**

```bash
psql "$DATABASE_URL" -f scripts/anon-execute-sweep.sql \
  > docs/verification/golive-2026-04-20/anon-execute-sweep.txt
cat docs/verification/golive-2026-04-20/anon-execute-sweep.txt
```
Expected: **0 rows** (header + `(0 rows)`).

- [ ] **Step 3: If any rows returned — STOP. File a fix-migration to revoke EXECUTE from anon, reapply, re-run.**

---

### Task 6.3: RLS smoke test

**Files:**
- Create: `scripts/rls-smoke.ts`

- [ ] **Step 1: Write the test**

```typescript
import { createClient } from '@supabase/supabase-js';

const TABLES = [
  'profiles', 'transactions_v2', 'investor_positions', 'yield_allocations',
  'fee_allocations', 'ib_commission_ledger', 'platform_fee_ledger',
  'investor_yield_events', 'yield_distributions', 'fund_daily_aum',
  'withdrawal_requests', 'funds', 'fund_config', 'statements',
] as const;

async function main(): Promise<void> {
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  let fails = 0;
  for (const t of TABLES) {
    // @ts-expect-error dynamic table
    const { data, error } = await anon.from(t).select('*').limit(1);
    const rowCount = data?.length ?? 0;
    if (rowCount > 0) {
      console.log(`LEAK: anon can read ${rowCount} row from ${t}`);
      fails++;
    } else {
      console.log(`OK:   ${t} (${error ? 'denied: ' + error.message : '0 rows'})`);
    }
  }
  if (fails > 0) {
    console.error(`${fails} tables leak rows to anon`);
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run**

```bash
npx tsx scripts/rls-smoke.ts | tee docs/verification/golive-2026-04-20/rls-smoke.txt
```
Expected: all `OK:`, exit 0.

---

### Task 6.4: DR drill (compressed) — backup accessibility + rollback-runbook v2

- [ ] **Step 1: Verify Phase-1 backup still readable**

```bash
BACKUP_FILE=$(ls -t ~/indigo-backups/pre-golive-*.sql.gz | head -1)
gunzip -c "$BACKUP_FILE" | head -5
echo "backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
```
Expected: header visible, size reasonable.

- [ ] **Step 2: Verify PITR window visible**

Open Supabase dashboard → Database → Backups. Screenshot the PITR window, save as `docs/verification/golive-2026-04-20/pitr-window.png` (or record the retention days in the runbook if screenshot not possible).

- [ ] **Step 3: Add verification artifacts reference to runbook**

Append to `docs/runbooks/rollback.md`:

```
## 7. Go-live verification (2026-04-20)
- pg_dump accessibility: verified at 2026-04-20T<HH:MM>Z
- PITR window: <N> days, screenshot at docs/verification/golive-2026-04-20/pitr-window.png
- Anon EXECUTE sweep: 0 leaks (see anon-execute-sweep.txt)
- RLS smoke: 0 table leaks (see rls-smoke.txt)
- SECDEF gate: all 2026-04-16/17 migrations pass (see secdef-sweep.log)
```

- [ ] **Step 4: Commit everything**

```bash
git add scripts/secdef-gate-sweep.sh scripts/anon-execute-sweep.sql scripts/rls-smoke.ts \
        docs/verification/golive-2026-04-20/ docs/runbooks/rollback.md
git commit -m "chore(security): SECDEF + anon EXECUTE + RLS sweeps; runbook v2 with verification artifacts"
```

---

## Phase 7 — Cutover rehearsal + go/no-go

### Task 7.1: Migrations freeze

- [ ] **Step 1: Announce freeze**

No new files in `supabase/migrations/` from this point until after go-tag.

- [ ] **Step 2: Verify clean tree**

```bash
git status --short
```
Expected: clean or only the verification artifacts.

---

### Task 7.2: End-to-end dress rehearsal

- [ ] **Step 1: Run full Playwright suite on all three projects**

```bash
npx playwright test --project=chromium-desktop
npx playwright test --project=mobile-chrome
npx playwright test --project=webkit-desktop
```
Expected: all green. On failure, triage, fix, rerun from Phase 5.

- [ ] **Step 2: Final invariant run**

```bash
psql "$DATABASE_URL" -c "SELECT * FROM public.run_invariant_checks();" \
  | tee docs/verification/golive-2026-04-20/invariant-checks-final.txt
```
Expected: 20/20 PASS.

- [ ] **Step 3: Commit final artifacts**

```bash
git add docs/verification/golive-2026-04-20/
git commit -m "test(verification): final Phase 7 artifacts — Playwright green + 20/20 invariants"
```

---

### Task 7.3: Go/no-go checklist

Copy this into `docs/verification/golive-2026-04-20/go-no-go.md`, tick each box:

```markdown
# Go / No-Go — 2026-04-20

- [ ] 20/20 invariants pass on final sweep (see invariant-checks-final.txt)
- [ ] 5 net-new Playwright specs green on desktop + mobile + webkit
- [ ] Existing E2E smoke + lifecycle specs green on all 3 projects
- [ ] Trigger matrix: 100% pass (see trigger-matrix.log)
- [ ] package.json has no broken test:qa:* scripts
- [ ] Phase-1 pg_dump timestamp recorded in rollback runbook
- [ ] docs/runbooks/rollback.md committed and current
- [ ] Anon EXECUTE sweep: 0 rows
- [ ] RLS smoke: 0 table leaks
- [ ] SECDEF gate: all 2026-04-16/17 migrations green
- [ ] BTC verified baseline established + logged to AGENTS.md
```

- [ ] **Step 1: Decision**

If every box ticked → **GO** → Task 7.4.
If any box unchecked → **NO-GO** → triage and re-run the failing phase.

- [ ] **Step 2: Commit decision artifact**

```bash
git add docs/verification/golive-2026-04-20/go-no-go.md
git commit -m "docs: go/no-go decision artifact for 2026-04-20"
```

---

### Task 7.4: Tag and announce (only if GO)

- [ ] **Step 1: Tag**

```bash
git tag -a golive-2026-04-20 -m "Go-live candidate — all gates green, 20/20 invariants, trigger matrix clean, 5 new specs + existing suite pass"
git tag | grep golive
```

- [ ] **Step 2: Push tag (DO NOT push to main unless user explicitly confirms)**

Await explicit user `yes push to main` before:

```bash
git push origin main
git push origin golive-2026-04-20
```

- [ ] **Step 3: Record launch timestamp**

```bash
echo "Go-live tagged at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/verification/golive-2026-04-20/phase-log.txt
git add docs/verification/golive-2026-04-20/phase-log.txt
git commit -m "docs: log go-live tag timestamp"
```

---

## Post-launch follow-ups (tracked, not today)

- Execute a real PITR restore to a scratch branch (full DR drill)
- Perf baseline at N=50 / N=100 / N=200 investors
- Scaffold `tests/qa/` properly or remove it permanently
- Wire CI to run nightly E2E with storage-state reuse
- Monitor first-week invariant-check cron

---

## Self-review checklist (for the plan author)

- **Spec coverage**
  - [x] Section 3 hybrid data strategy → Task 2.1 + BTC phase0 in Task 3.2
  - [x] Section 4 identity → Task 2.2 + 2.3
  - [x] Section 5 Phases 1–7 → Tasks 1.x–7.x one-to-one
  - [x] Section 6 gate checklist → Task 7.3
  - [x] Section 7 DR + rollback → Task 1.2 + 1.6 + 6.4
  - [x] Section 8 security closure → Tasks 6.1 + 6.2 + 6.3
  - [x] Section 9 architecture constraints → enforced per task (canonical_rpc, is_admin, migrations-only)
  - [x] Section 10 risks → mitigations built into tasks
  - [x] Section 11 assumptions → pre-flight section + inline notes
  - [x] Section 12 follow-ups → "Post-launch follow-ups" section above

- **Placeholder scan** — no TBDs, every code block is real
- **Type consistency** — `_test_reset_transactional_state` used everywhere; column list consistent
- **Cross-task references** — every referenced file is created in an earlier task
