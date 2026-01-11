# INDIGO Platform — Comprehensive Architecture Audit Report

> **Date:** 2026-01-11
> **Audit Type:** Read-Only Analysis
> **Scope:** Complete codebase structure, separation of concerns, code quality

---

## Executive Summary

The INDIGO Yield Platform demonstrates a **domain-driven architecture** with proper separation into services, hooks, and components. However, significant technical debt exists in:

1. **Oversized Components** - 10 files exceed 500 lines (max: 1114 lines)
2. **Misplaced Business Logic** - Validation and filtering in UI components
3. **Duplicate Code** - Formatting functions replicated across 38+ locations
4. **Type Safety Gaps** - 20+ unsafe `any` casts in RPC calls
5. **Coupling Issues** - Cross-service dependencies and prop drilling

---

## Codebase Overview

| Metric | Count |
|--------|-------|
| Total Files | 739 |
| Services | 109 |
| Components | 293 |
| Hooks | 87 |
| Pages | 42 |
| SQL Migrations | 208 |

### Directory Structure

```
src/
├── components/          # 293 React components (UI layer)
│   ├── admin/           # Admin panel components
│   ├── dashboard/       # Investor dashboard
│   └── ui/              # Shadcn/Radix primitives
├── services/            # 109 service modules (business logic)
│   ├── admin/           # Admin operations
│   ├── investor/        # Investor data services
│   ├── operations/      # Transaction & yield operations
│   └── notifications/   # Email/reporting
├── hooks/               # 87 React Query hooks (data fetching)
│   └── data/            # Domain-specific hooks
├── pages/               # 42 route pages
├── types/               # TypeScript definitions
└── lib/                 # Utilities & Supabase client
```

**Verdict:** The overall structure follows modern React patterns with proper domain separation.

---

## Part 1: Critical Issues (Must Fix Before Production)

### 1.1 Type Safety Violations

**20+ unsafe `any` casts in RPC calls**

| File | Line | Issue |
|------|------|-------|
| `transactionService.ts` | 89 | `as any` cast on RPC result |
| `adminService.ts` | 156 | `result as any` bypass |
| `yieldDistributionService.ts` | 203 | Generic `any` return type |
| `withdrawalService.ts` | 78 | `data as any` cast |

**Risk:** Runtime errors when database schema changes.

**Fix:** Create typed response interfaces matching RPC function signatures.

### 1.2 RPC Parameter Mismatches

**4 critical parameter mismatches between TypeScript and PostgreSQL:**

| TypeScript Call | Missing Parameter | PostgreSQL Signature |
|-----------------|-------------------|---------------------|
| `apply_deposit_with_crystallization` | `p_admin_id` | Required for audit trail |
| `recompute_investor_position` | `p_fund_id` | Ambiguous without fund context |
| `void_transaction` | `p_reason` | Required for compliance |
| `crystallize_yield_before_flow` | `p_closing_aum` | Conservation law dependency |

**Risk:** Silent failures or incorrect calculations at runtime.

### 1.3 Missing Error Handling

**Inconsistent error handling across 3 patterns:**

```typescript
// Pattern 1: Log & re-throw (adminService.ts:41-68)
catch (error) {
  console.error("Error:", error);
  throw error;  // No user-friendly message
}

// Pattern 2: Toast with instanceof (AddTransactionDialog.tsx:282)
catch (error) {
  toast.error(error instanceof Error ? error.message : "Failed");
}

// Pattern 3: Toast only (YieldOperationsPage.tsx:212)
catch (error) {
  toast.error("Failed to preview yield.");  // No logging
}
```

**Fix:** Create centralized error handler with structured error types.

---

## Part 2: High Priority Issues (Address Within Sprint)

### 2.1 Oversized Files (10 files > 500 lines)

| File | Lines | Primary Issue |
|------|-------|---------------|
| `YieldOperationsPage.tsx` | **1114** | 3 dialogs + filtering + formatting inline |
| `AdminOnboardingPage.tsx` | 797 | Multiple form sections in single file |
| `FeesOverviewPage.tsx` | 790 | Complex fee calculations inline |
| `RecordedYieldsPage.tsx` | 709 | Large data table + inline actions |
| `ReportDeliveryCenter.tsx` | **694** | KPIs + table + 2 dialogs + mutations |
| `AddTransactionDialog.tsx` | **636** | Validation + async loading + hooks |
| `IBSettingsSection.tsx` | **563** | 7 hooks + promotion/delete logic |
| `InvestorLedgerTab.tsx` | 536 | Ledger display + sorting + filtering |
| `systemAdminService.ts` | 535 | Mixed dashboard/withdrawal/export |
| `InvestorManagementDrawer.tsx` | **440** | 6 tabs + delete flow inline |

