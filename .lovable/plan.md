

# Platform Architecture Audit Report

## Executive Summary

The codebase has successfully migrated most logic into a feature-based structure (`src/features/admin/` and `src/features/investor/`). However, the migration left behind a thick layer of re-export shims, duplicated hook barrels, and "shared" directories that blur ownership. Below are findings ranked from most critical to optional.

---

## Finding 1: Triple-Indirection Hook Barrel (Critical)

**Problem:** Hooks pass through 3 layers before reaching consumers:

```text
src/features/admin/yields/hooks/useYieldOperations.ts   ← actual logic
  ↑ re-exported by
src/hooks/data/admin/exports/yields.ts                  ← barrel shim
  ↑ re-exported by
src/hooks/data/admin/index.ts                           ← barrel shim
  ↑ re-exported by
src/hooks/data/index.ts                                 ← barrel shim
  ↑ imported by
src/features/admin/yields/components/SomeComponent.tsx  ← consumer
```

This creates circular-like dependency risk, slows IDE resolution, and makes dead-code elimination harder. The same pattern applies to all 9 barrel files in `src/hooks/data/admin/exports/`.

**Recommendation:** Features should import directly from their own domain (`@/features/admin/yields/hooks/...`). The entire `src/hooks/data/admin/` directory (index + exports + yield subfolder) is pure re-export overhead. Plan a phased removal: update imports in features first, then delete the barrels.

---

## Finding 2: Bloated "Shared" Hooks Directory (Critical)

**Problem:** `src/hooks/data/shared/` has 28 files containing hooks that are not truly shared. Examples:
- `useDashboardMetrics.ts` / `useDashboardQueries.ts` — admin-only, re-exported through the admin dashboard barrel
- `useInvestorHooks.ts` — admin investor management hooks living in "shared"
- `useReports.ts` — admin-only report operations (generate, send, delete)
- `useStatements.ts` — admin statement publishing

These should live in their respective feature directories. Only genuinely cross-cutting hooks (auth, profiles, realtime, funds CRUD) belong in shared.

**Recommendation:** Move ~15 hooks from `src/hooks/data/shared/` into their owning feature folder. Keep only truly bidirectional hooks (auth, profiles, realtime subscription, fund CRUD, notifications).

---

## Finding 3: Services Shim Layer is Stale (High)

**Problem:** `src/services/admin/` contains 15 one-liner re-export files (e.g., `feesService.ts`, `reportService.ts`) plus a 194-line `index.ts` barrel. These were necessary during the migration, but now 35 feature files still import from `@/services/admin` instead of directly from `@/features/admin/.../services/`.

**Recommendation:** In a single sweep, update all 35 feature files to import from their co-located service, then delete the 15 shim files and reduce `src/services/admin/index.ts` to a minimal public API (or remove it entirely).

---

## Finding 4: Duplicate Alias Exports (Medium)

**Problem:** Several barrel files export the same symbol under multiple names:
- `system.ts` line 15-16: `useCreateAdminInvite` exported as itself, `useCreateSystemAdminInvite`, and `useCreateAdminInvitePage` — same function, 3 names
- `yields.ts` line 24-25: `YieldRecord` re-exported as `RecordedYieldRecord`, `YieldFilters` as `RecordedYieldFilters`
- `investors.ts`: `useDeleteInvestor` exported twice under different names

This creates confusion about which import to use and inflates the public API surface.

**Recommendation:** Consolidate to one canonical name per export. Find and update all consumers, then remove the aliases.

---

## Finding 5: Hook Logic Remaining in `src/hooks/data/admin/` (Medium)

**Problem:** Six files in `src/hooks/data/admin/` contain actual hook logic rather than re-exports:
- `useYieldData.ts`, `useYieldOperationsState.ts`, `useFundYieldLock.ts` — yield domain hooks
- `useIBSettings.ts` — IB domain hook
- `useInvestorMutations.ts` — investor domain hook
- `useWithdrawalMutations.ts` — withdrawal domain hook
- Plus 4 files in `yield/` subfolder

These should live in `src/features/admin/{domain}/hooks/`.

**Recommendation:** Move each file into its owning feature folder and update the 1-2 import sites per file.

---

## Finding 6: `src/components/common/` Underused (Low)

**Problem:** `src/components/common/` has 12 shared UI components (ExportButton, FormattedNumber, MetricStrip, etc.), but only 4 feature files import from it. The rest import from `@/components/ui`. The split between `common/` and `ui/` is ambiguous.

**Recommendation:** Either merge `common/` into `ui/` (if they're all general-purpose) or document the distinction clearly. Currently it's unclear where a new shared component should go.

---

## Finding 7: `src/services/core/` vs `src/services/shared/` Overlap (Low)

**Problem:** Two directories serve similar purposes:
- `src/services/core/`: dataIntegrityService, systemHealthService, reportUpsertService, supportService
- `src/services/shared/`: auditLogService, performanceService, transactionService, etc.

The distinction between "core" and "shared" is not well-defined.

**Recommendation:** Merge into a single `src/services/shared/` (or `src/services/platform/`) directory. Move domain-specific services (reportUpsertService, dataIntegrityService) into their feature folders.

---

## Finding 8: `src/hooks/data/investor/index.ts` is a 134-line Shim (Low)

**Problem:** This barrel re-exports everything from `src/features/investor/*/hooks/`. Investor features already import directly from their own hooks, so this barrel primarily serves cross-domain imports (admin pages viewing investor data).

**Recommendation:** Audit consumers. If only admin features use it, create a thin `@/features/investor/public-api.ts` instead.

---

## Ordered Action Plan

| Priority | Action | Files Affected | Risk |
|----------|--------|---------------|------|
| **P0** | Move 6 hook files from `hooks/data/admin/` into `features/admin/{domain}/hooks/` | ~12 files | Low |
| **P1** | Update 35 feature files to import directly from `@/features/admin/.../services/` instead of `@/services/admin` | ~35 files | Low |
| **P2** | Move ~15 admin-only hooks from `hooks/data/shared/` into feature folders | ~30 files | Medium |
| **P3** | Remove duplicate alias exports in barrel files | ~10 files | Low |
| **P4** | Delete `src/services/admin/` shim files after P1 | 16 files deleted | Low |
| **P5** | Delete `src/hooks/data/admin/exports/` barrel after P0+P2 | 10 files deleted | Low |
| **P6** | Merge `services/core/` into `services/shared/` | ~8 files | Low |
| **P7** | Clarify `components/common/` vs `components/ui/` | Documentation | None |

Each step is independently deployable. P0-P1 provide the highest clarity improvement with the lowest risk.

