# Audit 58: Invariant Coverage Domain Audit

**Date:** 2026-04-16  
**Type:** Domain Audit #7 — Invariant Coverage  
**Scope:** All declared financial invariants vs. automated test coverage  
**Status:** READ-ONLY analysis, no source modifications  

---

## 1. Declared Invariants (from INVARIANT_REGISTRY.md)

| ID | Name | Severity | Definition |
|----|------|----------|------------|
| I1 | AUM Position Reconciliation | CRITICAL | Σ investor_positions.current_value = fund_daily_aum.total_aum (within 0.01) |
| I2 | Yield Conservation Law | CRITICAL | gross_yield = net_yield + total_fees + total_ib + dust (within 0.01) |
| I3 | Position Non-Negativity | CRITICAL | investor_positions.current_value >= 0 (ZERO TOLERANCE) |
| I4 | Transaction Uniqueness | CRITICAL | No duplicate reference_id in transactions_v2 |
| I5 | Void Cascade Completeness | HIGH | When yield is voided, all derived transactions are also voided |
| I6 | AUM Daily Movement | MEDIUM | fund_daily_aum entries exist for each active fund per day |
| I7 | Transaction-Position Correlation | HIGH | SUM(transactions_v2.amount) per investor/fund = investor_positions.current_value |
| I8 | Yield Idempotency | HIGH | No duplicate yield applications for same fund/period/purpose |
| I9 | SECDEF Read Function Admin Gate | HIGH | All SECDEF STABLE read functions returning cross-tenant data must have is_admin() gate |
| I10 | Cross-Tenant SECDEF Isolation | CRITICAL | SECDEF read functions with no scope param must gate with is_admin() |

---

## 2. Invariant → Test Coverage Mapping

### 2.1 Coverage Classification

| Invariant | DB Check (`run_invariant_checks`) | SQL Migration Tests | E2E Tests | Frontend Unit | Classification |
|-----------|-----------------------------------|---------------------|------------|---------------|----------------|
| I1: AUM Reconciliation | Check 2 (informational: "AUM is dynamically derived from positions") + Check 1 (position_matches_ledger) | phase5A1 (4 tests), position_sync_validation_tests (6+ tests), reporting_hardening_tests (Test 2) | golive-lifecycle.spec.ts:705 (calls check_aum_reconciliation RPC) | aumReconciliationService.ts (calls RPC) | **COVERED** (DB + SQL + E2E) |
| I2: Yield Conservation | Check 3 (yield_conservation: gross vs sum of allocations) | yield_hardening_tests (Test 4), reporting_hardening_tests (Test 1) | None found | None found | **PARTIAL** (DB + SQL, no E2E/frontend test) |
| I3: No Negative Positions | Check 4 (no_negative_positions: current_value < -0.000001) | phase5A3 (Tests 1-2: non-negative + unique positions) | None found | None found | **PARTIAL** (DB + SQL, no E2E) |
| I4: No Duplicate Transactions | Check 11 (duplicate_transactions_check: same investor/fund/type/amount/tx_date) | None found | None found | None found | **PARTIAL** (DB check only, no standalone test) |
| I5: Void Cascade Integrity | Check 9 (voided_transaction_no_active_allocations) + Check 15 (voided_distribution_no_active_allocations) | phase5A2 (5 tests), void_unvoid_concurrency_tests (3 tests), void_transaction_regression_tests (5 tests), 20260327102803_void_unvoid_tests (7 checks) | ui-void-cascade.spec.ts | None found | **COVERED** (DB + SQL + E2E) |
| I6: AUM Daily Movement | Check 10 (aum_event_consistency) covers AUM events; no explicit "all active funds have today's AUM" check | phase5B_deposit_scenario (trigger existence) | None found | None found | **PARTIAL** (DB tangential, no direct test) |
| I7: Position-Transaction Correlation | Check 1 (position_matches_ledger) + Check 13 (position_ledger_drift: 0.000001–0.01 tolerance) | phase5A3 (Test 5), void_unvoid_concurrency_tests (Test 3) | None found | None found | **COVERED** (DB + SQL) |
| I8: Yield Idempotency | Not in `run_invariant_checks` (16 checks do not include yield idempotency) | yield_hardening_tests (Tests 1-6 cover v5 canonical, not idempotency guards) | None found | None found | **UNCOVERED** (no automated check anywhere) |
| I9: SECDEF Admin Gate | Not in `run_invariant_checks` | None found | None found | CI pipeline: `ci.yml` sql-checks job verifies admin gates on 57 critical RPCs | **PARTIAL** (CI only, no runtime check) |
| I10: Cross-Tenant SECDEF Isolation | Not in `run_invariant_checks` | None found | None found | CI pipeline: `ci.yml` sql-checks verifies admin gates; Tier 3/3.5/4 migrations gated functions | **PARTIAL** (CI + migration gates, no runtime test) |

