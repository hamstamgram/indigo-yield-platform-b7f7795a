
# Architecture Cleanup Implementation Plan

## Overview
This plan implements Phase 1 (Quick Wins) and Phase 2 fixes from the architecture audit. These are low-risk, high-impact changes that improve code organization without major refactoring.

---

## Phase 1: Quick Wins (30 minutes)

### 1.1 Delete Deprecated `positionService.ts`

**Action**: Delete `src/services/shared/positionService.ts`

**Rationale**: 
- Already marked `@deprecated` with migration guide
- NOT exported from `shared/index.ts` (only a comment exists)
- No active imports found in codebase
- The canonical service is `src/services/investor/investorPositionService.ts`

---

### 1.2 Consolidate Duplicate Settings Pages

**Current State**:
- `/admin/settings` → `AdminSettingsPage.tsx` (minimal placeholder UI)
- `/admin/settings-platform` → `AdminSettings.tsx` (full implementation with form)

**Action**: 
1. Update `src/routing/routes/admin/system.tsx` to use `AdminSettings.tsx` for the main `/admin/settings` route
2. Delete `src/pages/admin/AdminSettingsPage.tsx` (the placeholder)
3. Update `src/routing/LazyRoutes.tsx` to remove duplicate lazy import

**Files to Modify**:
```
src/routing/routes/admin/system.tsx:
- Line 10: Keep AdminSettingsNew import
- Line 11: Remove AdminSettingsPage import
- Lines 29-35: Change to use AdminSettingsNew for /admin/settings
- Lines 39-46: Remove legacy route

src/routing/LazyRoutes.tsx:
- No changes needed (already has AdminSettings)
```

---

### 1.3 Add Missing Barrel Exports

**Create `src/components/sidebar/index.ts`**:
```typescript
/**
 * Sidebar Components
 * Navigation and user profile components for the sidebar
 */

export { default as LogoutButton } from "./LogoutButton";
export { default as NavSection } from "./NavSection";
export { default as UserProfile } from "./UserProfile";
```

**Create `src/components/error/index.ts`**:
```typescript
/**
 * Error Handling Components
 * Error boundaries and fallback UI components
 */

export { ErrorBoundary } from "./ErrorBoundary";
export { FinancialErrorBoundary } from "./FinancialErrorBoundary";
```

---

### 1.4 Refactor AdminOperationsHub to Use Hook Pattern

**Current Anti-Pattern** (lines 34-46):
```typescript
const [metrics, setMetrics] = useState({...});
const [pendingBreakdown, setPendingBreakdown] = useState<PendingBreakdown>({...});
const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
```

**Solution**: Create a dedicated React Query hook

**Create `src/hooks/data/admin/useOperationsMetrics.ts`**:
```typescript
import { useQuery } from "@tanstack/react-query";
import { operationsService } from "@/services/operations/operationsService";
import { getSystemHealth } from "@/services/core/systemHealthService";
import { QUERY_KEYS } from "@/constants/queryKeys";

export function useOperationsMetrics() {
  return useQuery({
    queryKey: QUERY_KEYS.operationsMetrics(),
    queryFn: async () => {
      const [metricsData, yesterdayCount] = await Promise.all([
        operationsService.getMetrics(),
        operationsService.getYesterdayTransactions(),
      ]);
      
      const trend = operationsService.calculateTrend(
        metricsData.todaysTransactions,
        yesterdayCount
      );
      
      return {
        pendingApprovals: metricsData.pendingApprovals,
        todaysTransactions: metricsData.todaysTransactions,
        activeInvestors: metricsData.activeInvestors,
        totalAUM: metricsData.totalAUM,
        transactionTrend: trend,
        pendingBreakdown: operationsService.getPendingBreakdown(metricsData),
      };
    },
    staleTime: 30_000, // 30 seconds
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.systemHealth(),
    queryFn: getSystemHealth,
    staleTime: 60_000, // 1 minute
  });
}
```

**Update `src/constants/queryKeys.ts`**: Add new keys:
```typescript
operationsMetrics: () => ["operationsMetrics"] as const,
systemHealth: () => ["systemHealth"] as const,
```

**Refactor `AdminOperationsHub.tsx`**: Replace useState with hooks

---

## Phase 2: Type Safety Improvements

### 2.1 Remove `as any` Cast in Operations Service

**File**: `src/services/operations/operationsService.ts`

**Pattern to Fix**:
```typescript
// Current
const withdrawalsResult = results[0] as any;

// Fixed - Create proper interface
interface OperationsQueryResults {
  withdrawals: { count: number }[];
  deposits: { count: number }[];
  // ...
}
```

---

## Implementation Order

| Step | File | Action | Risk |
|------|------|--------|------|
| 1 | `src/services/shared/positionService.ts` | DELETE | None - not imported |
| 2 | `src/components/sidebar/index.ts` | CREATE | None - new file |
| 3 | `src/components/error/index.ts` | CREATE | None - new file |
| 4 | `src/pages/admin/AdminSettingsPage.tsx` | DELETE | Low - unused route |
| 5 | `src/routing/routes/admin/system.tsx` | MODIFY | Low - route consolidation |
| 6 | `src/hooks/data/admin/useOperationsMetrics.ts` | CREATE | None - new file |
| 7 | `src/constants/queryKeys.ts` | MODIFY | None - adding keys |
| 8 | `src/hooks/data/admin/exports/system.ts` | MODIFY | None - re-export hook |
| 9 | `src/pages/admin/AdminOperationsHub.tsx` | MODIFY | Low - same behavior |

---

## Expected Outcomes

1. **Cleaner imports**: `import { ErrorBoundary } from "@/components/error"`
2. **No deprecated code**: Removed dead `positionService.ts`
3. **Single settings page**: No confusion about which to edit
4. **Consistent patterns**: All admin pages use React Query hooks
5. **Better caching**: Operations metrics cached properly

---

## Testing After Implementation

1. Navigate to `/admin/settings` - should show full settings form
2. Navigate to `/admin/operations` - should display metrics
3. Verify no TypeScript errors after deletions
4. Run `npm run build` to ensure no broken imports
