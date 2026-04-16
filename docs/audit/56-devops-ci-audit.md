# DevOps / CI Domain Audit

**Audit #56** | Domain #5 | Date: 2026-04-16 | Analyst: automated
**Scope**: Build reliability, test infrastructure, CI pipeline, deployment readiness

---

## 1. Build Status

| Tool | Command | Result | Notes |
|------|---------|--------|-------|
| `tsc --noEmit` (8GB heap) | `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` | **OOM crash** | Pre-existing. Heap exhausted at ~4GB. Stack traces are raw memory addresses — no useful type errors reported. |
| `npm run type-check` | `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` | **OOM crash** | Same command as above, wrapped in npm script. |
| `npm run build` (Vite/esbuild) | `vite build` | **PASS** ✓ | Built in 5.14s. 2 chunks >500kB (index, pdf) — warning only. |
| `npm run lint` | `eslint . --max-warnings=0` | **FAIL** ✗ | 4 errors, 221 warnings. Errors: 1 parsing error, 1 `no-shadow-restricted-names`, 2 `prefer-const`. Warnings are `no-restricted-imports` (3) + `no-restricted-syntax` (218). |

### Key Finding: tsc --noEmit is Non-Functional

`tsc --noEmit` OOMs even at 8GB (and reportedly at 16GB). The project's actual build tool is **Vite + esbuild**, which handles TypeScript via transpilation without full type-checking. This means:

- **No type safety gate exists** anywhere in the pipeline — CI, pre-commit, or manual
- `npm run type-check` is a dead script that will never succeed on this codebase
- Vite build succeeds because esbuild strips types without full analysis

---

## 2. Test Inventory

### 2.1 Vitest (Unit/Integration)

| Metric | Value |
|--------|-------|
| Test files discovered | 146 |
| Passed | 142 |
| Failed | 3 |
| Skipped | 1 |
| Individual tests | 1,474 |
| Tests passed | 1,473 |
| Tests todo | 1 |
| Duration | ~2.2s |

**All 3 failures are in `.opencode/node_modules/zod/`** — zod's own v4 internal tests (`recheck.test.ts`, `file.test.ts`, `to-json-schema.test.ts`) missing peer deps (`recheck`, `@web-std/file`, `@seriousme/openapi-schema-validator`). These are NOT project code.

**Project tests: 0 discovered.** No `.test.ts` / `.spec.ts` files exist in `src/`. The 142 passing test files are all from zod's internal test suite inside `.opencode/node_modules/`.

### 2.2 Test Directory Structure

