
# Architecture Cleanup — Full Implementation Plan

## Phase 1: Eliminate Shim Layers (Highest Impact)

### Step 1A: Delete `src/services/admin/` shim layer
- Update all 44 consumer files in `src/features/` to import directly from `@/features/admin/*/services/` instead of `@/services/admin` or `@/services/admin/*`
- Delete all 20 shim files in `src/services/admin/` (215 LOC of pure re-exports)
- Delete `src/services/admin/index.ts` barrel (173 lines)
- **Files affected:** ~65 files across `src/features/admin/`

### Step 1B: Delete `src/hooks/data/admin/` and `src/hooks/data/investor/` shim barrels
- Update 54+ consumer files to import from `@/features/admin/*/hooks/` and `@/features/investor/*/hooks/` directly
- Delete `src/hooks/data/admin/` and `src/hooks/data/investor/` directories (pure re-exports)
- **Files affected:** ~60 files

### Step 1C: Relocate 21 real shared hooks from `src/hooks/data/shared/`
- Move hooks like `useActiveFunds`, `useFunds`, `useNotifications`, `useRealtimeSubscription`, etc. into `src/features/shared/hooks/`
- Update all consumer imports
- Delete the now-empty `src/hooks/data/` tree
- Keep `src/hooks/ui/` in place (genuinely cross-cutting UI utilities like `useDebounce`, `useMobile`)

---

## Phase 2: Resolve Cross-Boundary Coupling

### Step 2A: Create `src/features/shared/services/`
Extract these services that are imported by both admin and investor features:
- `withdrawalService.ts` (currently in `src/features/investor/withdrawals/`)
- `transactionsV2Service.ts` (currently in `src/features/investor/transactions/`)
- Move to `src/features/shared/services/`
- Update 7 admin files + investor consumers

### Step 2B: Create `src/features/shared/hooks/` for cross-domain hooks
Extract hooks imported across the admin↔investor boundary:
- `useFeeSchedule` / `useIBSchedule` (currently in `src/features/investor/shared/hooks/`)
- `useInvestorSettings` dependencies from admin services
- Update 6 admin files + investor consumers

### Step 2C: Rationalize `src/services/shared/` → `src/features/shared/services/`
- Move the 13 real service files to `src/features/shared/services/`
- Domain-specific ones like `statementsService.ts` and `performanceService.ts` (721 LOC) stay shared since both portals use them
- Delete `src/services/shared/` after migration
- **Files affected:** ~30 files

### Step 2D: Move `src/services/core/` contents to feature directories
- `integrityService` → `src/features/admin/system/services/`
- `reportUpsertService` → `src/features/admin/reports/services/`
- `supportService` → `src/features/shared/services/`
- `systemHealthService` → `src/features/admin/system/services/`
- Delete `src/services/core/`

### Step 2E: Move `src/services/ib/` → `src/features/admin/ib/services/`
- 4 files, only used by admin IB management
- Delete `src/services/ib/`

**After Phase 2, `src/services/` contains only `src/services/auth/` (3 files) and `src/services/notifications/` — both are cross-cutting infrastructure.**

---

## Phase 3: Extract Data Logic from Components

### Step 3: Extract `useQuery`/`useMutation` from 15 component files
Create co-located hooks for each:
| Component | New Hook |
|-----------|----------|
| `InvestorPositionsTab.tsx` | `useInvestorPositionsTab.ts` |
| `InvestorYieldManager.tsx` | `useInvestorYieldManager.ts` |
| `StatementManager.tsx` | `useStatementManager.ts` |
| `ApproveWithdrawalDialog.tsx` | `useApproveWithdrawal.ts` |
| `CreateWithdrawalDialog.tsx` | `useCreateWithdrawal.ts` |
| `OpenPeriodDialog.tsx` | `useOpenPeriod.ts` |
| `InvestorSettingsTab.tsx` | `useInvestorSettingsTab.ts` |
| `SystemIntegrityStatus.tsx` | `useSystemIntegrity.ts` |
| `AssetPriceDialog.tsx` | `useAssetPrice.ts` |
| `CreateAssetDialog.tsx` | `useCreateAsset.ts` |
| `EditAssetDialog.tsx` | `useEditAsset.ts` |
| `InternalRouteDialog.tsx` | `useInternalRoute.ts` (may already exist) |
| `AddFeeScheduleDialog.tsx` | (already uses shared hook — just remove inline mutation) |
| `AddIBScheduleDialog.tsx` | (already uses shared hook — just remove inline mutation) |
| `InvestorTabs.tsx` | `useInvestorTabs.ts` |

