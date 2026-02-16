
# Steps 8 and 14: Remove Class Wrappers and Consolidate Numeric Utilities

## Overview

Two cleanup tasks:
1. **Step 8** -- Remove class-based service wrappers, replacing them with plain object singletons or direct functional exports
2. **Step 14** -- Eliminate the duplicate `toNum` in `assets.ts` and merge the `numeric.ts` re-export shim into `numericHelpers.ts`

---

## Step 8: Remove Class-Based Service Wrappers

Six class wrappers to convert. Each becomes either a plain object literal or direct functional exports.

### 8a. `InvestorDataService` (src/services/investor/investorDataService.ts)

**Current:** 65-line class that delegates every method to sub-service functions.
**Consumer:** `adminService.ts` uses `investorDataService.getTotalAUM()`, `.getActiveInvestorCount()`, `.getAllInvestorsWithSummary()`, `.getInvestorPositions()`.
**Action:** Remove the class and singleton. Replace with a plain object:
```ts
export const investorDataService = {
  getInvestorPositions: positionService.getInvestorPositions,
  getUserPositions: positionService.getUserPositions,
  getTotalAUM: positionService.getTotalAUM,
  getActiveInvestorCount: positionService.getActiveInvestorCount,
  getInvestorPortfolio: portfolioService.getInvestorPortfolio,
  getInvestorSummary: portfolioService.getInvestorSummary,
  getAllInvestorsWithSummary: portfolioService.getAllInvestorsWithSummary,
  // ...remaining methods
};
```
Remove `InvestorDataService` class export from barrel files.

### 8b. `FundServiceClass` (src/services/admin/fundService.ts)

**Current:** 15-line class mapping method names to standalone functions.
**Action:** Replace with a plain object literal. No consumer changes needed since `fundService.getAllFunds()` call syntax is identical.

### 8c. `DepositService` (src/services/investor/depositService.ts)

**Current:** ~330-line class with real logic.
**Risk:** Higher -- methods reference `this` internally.
**Action:** Convert each method to a standalone exported function. Create a plain object `depositService` mapping to those functions. Update barrel and 2 consumers.

### 8d. `TransactionsRecordService` (src/services/investor/transactionsV2Service.ts)

**Current:** ~185-line class.
**Action:** Same pattern -- extract to standalone functions, plain object singleton. 3 consumers use `transactionsV2Service.methodName()`.

### 8e. `AdminInvestorService` (src/services/admin/adminService.ts)

**Current:** ~300-line class with multiple methods.
**Action:** Extract to standalone functions, plain object singleton. 3 consumers use `adminInvestorService.methodName()`.

### 8f. `IBScheduleService` and `FeeScheduleService`

**Current:** Small classes (60 and 150 lines respectively).
**Action:** Convert to standalone functions + plain object singletons.

### 8g. `AdminInviteService` (src/services/admin/adminInviteService.ts)

**Current:** Small class.
**Action:** Same pattern.

---

## Step 14: Consolidate Numeric Utilities

### 14a. Remove duplicate `toNum` from `assets.ts`

`src/utils/assets.ts` defines its own private `toNum` (lines 30-35) that is identical to `toNumber` from `numericHelpers.ts`.
**Action:** Replace with `import { toNum } from "@/utils/numeric"` and delete the local definition.

### 14b. Merge `numeric.ts` into `numericHelpers.ts`

`src/utils/numeric.ts` is a pure re-export shim for `numericHelpers.ts`. Both files exist side by side.
**Action:** Rename `numericHelpers.ts` to `numeric.ts` (keeping all content), delete the shim. Update the 1 import that references `numericHelpers` directly (the shim itself -- which will be gone).

---

## Technical Summary

### Files Modified (~15)
- `src/services/investor/investorDataService.ts` -- class to plain object
- `src/services/investor/depositService.ts` -- class to functions + object
- `src/services/investor/transactionsV2Service.ts` -- class to functions + object
- `src/services/admin/adminService.ts` -- class to functions + object
- `src/services/admin/fundService.ts` -- class to plain object
- `src/services/admin/ibScheduleService.ts` -- class to functions + object
- `src/services/admin/feeScheduleService.ts` -- class to functions + object
- `src/services/admin/adminInviteService.ts` -- class to functions + object
- `src/services/investor/index.ts` -- remove `InvestorDataService` class export
- `src/services/admin/index.ts` -- remove class type exports if any
- `src/utils/assets.ts` -- replace local `toNum` with import
- `src/utils/numeric.ts` -- absorb content from `numericHelpers.ts`

### Files Deleted (1)
- `src/utils/numericHelpers.ts` -- merged into `numeric.ts`

### Risk Mitigation
- Plain object singletons preserve `service.method()` call syntax so no consumer changes are needed for 8b (FundServiceClass) and 8a (InvestorDataService)
- For classes with `this` usage (DepositService, TransactionsRecordService), each method is extracted as a standalone function first, then the object maps to them
- All changes are import-path-only for consumers -- no behavioral changes
