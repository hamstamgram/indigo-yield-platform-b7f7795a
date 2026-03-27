

# Full Stack Audit -- Functions, Cascades, Relations & Flows

## Current State Summary

Previous audit rounds fixed ~35 issues. This audit verified all prior fixes are correctly applied and found **5 remaining issues** (1 P0, 2 P1, 2 P2).

---

## Verified CLEAN (All Prior Fixes Confirmed)

- `Decimal.set({ precision: 40 })` -- correct
- `toFinancialString()` uses `.toFixed(18)` -- correct
- `parseFinancial()` used consistently in `adminService.ts`, `yieldAumService.ts`, `feeScheduleService.ts`, `depositService.ts` -- all fixed
- `YieldDistributionsPage` void/bulk-void handlers call `invalidateAfterYieldOp` -- correct
- `void_yield_distribution` has `is_admin()` check -- correct (migration `20260327172230`)
- `anon` role revoked from 19 admin RPCs -- correct (migration `20260327172230`)
- `process-report-delivery-queue` no longer uses `profiles.is_admin` fallback -- correct
- `ExpertPositionsTable` uses `toNum()` -- correct
- No `parseFloat()` in services layer -- clean
- No direct writes to `transactions_v2` or `investor_positions` from frontend services -- clean
- Advisory locks scoped correctly in `void_yield_distribution`, `approve_and_complete_withdrawal`, `recalculate_fund_aum_for_date` -- correct

---

## BUG 1 (P0): `void_yield_distribution` Does NOT Void `yield_allocations` or `fee_allocations`

**Issue:** The `void_yield_distribution` function (both the baseline version at line 17170 and the latest at migration `20260327172230`) voids `platform_fee_ledger`, `ib_commission_ledger`, and `ib_allocations`, but **never touches `yield_allocations` or `fee_allocations`**. These tables have `is_voided` columns and are used by the `yield_distribution_conservation_check` view to verify `gross = net + fees + ib`.

**Execution Path:** Admin voids a yield distribution -> YIELD/FEE_CREDIT/IB_CREDIT transactions voided -> `ib_allocations` voided -> BUT `yield_allocations` and `fee_allocations` remain `is_voided = false` -> Conservation check view filters by `is_voided = false` and computes sums from orphaned allocations that reference a voided distribution -> Integrity monitor may report false conservation violations.

**Current Data:** No orphaned records exist today (0 cases where `distribution.is_voided = true AND allocation.is_voided = false`), but any future void will create them.

**Fix:** Add two lines to `void_yield_distribution` after the `ib_allocations` void (line 94):
```sql
UPDATE yield_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;
UPDATE fee_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE distribution_id = p_distribution_id AND NOT is_voided;
```

---

## BUG 2 (P1): `requestsQueueService.approveWithdrawal` Bypasses the Canonical RPC

**Issue:** `src/services/admin/requestsQueueService.ts` line 38 performs a direct `supabase.from("withdrawal_requests").update()` to set status to "completed", bypassing the `approve_and_complete_withdrawal` RPC entirely. This means: no ledger transaction created, no crystallization, no dust sweep, no advisory lock, no audit trail.

**Current Risk:** The `ApproveWithdrawalDialog` correctly uses `withdrawalService.approveAndComplete` (the RPC path). The dangerous `requestsQueueService.approveWithdrawal` is consumed only by `useRequestsQueueMutations.approveMutation`, which is exported but **never called from any UI component**. This is dead code but a latent risk.

**Fix:** Delete `approveWithdrawal` from `requestsQueueService.ts` (or replace with a call to the canonical RPC). Also delete the `approveMutation` from `useRequestsQueueMutations.ts`, keeping only `rejectMutation`.

---

## BUG 3 (P1): `approve_and_complete_withdrawal` Skips Position Deactivation When `v_dust = 0`

**Issue:** In the full-exit path (line 281): `IF p_is_full_exit AND v_dust > 0 THEN ... SET is_active = false`. If the balance divides exactly into the send precision (e.g., balance = 1.000, truncated to 3dp = 1.000, dust = 0), the position is **never deactivated**. The investor remains `is_active = true` with `current_value = 0`.

**Execution Path:** Admin processes full exit for investor with balance 1.000000000000000000 -> `v_final_amount = 1.000` -> `v_dust = 0` -> Dust block skipped -> Position stays `is_active = true` -> Zero-balance position pollutes fund composition and investor counts.

**Fix:** Add unconditional deactivation for full exits after the dust block:
```sql
-- After line 317 (END IF of dust block):
IF p_is_full_exit THEN
  UPDATE public.investor_positions
  SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND current_value <= 0;
END IF;
```

---

## BUG 4 (P2): `console.error` in Production Code

**File:** `src/features/admin/yields/pages/YieldDistributionsPage.tsx`, line 406
**Issue:** `console.error()` in the bulk void loop. Per project rules, no `console.log`/`console.error` in production.
**Fix:** Replace with `logError("YieldDistributionsPage.bulkVoid", err, { distributionId: id })`.

---

## BUG 5 (P2): Dead `useRequestsQueueMutations` Hook Exports Dangerous Bypass

**File:** `src/features/admin/operations/hooks/useRequestsQueueMutations.ts`
**Issue:** The `approveMutation` is exported but never consumed. It calls the non-canonical `requestsQueueService.approveWithdrawal` which does a direct table update. A future developer might use this hook thinking it's the correct path.
**Fix:** Remove `approveMutation` from the hook or delete the hook entirely if `rejectMutation` can be moved to the `ApproveWithdrawalDialog`'s local scope.

---

## Implementation Plan

### Phase 1: SQL Migration (P0 + P1)
Create one migration that:
1. Recreates `void_yield_distribution` adding `yield_allocations` and `fee_allocations` to the void cascade
2. Adds unconditional full-exit deactivation to `approve_and_complete_withdrawal`

### Phase 2: TypeScript Cleanup (P1 + P2)
1. Delete `approveWithdrawal` from `requestsQueueService.ts`
2. Remove `approveMutation` from `useRequestsQueueMutations.ts`
3. Replace `console.error` with `logError` in `YieldDistributionsPage.tsx`

**Total: 1 SQL migration + 3 TypeScript files**

