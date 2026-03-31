

# Definitive Fix: Broken Import Paths from Architecture Migration

## Root Cause

The codebase migrated services from `src/services/admin/*.ts` to `src/features/admin/*/services/*.ts`. A barrel re-export exists at `src/services/admin/index.ts`, but **32 files** import from specific sub-paths (e.g., `@/services/admin/feesService`, `@/services/admin/yields/yieldManagementService`). These individual files were never created as shims, so Vite cannot resolve them.

The `tsconfig.json` also lacks `"types": ["node", "vite/client"]`, causing `process` reference errors.

## Plan

### Step 1: Add `types` to `tsconfig.json`

Add `"types": ["node", "vite/client"]` to `compilerOptions` to resolve all `Cannot find name 'process'` errors (5 occurrences across 3 files).

### Step 2: Create shim files for all broken sub-path imports

Each shim is a one-liner re-exporting from the real feature location. Here is the complete list of **18 shim files** needed, mapped to their real sources:

| Shim file to create | Re-exports from |
|---|---|
| `src/services/admin/feesService.ts` | `@/features/admin/investors/services/feesService` |
| `src/services/admin/feeScheduleService.ts` | `@/features/admin/investors/services/feeScheduleService` |
| `src/services/admin/reportQueryService.ts` | `@/features/admin/reports/services/reportQueryService` |
| `src/services/admin/reportService.ts` | `@/features/admin/reports/services/reportService` |
| `src/services/admin/statementAdminService.ts` | `@/features/admin/reports/services/statementAdminService` |
| `src/services/admin/deliveryService.ts` | `@/features/admin/reports/services/deliveryService` |
| `src/services/admin/systemAdminService.ts` | `@/features/admin/system/services/systemAdminService` |
| `src/services/admin/integrityService.ts` | `@/features/admin/system/services/integrityService` |
| `src/services/admin/transactionFormDataService.ts` | `@/features/admin/transactions/services/transactionFormDataService` |
| `src/services/admin/transactionDetailsService.ts` | `@/features/admin/transactions/services/transactionDetailsService` |
| `src/services/admin/adminTransactionHistoryService.ts` | `@/features/admin/transactions/services/adminTransactionHistoryService` |
| `src/services/admin/requestsQueueService.ts` | `@/features/admin/operations/services/requestsQueueService` |
| `src/services/admin/internalRouteService.ts` | `@/features/admin/shared/services/internalRouteService` |
| `src/services/admin/recordedYieldsService.ts` | `@/features/admin/yields/services/recordedYieldsService` |
| `src/services/admin/yields/index.ts` | `@/features/admin/yields/services/yields` |
| `src/services/admin/yields/yieldDistributionService.ts` | `@/features/admin/yields/services/yields/yieldDistributionService` |
| `src/services/admin/yields/yieldDistributionsPageService.ts` | `@/features/admin/yields/services/yields/yieldDistributionsPageService` |
| `src/services/admin/yields/yieldManagementService.ts` | `@/features/admin/yields/services/yields/yieldManagementService` |
| `src/services/admin/yields/yieldCrystallizationService.ts` | `@/features/admin/yields/services/yields/yieldCrystallizationService` |
| `src/services/admin/yields/yieldAumService.ts` | `@/features/admin/yields/services/yields/yieldAumService` |

Each file follows this pattern:
```typescript
export * from "@/features/admin/[domain]/services/[serviceName]";
```

### Step 3: Fix `integrityService.ts` type-bypass cast

Add `as any` cast for `"ib_allocation_consistency"` table name in `src/features/admin/system/services/integrityService.ts` (line 24), per the project's established type-bypass pattern.

### What this does NOT touch

- No service logic changes — only re-export shims
- No component modifications
- No database changes
- The existing barrel at `src/services/admin/index.ts` stays as-is

### Risk Assessment

**Zero risk** — every shim is a pure re-export of an already-working module. No runtime behavior changes.