| Directory | Type | File Count | Status |
|-----------|------|-----------|--------|
| `src/**/*.test.ts` | Unit | **0** | No project unit tests exist |
| `tests/unit/` | Unit | **0** (directory doesn't exist) | `npm run test:unit` exits with "No test files found" |
| `tests/migrations/` | SQL | 14 files | Run against live DB only (not in vitest) |
| `tests/e2e/` | Playwright | 25 spec files + 1 `.disabled` | Require seeded DB + browser |
| `tests/validation/` | Playwright (disabled) | 1 `.disabled` file | Inactive |
| `tests/qa/` | QA scripts | 0 files (directory empty) | `npm run test:qa:ci` crashes — references `tests/qa/ci/contract-drift-check.ts` which doesn't exist |

### 2.3 E2E Tests (25 Playwright specs)

| Category | Files |
|----------|-------|
| Smoke | `smoke-critical-flows`, `smoke-login`, `smoke-navigation`, `smoke-suite` |
| Lifecycle | `btc-ralph-loop`, `eth-ralph-loop`, `sol-ralph-loop`, `usdt-ralph-loop`, `xrp-lifecycle`, `xrp-ralph-loop`, `xrp-full-lifecycle-ui` |
| Yield | `yield-replay-btc`, `yield-replay-xrp` |
| Go-live | `golive-lifecycle`, `phase2-cloud-validation`, `phase2-day2-advanced-flows`, `phase2-day3-final-regression-sweep` |
| Financial | `financial-proof` |
| Admin | `ui-admin-data-integrity`, `ui-admin-financial-actions`, `fund-lifecycle-ui` |
| UX/UI | `ui-form-validation`, `ui-permissions-error-states`, `ui-reports-history`, `ui-void-cascade`, `ui-withdrawal-full-exit` |

**Dependency**: All E2E tests require a running Supabase instance (local or remote) with seeded data. `supabase/seed.sql` exists. No local-seed-only test mode is configured.

---

## 3. CI Pipeline Analysis (`.github/workflows/ci.yml`)

### 3.1 Pipeline Structure

4 parallel jobs + 1 dependent job:

```
lint-and-type ──┐
test-unit ──────┤
sql-checks ─────┼──> qa-invariants (depends on sql-checks)
security-scan ──┘
```

**Triggers**: PR to `main`/`develop`, push to `develop`

### 3.2 Job Coverage

| Job | Checks | Status |
|-----|--------|--------|
| **lint-and-type** | `pnpm lint`, `pnpm tsc --noEmit` | **BROKEN** — `pnpm` is not the project's package manager (uses npm). `tsc --noEmit` will OOM. |
| **test-unit** | `pnpm test:unit --if-present` | **BROKEN** — pnpm + no unit tests exist |
| **sql-checks** | Migration naming, CRITICAL_RPCS admin gates (40 RPCs), unbounded numeric, yield conservation, migration dry-run (pg), RLS checks, ledger integrity, yield conservation views | **PASS** (if pnpm → npm fixed) |
| **contract-integrity** | Enum contracts, SQL hygiene, gateway usage, protected table mutations, composite PK misuse, FIRST_INVESTMENT enum | **PASS** (if pnpm → npm fixed) |
| **qa-invariants** | Raw enum literals, dual enum source alignment, dust references | **PASS** (if pnpm → npm fixed) |
| **security-scan** | `pnpm audit --audit-level=high`, TruffleHog secret scan | Partially functional |

### 3.3 Critical CI Gap Analysis

| Check | CI Present | Local Present | Gap |
|-------|-----------|---------------|-----|
| Lint (ESLint) | ✓ (but via pnpm) | ✓ (`npm run lint`) | Package manager mismatch |
| Type-check (`tsc --noEmit`) | ✓ (but OOMs) | ✓ (but OOMs) | Dead check — will never pass |
| Unit tests | ✓ (but 0 tests) | ✓ (but 0 tests) | No project unit tests exist |
| Integration tests | ✗ | ✓ (`test:integration`) | **Missing from CI** |
| Migration naming | ✓ | ✓ (pre-commit) | Covered |
| SECDEF admin gates | ✓ | ✓ (pre-commit) | Covered |
| Unbounded numeric | ✓ | ✓ (pre-commit) | Covered |
| Migration dry-run | ✓ (Postgres service) | ✗ | CI-only |
| RLS verification | ✓ | ✗ | CI-only |
| Ledger integrity | ✓ | ✗ | CI-only |
| Yield conservation | ✓ | ✗ | CI-only |
| Enum contracts | ✓ | ✓ (`contracts:verify`) | Covered |
| SQL hygiene | ✓ | ✓ (`sql:hygiene`) | Covered |
| Gateway check | ✓ | ✓ (`gateway:check`) | Covered |
| Coverage gate (80%) | ✗ | ✗ | **No coverage gate anywhere** |
| E2E/Playwright | ✗ | ✓ (`test:e2e`) | **Missing from CI** |
| QA contract drift | ✗ | ✗ (script broken) | **Broken on both** |
| Build (Vite) | ✗ | ✓ (`npm run build`) | **Missing from CI** |
| Bundle size check | ✗ | ✓ (warning in build) | Not gated |
| Security audit | ✓ | ✗ | CI-only |

### 3.4 Package Manager Discrepancy

**CI uses `pnpm`** (`pnpm/action-setup@v2`, `pnpm install --frozen-lockfile`, `pnpm lint`). **Project uses `npm`** (has `package-lock.json`, no `pnpm-lock.yaml`). This means the entire CI pipeline likely **fails on every run** unless a `pnpm-lock.yaml` is maintained separately.

---

## 4. Pre-commit Hook Analysis (`.husky/pre-commit`)

### 4.1 Current Checks

| # | Check | Scope | Blocking? |
|---|-------|-------|-----------|
| 1 | Migration naming (`<timestamp>_<snake_case>.sql`) | Staged migrations | ✓ `exit 1` |
| 2 | SECDEF without admin gate | Staged migrations | ✗ Warning only |
| 3 | Unbounded numeric columns | Staged migrations | ✓ `exit 1` |
| 4 | console.log statements | Staged `.ts`/`.tsx` | ✗ Warning only |
| 5 | (Comment says "Type check" but does nothing) | — | N/A |

### 4.2 Pre-commit Gap Analysis

| Check | Should Be Present | Priority |
|-------|--------------------|----------|
| ESLint on staged files | ✓ | P0 |
| TypeScript type-check (if feasible) | ✓ (but OOMs) | P2 |
| Build verification | Optional | P2 |
| Test run on affected files | Optional | P1 |
| SECDEF gate blocking | ✓ (currently warning-only) | P1 |
| console.log gate blocking | ✓ (currently warning-only) | P1 |

**Note**: Line 54 comments "Type check (fast — only checks changed files via tsc)" but no actual type-check command runs. This was likely disabled due to the OOM issue.

---

## 5. E2E Test Dependency Analysis

### 5.1 Prerequisites

| Requirement | Available | Note |
|-------------|-----------|------|
| Playwright installed | ✓ | `test:e2e` script configured |
| Local Supabase | Optional | `supabase/seed.sql` exists |
| Remote Supabase | ✓ | Tests likely target remote by default |
| Seeded data | ✓ | `seed.sql` + `seed:golden` script |
| Auth credentials | Required | Not documented for CI |

### 5.2 E2E Run Feasibility

- **Local**: Requires `npx supabase start` + `npx supabase db reset` to seed. No smoke test command targets localhost explicitly.
- **CI**: No Playwright job in CI. Would need a database service + seed + auth setup — complex but feasible.
- **Risk**: 25 spec files with no CI gate means E2E regressions are only caught by manual runs.

---

## 6. QA Infrastructure Status

| Script | Expected | Actual |
|--------|----------|--------|
| `test:qa:contracts` | `tests/qa/ci/contract-drift-check.ts` | **File doesn't exist** — ERR_MODULE_NOT_FOUND |
| `test:qa:gateway` | `tests/qa/ci/gateway-bypass-check.ts` | Likely missing too (same directory) |
| `test:qa:integrity` | `tests/qa/ci/integrity-check.ts` | Likely missing too |
| `test:qa:phase0` | `tests/qa/phase0-runtime-truth.ts` | Likely missing |
| `test:qa:phase1` | `tests/qa/phase1-enum-audit.ts` | Likely missing |
| `test:qa:scenarios` | `tests/qa/scenarios/runner.ts` | Likely missing |
| `test:qa:invariants` | `tests/qa/invariants/db-invariants.ts` | Likely missing |
| `test:qa:e2e` | `playwright test --project=qa` | May work if project configured |

**The `tests/qa/` directory is empty.** All QA npm scripts reference files that don't exist. This is dead infrastructure — scripts were likely planned but never implemented or were removed.

---

## 7. Lint Detail

| Type | Count | Details |
|------|-------|---------|
| Errors | 4 | 1 parsing error (likely generated file), 1 `no-shadow-restricted-names` (`undefined`), 2 `prefer-const` |
| Warnings | 221 | ~3 `no-restricted-imports` (direct Supabase client in utils), ~218 `no-restricted-syntax` (position query filters, direct rpc calls) |
| Fixable | 2 | `prefer-const` auto-fixable |

The 221 warnings are mostly intentional architecture-enforcement rules. The 4 errors are real issues that should be fixed.

---

## 8. Recommendations

### P0 — Critical (Breaks CI or blocks development)

| # | Issue | Action |
|---|-------|--------|
| P0-1 | **CI uses pnpm, project uses npm** | Migrate CI to `npm` or maintain `pnpm-lock.yaml`. Current CI fails on every run. |
| P0-2 | **Zero project unit tests** | No `.test.ts` files in `src/`. `tests/unit/` doesn't exist. Per AGENTS.md: "Min 80% coverage" is unachievable. Start with critical financial utility tests. |
| P0-3 | **QA scripts reference non-existent files** | `tests/qa/` is empty. Either implement the QA scripts or remove the dead npm scripts. |
| P0-4 | **No coverage gate** | AGENTS.md requires 80% coverage but no enforcement exists. Add `vitest run --coverage` + threshold to CI. |

### P1 — Important (Quality & safety gaps)

| # | Issue | Action |
|---|-------|--------|
| P1-1 | **Vite build not in CI** | The only working build check is absent from CI. Add `npm run build` as a CI gate. |
| P1-2 | **E2E tests not in CI** | 25 Playwright specs run only manually. Add Playwright CI job with Supabase service container + seed. |
| P1-3 | **Lint has 4 errors, not blocked** | `npm run lint` exits non-zero but CI's lint job uses pnpm. Fix the 4 errors, add lint to pre-commit for staged files. |
| P1-4 | **SECDEF gate is warning-only in pre-commit** | Should be blocking (`exit 1`). A new migration could slip in without admin gates. |
| P1-5 | **console.log gate is warning-only** | Should be blocking or at minimum flag in CI. |
| P1-6 | **Integration tests not in CI** | `test:integration` exists locally but is not in the CI pipeline. |

### P2 — Improvement (Nice-to-have)

| # | Issue | Action |
|---|-------|--------|
| P2-1 | **`tsc --noEmit` OOMs** | Remove `npm run type-check` — it's a dead script. Replace with `vue-tsc --noEmit` (if compatible) or accept Vite build as the type gate. Document decision. |
| P2-2 | **`type-check` step in CI is dead** | Remove or replace. Wastes CI minutes on inevitable OOM. |
| P2-3 | **2 bundle chunks >500kB** | `index-CKfgrwn4.js` (710kB) and `pdf-xhpM2D93.js` (618kB). Consider code-splitting or lazy loading. |
| P2-4 | **3 zod internal test failures pollute vitest output** | Add `.opencode/` to vitest `exclude` config to stop running zod's own test suite. |
| P2-5 | **`build:staging` references `tsc &&`** | `npm run build:staging` runs `tsc && vite build --mode staging`. The `tsc` will OOM, making staging builds impossible. |
| P2-6 | **tests/validation/ contains .disabled file** | `fundLifecycle.spec.ts.disabled` — decide whether to restore or delete. |

---

## 9. Summary Scorecard

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Build reliability | 6/10 | Vite builds fine, but tsc and staging builds are broken |
| Test coverage | 1/10 | Zero project unit tests, QA infrastructure empty |
| CI pipeline | 3/10 | pnpm mismatch makes entire pipeline suspect; key checks missing |
| Pre-commit hooks | 5/10 | Good migration checks, but no lint/type-check, gates are warning-only |
| E2E testability | 4/10 | 25 specs exist, but no CI gate, requires remote DB |
| Deployment readiness | 3/10 | No type safety gate, no coverage gate, no build gate in CI |
| **Overall** | **3/10** | CI pipeline is non-functional (pnpm), zero unit tests, dead QA scripts |

---

## 10. Appendix: Raw Command Output

### tsc --noEmit (head)
```
<--- Last few GCs --->
[81444:0x74a80c000]   24138 ms: Mark-Compact 4062.0 (4111.5) -> 4048.2 (4113.3) MB,
  pooled: 0.0 MB, 345.88 / 0.00 ms (average mu = 0.107, current mu = 0.056)
  allocation failure
```
→ OOM crash, no usable type errors emitted.

### npm run build (tail)
```
✓ built in 5.14s
(!) Some chunks are larger than 500 kB after minification.
```

### npx vitest run (summary)
```
Test Files  3 failed | 142 passed | 1 skipped (146)
     Tests  1473 passed | 1 todo (1474)
  Duration  2.16s
```
3 failures = zod internal tests (not project code).

### npm run lint (summary)
```
✖ 225 problems (4 errors, 221 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.
```

### npm run test:qa:ci
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../tests/qa/ci/contract-drift-check.ts'
```