### 2.2 Summary Statistics

| Classification | Count | Invariants |
|----------------|-------|------------|
| **COVERED** | 2 | I1, I5 |
| **PARTIAL** | 7 | I2, I3, I4, I6, I7, I9, I10 |
| **UNCOVERED** | 1 | I8 |
| **Total** | 10 | — |

---

## 3. `run_invariant_checks()` Function Analysis

### 3.1 Function Definition (Latest: `20260416055420_financial_logic_p2_fixes.sql`)

The function runs **16 checks** via a single JSONB-returning RPC. It is `SECURITY DEFINER` and gated by `is_admin()`.

### 3.2 Check Inventory → Invariant Mapping

| Check # | Name | Category | Covers Invariant | Notes |
|---------|------|----------|------------------|-------|
| 1 | position_matches_ledger | core | I7 | Drift > 0.000001 |
| 2 | fund_aum_matches_positions | core | I1 | **Informational only** — "AUM is dynamically derived from positions", always passes |
| 3 | yield_conservation | core | I2 | FL-5 fix: removed `purpose='reporting'` filter |
| 4 | no_negative_positions | core | I3 | current_value < -0.000001 |
| 5 | no_orphaned_transactions | core | — | Not declared in registry (extra check) |
| 6 | ib_ledger_consistency | ib | — | Not declared in registry (extra check) |
| 7 | fee_allocation_consistency | fees | — | Not declared in registry (extra check) |
| 8 | yield_allocation_consistency | yield | — | Not declared in registry (extra check) |
| 9 | voided_transaction_no_active_allocations | validation | I5 (partial) | Transaction-level void cascade |
| 10 | aum_event_consistency | aum | I6 (tangential) | Events have corresponding AUM records |
| 11 | duplicate_transactions_check | validation | I4 (partial) | Based on investor/fund/type/amount/tx_date combo, NOT reference_id |
| 12 | ib_allocation_consistency | ib | — | Not declared in registry (extra check) |
| 13 | position_ledger_drift | drift | I7 | Drift between 0.000001 and 0.01 (informational) |
| 14 | crystallization_integrity | crystallization | — | Not declared in registry (extra check) |
| 15 | voided_distribution_no_active_allocations | validation | I5 (partial) | Distribution-level void cascade |
| 16 | aum_purpose_coverage | aum | — | Not declared in registry (extra check) |

### 3.3 Coverage Gaps in `run_invariant_checks()`

| Invariant | Gap Description |
|-----------|-----------------|
| I1 | Check 2 is **informational** — always passes. The real check is Check 1 (position-ledger), but I1 specifically tests fund_daily_aum.total_aum vs position sum, not position vs transaction ledger. These differ when AUM != positions (e.g. post-void before sync). No strict DB check for I1. |
| I4 | Check 11 checks duplicates on (investor_id, fund_id, type, amount, tx_date) combo, but I4 is defined as "no duplicate reference_id". These are **different checks**. |
| I6 | No check for "all active funds have today's AUM". Check 10 checks AUM events have corresponding records, not completeness. |
| I8 | **Completely absent** from `run_invariant_checks()`. No yield idempotency check exists. |
| I9/I10 | Security invariants not in this function (handled by CI static checks). |

---

## 4. Financial Invariant Gap Analysis

### 4.1 Seven Critical Financial Invariants

| # | Invariant | DB Check | SQL Test | E2E Test | Frontend Test | CI Test | Verdict |
|---|-----------|----------|----------|----------|---------------|---------|---------|
| 1 | **Yield conservation**: total_yield_distributed = sum(investor_yield_events) | Check 3 (yield_conservation) | yield_hardening_tests (Test 4) | — | — | — | **HAS DB CHECK, no E2E/CI** |
| 2 | **Fee conservation**: platform_fees = fund_yield * fee_pct | Check 7 (fee_allocation_consistency: orphan check only) | — | — | — | — | **GAP**: No check that fees = yield * fee_pct |
| 3 | **AUM consistency**: fund_daily_aum.total_aum = sum(investor_positions.current_value) | Check 2 (informational, always passes) | phase5A1 (direct query) | golive.spec.ts (check_aum_reconciliation RPC) | aumReconciliationService.ts | — | **GAP in run_invariant_checks**; separate RPC exists |
| 4 | **Transaction immutability**: voided tx → cascade-voided allocations | Check 9 + Check 15 | phase5A2, void regression tests | ui-void-cascade.spec.ts | — | — | **Covered** |
| 5 | **Balance chain**: current_value = cost_basis + cumulative_yield_earned | No DB check | — | — | — | — | **UNCOVERED**: No test for this invariant |
| 6 | **Withdrawal validity**: withdrawal <= available balance (current_value) | No DB check in run_invariant_checks | — | ui-withdrawal-full-exit.spec.ts (partial) | — | — | **GAP**: No DB enforcement test |
| 7 | **Statement accuracy**: generated_statement totals match transaction ledger | No DB check | reporting_hardening_tests (Tests 1-3, but uses legacy schema) | — | — | — | **PARTIAL**: Legacy SQL test, no current-schema test |

