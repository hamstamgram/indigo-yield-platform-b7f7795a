

# Phase 2-4 Comprehensive Verification Results

## PHASE 2: Ledger & Mathematical Invariants -- PASS (1 minor finding)

### Dust Violations
**CLEAN.** Zero active positions with ghost dust (value > 0 and < 0.0000001).

### Precision Audit (Live RPCs)

| RPC | numeric(10,x) vars | ROUND() | Status |
|-----|-------------------|---------|--------|
| `apply_segmented_yield_distribution_v5` | NONE | ROUND(..., 18) x3, ROUND(..., 4) x1 | PASS |
| `apply_transaction_with_crystallization` | NONE | NONE | PASS |
| `apply_investor_transaction` | NONE | NONE | PASS |
| `recompute_investor_position` | NONE | NONE | PASS |
| `void_transaction` | NONE | NONE | PASS |
| `void_yield_distribution` | NONE | NONE | PASS |

**Finding 2.1 (P3 -- Cosmetic):** `apply_segmented_yield_distribution_v5` uses `ROUND(..., 4)` for the ownership percentage display column in `yield_allocations.ownership_pct`. This is display-only and does not affect financial calculations (gross/fee/ib/net all use ROUND 18). No action needed.

**Finding 2.2 (RESOLVED):** All `numeric(10,6)` variable declarations from the old yield engine have been eliminated from live RPCs. They persist only in archived migrations (which are never re-executed).

### FLOAT References
**CLEAN.** No `FLOAT` or `DOUBLE PRECISION` casts in any active migration or live RPC. Only references are in SQL comments (tolerance descriptions) in test files.

---

## PHASE 3: Concurrency & Security Gating -- 2 findings

### Advisory Lock Audit

| RPC | Has Advisory Lock | Severity |
|-----|------------------|----------|
| `apply_transaction_with_crystallization` | YES | -- |
| `apply_segmented_yield_distribution_v5` | YES | -- |
| `void_transaction` | YES | -- |
| `apply_investor_transaction` (10-param) | YES | -- |
| `apply_investor_transaction` (9-param) | **NO** | **P2** |
| `void_yield_distribution` | **NO** | **P1** |
| `recompute_investor_position` | **NO** | P3 (idempotent recompute) |
| `void_and_reissue_transaction` | **NO** | P2 (calls void_transaction internally which has its own lock) |

**Finding 3.1 (P1):** `void_yield_distribution` has NO advisory lock. Two admins could concurrently void the same distribution, causing duplicate reversal transactions. This is the highest-priority fix.

**Finding 3.2 (P2):** `apply_investor_transaction` 9-param overload lacks an advisory lock while the 10-param version has one. If the 9-param version is called directly, concurrent submissions for the same investor/fund could race.

### Recommended Fix (Single Migration)

Create `supabase/migrations/20260327_add_missing_advisory_locks.sql`:

1. **`void_yield_distribution`**: Add `PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));` at the top of the function body after variable declarations.

2. **`apply_investor_transaction` (9-param)**: Add `PERFORM pg_advisory_xact_lock(hashtext(p_investor_id::text || p_fund_id::text));` matching the 10-param version's pattern.

---

## PHASE 4: Frontend UI State & Type Safety -- PASS

### Cache Invalidation Coverage

The system uses a centralized `invalidateAfterTransaction()` from `src/utils/cacheInvalidation.ts` with a dependency graph pattern. All mutation hooks route through this:

| Mutation Hook File | Uses `invalidateAfterTransaction` | Status |
|-------------------|----------------------------------|--------|
| `useTransactionMutations.ts` | YES (7 mutations, all onSettled) | PASS |
| `useTransactionSubmit.ts` | YES | PASS |
| `useTransactionHooks.ts` | YES (create, void) | PASS |
| `useInternalRoute.ts` | YES | PASS |
| `useInvestorLedger.ts` | YES (invalidateAll callback) | PASS |
| `useAdminInvestorMutations.ts` | Uses direct `invalidateQueries` | PASS (non-financial mutations) |
| `useInvestorMutations.ts` | Uses direct `invalidateQueries` | PASS (delete investor, not financial) |

The `INVALIDATION_GRAPH` covers all critical derived data: positions, AUM, dashboard stats, integrity checks, yields, fees, IB allocations, and per-asset stats. No missing invalidation paths detected.

### Real-time Invalidation
`useInvestorRealtimeInvalidation.ts` subscribes to Supabase channels and calls `invalidateAfterTransaction` on real-time events, ensuring multi-tab/multi-admin consistency.

---

## Summary of All Findings

| # | Phase | Finding | Severity | Action |
|---|-------|---------|----------|--------|
| 2.1 | Precision | ROUND(..., 4) on ownership_pct display column | P3 | No action |
| 3.1 | Concurrency | `void_yield_distribution` missing advisory lock | **P1** | Add lock |
| 3.2 | Concurrency | `apply_investor_transaction` 9-param missing lock | P2 | Add lock |
| -- | From Phase 2 (prior) | `recalculate_fund_aum_for_date` missing | P2 | Create function |
| -- | From Phase 2 (prior) | `crystallize_yield_before_flow` stale doc ref | P3 | Update docs |

### Implementation Plan

**Migration 1** (P1 -- `20260327_add_missing_advisory_locks.sql`):
- Add advisory lock to `void_yield_distribution` using distribution ID as lock key
- Add advisory lock to `apply_investor_transaction` 9-param using investor_id + fund_id hash

**Migration 2** (P2 -- `20260327_create_recalculate_fund_aum.sql`):
- Create `recalculate_fund_aum_for_date(p_fund_id, p_target_date)` that sums active positions and ups