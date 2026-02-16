

# Steps 6, 7, and 10: Yield Service Cleanup, Shared Service Pruning, and Report Component Migration

## Overview

Three structural changes to continue the audit:

1. **Step 6** -- Group the 8 yield service files under `src/services/admin/yields/` with a sub-barrel
2. **Step 7** -- Remove dead shared services (`historicalDataService`, `performanceDataService`) that have zero consumers
3. **Step 10** -- Move `src/components/reports/` components into `src/features/admin/reports/` to align with the feature-first structure

---

## Step 6: Organize Yield Services into a Sub-Directory

Currently there are 8 yield-related files scattered in `src/services/admin/`:
- `yieldDistributionService.ts` (re-export facade)
- `yieldPreviewService.ts`
- `yieldApplyService.ts`
- `yieldHistoryService.ts`
- `yieldReportsService.ts`
- `yieldCrystallizationService.ts`
- `yieldManagementService.ts`
- `yieldDistributionsPageService.ts`

### Changes

1. Create `src/services/admin/yields/` directory
2. Move all 8 files into it
3. Create `src/services/admin/yields/index.ts` barrel that re-exports everything
4. Update `src/services/admin/index.ts` yield section to point to `./yields` barrel
5. Update 7 files with direct imports (e.g., `from "@/services/admin/yieldManagementService"`) to use `from "@/services/admin/yields/yieldManagementService"` or the barrel

### Files with direct yield service imports to update
- `src/services/admin/yieldApplyService.ts` (imports yieldCrystallizationService)
- `src/features/admin/yields/hooks/useYieldCrystallization.ts`
- `src/features/admin/yields/components/VoidYieldDialog.tsx`
- `src/features/admin/yields/pages/YieldDistributionsPage.tsx`
- `src/hooks/data/shared/useYieldData.ts`
- `src/hooks/data/investor/useInvestorYieldData.ts`
- `src/features/admin/yields/hooks/useYieldDistributionsPage.ts`

---

## Step 7: Remove Dead Shared Services

### 7a. Delete `src/services/shared/historicalDataService.ts`
- Exports `getHistoricalReports`, `updateHistoricalReport`, `deleteHistoricalReport`, `generateHistoricalReport`, `BulkGenerateOptions`, `HistoricalReportTemplate`
- Zero consumers found outside the barrel re-export
- `reportService.ts` in admin has its own `BulkGenerateOptions` and template generation -- this file is a dead duplicate

### 7b. Delete `src/services/shared/performanceDataService.ts`
- Exports `PerformanceData`, `upsertPerformanceData`, `getPerformanceByPeriod`, `deletePerformanceRecord`
- Zero consumers found outside the barrel re-export
- All actual performance reads go through `performanceService.ts`

### 7c. Update `src/services/shared/index.ts`
Remove the two dead exports:
```
export * from "./performanceDataService";
export * from "./historicalDataService";
```

---

## Step 10: Move Report Components to Features

`src/components/reports/` contains 3 files:
- `ReportBuilder.tsx` -- "Feature Unavailable" placeholder (already simplified in Step 5)
- `ReportHistory.tsx` -- "Feature Unavailable" placeholder (already simplified in Step 5)
- `InvestorReportTemplate.tsx` -- 803-line HTML email template (active, used by tests and report generation)

### Changes

1. Move `InvestorReportTemplate.tsx` to `src/features/admin/reports/components/InvestorReportTemplate.tsx`
2. Move `ReportBuilder.tsx` to `src/features/admin/reports/components/ReportBuilder.tsx`
3. Move `ReportHistory.tsx` to `src/features/admin/reports/components/ReportHistory.tsx`
4. Update `src/features/admin/reports/components/index.ts` barrel to export all three
5. Delete `src/components/reports/` directory
6. Update consumers:
   - `src/pages/reports/CustomReport.tsx` -- update import path
   - `tests/unit/components/reportTemplateSnapshot.test.ts` -- update import path

---

## Technical Summary

### Files Created (1)
- `src/services/admin/yields/index.ts` -- yield sub-barrel

### Files Moved (11)
- 8 yield service files into `src/services/admin/yields/`
- 3 report components into `src/features/admin/reports/components/`

### Files Deleted (2)
- `src/services/shared/historicalDataService.ts`
- `src/services/shared/performanceDataService.ts`

### Files Modified (~12)
- `src/services/admin/index.ts` -- update yield imports to sub-barrel
- `src/services/shared/index.ts` -- remove dead exports
- `src/features/admin/reports/components/index.ts` -- add report component exports
- `src/pages/reports/CustomReport.tsx` -- update import path
- `tests/unit/components/reportTemplateSnapshot.test.ts` -- update import path
- 7 files with direct yield service imports (path updates only)

