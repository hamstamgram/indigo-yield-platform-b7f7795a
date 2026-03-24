

# Full Codebase Architecture Audit

## Executive Summary

The codebase is **well-structured overall** -- it has clear feature-based organization (`src/features/admin`, `src/features/investor`), proper separation of concerns (no direct Supabase calls in UI components), and a consistent hook/service/component layering. However, there are structural issues that add complexity and maintenance burden. Nothing is broken, but several patterns create confusion and risk of divergence.

---

## Findings (Ordered: Critical to Optional)

### 1. CRITICAL: Duplicate Withdrawal Creation Paths

There are **3 separate implementations** of `createWithdrawalRequest`:

| Location | Used By |
|----------|---------|
| `features/investor/withdrawals/services/investorWithdrawalService.ts` | Exported via `services/investor/index.ts` barrel |
| `features/investor/portfolio/services/investorPortfolioService.ts` | Used by `useCreateWithdrawalRequest` hook (the actual live path) |
| `features/investor/withdrawals/services/withdrawalService.ts` | Admin withdrawal operations |

The first one (`investorWithdrawalService`) is exported but **may not be called by any live UI path** since the portfolio hook uses the portfolio service version. This is a divergence risk -- if one gets patched, the other doesn't.

**Recommendation**: Audit which `createWithdrawalRequest` is actually called, delete the dead one, keep a single canonical implementation.

---

### 2. HIGH: Ghost Components Layer (`src/components/admin`, `src/components/investor`)

Both `src/components/admin/index.ts` and `src/components/investor/index.ts` are **pure re-export shims** that point to `src/features/`. They add an extra indirection layer:

- `src/components/admin/index.ts` re-exports ~40 items from `src/features/admin/`
- `src/components/investor/index.ts` re-exports 5 items from `src/features/investor/`
- 11 feature files import from `@/components/admin` instead of directly from `@/features/admin`

These shims create a false impression of a standalone component library when everything actually lives in `features/`.

**Recommendation**: Update the 11 importing files to use `@/features/admin/...` directly, then delete the shim barrels.

---

### 3. HIGH: Orphaned Components Outside Features

Several component directories sit in `src/components/` but belong to specific features:

| Directory | Should Be In |
|-----------|-------------|
| `src/components/withdrawal/WithdrawalRequestForm.tsx` | `src/features/investor/withdrawals/components/` |
| `src/components/account/ProfileTab.tsx`, `SecurityTab.tsx` | `src/features/*/settings/components/` (shared between admin & investor settings) |
| `src/components/sidebar/` | `src/components/layout/` (already imported only by `layout/Sidebar.tsx`) |
| `src/components/documents/` | Unused (0 imports found) |

**Recommendation**: Move these into their feature homes. Delete `components/documents/` if confirmed dead.

---

### 4. HIGH: Dual Service Layer (services/admin vs features/admin/services)

Admin services live in **two places**:

- `src/services/admin/` -- 28 service files (the original location)
- `src/features/admin/*/services/` -- domain-specific services (the newer pattern)

The barrel `src/services/admin/index.ts` re-exports from **both** locations, mixing old and new. Some services (`adminService.ts`, `recordedYieldsService.ts`, `integrityService.ts`) still live in `services/admin/` while their hooks and components are in `features/admin/`.

**Recommendation**: Migrate remaining `services/admin/*.ts` files into their corresponding `features/admin/*/services/` directories. The barrel can stay as a compatibility shim during transition.

---

### 5. MODERATE: Hook Barrel Chain is 3 Levels Deep

Import chain: `@/hooks/data` -> `@/hooks/data/admin` -> `@/hooks/data/admin/exports/yields.ts` -> `@/features/admin/yields/hooks/useRecordedYieldsPage.ts`

That's 4 files just to re-export a hook. The `hooks/data/admin/exports/*.ts` layer exists only as grouping barrels.

**Recommendation**: Consider flattening to 2 levels: `@/hooks/data/index.ts` directly re-exports from `@/features/*/hooks/`. Or better yet, have pages import directly from `@/features/admin/yields/hooks/`.

---

### 6. MODERATE: Services Layer Split (services/investor duplicates features/investor)

`src/services/investor/index.ts` re-exports from 8 different `features/investor/*/services/` files plus its own local files (`depositService.ts`, `investmentService.ts`, `fundViewService.ts`, `investorPortalService.ts`). The local files should move to `features/investor/`.

**Recommendation**: Same as #4 -- consolidate into feature directories.

---

### 7. LOW: `src/components/common/` vs Feature Shared Components

`src/components/common/` contains 13 genuinely shared UI primitives (`FinancialValue`, `MetricStrip`, `ExportButton`, etc.). This is **correctly placed** -- these are cross-cutting UI utilities. No action needed.

However, `src/features/admin/shared/` and `src/features/investor/shared/` also exist. Verify nothing in `components/common/` is admin-only.

---

### 8. LOW: Stale Barrel Comments

Several barrel files have outdated counts/comments:
- `src/hooks/data/index.ts` says "Admin hooks (19 hooks)" -- actual count may differ after recent additions
- `src/routing/AppRoutes.tsx` says "Total: 115 routes across 3 modules" -- likely stale

**Recommendation**: Remove counts from comments or add a lint rule.

---

### 9. OPTIONAL: `src/services/profile/` Has Single File

`src/services/profile/profileSettingsService.ts` is the only file in its directory. It's imported by shared hooks. Could be moved to `src/services/shared/` for consistency.

---

### 10. OPTIONAL: `localStorage` Access Scattered

3 files access `localStorage` directly for recent investors and settings. Consider a thin wrapper (`src/lib/localStorage.ts`) for consistency and testability.

---

## What's Working Well (No Changes Needed)

- **Zero Supabase calls in UI components** -- all data access goes through services/hooks
- **Feature-based directory structure** is well-applied for both admin and investor
- **`src/components/ui/`** properly contains only shadcn primitives
- **`src/components/layout/`** is correctly scoped to shell components
- **Type domains** (`src/types/domains/`) are clean and well-organized
- **Constants, config, contracts** are properly separated
- **Error boundaries and auth guards** are consistently applied

---

## Recommended Action Order

| Priority | Action | Effort | Risk |
|----------|--------|--------|------|
| 1 | Deduplicate `createWithdrawalRequest` implementations | Small | Eliminates divergence bug risk |
| 2 | Delete `src/components/documents/` if unused | Trivial | None |
| 3 | Move `WithdrawalRequestForm` to `features/investor/withdrawals/components/` | Small | Low |
| 4 | Move `account/ProfileTab`, `SecurityTab` to `features/*/settings/` or shared | Small | Low |
| 5 | Collapse `src/components/admin/index.ts` shim (update 11 imports) | Medium | Low |
| 6 | Migrate remaining `services/admin/*.ts` into `features/admin/*/services/` | Large | Medium (many imports) |
| 7 | Flatten hook barrel chain from 4 to 2 levels | Medium | Medium |
| 8 | Move `services/investor/` local files into `features/investor/` | Medium | Medium |
| 9 | Stale comment cleanup | Trivial | None |
| 10 | localStorage wrapper | Small | None |

No code changes, no new features -- just structural cleanup to reduce indirection and eliminate dead/duplicate code.

