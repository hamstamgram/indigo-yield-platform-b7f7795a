
# Phase 4: Split Withdrawal Service Between Admin and Investor Domains

## What We're Doing

The file `src/services/investor/withdrawalService.ts` (591 lines) currently contains both admin operations (approve, reject, cancel, restore, bulk audit, stats, etc.) and investor-portal methods (view own withdrawals, submit requests). This violates the feature-first architecture -- admin logic should not live in the investor service folder.

We will split it into two focused services and update all consumers.

---

## The Split

### New file: `src/services/admin/withdrawalAdminService.ts`

Will contain all 14 admin-only methods extracted from the current file:

- `getWithdrawals` (paginated list with filters)
- `getWithdrawalById` (single withdrawal detail)
- `getWithdrawalAuditLogs` (stub -- returns empty)
- `getStats` (status counts and pending-by-asset)
- `approveAndComplete` (approve + complete via RPC)
- `rejectWithdrawal` (reject via RPC)
- `cancelWithdrawal` (cancel via RPC)
- `routeToFees` (route to INDIGO FEES via RPC)
- `restoreWithdrawal` (restore to pending via RPC)
- `createWithdrawal` (admin-initiated withdrawal)
- `updateWithdrawal` (edit withdrawal)
- `deleteWithdrawal` (delete/cancel withdrawal)
- `fetchPositionsForWithdrawal` (positions for admin withdrawal form)
- `logBulkAudit` (centralized audit logging)

### Slimmed file: `src/services/investor/withdrawalService.ts`

Will keep only the 3 investor-portal methods:

- `getInvestorWithdrawals` (investor's own withdrawal history)
- `getInvestorWithdrawalPositions` (investor's positions for withdrawal form)
- `submitInvestorWithdrawal` (investor submits withdrawal request)

---

## Consumer Updates (7 files)

Each file currently imports `withdrawalService` from `@/services/investor`. After the split, admin consumers will import `withdrawalAdminService` from `@/services/admin`.

1. **`src/features/admin/withdrawals/hooks/useAdminWithdrawals.ts`** -- Change import to `withdrawalAdminService` from `@/services/admin`
2. **`src/features/admin/withdrawals/components/ApproveWithdrawalDialog.tsx`** -- Change to `withdrawalAdminService`
3. **`src/features/admin/withdrawals/components/RejectWithdrawalDialog.tsx`** -- Change to `withdrawalAdminService`
4. **`src/features/admin/transactions/hooks/usePendingTransactionDetails.ts`** -- Change to `withdrawalAdminService`
5. **`src/features/admin/investors/hooks/useAdminInvestorWithdrawals.ts`** -- Change to `withdrawalAdminService`
6. **`src/hooks/data/shared/useWithdrawalMutations.ts`** -- Change to `withdrawalAdminService`
7. **`src/hooks/data/shared/useWithdrawalFormData.ts`** -- Change to `withdrawalAdminService`
8. **`src/utils/prefetch/adminPrefetch.ts`** -- Change to `withdrawalAdminService`

The investor-side consumer (`src/features/investor/shared/hooks/useInvestorWithdrawals.ts`) keeps its current import unchanged.

---

## Barrel Updates

- **`src/services/admin/index.ts`** -- Add `export { withdrawalAdminService } from "./withdrawalAdminService"`
- **`src/services/investor/index.ts`** -- Remove the line `export { withdrawalService } from "./withdrawalService"` (the old combined export). The slimmed `withdrawalService` stays exported for investor consumers.

---

## Technical Details

- All shared imports (`supabase`, `rpc`, types from `@/types/domains`, `generateCorrelationId`, `verifyResourceAccess`, `sanitizeSearchInput`) will be duplicated into both files as needed.
- The `buildAuditMeta` helper and `DEFAULT_PAGE_SIZE` constant move to the admin service (only used there).
- No behavioral changes -- purely a file reorganization. Every method body stays identical.
- The `investorDataService.ts` facade references to `withdrawalService` are for the old `investorWithdrawalService` (different file), not affected by this split.
