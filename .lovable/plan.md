

# Steps 4 and 5: Move Admin Hooks and Consolidate services/api/

## Overview

Two focused changes to continue the audit cleanup:

1. **Move 6 admin-only hooks** out of `src/hooks/data/shared/` into the admin barrel
2. **Eliminate `src/services/api/`** -- delete dead code and migrate live report schedule CRUD into the admin domain

---

## Step 4: Move Admin-Specific Hooks from shared/ to admin/

Six hooks in `src/hooks/data/shared/` are admin-only and should be re-exported through the admin barrel instead.

### Files to move

| Current Location | New Location |
|---|---|
| `shared/useDashboardMetrics.ts` | `hooks/data/admin/exports/dashboard.ts` (re-export) |
| `shared/useDashboardQueries.ts` | Same barrel file |
| `shared/useInvestorDetailHooks.ts` | Already re-exported via `admin/exports/investors.ts` -- remove from shared barrel |
| `shared/useInvestorEnrichment.ts` | Already re-exported via `admin/exports/investors.ts` -- remove from shared barrel |
| `shared/useInvestorMutations.ts` | Already re-exported via `admin/exports/investors.ts` -- remove from shared barrel |
| `shared/useInvestorQueries.ts` | Already re-exported via `admin/exports/investors.ts` -- remove from shared barrel |

### Changes

1. **Create `src/hooks/data/admin/exports/dashboard.ts`** -- new barrel that re-exports all hooks from `shared/useDashboardMetrics.ts` and `shared/useDashboardQueries.ts`
2. **Update `src/hooks/data/admin/index.ts`** -- add `export * from "./exports/dashboard"`
3. **Update `src/hooks/data/shared/index.ts`** -- remove the dashboard and investor-detail/enrichment/mutation/query exports (they remain accessible via the admin barrel and the top-level `@/hooks/data` barrel)
4. **Keep the source files in `shared/`** -- they physically stay where they are. The barrel re-export pointers simply move from the shared barrel to the admin barrel. This avoids breaking any deep imports that already exist.

Consumer impact: All 4 consumers (`FinancialSnapshot`, `StatementDeliveryStatus`, `QuickYieldEntry`, `PendingActionsPanel`, `ActivityFeed`) currently import from `@/hooks/data` (the top-level barrel), so they remain unaffected as long as the top-level barrel re-exports admin.

---

## Step 5: Consolidate `src/services/api/`

### 5a: Delete `statementsApi.ts` (954 lines, zero importers)

This file has **zero external consumers** (confirmed by search). It was fully superseded by domain services. Safe to delete outright.

### 5b: Clean up `reportsApi.ts` (330 lines, 3 consumers)

Of the 15+ methods in `ReportsApi`:
- **5 are dead** (`generateReport`, `generateReportNow`, `getUserReports`, `getReport`, `deleteReport`, `getReportStatistics`, `logReportAccess`) -- return empty arrays, null, or errors
- **4 are live** (`getReportSchedules`, `createReportSchedule`, `updateReportSchedule`, `deleteReportSchedule`)
- **2 are utility** (`downloadReport` which depends on `getReport` so also dead, `generateCSV`)
- **2 are private mappers** (`mapReportDefinition` which is unused, `mapGeneratedReport` which is unused, `mapReportSchedule` which is used)

Consumers:
1. `useReportHistory.ts` -- calls `getUserReports` which always returns `[]`. This hook is dead.
2. `ReportHistory.tsx` -- imports `ReportsApi` but uses `useReportHistory` (dead) and `downloadReport` (dead). Dead component.
3. `ReportBuilder.tsx` -- imports `ReportsApi` for `generateReportNow` (dead). Dead component.

### Changes for Step 5

1. **Delete `src/services/api/statementsApi.ts`**
2. **Create `src/services/admin/reportScheduleService.ts`** -- extract the 4 live schedule CRUD methods + `mapReportSchedule` helper from `reportsApi.ts` as clean functional exports (no class wrapper)
3. **Update `src/services/admin/index.ts`** barrel to export the new service
4. **Delete `src/services/api/reportsApi.ts`**
5. **Delete `src/services/api/` directory**
6. **Delete dead hook `src/hooks/data/shared/useReportHistory.ts`** and remove from shared barrel
7. **Update `src/components/reports/ReportHistory.tsx`** -- replace `ReportsApi` import with new `reportScheduleService` import; remove dead `getUserReports` usage
8. **Update `src/components/reports/ReportBuilder.tsx`** -- remove dead `ReportsApi.generateReportNow` call; show "feature disabled" message
9. **Update `src/pages/reports/CustomReport.tsx`** if it references dead functionality

---

## Technical Details

### New file: `src/services/admin/reportScheduleService.ts`

Functional exports (no class):
- `getReportSchedules(): Promise<ReportSchedule[]>`
- `createReportSchedule(schedule): Promise<{ success, schedule?, error? }>`
- `updateReportSchedule(id, updates): Promise<{ success, error? }>`
- `deleteReportSchedule(id): Promise<{ success, error? }>`

Plus `mapReportSchedule` as a private helper.

### New file: `src/hooks/data/admin/exports/dashboard.ts`

Re-exports from:
- `@/hooks/data/shared/useDashboardMetrics`
- `@/hooks/data/shared/useDashboardQueries`

### Files deleted (5)
- `src/services/api/statementsApi.ts`
- `src/services/api/reportsApi.ts`
- `src/services/api/` (directory)
- `src/hooks/data/shared/useReportHistory.ts`

### Files modified (5)
- `src/hooks/data/admin/index.ts` -- add dashboard export
- `src/hooks/data/shared/index.ts` -- remove dashboard, investor detail/enrichment/mutation/query, and reportHistory exports
- `src/components/reports/ReportHistory.tsx` -- update imports
- `src/components/reports/ReportBuilder.tsx` -- update imports
- `src/services/admin/index.ts` -- add reportScheduleService export