---

## 5. Test Infrastructure Status

### 5.1 Unit Tests

- **Runner**: Vitest
- **Status**: 146 test files, 1473 tests passed, 3 failures (zod dependency issues in `.opencode/node_modules/`)
- **Coverage**: `npm run test:coverage` runs but fails with same 3 zod dependency errors
- **Config**: No `vitest.config.ts` or `jest.config.*` found at root (likely in `package.json` or `vite.config.ts`)

### 5.2 E2E Tests

- **Runner**: Playwright (tests/e2e/)
- **Files**: 26 spec files
- **Invariant-relevant**: 2 files (golive-lifecycle.spec.ts, ui-void-cascade.spec.ts)
- **CI**: `.github/workflows/e2e.yml` exists

### 5.3 QA Tests

- **Status**: `tests/qa/` directory does **NOT exist**
- No invariant-specific QA test suite

### 5.4 SQL Migration Tests

- **Files**: 14 SQL files in `tests/migrations/`
- **Inventory**:

| File | Invariants Covered |
|------|--------------------|
| phase5A1_aum_position_invariant.sql | I1 (AUM = SUM positions), voided exclusion |
| phase5A2_void_reversibility.sql | I5 (void cascade), I7 (position after void) |
| phase5A3_position_integrity.sql | I3 (non-negative), I7 (uniqueness, orphans, numeric validity) |
| phase5A4_reporting_consistency.sql | I1 (reporting AUM), I7 (exclude voided), canonical enforcement |
| phase5B_deposit_scenario.sql | I6 (triggers exist), I7 (position reflects deposits) |
| phase5B_yield_scenario.sql | I2 (triggers exist), I6, I8 (canonical v5 only) |
| phase5C_concurrency_validation.sql | Concurrency mechanisms, I7 (position uniqueness via PK) |
| yield_hardening_tests.sql | I2 (yield conservation Test 4), I8 (v5 canonical, v3/v4 removed) |
| void_unvoid_concurrency_tests.sql | I5 (void cascade Tests 1-2), I7 (position-ledger Test 3) |
| void_transaction_regression_tests.sql | I5 (void cascade), audit trail, idempotency |
| reporting_hardening_tests.sql | I1, I2 (statement accuracy), I5 (void exclusion) **Note: uses legacy schema** |
| position_sync_validation_tests.sql | I1 (validate_aum_matches_positions) |
| position_sync_repair_isolation_tests.sql | Repair function existence/SECDEF/admin checks |
| 20260327102803_void_unvoid_tests.sql | I5 (void/unvoid cascade with live data) |

- **CI Runnable?**: **NO** — SQL tests require a running local Supabase instance. Not integrated into CI pipeline.

### 5.5 CI Pipeline Invariant Coverage

| Workflow | Invariant Checks | Gaps |
|----------|-------------------|------|
| `.github/workflows/ci.yml` (sql-checks) | v_ledger_reconciliation view, v_yield_conservation_check/violations views, admin gates on 57 RPCs, yield conservation identity pattern, forbidden migration patterns, unbounded numerics, RLS checks | No `run_invariant_checks()` execution in CI |
| `.github/workflows/ci.yml` (contract-integrity) | Protected table mutation checks, gateway enforcement, enum contracts | No runtime invariant verification |
| `.github/workflows/test.yml` | Unit tests + coverage + security audit | No invariant-specific assertions |

---