**Recommended splits for YieldOperationsPage.tsx (1114 lines):**
1. `YieldPreviewDialog.tsx` - Preview modal
2. `YieldConfirmationDialog.tsx` - Confirmation modal
3. `OpenPeriodDialog.tsx` - Period management
4. `useYieldPageState.ts` - State management hook
5. `yieldFormatters.ts` - Formatting utilities

### 2.2 Business Logic in Components

**YieldOperationsPage.tsx (lines 268-298):**
```typescript
// WRONG: Filtering logic in component
const getFilteredDistributions = (distributions: YieldDistribution[]) => {
  return distributions.filter((d) => {
    if (!showSystemAccounts) {
      const isSystemAccount = d.investorId === INDIGO_FEES_ACCOUNT_ID ||
        d.accountType === "fees_account";
      if (isSystemAccount) return false;
    }
    // ... more filtering
  });
};
```

**Should be:** `filterDistributions()` in `yieldDistributionService.ts`

**AddTransactionDialog.tsx (lines 219-267):**
- System account validation (line 228)
- Position type determination (lines 234, 165)
- AUM requirement validation (lines 243-252)

**Should be:** Backend RPC validation or `transactionValidationService.ts`

### 2.3 Duplicate Code (38+ occurrences)

**Crypto formatting duplicated across components:**

```typescript
// FundPositionCard.tsx:76-80
const formatCrypto = (value: number, asset: string) => {
  if (asset === "BTC") return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
};

// YieldOperationsPage.tsx:127-134 (identical logic)
// QuickYieldEntry.tsx (similar)
// SingleReportGenerator.tsx (similar)
// InvestorKpiChips.tsx (similar)
```

**Fix:** Create `@/utils/formatters.ts`:
```typescript
export const formatCryptoValue = (value: number, asset: string): string => { ... }
export const formatFiatValue = (value: number, currency: string): string => { ... }
export const formatPercentage = (value: number, decimals?: number): string => { ... }
```

**System account detection duplicated:**

```typescript
// YieldOperationsPage.tsx:294-298
const isSystemAccount = (d: YieldDistribution) => {
  return d.investorId === INDIGO_FEES_ACCOUNT_ID;
};

// AddTransactionDialog.tsx:228 (same check)
// Other components (similar patterns)
```

**Fix:** Create `@/utils/accountUtils.ts`:
```typescript
export const isSystemAccount = (investorId: string): boolean => { ... }
export const isFeeAccount = (investor: InvestorBase): boolean => { ... }
```

---

## Part 3: Medium Priority Issues

### 3.1 Coupling Problems

**Cross-service dependencies in adminService.ts:**
```typescript
import { investorDataService } from "@/services/investor/investorDataService";

// adminService.ts calls:
const totalAUM = await investorDataService.getTotalAUM();           // Line 44
const investors = await investorDataService.getAllInvestorsWithSummary(); // Line 74
```

**Issue:** Admin service depends directly on investor service. If investor service changes interface, admin breaks.

**Fix:** Use interface injection or shared types:
```typescript
// types/services.ts
interface IAUMProvider {
  getTotalAUM(): Promise<number>;
}

// adminService.ts
constructor(private aumProvider: IAUMProvider) {}
```

**Hook coupling in IBSettingsSection.tsx:**
```typescript
// 7 separate hooks in single component
const { data: ibSettings } = useIBSettings(investorId);
const { searchUsers } = useSearchUsersForIB(investorId);
const updateIBConfigMutation = useUpdateIBConfig();
const assignIBRoleMutation = useAssignIBRole();
const promoteToIBMutation = usePromoteToIB();
const removeIBRoleMutation = useRemoveIBRole();
// + 7 local state variables
```

**Fix:** Consolidate into single `useIBManagement` hook.

### 3.2 Prop Drilling

**InvestorManagementDrawer.tsx passes props through 3+ levels:**
```
InvestorManagementDrawer
  └── InvestorYieldManager (investorId)
  └── InvestorPositionsTab (investorId, periodId)
  └── InvestorTransactionsTab (investorId)
        └── TransactionRow (investorId, transaction, onVoid)
```

**Fix:** Use React Context for shared investor data:
```typescript
const InvestorContext = createContext<InvestorContextValue>(null);

// Usage
<InvestorProvider investorId={investorId}>
  <InvestorYieldManager />  {/* No props needed */}
  <InvestorPositionsTab />
</InvestorProvider>
```

### 3.3 Complex Conditional Rendering

