
# Comprehensive Architecture Audit Report

## Executive Summary

The codebase is a large financial platform (investment/yield management) with ~115 routes, organized using a feature-first architecture with layered separation (Components > Hooks > Services). While the overall structure is solid, there are several areas of misalignment, dead code, domain boundary violations, and organizational inconsistencies that should be addressed.

---

## Critical Issues (Fix First)

### 1. Direct Supabase Calls in Hooks (Violates Service Layer Isolation)

Two shared hook files bypass the service layer by making direct `supabase.from()` calls:

- **`src/hooks/data/shared/useWithdrawalMutations.ts`** -- Makes 6 direct `supabase.from("audit_log").insert()` calls
- **`src/hooks/data/shared/useReports.ts`** -- Makes direct `supabase.from("generated_statements").delete()` and `supabase.from("audit_log").insert()` calls

**Recommendation:** Extract these into the respective domain services (`statementAdminService`, `withdrawalService`, or `auditLogService`). Hooks should only call service functions, never Supabase directly.

### 2. Investor Feature Importing Admin Service Types (Cross-Domain Leak)

- **`src/features/investor/shared/hooks/useInvestorSearch.ts`** imports `AdminInvestorSummary` from `@/services/admin`

An investor-domain hook should never depend on admin services. This type should either be shared or the hook should use an investor-appropriate type.

**Recommendation:** Move `AdminInvestorSummary` to a shared type (e.g., `@/types/domains/investor`) or create a leaner investor-specific type alias.

### 3. Duplicate Withdrawal Services

Two separate files handle withdrawal logic for the investor domain:
- `src/services/investor/investorWithdrawalService.ts` -- investor-facing withdrawal requests
- `src/services/investor/withdrawalService.ts` -- labeled "admin operations" but lives in the investor service folder

**Recommendation:** Move `withdrawalService.ts` admin operations to `src/services/admin/` where it belongs, or merge overlapping logic.

---

## High Priority (Structural Debt)

### 4. Ghost Shim Layers (Three-Layer Re-export Chains)

The hook export chain has 3 unnecessary layers:

```text
src/hooks/data/index.ts
  -> src/hooks/data/investor/index.ts (shim)
    -> src/features/investor/*/hooks/*.ts (actual code)

src/hooks/data/index.ts
  -> src/hooks/data/admin/exports/*.ts (proxy files)
    -> src/features/admin/*/hooks/*.ts (actual code)
```

These shim barrels (`src/hooks/data/investor/index.ts`, `src/hooks/data/admin/exports/*.ts`) add no value -- they are pure pass-through re-exports.

**Recommendation:** Have `src/hooks/data/index.ts` export directly from `src/features/*/` or, better, have consumers import from `@/features/admin/...` and `@/features/investor/...` directly. Remove the shim layer.

### 5. Ghost Component Shim Layers

Same pattern in components:
- `src/components/admin/index.ts` -- pure re-export from `@/features/admin/`
- `src/components/investor/index.ts` -- pure re-export from `@/features/investor/`
- `src/components/reports/index.ts` -- pure re-export from `@/features/admin/reports/`

**Recommendation:** Update all consumers to import from `@/features/` directly and delete these shim files.

### 6. Scattered Page Files Outside Feature Directories

Despite the feature-first architecture, pages remain scattered:
- `src/pages/admin/AdminDashboard.tsx` -- should be in `src/features/admin/dashboard/`
- `src/pages/investor/portfolio/` -- should be in `src/features/investor/portfolio/`
- `src/pages/reports/` (2 files) -- should be in features
- `src/pages/transactions/TransactionDetailsPage.tsx` -- should be in features
- `src/pages/withdrawals/` (2 files) -- should be in features

The `src/pages/` directory should only contain truly standalone/public pages (Login, NotFound, etc.).

**Recommendation:** Migrate domain-specific pages into their feature directories.

---

## Medium Priority (Organizational Cleanup)

### 7. Stale Documentation References Dead Code

`src/services/reports/README.md` references:
- `ReportsApi` from `@/services/api/reportsApi` -- does not exist
- `ReportEngine` from `@/lib/reports` -- does not exist

**Recommendation:** Either delete this README or update it to match current implementation.

### 8. `src/lib/documents/types.ts` -- Unused Type-Only Module