## 6. CI Integration Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| `run_invariant_checks()` not called in CI | 16 DB-level checks never run automatically | Add step to sql-checks job that calls `run_invariant_checks()` and fails on any `passed=false` |
| SQL migration tests not in CI | 14 SQL test files require live DB, never run in CI | Add Supabase local start + SQL test runner to CI (use existing Postgres service container) |
| `check_aum_reconciliation()` not in CI | Most critical invariant (I1) not verified in CI pipeline | Add to sql-checks job after migrations |
| No `tests/qa/` directory | AGENTS.md requires 80% coverage but no QA invariant suite exists | Create `tests/qa/invariants/` with automated invariant verification |
| I8 yield idempotency has zero automated coverage | Can deploy duplicate yield without detection | Add idempotency guard check to `run_invariant_checks()` |
| I1 Check 2 in `run_invariant_checks()` is informational | Always passes, never detects AUM drift | Replace with actual AUM vs position sum comparison |
| I4 check uses different definition than registry | `reference_id` uniqueness not checked; only combo-uniqueness checked | Add `reference_id` duplicate check to `run_invariant_checks()` or as separate check |
| Balance chain (I-ext: current = cost + yield) has no check | Can silently drift without detection | Add balance chain check to `run_invariant_checks()` |
| Fee conservation (fees = yield * fee_pct) has no check | Fee calculation errors undetectable | Add fee conservation check |
| Legacy schema in reporting_hardening_tests.sql | Tests reference `investors`, `transactions` (v1) tables which may not exist in current schema | Rewrite for v2 schema or mark as deprecated |

---

## 7. Priority-Ordered Test Implementation Plan

> **NOTE:** This plan documents what should be implemented. No code changes made in this audit.

### P0 — CRITICAL (deploy blockers without automation)

| Priority | Invariant | Action | Artefact |
|----------|-----------|--------|----------|
| P0-1 | I8: Yield Idempotency | Add Check 17 to `run_invariant_checks()`: detect duplicate (fund_id, period_end, purpose) in non-voided yield_distributions | SQL migration |
| P0-2 | I1: AUM Reconciliation | Replace Check 2 informational with actual `fund_daily_aum.total_aum = SUM(investor_positions.current_value)` comparison | SQL migration |
| P0-3 | I4: Transaction Uniqueness | Add `reference_id` duplicate check to `run_invariant_checks()` as Check 18 | SQL migration |
| P0-4 | CI: Run `run_invariant_checks()` | Add step to `ci.yml` sql-checks job: call function, fail if any `passed=false` | YAML workflow |
| P0-5 | Balance Chain | Add Check 19: `current_value = cost_basis + cumulative_yield_earned` per position | SQL migration |
| P0-6 | Fee Conservation | Add Check 20: `fund_yield * fee_pct = total_fees` per distribution | SQL migration |

### P1 — HIGH (should have before next release)

| Priority | Invariant | Action | Artefact |
|----------|-----------|--------|----------|
| P1-1 | I2: Yield Conservation | E2E test: apply yield, then call `alert_on_yield_conservation_violation()`, assert 0 violations | Playwright spec |
| P1-2 | I3: No Negative Positions | E2E test: after withdrawal, verify `investor_positions.current_value >= 0` | Playwright spec |
| P1-3 | I6: AUM Daily | Add Check 21: all active funds have today's `fund_daily_aum` entry | SQL migration |
| P1-4 | SQL Test CI | Add SQL migration test runner to CI (Supabase local start + psql test runner) | YAML workflow + script |
| P1-5 | Withdrawal Validity | Add DB check: withdrawal amount <= current_value at time of execution | SQL migration |

### P2 — MEDIUM (hardening)

| Priority | Invariant | Action | Artefact |
|----------|-----------|--------|----------|
| P2-1 | `tests/qa/` | Create `tests/qa/invariants/` directory with invariant scenario tests | New test files |
| P2-2 | Statement Accuracy | Rewrite reporting_hardening_tests.sql for v2 schema | SQL test file |
| P2-3 | Coverage reporting | Fix `npm run test:coverage` (3 zod dependency errors from .opencode/) | NPM config |
| P2-4 | I9/I10: Security | Add runtime SECDEF gate check to `run_invariant_checks()` (query pg_proc for ungated SECDEF functions) | SQL migration |

---

## 8. Summary

**Overall Coverage Assessment: Incomplete**

- **10 declared invariants** in the registry
- **2 fully covered** (I1, I5) with DB + SQL + E2E tests
- **7 partially covered** — have DB checks or SQL tests but missing E2E, CI, or frontend verification
- **1 uncovered** (I8) — no automated check anywhere
- **`run_invariant_checks()`** is the primary automated verification tool but has 6 significant coverage gaps: informational Check 2, missing I8, I4 misaligned, no balance chain, no fee conservation, no AUM completeness
- **SQL migration tests** are comprehensive (14 files) but **not integrated into CI** and require a live Supabase instance
- **CI pipeline** has strong static analysis (admin gates, schema hygiene, protected table checks) but does **not** execute `run_invariant_checks()` at runtime
- **No `tests/qa/` directory** exists despite AGENTS.md requirement for 80% coverage
- **Key financial invariants** (balance chain, fee conservation, withdrawal validity) have **zero automated verification** — these represent potential silent drift vectors

**Risk Assessment:** The platform can deploy with undetected yield idempotency violations, AUM drift (Check 2 is informational), balance chain drift, and fee calculation errors. None of these are caught by CI.