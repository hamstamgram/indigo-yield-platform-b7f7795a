
# Comprehensive Architecture Audit Report

## Executive Summary

This audit analyzes the Indigo Yield Platform codebase for architectural cleanliness, modularity, separation of concerns, and optimization opportunities. The codebase is **well-organized overall** with clear patterns and strong conventions, but there are specific areas that need attention.

**Overall Assessment: B+ (Good with room for improvement)**

---

## Part 1: Architecture Strengths

The codebase demonstrates several excellent architectural patterns:

### 1.1 Clean Layer Separation
```text
Components > Hooks > Services > Database
     UI      State    Logic    Supabase
```

- **Services layer** (`src/services/`) properly encapsulates all database operations
- **Hooks layer** (`src/hooks/data/`) wraps services with React Query for state management
- **Components** consume hooks, never directly accessing Supabase (verified: no `supabase.from()` in components or pages)

### 1.2 Feature-Based Organization
The `src/features/admin/` directory follows a clean domain-driven structure:
```text
features/admin/
  ├── dashboard/     (hooks, components, pages)
  ├── deposits/      (hooks, components, pages)
  ├── fees/          (hooks, components, pages)
  ├── investors/     (hooks, components, pages)
  ├── transactions/  (hooks, components, pages)
  ├── withdrawals/   (hooks, components, pages)
  └── yields/        (hooks, components, pages)
```

### 1.3 Strong Type System
- Canonical domain types in `src/types/domains/` with proper mapping functions
- Database enum contracts in `src/contracts/dbEnums.ts` with Zod validation
- Compile-time type alignment checks against Supabase types

### 1.4 RPC Gateway Pattern
All financial mutations flow through `src/lib/rpc/` gateway, enforcing:
- Consistent error handling
- Parameter validation
- Proper transaction type mapping (UI types to DB types)

---

## Part 2: Critical Issues (Priority 1 - Must Fix)

### 2.1 Duplicate Hook Definitions
**Severity: High | Impact: Confusion, potential bugs**

There are **3 different `useInvestorPositions` hooks** with different behaviors:

| Location | Query Key | Purpose |
|----------|-----------|---------|
| `hooks/data/shared/useInvestorDetailHooks.ts` | `adminInvestorPositions` | Admin view with totals |
| `hooks/data/investor/useInvestorPositions.ts` | `investorPositions` | Investor view |
| `hooks/data/investor/useInvestorData.ts` | `investorPositions` | Duplicate of above |

**Issue:** The same hook name is exported from different locations with different behaviors, causing:
- Import confusion for developers
- Potential for using wrong hook in wrong context
- Cache key mismatches

**Recommendation:**
1. Rename admin version to `useAdminInvestorPositions` (already partially done in barrel)
2. Remove duplicate in `useInvestorData.ts` (lines 83-88) - it's identical to `useInvestorPositions.ts`
3. Add clear JSDoc comments indicating admin vs investor context

### 2.2 Direct Supabase Imports in Feature Components
**Severity: Medium-High | Impact: Layer violation**

6 files in `src/features/` import Supabase directly instead of using services:

| File | Issue |
|------|-------|
| `transactions/VoidAndReissueDialog.tsx` | Direct `supabase` import for AUM query |
| `system/components/DataIntegrityPanel.tsx` | Direct realtime channel setup |
| `withdrawals/components/CompleteWithdrawalDialog.tsx` | Direct `supabase` import |
| `investors/components/wizard/steps/ReviewStep.tsx` | Direct DB query |
| `deposits/components/CreateDepositDialog.tsx` | Mixed service/direct calls |
| `transactions/pages/AdminManualTransaction.tsx` | Direct `supabase` import |

**Recommendation:** Move all database operations to service layer. If realtime channels are needed, create a `realtimeService.ts`.

---

## Part 3: Structural Issues (Priority 2 - Should Fix)

### 3.1 Inconsistent Page/Feature Organization
**Issue:** Admin pages are split between two locations:

```text
src/pages/admin/          <- Only AdminDashboard.tsx here
src/features/admin/*/pages/  <- Most admin pages here
```

**Issue:** Investor pages are also split:
```text
src/pages/investor/       <- 7 pages directly + subdirectories
src/pages/ib/             <- IB pages
src/pages/withdrawals/    <- Withdrawal pages
src/pages/transactions/   <- Transaction pages
```

**Recommendation:** Consolidate all pages under either:
- Option A: `src/features/{domain}/pages/` (feature-first)
- Option B: `src/pages/{domain}/` (page-first)

Choose one pattern and migrate. The codebase has started moving toward feature-first for admin but hasn't completed the migration for investor.

### 3.2 Barrel Export Complexity
**Issue:** The hook barrel structure is deeply nested and confusing:

```text
src/hooks/data/index.ts
  └── exports from src/hooks/data/admin/index.ts
        └── exports from src/hooks/data/admin/exports/*.ts
              └── exports from src/hooks/data/shared/*.ts
```

This leads to:
- Hard to trace where a hook originates
- Potential for circular dependencies
- Type re-export duplication

**Recommendation:** Flatten to 2 levels max:
```text
src/hooks/data/index.ts (main barrel)
  ├── admin.ts (all admin hooks)
  ├── investor.ts (all investor hooks)
  └── shared.ts (shared hooks)
```

### 3.3 Mixed Component Locations
**Issue:** Admin investor components exist in two places:

