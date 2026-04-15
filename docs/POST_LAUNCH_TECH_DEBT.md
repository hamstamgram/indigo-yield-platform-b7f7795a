# Post-Launch Tech Debt

> **Updated:** 2026-06-17
> **Priority:** P0 (blocking) + P1 (next sprint) + P2 (backlog)

---

## P0 — BLOCKING (Fix before next manual operation)

### P0-1: `void_and_reissue_transaction` CANONICAL_MUTATION_REQUIRED

**Status:** Migration written, NEEDS APPLY to remote DB

**Problem:** Void & Reissue button in the admin UI fails with:
```
CANONICAL_MUTATION_REQUIRED: Direct INSERT on transactions_v2 is blocked.
Use canonical RPC functions: apply_deposit_with_crystallization...
```

**Root Cause:** The DB function `void_and_reissue_transaction` calls `set_config('indigo.canonical_rpc', 'true', true)` at the top, but after internally calling `void_transaction()`, the `is_local=true` (3rd param) may cause the setting to be scoped to a sub-transaction boundary. The INSERT that follows is then blocked by the `enforce_canonical_transaction_mutation` trigger.

**Fix:** Migration `20260617000000_fix_void_and_reissue_canonical_rpc.sql` — re-creates both `void_and_reissue_transaction` and `void_and_reissue_full_exit` with defense-in-depth re-set of `set_config` before every INSERT.

**Action Required:** Apply this migration to the remote Supabase DB via Dashboard SQL Editor or MCP tool.

**Files Changed:**
- `supabase/migrations/20260617000000_fix_void_and_reissue_canonical_rpc.sql` (NEW)

---

### P0-2: `v_liquidity_risk` 404 errors (console spam)

**Status:** Frontend fix applied; DB view still missing

**Problem:** `useLiquidityRisk()` and `useConcentrationRisk()` hooks query `v_liquidity_risk` and `v_concentration_risk` views that don't exist on the remote DB. This causes ~10 failed 404 requests per poll cycle, clogging the browser console.

**Frontend Fix Applied:** `useRiskAlerts.ts` now gracefully returns `[]` on 404 with no retry. Removed `refetchInterval` polling and set `staleTime: 5 min`.

**Remaining:** Create the `v_liquidity_risk` and `v_concentration_risk` views on the remote DB, OR implement risk monitoring through a different path.

**Files Changed:**
- `src/features/admin/system/hooks/useRiskAlerts.ts` (MODIFIED)

---

## P1 — Next Sprint

### P1-1: Error Propagation — Generic Fallback Masking Real Errors

**Status:** Fixed

**Problem:** When RPC calls fail, service layers were throwing `new Error(error.userMessage || error.message)`. The `userMessage` field comes from `getUserFriendlyError()` which returns the generic "An unexpected error occurred. Please try again or contact support." for any error that doesn't match its known patterns. This means the actual DB error (e.g., "Transaction already voided", "function not found") was being hidden from the user AND from `parsePlatformError()` which could have shown a meaningful message.

**Fix:** Flipped priority to `error.message || error.userMessage` across all service files. This ensures the raw DB error message is available to the platform error parser, which can then pattern-match it against known errors and show specific UI actions.

**Files Changed (10):**
- `src/features/admin/transactions/services/adminTransactionHistoryService.ts`
- `src/features/admin/funds/services/fundService.ts`
- `src/features/shared/services/feeScheduleService.ts`
- `src/features/shared/services/ibScheduleService.ts`
- `src/features/admin/ib/services/ibManagementService.ts`
- `src/services/shared/systemConfigService.ts`
- `src/services/shared/statementsService.ts`
- `src/services/shared/transactionService.ts`
- `src/features/admin/investors/services/adminService.ts`
- `src/features/admin/yields/services/yields/yieldReportsService.ts`

**Also added 6 new error patterns** to `src/lib/errors/rpcErrors.ts`:
- `not found in the schema cache` → "Operation not available, refresh and retry"
- `could not find the function.*with the specified parameters` → "Parameter mismatch"
- `already voided` → "Already voided"
- `cannot void.*locked` → "Locked, contact admin"
- `first principles violation` → "Void yield distribution first"
- `transaction not found` → "Not found, refresh and retry"

---

### P1-2: `void_yield_distribution` — noCascade Warning

**Status:** Investigated, requires DB function fix

**Problem:** When voiding a yield distribution, the frontend logs:
```
[voidYieldDistribution.noCascade] {message: 'Yield voided but no allocations were cascaded — verify fee/ib allocations manually'}
```

**Root Cause:** The deployed `void_yield_distribution` function (migration `20260414000000`) returns `voided_count` which counts **transactions** voided, not fee/IB allocations. It uses pattern-matching on `reference_id` (e.g., `yield_adb_`, `yield_v5_`, `fee_credit_`, `ib_credit_`) to find linked transactions. If the reference_id patterns from the apply function don't match, no transactions are found and `voided_count = 0`.

**Impact:** The yield_distributions row IS voided, but underlying yield/fee/IB transactions might NOT be voided if the reference_id patterns are mismatched. This creates orphaned transactions.

**Action Required:** 
1. Check if transactions linked to voided distributions are properly voided
2. Verify reference_id patterns between `apply_segmented_yield_distribution_v5` and `void_yield_distribution` match
3. Consider adding `distribution_id` column population on transactions during yield apply

---

### P1-3: `notify-yield-applied` Edge Function 500

**Status:** Non-blocking (fire-and-forget)

**Problem:** `POST /functions/v1/notify-yield-applied` returns 500 when called after yield distribution.

**Likely Cause:** Edge function requires `SUPABASE_SERVICE_ROLE_KEY` env var which may not be configured, OR the caller passes user auth instead of service role auth.

**Impact:** Push notifications for yieldApplied are not delivered. The yield distribution itself succeeds — the notification is fire-and-forget with `.catch()`.

**Action:** Configure `SUPABASE_SERVICE_ROLE_KEY` in the edge function's env vars via Supabase Dashboard.

---

## P2 — Backlog

### P2-1: Select Controlled/Uncontrolled Warning

**Status:** Not fixed

**Problem:** React warning "Select is changing from uncontrolled to controlled" appears when a `Select` component's `value` prop transitions from `undefined` to a string (or vice versa). This happens when `useUrlFilters()` returns `undefined` for a key before URL params are parsed.

**Fix:** Ensure all `Select` components use `value={someFilter || "all"}` pattern instead of `value={someFilter}` where `someFilter` can be `undefined`. Use empty string `""` or a default value as fallback.

---

### P2-2: InvestorReports Dialog Missing Description

**Status:** Fixed

**Problem:** `<DialogContent>` in `InvestorReports.tsx` was missing a `<DialogDescription>`, causing an accessibility warning.

**Fix:** Added `<DialogDescription>` with `className="sr-only"` to the preview dialog.

**Files Changed:**
- `src/features/admin/reports/pages/InvestorReports.tsx` (MODIFIED)