**ReportDeliveryCenter.tsx (lines 430-448):**
```typescript
{processMutation.isPending || queueMutation.isPending ? (
  <Loader2 className="animate-spin" />
) : (stats?.queued ?? 0) > 0 ? (
  "Send via..."
) : (stats?.statements_generated ?? 0) > 0 ? (
  "Queue & Send..."
) : (
  "No statements"
)}
```

**Issue:** 4 levels of ternary nesting reduces readability.

**Fix:** Extract to helper function:
```typescript
const getButtonLabel = () => {
  if (isProcessing) return <Loader2 />;
  if (stats?.queued > 0) return "Send via...";
  if (stats?.statements_generated > 0) return "Queue & Send...";
  return "No statements";
};
```

---

## Part 4: Low Priority Enhancements

### 4.1 Inconsistent Naming Conventions

| Pattern | Examples | Recommendation |
|---------|----------|----------------|
| Service naming | `adminService`, `investorDataService`, `systemAdminService` | Standardize to `<domain>Service.ts` |
| Hook naming | `useAdminInvestorPositions`, `useInvestorActivePositions` | Clarify domain ownership |
| Component naming | `AddTransactionDialog`, `TransactionFormDialog` | Pick one pattern |

### 4.2 Missing Index Files

Several directories lack barrel exports:
- `src/components/admin/` - No `index.ts`
- `src/services/admin/` - Partial exports
- `src/hooks/data/admin/` - No consolidated export

**Fix:** Add index files for cleaner imports:
```typescript
// src/services/admin/index.ts
export * from './adminService';
export * from './systemAdminService';
export * from './yieldCrystallizationService';
```

### 4.3 Test Coverage Gaps

No test files found for:
- `YieldOperationsPage.tsx` (most complex page)
- `ReportDeliveryCenter.tsx`
- `AddTransactionDialog.tsx`
- Critical RPC services

**Recommendation:** Add integration tests for:
1. Transaction creation flow
2. Yield distribution workflow
3. Withdrawal approval flow

---

## Part 5: Ordered Action Plan

### CRITICAL (Block deployment)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1 | Fix RPC parameter mismatches | `transactionService.ts`, `yieldDistributionService.ts` | 2-4 hours |
| 2 | Add typed response interfaces | All service files with `any` casts | 4-6 hours |
| 3 | Standardize error handling | Create `@/lib/errorHandler.ts` | 2-3 hours |

### HIGH PRIORITY (This sprint)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 4 | Extract formatting utilities | Create `@/utils/formatters.ts` | 1-2 hours |
| 5 | Extract system account utils | Create `@/utils/accountUtils.ts` | 1 hour |
| 6 | Split YieldOperationsPage | Create 4-5 sub-components | 4-6 hours |
| 7 | Split ReportDeliveryCenter | Create 3-4 sub-components | 3-4 hours |
| 8 | Move validation to services | `AddTransactionDialog.tsx` → backend | 2-3 hours |

### MEDIUM PRIORITY (Next sprint)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 9 | Consolidate IB hooks | `IBSettingsSection.tsx` → `useIBManagement` | 2-3 hours |
| 10 | Add InvestorContext | `InvestorManagementDrawer.tsx` | 2-3 hours |
| 11 | Split AdminOnboardingPage | Create form section components | 4-5 hours |
| 12 | Reduce service coupling | `adminService.ts` → interface injection | 3-4 hours |

### LOW PRIORITY (Backlog)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 13 | Add barrel exports | All major directories | 2 hours |
| 14 | Standardize naming conventions | Multiple files | 3-4 hours |
| 15 | Add integration tests | Critical workflows | 8-12 hours |
| 16 | Documentation | Architecture decision records | 4-6 hours |

---

## Appendix A: File Dependency Map

```
adminService.ts
├── investorDataService.ts (direct import)
├── supabase client (direct)
└── types/admin.ts

yieldDistributionService.ts
├── snapshotService.ts (import 4 functions)
├── yieldNotifications.ts (import)
├── yieldCrystallizationService.ts (import)
└── supabase client

transactionService.ts
├── crystService.ts (import)
├── positionService.ts (import)
└── supabase client
```

## Appendix B: Cyclomatic Complexity Hotspots

| Function | File | Complexity | Threshold |
|----------|------|------------|-----------|
| `onSubmit` | `AddTransactionDialog.tsx:219` | 8 | 5 |
| `getFilteredDistributions` | `YieldOperationsPage.tsx:268` | 6 | 5 |
| `handleApplyYield` | `YieldOperationsPage.tsx:188` | 5 | 5 |
| `renderActionButton` | `ReportDeliveryCenter.tsx:430` | 5 | 5 |

---

**Report Generated:** 2026-01-11
**Auditor:** Claude Code (Architecture Review)
**Status:** Read-Only Analysis Complete
