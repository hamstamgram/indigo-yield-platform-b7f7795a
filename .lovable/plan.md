

# Remaining Audit Steps: 9, 11, 12, and 13

## Status Check

Steps completed: 1-8, 10, 14, plus the export collision hotfix.
Steps remaining: 9, 11, 12, 13.

---

## Step 9: Create `src/features/investor/` Structure

Mirror the feature-first pattern already established for `src/features/admin/` (which has `components/`, `hooks/`, `pages/` per sub-domain).

### Current Investor Code Locations (scattered)
- `src/pages/investor/` -- 7 page files + 2 subdirectories
- `src/components/investor/` -- 4 subdirectories (overview, performance, portfolio, reports)
- `src/hooks/data/investor/` -- 23 hook files
- `src/services/investor/` -- 15 service files

### Target Structure
```text
src/features/investor/
  overview/
    pages/          -- InvestorOverviewPage.tsx
    components/     -- from src/components/investor/overview/
    hooks/          -- useInvestorOverview.ts, useInvestorOverviewQueries.ts
  portfolio/
    pages/          -- InvestorPortfolioPage.tsx, PortfolioAnalyticsPage.tsx
    components/     -- from src/components/investor/portfolio/
    hooks/          -- usePortfolio.ts, useInvestorPositions.ts, useInvestorBalance.ts
  performance/
    pages/          -- InvestorPerformancePage.tsx
    components/     -- from src/components/investor/performance/
    hooks/          -- useInvestorPerformance.ts, useInvestorYieldData.ts
  transactions/
    pages/          -- InvestorTransactionsPage.tsx
    hooks/          -- useInvestorPortal.ts (transaction parts)
  statements/
    pages/          -- StatementsPage.tsx (from src/pages/investor/statements/)
    hooks/          -- useInvestorPortal.ts (statement parts)
  documents/
    pages/          -- InvestorDocumentsPage.tsx
    hooks/          -- useInvestorPortfolioQueries.ts (document parts)
  settings/
    pages/          -- InvestorSettingsPage.tsx
    hooks/          -- useInvestorSettings.ts
  funds/
    pages/          -- FundDetailsPage.tsx
    hooks/          -- useFundDetailsPage.ts
  reports/
    components/     -- from src/components/investor/reports/
  shared/
    hooks/          -- useInvestorSearch.ts, useInvestorRealtimeInvalidation.ts, useInvestorNotifications.ts
```

### Migration Approach
- Move files incrementally, one sub-domain at a time
- Update import paths in route files (`src/routing/routes/investor/core.tsx`, `portfolio.tsx`, `reports.tsx`)
- Keep `src/services/investor/` in place (services stay in the service layer per architecture standards)
- Update barrel exports in `src/hooks/data/investor/index.ts` to re-export from new locations
- Old `src/components/investor/` and `src/pages/investor/` directories become empty and are deleted

### Files Moved (~30)
- 7 page files from `src/pages/investor/`
- ~10 component files from `src/components/investor/`
- 23 hook files from `src/hooks/data/investor/`

### Risk
Low -- purely structural. All imports update to `@/features/investor/...`. Barrel re-exports from `src/hooks/data/investor/index.ts` maintain backward compatibility during transition.

---

## Step 11: Consolidate Performance Services

### Current State
Two performance-related service files exist:
1. `src/services/shared/performanceService.ts` (584 lines) -- read-only operations: `getInvestorPerformance`, `getPerAssetStats`, `getFinalizedInvestorData`, `getPerformanceHistoryGrouped`, `getAvailableStatementPeriods`
2. `src/services/admin/investorPerformanceService.ts` (36 lines) -- single write operation: `updateFundPerformance`

### Assessment
These are **not overlapping** -- they serve distinct purposes (reads vs. admin writes). Consolidation is not needed. The only action is to verify no consumers import from the wrong file.

### Action
- Confirm 3 consumer hooks (`useInvestorPerformance.ts`, `useInvestorPortfolioQueries.ts`, `useFinalizedPortfolio.ts`) all import from `@/services/shared` (verified -- they do).
- Confirm `updateFundPerformance` is only imported via `@/services/admin` barrel (verified -- it is).
- **No file changes needed.** Mark Step 11 as complete.

---

## Step 12: Remove Remaining Class Wrappers in Shared/IB Services

Step 8 converted investor and admin service classes. Several class wrappers remain in shared and IB services:

### Classes to Convert
| File | Class | Lines | Complexity |
|------|-------|-------|------------|
| `src/services/shared/profileService.ts` | `ProfileService` | ~80 | Low |
| `src/services/shared/auditLogService.ts` | `AuditLogService` | ~90 | Low |
| `src/services/shared/notificationService.ts` | `NotificationService` | ~60 | Low |
| `src/services/shared/systemConfigService.ts` | `SystemConfigService` | ~50 | Low |
| `src/services/shared/inviteService.ts` | `InviteService` | ~40 | Low |
| `src/services/shared/investorDataExportService.ts` | `InvestorDataExportService` | ~50 | Low |
| `src/services/shared/statementsService.ts` | `StatementsService` | ~100 | Medium |
| `src/services/shared/fundDailyAumService.ts` | `FundDailyAumService` | ~60 | Low |
| `src/services/shared/assetService.ts` | `AssetService` | ~80 | Low |
| `src/services/ib/management.ts` | `IBManagementService` | ~80 | Low |

### Pattern
Same as Step 8: extract methods to standalone functions, export a plain object singleton with the same name (e.g., `profileService`). Since all consumers already use `profileService.getProfile()` syntax, no consumer changes are needed.

### Files Modified (~10)
Each of the 10 files listed above.

---

## Step 13: Final Barrel and Import Cleanup

After Steps 9 and 12, perform a final sweep:

### Actions
1. Remove any empty directories left after Step 9 migration
2. Remove deprecated shim files in `src/hooks/data/` (identified in earlier steps)
3. Verify all barrel files (`src/hooks/data/index.ts`, `src/services/shared/index.ts`) export from correct locations
4. Remove any `type` keyword from re-exports that should be value exports (or vice versa)
5. Run a full build to confirm zero errors

### Files Modified (~5)
- `src/hooks/data/investor/index.ts` -- update to re-export from `@/features/investor/`
- `src/components/investor/index.ts` -- delete (moved to features)
- `src/pages/investor/` -- delete directory (moved to features)
- Any remaining deprecated shims

---

## Execution Order

1. **Step 11** -- No changes needed, just verification (mark complete)
2. **Step 12** -- Convert shared/IB class wrappers (low risk, isolated)
3. **Step 9** -- Migrate investor domain to features (larger, structural)
4. **Step 13** -- Final cleanup after migration

### Total Scope
- ~30 files moved (Step 9)
- ~10 files refactored (Step 12)
- ~5 files cleaned up (Step 13)
- 0 behavioral changes

