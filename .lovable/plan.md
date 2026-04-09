

## Full-Stack Expert Audit — Comprehensive Findings & Fix Plan

### TEAM: Frontend Specialist, Database Specialist, Senior Dev, CTO

---

### Finding 1 — CRITICAL: Admin prefetch loads WRONG data for /admin/transactions

**Specialist**: Frontend

`src/utils/prefetch/adminPrefetch.ts` line 39 calls `transactionService.fetchUserTransactions()` to prefetch the admin transactions page. This function fetches the **current admin user's own transactions** (filtered by `auth.uid()`), NOT all transactions. The admin transactions page uses `useTransactions()` from `useTransactionHooks.ts` which calls the correct `fetchTransactions()`.

**Impact**: The prefetch populates the wrong query key with wrong data. When the admin page loads, it either shows the admin's own transactions briefly (flash of wrong content) or triggers a redundant re-fetch, wasting the prefetch entirely.

**Fix**: Replace the prefetch with the correct admin transaction fetcher, or remove the prefetch for this route entirely since the query key won't match.

---

### Finding 2 — CRITICAL: `fetchUserTransactions` (shared service) missing `visibility_scope` filter

**Specialist**: Senior Dev / Security

`src/services/shared/transactionService.ts:fetchUserTransactions()` queries `transactions_v2` filtered by `investor_id` and `is_voided = false`, but does NOT filter by `visibility_scope = 'investor_visible'`. This means admin-only transactions (IB_CREDIT, DUST, internal types) leak into the result set.

Meanwhile, the actual investor-facing code in `src/features/investor/transactions/services/transactionsV2Service.ts` and `useInvestorOverviewQueries.ts` correctly filter by `visibility_scope = 'investor_visible'`.

**Impact**: If `fetchUserTransactions` is called from investor context (it's designed for "user transaction views" per its JSDoc), internal system transactions become visible. Currently only used by admin prefetch (Finding 1), but any future investor-facing use would leak data.

**Fix**: Add `.eq("visibility_scope", "investor_visible")` to the query in `fetchUserTransactions`.

---

### Finding 3 — MEDIUM: `rpc.applyYield` helper calls V4 (stale), not V5

**Specialist**: Senior Dev

`src/lib/rpc/client.ts:applyYield()` (line 266) calls `apply_segmented_yield_distribution` (V4). The actual yield pipeline uses `apply_segmented_yield_distribution_v5` via `yieldApplyService.ts`.

**Impact**: Currently no code calls `rpc.applyYield`, so this is dead code. But it's a trap for future developers who might use the convenient `rpc.applyYield` helper expecting V5 behavior.

**Fix**: Update `rpc.applyYield` to call V5 with correct params (add `p_purpose` as required), or remove it and direct callers to `yieldApplyService.applyYieldDistribution`.

---

### Finding 4 — MEDIUM: `useTransactionSubmit` withdrawal path bypasses RPC with direct insert

**Specialist**: CTO / Database

`src/features/admin/transactions/hooks/useTransactionSubmit.ts` lines 87-112 create a withdrawal via direct `supabase.from("withdrawal_requests").insert(...)` followed by `withdrawalService.approveAndComplete()`. This bypasses `create_withdrawal_request` RPC which has validation, advisory locking, and audit logging.

**Impact**: Missing validation (e.g., balance checks, cooling-off enforcement) and no advisory lock means potential race conditions if two admins create+approve withdrawals simultaneously for the same investor.

**Fix**: Route through `create_withdrawal_request` RPC instead of direct insert, or at minimum call `can_withdraw` validation before the insert.

---

### Finding 5 — MEDIUM: `investorPortfolioService.createWithdrawalRequest` passes raw number, not string

**Specialist**: Frontend / Precision

`src/features/investor/portfolio/services/investorPortfolioService.ts` line 155 passes `requested_amount: params.amount` where `params.amount` is typed as `number`. All other withdrawal insert paths use `String(params.amount)` to preserve NUMERIC precision. This path risks floating-point drift on amounts like `0.00000001` BTC.

**Fix**: Change to `requested_amount: String(params.amount)`.

---

### Finding 6 — LOW: `rpc.applyYield` (V4 helper) has wrong rate limit key

**Specialist**: Senior Dev

`RATE_LIMITED_RPCS` in `client.ts` has an entry for `apply_segmented_yield_distribution` (V4) but NOT `apply_segmented_yield_distribution_v5`. The V5 function (the one actually used) has no rate limiting.

**Fix**: Add `apply_segmented_yield_distribution_v5` to `RATE_LIMITED_RPCS` with the same config as V4.

---

### Finding 7 — LOW: Dead code in `rpc.previewYield` and `rpc.withdrawal`/`rpc.deposit` helpers

**Specialist**: Frontend

`rpc.previewYield`, `rpc.deposit`, and `rpc.withdrawal` in `client.ts` are never called anywhere in the codebase. The actual yield preview uses `preview_segmented_yield_distribution_v5` via `callRPC`. Deposits/withdrawals go through `transactionService.createInvestorTransaction`.

**Fix**: Either remove these dead helpers or update them to match current paths. Keeping them is a maintenance trap.

---

### Finding 8 — LOW: `WithdrawalStats` type doesn't include "voided" status count

**Specialist**: Frontend

`withdrawalService.getStats()` counts pending/approved/processing/completed/rejected but skips "voided" and "cancelled" statuses. Voided withdrawals (added in the recent migration) are silently uncounted.

**Fix**: Add `voided` and `cancelled` to the stats counter.

---

## Implementation Plan

### Change Set 1 — Critical frontend fixes (2 items)
1. Fix `adminPrefetch.ts`: remove or correct the `/admin/transactions` prefetch
2. Add `visibility_scope` filter to `fetchUserTransactions` in `transactionService.ts`

### Change Set 2 — Precision and safety fixes (2 items)
3. Fix `investorPortfolioService.ts`: `String(params.amount)` for numeric precision
4. Add `can_withdraw` validation to `useTransactionSubmit` withdrawal path (or route through RPC)

### Change Set 3 — Dead code and rate limiting (3 items)
5. Update `rpc.applyYield` to call V5, or remove the dead helper
6. Add V5 to `RATE_LIMITED_RPCS`
7. Add voided/cancelled to withdrawal stats counter

### Risk Assessment
- All changes are frontend-only, no database migrations
- No business logic changes in the DB layer
- Finding 2 (visibility_scope) is a data-visibility fix with zero position/ledger impact
- Finding 4 (direct insert bypass) is the highest-risk item but the fix is straightforward

