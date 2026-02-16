

# Steps 4 and 5: Implementation Plan

## Step 4: Move Admin-Specific Hooks to Admin Barrel

### 4a. Create `src/hooks/data/admin/exports/dashboard.ts`
Re-export all dashboard hooks from `shared/useDashboardMetrics` and `shared/useDashboardQueries`:
- `useFinancialMetrics`, `useHistoricalFlowData`, `useFundComposition`, `useDeliveryStatus`, `useRetryDelivery`, `useDeliveryDiagnostics`, `useDeliveryExclusionBreakdown` + types
- `useFundsWithAUM`, `useRecentActivities`, `usePendingItems`

### 4b. Update `src/hooks/data/admin/index.ts`
Add `export * from "./exports/dashboard"` line.

### 4c. Update `src/hooks/data/shared/index.ts`
Remove the dashboard metrics (lines 29-44) and dashboard queries (line 47) exports. The investor detail/enrichment/mutation/query hooks are already re-exported via `admin/exports/investors.ts`, but they must stay in shared barrel too since `useInvestorHooks.ts` consolidates them and shared consumers exist. Only dashboard hooks move exclusively to admin.

---

## Step 5: Eliminate `src/services/api/`

### 5a. Delete `src/services/api/statementsApi.ts`
Zero external importers confirmed -- fully dead file (954 lines).

### 5b. Create `src/services/admin/reportScheduleService.ts`
Extract 4 live CRUD methods from `reportsApi.ts` as functional exports:
- `getReportSchedules()`
- `createReportSchedule(schedule)`
- `updateReportSchedule(id, updates)`
- `deleteReportSchedule(id)`
- Private `mapReportSchedule()` helper

### 5c. Update `src/services/admin/index.ts`
Add export for the new `reportScheduleService`.

### 5d. Delete `src/services/api/reportsApi.ts` and `src/services/api/` directory

### 5e. Delete `src/hooks/data/shared/useReportHistory.ts`
The hook calls `ReportsApi.getUserReports()` which always returns `[]`. Dead code.

### 5f. Update `src/hooks/data/shared/index.ts`
Remove `useReportHistory` and `ReportHistoryFilters` exports (line 206).

### 5g. Update `src/components/reports/ReportHistory.tsx`
This component uses `useReportHistory` (always returns `[]`) and `ReportsApi.downloadReport`/`deleteReport` (both dead). Replace with a "Feature unavailable" placeholder card.

### 5h. Update `src/components/reports/ReportBuilder.tsx`
Calls `ReportsApi.generateReportNow` and `generateReport` (both return errors). `loadReportDefinitions` already sets `[]`. Replace with a "Feature unavailable" placeholder card.

### 5i. Update `src/components/reports/index.ts`
Keep exports (the components still exist, just simplified).

---

## Files Created (2)
- `src/hooks/data/admin/exports/dashboard.ts`
- `src/services/admin/reportScheduleService.ts`

## Files Deleted (3)
- `src/services/api/statementsApi.ts`
- `src/services/api/reportsApi.ts`
- `src/hooks/data/shared/useReportHistory.ts`

## Files Modified (5)
- `src/hooks/data/admin/index.ts` -- add dashboard export
- `src/hooks/data/shared/index.ts` -- remove dashboard + reportHistory exports
- `src/services/admin/index.ts` -- add reportScheduleService export
- `src/components/reports/ReportHistory.tsx` -- replace with placeholder
- `src/components/reports/ReportBuilder.tsx` -- replace with placeholder