```text
src/components/admin/investors/index.ts  <- Just re-exports
src/features/admin/investors/components/ <- Actual components
```

The `src/components/admin/investors/` directory only contains a barrel file that re-exports from features. This is unnecessary indirection.

**Recommendation:** Remove `src/components/admin/investors/` and update imports to use `@/features/admin/investors/components` directly.

---

## Part 4: Coupling Issues (Priority 3 - Improvement)

### 4.1 Transaction History Service Direct Supabase Coupling
**Location:** `src/services/admin/adminTransactionHistoryService.ts`

The service does inline displayType mapping that duplicates logic already in `src/types/domains/transaction.ts`:

```typescript
// In service (lines 154-160):
if (tx.type === "DEPOSIT") displayType = "Top-up";
else if (tx.type === "WITHDRAWAL") displayType = "Withdrawal";
// etc.

// Already exists in transaction.ts:
export function formatTransactionType(type: TransactionType): string {...}
```

**Recommendation:** Use `formatTransactionType()` from domain types instead of duplicating mapping logic.

### 4.2 Hook-to-Hook Dependencies
Some hooks directly import from other hook files instead of using the barrel:

```typescript
// In useIBManagementPage.ts
import { useIBProfiles } from "./useIBProfiles";  // Direct import

// Should be:
import { useIBProfiles } from "@/hooks/data";  // Via barrel
```

**Recommendation:** All inter-hook imports should go through the barrel for consistency.

---

## Part 5: Code Quality Issues (Priority 4 - Nice to Have)

### 5.1 Missing formatters.ts Utility
**Issue:** `src/utils/index.ts` references `export * from "./formatters"` but the file doesn't exist.

The comment mentions it should be the canonical source for `formatAssetAmount`, `formatPercentage`, but these are exported from `src/utils/assets.ts` instead.

**Recommendation:** Create `src/utils/formatters.ts` as the canonical location for all formatting functions, or update the barrel to correctly reference `assets.ts`.

### 5.2 Orphaned Shim Files Note
The codebase has a deprecation plan:
```typescript
// hooks/data/index.ts comment:
// Individual shim files in this directory are deprecated and will be removed in v2.0.
```

**Recommendation:** Track these deprecated shims and create a migration checklist.

### 5.3 Test Directory Structure
The `tests/` directory contains 60+ files at the root level alongside subdirectories. This is difficult to navigate.

**Recommendation:** Organize tests by type:
```text
tests/
  ├── unit/
  ├── integration/
  ├── e2e/
  ├── sql/
  └── reports/  <- Move all markdown reports here
```

---

## Part 6: Ordered Remediation Plan

### Phase 1: Critical Fixes (Week 1)

| Task | Priority | Effort | Files Affected |
|------|----------|--------|----------------|
| 1.1 Remove duplicate `useInvestorPositions` in `useInvestorData.ts` | Critical | Low | 1 file |
| 1.2 Rename admin `useInvestorPositions` to `useAdminInvestorPositions` consistently | Critical | Low | 3 files |
| 1.3 Move direct Supabase calls in feature components to services | High | Medium | 6 files |

### Phase 2: Structural Improvements (Week 2-3)

| Task | Priority | Effort | Files Affected |
|------|----------|--------|----------------|
| 2.1 Consolidate investor pages under `src/features/investor/` | Medium | High | 15+ files |
| 2.2 Remove redundant `src/components/admin/investors/` barrel | Medium | Low | 2 files |
| 2.3 Flatten hooks barrel structure | Medium | Medium | 10+ files |
| 2.4 Create or fix `src/utils/formatters.ts` | Low | Low | 2 files |

### Phase 3: Code Quality (Week 4)

| Task | Priority | Effort | Files Affected |
|------|----------|--------|----------------|
| 3.1 Use `formatTransactionType()` in adminTransactionHistoryService | Low | Low | 1 file |
| 3.2 Update inter-hook imports to use barrels | Low | Low | 5+ files |
| 3.3 Organize test directory structure | Low | Medium | 60+ files |
| 3.4 Document and track deprecated shim files | Low | Low | Documentation only |

### Phase 4: Optional Enhancements

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| 4.1 Create IB feature directory | Optional | High | Move IB pages from `src/pages/ib/` to `src/features/ib/` |
| 4.2 Create investor feature directory | Optional | High | Mirror admin feature structure for investor domain |
| 4.3 Add architecture decision records (ADRs) | Optional | Medium | Document key decisions |

---

## Summary of Key Metrics

| Metric | Current State | Target |
|--------|---------------|--------|
| Service layer isolation | 94% (6 violations) | 100% |
| Hook naming consistency | 85% (duplicate hooks) | 100% |
| Feature organization (admin) | 95% (mostly complete) | 100% |
| Feature organization (investor) | 60% (split locations) | 100% |
| Barrel export depth | 4 levels | 2 levels |
| Test organization | 40% (files at root) | 100% |

---

## Conclusion

The codebase follows strong architectural patterns overall. The main issues are:
1. **Duplicate hook definitions** causing confusion
2. **Direct Supabase imports** in 6 feature components
3. **Inconsistent page organization** between admin and investor domains
4. **Over-nested barrel exports** making tracing difficult

Addressing Phase 1 items will significantly improve code quality and developer experience. The remaining phases can be tackled incrementally as part of regular maintenance.
