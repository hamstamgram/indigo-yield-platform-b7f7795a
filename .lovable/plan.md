

# Phase 4: Split Withdrawal Service Between Admin and Investor Domains

## Overview

Extract 14 admin-only methods from `src/services/investor/withdrawalService.ts` into a new `src/services/admin/withdrawalAdminService.ts`. The investor service keeps only 3 investor-portal methods. Then update 8 consumer files to import from the new admin service.

## Step 1: Create `src/services/admin/withdrawalAdminService.ts`

Extract these methods into a new `withdrawalAdminService` object:

- `getWithdrawals` (lines 39-122)
- `getWithdrawalById` (lines 127-169)
- `getWithdrawalAuditLogs` (lines 176-178)
- `getStats` (lines 184-233)
- `approveAndComplete` (lines 241-282)
- `rejectWithdrawal` (lines 287-316)
- `cancelWithdrawal` (lines 321-350)
- `fetchPositionsForWithdrawal` (lines 357-389)
- `createWithdrawal` (lines 395-409)
- `routeToFees` (lines 415-423)
- `updateWithdrawal` (lines 428-439)
- `deleteWithdrawal` (lines 445-453)
- `restoreWithdrawal` (lines 458-489)
- `logBulkAudit` (lines 575-590)

Also moves `DEFAULT_PAGE_SIZE` and `buildAuditMeta` helper. Copies all needed imports (`supabase`, `rpc`, domain types, `generateCorrelationId`, `verifyResourceAccess`, `sanitizeSearchInput`).

## Step 2: Slim down `src/services/investor/withdrawalService.ts`

Keep only:
- `getInvestorWithdrawals` (lines 499-521)
- `getInvestorWithdrawalPositions` (lines 526-539)
- `submitInvestorWithdrawal` (lines 545-569)

Remove all admin methods, `buildAuditMeta`, `DEFAULT_PAGE_SIZE`, and unused imports.

## Step 3: Update 8 admin consumer files

| File | Current Import | New Import |
|------|---------------|------------|
| `src/features/admin/withdrawals/hooks/useAdminWithdrawals.ts` | `withdrawalService` from `@/services/investor/withdrawalService` | `withdrawalAdminService` from `@/services/admin/withdrawalAdminService` |
| `src/features/admin/withdrawals/components/ApproveWithdrawalDialog.tsx` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/features/admin/withdrawals/components/RejectWithdrawalDialog.tsx` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/features/admin/transactions/hooks/usePendingTransactionDetails.ts` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/features/admin/investors/hooks/useAdminInvestorWithdrawals.ts` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/hooks/data/shared/useWithdrawalMutations.ts` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/hooks/data/shared/useWithdrawalFormData.ts` | `withdrawalService` from `@/services/investor` | `withdrawalAdminService` from `@/services/admin` |
| `src/utils/prefetch/adminPrefetch.ts` | `withdrawalService` from `@/services/investor/withdrawalService` | `withdrawalAdminService` from `@/services/admin/withdrawalAdminService` |

## Step 4: Update barrel exports

- **`src/services/admin/index.ts`**: Add `export { withdrawalAdminService } from "./withdrawalAdminService"`
- **`src/services/investor/index.ts`**: Update comment from "admin operations" to "investor portal operations". The `withdrawalService` export stays for the investor consumer (`useInvestorWithdrawals.ts`).

## Unchanged file

- `src/features/investor/shared/hooks/useInvestorWithdrawals.ts` -- keeps importing `withdrawalService` from `@/services/investor` (only uses `getInvestorWithdrawals`, `getInvestorWithdrawalPositions`, `submitInvestorWithdrawal`)

## Technical Notes

- Zero behavioral changes -- every method body is copied verbatim
- All method names stay the same on the new `withdrawalAdminService` object
- Each consumer file only needs an import path change and a variable rename (`withdrawalService` to `withdrawalAdminService`)
- The `useCorrelatedMutation.ts` reference is a code comment (not a real import), no change needed

