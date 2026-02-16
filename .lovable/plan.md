
# Fix: Build-Breaking Export Collision

## Root Cause

The blank page is caused by a **duplicate export** in `src/services/admin/index.ts`. Two sources both export `getFundInvestorComposition`:

1. `dashboardMetricsService.ts` (line 23) -- the dashboard version (all account types)
2. `./yields` barrel (via `yieldDistributionService.ts` line 42) -- the yield version (investor-only, aliased from `getFundInvestorCompositionWithYield`)

When `src/services/admin/index.ts` does `export * from "./yields"` alongside the explicit dashboard export, the bundler encounters a name collision and the build fails silently, producing a blank page.

There is also a secondary issue: the `yields/index.ts` barrel re-exports everything from `yieldDistributionService.ts` (line 7) AND then explicitly lists the same exports again (lines 10-79), creating redundant double-exports within the sub-barrel itself.

## Fix Plan

### 1. Remove the `getFundInvestorComposition` alias from `yields/yieldDistributionService.ts`
- Delete line 42: `getFundInvestorCompositionWithYield as getFundInvestorComposition,`
- This alias is the source of the collision. The yield-specific function should be imported as `getFundInvestorCompositionWithYield` to distinguish it from the dashboard version.

### 2. Remove the duplicate alias from `yields/index.ts`
- Delete line 23: `getFundInvestorCompositionWithYield as getFundInvestorComposition,`
- Same fix in the sub-barrel explicit exports.

### 3. Remove duplicate explicit exports from `yields/index.ts`
- Lines 10-79 duplicate everything already covered by line 7 (`export * from "./yieldDistributionService"`). Remove the redundant explicit re-exports for `yieldPreviewService`, `yieldApplyService`, `yieldHistoryService`, and `yieldReportsService` since they are already re-exported through the distribution facade.
- Keep the explicit exports for `yieldCrystallizationService`, `yieldManagementService`, and `yieldDistributionsPageService` since those are NOT covered by the distribution facade.

### 4. Update the one consumer that imports `getFundInvestorComposition` from yields
- `src/features/admin/yields/hooks/useYieldOperations.ts` (line 9): change import to `getFundInvestorCompositionWithYield` (or import from `@/services/admin` which will now unambiguously resolve to the dashboard version).

## Files Modified (3)

- `src/services/admin/yields/yieldDistributionService.ts` -- remove alias on line 42
- `src/services/admin/yields/index.ts` -- remove alias on line 23 and deduplicate re-exports
- `src/features/admin/yields/hooks/useYieldOperations.ts` -- update import name
