

# Steps 9 + 13: Investor Feature Migration and Final Cleanup

## Overview

Migrate all investor-domain code into `src/features/investor/` (mirroring the admin pattern), then clean up empty directories and barrel files. Steps 11 and 12 are already complete.

---

## Step 9: Create `src/features/investor/` Structure

### Files to Move

**Pages (8 files):**

| From | To |
|------|----|
| `src/pages/investor/InvestorOverviewPage.tsx` | `src/features/investor/overview/pages/InvestorOverviewPage.tsx` |
| `src/pages/investor/InvestorPortfolioPage.tsx` | `src/features/investor/portfolio/pages/InvestorPortfolioPage.tsx` |
| `src/pages/investor/portfolio/PortfolioAnalyticsPage.tsx` | `src/features/investor/portfolio/pages/PortfolioAnalyticsPage.tsx` |
| `src/pages/investor/InvestorPerformancePage.tsx` | `src/features/investor/performance/pages/InvestorPerformancePage.tsx` |
| `src/pages/investor/InvestorTransactionsPage.tsx` | `src/features/investor/transactions/pages/InvestorTransactionsPage.tsx` |
| `src/pages/investor/statements/StatementsPage.tsx` | `src/features/investor/statements/pages/StatementsPage.tsx` |
| `src/pages/investor/InvestorDocumentsPage.tsx` | `src/features/investor/documents/pages/InvestorDocumentsPage.tsx` |
| `src/pages/investor/InvestorSettingsPage.tsx` | `src/features/investor/settings/pages/InvestorSettingsPage.tsx` |
| `src/pages/investor/YieldHistoryPage.tsx` | `src/features/investor/performance/pages/YieldHistoryPage.tsx` |
| `src/pages/investor/funds/FundDetailsPage.tsx` | `src/features/investor/funds/pages/FundDetailsPage.tsx` |

**Components (5 files):**

| From | To |
|------|----|
| `src/components/investor/overview/HoldingsByToken.tsx` | `src/features/investor/overview/components/HoldingsByToken.tsx` |
| `src/components/investor/performance/PerformanceCard.tsx` | `src/features/investor/performance/components/PerformanceCard.tsx` |
| `src/components/investor/performance/PeriodSelector.tsx` | `src/features/investor/performance/components/PeriodSelector.tsx` |
| `src/components/investor/portfolio/MyPerformanceHistory.tsx` | `src/features/investor/portfolio/components/MyPerformanceHistory.tsx` |
| `src/components/investor/reports/PerformanceReportTable.tsx` | `src/features/investor/reports/components/PerformanceReportTable.tsx` |

**Hooks (22 files) -- all from `src/hooks/data/investor/`:**

| Hook File | Target Subdomain |
|-----------|-----------------|
| `useInvestorOverview.ts` | `overview/hooks/` |
| `useInvestorOverviewQueries.ts` | `overview/hooks/` |
| `usePortfolio.ts` | `portfolio/hooks/` |
| `useInvestorPositions.ts` | `portfolio/hooks/` |
| `useInvestorBalance.ts` | `portfolio/hooks/` |
| `useInvestorPerformance.ts` | `performance/hooks/` |
| `useInvestorYieldData.ts` | `performance/hooks/` |
| `useInvestorYield.ts` | `performance/hooks/` |
| `useInvestorYieldEvents.ts` | `performance/hooks/` |
| `useInvestorPortal.ts` | `transactions/hooks/` |
| `useInvestorPortfolioQueries.ts` | `documents/hooks/` |
| `useInvestorSettings.ts` | `settings/hooks/` |
| `useFundDetailsPage.ts` | `funds/hooks/` |
| `useInvestorSearch.ts` | `shared/hooks/` |
| `useInvestorRealtimeInvalidation.ts` | `shared/hooks/` |
| `useInvestorNotifications.ts` | `shared/hooks/` |
| `useInvestorData.ts` | `shared/hooks/` |
| `useInvestorInvite.ts` | `shared/hooks/` |
| `useInvestorLedger.ts` | `shared/hooks/` |
| `useInvestorWithdrawals.ts` | `shared/hooks/` |
| `useFeeSchedule.ts` | `shared/hooks/` |
| `useIBSchedule.ts` | `shared/hooks/` |

### Import Updates Required

**Route files (2 files):**
- `src/routing/routes/investor/core.tsx` -- update all 10 lazy imports from `@/pages/investor/...` to `@/features/investor/.../pages/...`
- `src/routing/routes/investor/portfolio.tsx` -- update `PortfolioAnalyticsPage` import

**Cross-domain consumers (5 files importing from `@/hooks/data/investor/` or `@/components/investor/`):**
- `src/routing/InvestorRoute.tsx` -- update `useInvestorRealtimeInvalidation` import
- `src/features/admin/investors/components/shared/IBScheduleSection.tsx` -- update `useIBSchedule` import
- `src/features/admin/investors/components/shared/FeeScheduleSection.tsx` -- update `useFeeSchedule` and `useInvestorSettings` imports
- `src/features/admin/investors/components/shared/AddIBScheduleDialog.tsx` -- update `useAddIBScheduleEntry` import
- `src/features/admin/investors/components/shared/AddFeeScheduleDialog.tsx` -- update `useAddFeeScheduleEntry` import

**Internal page-to-component imports (3 pages):**
- `FundDetailsPage.tsx` -- update `PerformanceReportTable` import
- `PortfolioAnalyticsPage.tsx` -- update `MyPerformanceHistory` import
- `InvestorPerformancePage.tsx` -- update `PerformanceCard`/`PeriodSelector` imports

### Barrel Files

Create a new `src/features/investor/index.ts` barrel that re-exports all public hooks, components, and types. Update `src/hooks/data/investor/index.ts` to re-export from `@/features/investor/` for backward compatibility (consumers importing from `@/hooks/data` or `@/hooks` continue working).

---

## Step 13: Final Cleanup

### Directories to Delete (emptied by Step 9)
- `src/pages/investor/` (all files moved)
- `src/pages/investor/portfolio/` (including `index.tsx`)
- `src/pages/investor/funds/`
- `src/pages/investor/statements/`
- `src/components/investor/` (all files moved)

### Barrel Updates
- `src/hooks/data/investor/index.ts` -- rewrite to re-export from `@/features/investor/`
- `src/components/investor/index.ts` -- delete (replaced by feature barrel)

### Build Verification
- Confirm zero TypeScript errors after migration

---

## Technical Details

### Execution Sequence
1. Create all new directories and files under `src/features/investor/`
2. Update internal imports within moved files (component/hook references)
3. Update route files to point to new page locations
4. Update cross-domain consumer imports (admin components, InvestorRoute)
5. Rewrite `src/hooks/data/investor/index.ts` as re-export shim
6. Delete old files and directories

### Risk
Low -- purely structural. No behavioral changes. The `src/hooks/data/investor/index.ts` re-export shim ensures any imports via `@/hooks/data` or `@/hooks` continue working without changes.

### Total File Count
- ~37 new files created (moved content + barrel indexes)
- ~37 old files deleted
- ~10 existing files updated (route files, cross-domain consumers, barrel)
