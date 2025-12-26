# V2 Migration: The Final Cleanup Plan

## 🎯 Objective
Eliminate all remaining technical debt from the "One ID" migration. Ensure every service speaks to `profiles`, not the deleted `investors` table, and ACTIVATE the real Yield Engine.

---

## 📅 Phase 1: Activate the Yield Engine (Priority: Critical)
**Goal:** Ensure `feeService.ts` actually distributes money instead of pretending.

### 1.1 Update `feeService.ts`
*   **Remove:** Mock implementation of `applyDailyYieldWithFees`.
*   **Implement:** Call `supabase.rpc("distribute_yield_v2")`.
    *   *Note:* The audit mentioned `apply_daily_yield_with_fees`, but my previous migration created `distribute_yield_v2` specifically for the new `investor_fund_performance` table structure. I will use the V2 function.
*   **Fix:** `getPlatformFees` and other getters to query the actual `fees` table.

---

## 📅 Phase 2: Transaction & Operations Services (Priority: High)
**Goal:** Fix Deposit/Withdrawal flows that break because they look for `investors.profile_id`.

### 2.1 `depositService.ts`
*   **Current:** Looks up investor ID via `profiles`.
*   **Fix:** `investor_id` IS `auth.uid()`. Remove lookup.

### 2.2 `withdrawalService.ts`
*   **Current:** JOINs `investors` table.
*   **Fix:** Remove JOIN. User data is already in `profiles`.

### 2.3 `transactionService.ts` & `transactionApi.ts`
*   **Current:** Queries `investors`.
*   **Fix:** Direct query to `transactions` table using `investor_id = auth.uid()`.

---

## 📅 Phase 3: Deprecate Legacy Services (Priority: Medium)
**Goal:** Remove code paths that confuse the architecture.

### 3.1 `expertInvestorService.ts`
*   **Action:** Refactor to use `investorDataService` (which is already V2 compliant) or mirror its logic.
*   **Fix:** Ensure `profileId` mapping is removed (it's just `id` now).

### 3.2 `investorServiceV2.ts`
*   **Action:** This seems redundant if we have `investorDataService`. Consolidate or update logic to hit `profiles`.

### 3.3 `portfolioApi.ts` & `reportGenerationService.ts`
*   **Action:** Update queries to join `profiles` instead of `investors`.

---

## 📅 Phase 4: Final Verification
*   **Test:** Create a deposit. Verify it appears in `v_live_investor_balances`.
*   **Test:** Distribute Yield. Verify it updates `investor_fund_performance`.

---

## 🚀 Execution Strategy
I will proceed file-by-file, starting with **Phase 1 (Fee Service)** as it's the most critical logic gap. Then I will sweep through the "Old Pattern" list.