---

## Phase 4: Decompose Oversized Components

### Step 4A: `YieldDistributionsPage.tsx` (1,296 LOC)
Split into:
- `YieldDistributionFilters.tsx` — fund picker, date range, status filter
- `YieldDistributionTable.tsx` — the data table with sorting/pagination
- `YieldDistributionDetail.tsx` — expanded row detail with allocations
- `YieldDistributionActions.tsx` — void/reissue action buttons
- Keep `YieldDistributionsPage.tsx` as a thin orchestrator (~100 LOC)

### Step 4B: `AdminTransactionsPage.tsx` (847 LOC)
Split into:
- `TransactionFilters.tsx`
- `TransactionTable.tsx`
- `TransactionActions.tsx`
- Thin page orchestrator

### Step 4C: `InvestorReports.tsx` (808 LOC)
Split into:
- `ReportFilters.tsx`
- `ReportTable.tsx`
- `BulkReportActions.tsx`
- `ReportPreviewDialog.tsx`
- Thin page orchestrator

### Step 4D: `VoidAndReissueDialog.tsx` (706 LOC)
Split into:
- `VoidAndReissueForm.tsx` — the form step
- `VoidAndReissuePreview.tsx` — the confirmation step
- `VoidAndReissueContext.tsx` — shared state via context
- Keep dialog shell thin

### Step 4E: `OperationsPage.tsx` (686 LOC)
Split into one component per tab section.

---

## Phase 5: Consolidate Utility Layers

### Step 5A: Co-locate query keys per feature
- Create `queryKeys.ts` files in each feature directory (yields, investors, transactions, etc.)
- Move relevant keys from the 604-line `src/constants/queryKeys.ts`
- Keep only truly cross-feature keys (auth, profile) in the central file
- Update all consumer imports

### Step 5B: Consolidate `src/lib/` vs `src/utils/`
- `src/lib/` = infrastructure: DB clients (`db/`, `rpc/`, `supabase/`), error handling (`errors/`), logging (`logger.ts`), PDF generation (`pdf/`)
- `src/utils/` = pure functions: formatters, math, sanitization
- Move `utils/yieldMath.ts` → `src/features/admin/yields/utils/`
- Move `utils/statementCalculations.ts` → `src/features/admin/reports/utils/`
- Move `utils/kpiCalculations.ts` → `src/features/admin/dashboard/utils/`
- Delete redundant `lib/performance.ts` (overlaps with `utils/performance/`)

### Step 5C: Merge `src/config/` and `src/constants/`
- Consolidate into `src/config/` (or `src/constants/`, pick one)
- Single source for app-wide configuration values

### Step 5D: Flatten single-file component directories in `src/components/`
- Audit `account/`, `privacy/`, `security/`, `accessibility/` — if 1-2 files, flatten or move to relevant feature
- Keep `ui/`, `common/`, `layout/`, `sidebar/` as genuine shared component libraries

---

## Phase 6: Optional Enhancements

### Step 6A: Move `src/templates/` to `src/features/admin/reports/templates/`
### Step 6B: Add CI lint rule preventing `@/services/admin` imports (enforce direct feature imports)
### Step 6C: Evaluate converting `performanceService.ts` (721 LOC) heavy client-side aggregation to a database view/RPC

---

## Execution Order & Dependencies

```
Phase 1A → 1B → 1C  (shim elimination, each builds on prior)
Phase 2A → 2B → 2C → 2D → 2E  (cross-boundary, independent of Phase 1)
Phase 3  (can run after Phase 1+2, needs stable import paths)
Phase 4  (independent, can run in parallel with Phase 3)
Phase 5  (run last, after all moves are done)
Phase 6  (optional, post-launch)
```

**Estimated total:** ~250 files touched, ~500 LOC of shims deleted, 5 monolith files decomposed into ~25 focused components. No business logic changes — purely structural moves and import rewiring.

**Risk:** Zero financial logic changes. All moves are import-path refactors and file relocations. TypeScript compiler will catch any broken imports immediately.