Contains 255 lines of document vault types/utilities (`DocumentType`, `DOCUMENT_TYPE_CONFIG`, validation functions) but no evidence of actual usage in the codebase. The `src/lib/README.md` itself notes `documents/` can be removed.

**Recommendation:** Verify usage; if unused, delete. If needed, move to `@/types/domains/document`.

### 9. `src/services/reports/index.ts` -- Near-Empty Barrel

Contains only `export * from "@/types/domains/report"`. This is a service barrel that exports only types -- misleading.

**Recommendation:** Delete this barrel; consumers should import types from `@/types/domains/report` directly.

### 10. Duplicate Service Patterns (Investor Yield)

Two investor yield services:
- `src/services/investor/investorYieldService.ts` -- investor-facing yield events
- `src/services/investor/investorYieldHistoryService.ts` -- yield history and documents

Both deal with investor yield data with overlapping concerns.

**Recommendation:** Consolidate into a single `investorYieldService.ts`.

### 11. `useIBSettings` Hook in Shared Folder

`src/hooks/data/shared/useIBSettings.ts` (299 lines) contains IB-specific admin logic (role assignment, referral queries) but lives in the shared hooks folder.

**Recommendation:** Move to `src/features/admin/ib/hooks/` since IB management is an admin concern.

### 12. `src/services/profile/profileSettingsService.ts` -- Orphaned Singleton

A standalone service file in its own folder. Profile settings services also exist in `src/services/shared/profileService.ts`.

**Recommendation:** Consolidate into `src/services/shared/profileService.ts` or move into `src/features/investor/settings/`.

---

## Low Priority (Optional Enhancements)

### 13. Shared Hooks Folder is Oversized

`src/hooks/data/shared/` contains 34 files. Many are admin-specific (dashboard metrics, investor queries, investor mutations, yield data) masquerading as "shared."

**Recommendation:** Gradually migrate admin-only hooks into `src/features/admin/` and investor-only hooks into `src/features/investor/`, leaving truly shared hooks (auth flow, funds, profiles, realtime) in shared.

### 14. `src/lib/export/` Could Move to Utils

`src/lib/export/csv-export.ts` is a pure utility (no framework integration). Per the `lib/README.md` guidelines, pure utilities belong in `src/utils/`.

**Recommendation:** Move to `src/utils/formatters/` or `src/utils/export.ts`.

### 15. Redundant Service Domains at Top Level

`src/services/` has 10 top-level folders. Some are very thin:
- `src/services/operations/` -- 1 service file
- `src/services/profile/` -- 1 file
- `src/services/core/` -- 4 files
- `src/services/notifications/` -- 3 small files

**Recommendation:** Consolidate `operations` into `admin`, `profile` into `shared`, and `notifications` into `shared` to reduce directory sprawl.

### 16. `src/components/account/`, `src/components/profile/`, `src/components/withdrawal/`

Legacy component directories that should be absorbed into feature directories (`features/investor/settings/`, `features/investor/portfolio/`).

---

## Summary: Prioritized Action Steps

| Priority | Action | Impact |
|----------|--------|--------|
| 1 | Move direct `supabase.from()` calls in hooks to services | Security, architecture compliance |
| 2 | Fix investor-to-admin cross-domain import | Domain boundary integrity |
| 3 | Resolve duplicate withdrawal services | Remove confusion |
| 4 | Remove hook shim layers (3-hop re-exports) | Reduce indirection, faster refactoring |
| 5 | Remove component shim layers | Same as above |
| 6 | Move domain pages into feature directories | Feature-first consistency |
| 7 | Delete/update stale README | Prevent developer confusion |
| 8 | Remove `lib/documents/types.ts` if unused | Dead code removal |
| 9 | Delete empty `services/reports/index.ts` barrel | Reduce confusion |
| 10 | Consolidate investor yield services | Reduce duplication |
| 11 | Move `useIBSettings` to admin features | Correct domain placement |
| 12 | Consolidate profile services | Reduce fragmentation |
| 13 | Thin out shared hooks folder | Better domain boundaries |
| 14 | Move CSV export to utils | Follow lib vs utils guidelines |
| 15 | Consolidate thin service directories | Reduce sprawl |
| 16 | Absorb legacy component directories | Complete feature-first migration |
