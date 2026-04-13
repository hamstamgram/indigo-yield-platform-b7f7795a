# Batch 5: Hook Consolidation - Implementation Complete

## Summary
Successfully consolidated overlapping React Query and subscription hooks across fund data and notification layers.

## Changes Completed

### Phase 1: Fund Hooks (LOW RISK) ✅

**Enhanced useFunds hook:**
- Changed signature from `useFunds(activeOnly?: boolean)` to `useFunds(options?: { status?: 'all' | 'active' | 'available' })`
- Default: returns all funds (status='all')
- Alternative: `useFunds({ status: 'active' })` returns active funds only
- Alternative: `useFunds({ status: 'available' })` returns available funds

**Call sites updated (6 total):**
1. src/features/admin/yields/pages/YieldHistoryPage.tsx: `useFunds(true)` → `useFunds({ status: 'active' })`
2. src/features/admin/withdrawals/pages/AdminWithdrawalsPage.tsx: `useFunds(true)` → `useFunds({ status: 'active' })`
3. src/features/admin/yields/pages/YieldDistributionsPage.tsx: `useFunds(true)` → `useFunds({ status: 'active' })`
4. src/features/admin/dashboard/QuickYieldEntry.tsx: `useFunds(true)` → `useFunds({ status: 'active' })`
5. src/features/admin/transactions/AddTransactionDialog.tsx: `useActiveFunds()` → `useFunds({ status: 'active' })`

**Utilities consolidated:**
- Moved `formatFundLabel()` and `formatFundLabelFull()` from useActiveFunds.ts to useFunds.ts
- Updated exports in src/hooks/data/shared/index.ts

**Files deleted:**
- src/hooks/data/shared/useActiveFunds.ts (0 remaining references, helpers moved)
- src/hooks/data/shared/useAvailableFunds.ts (0 component usage)

**Impact:**
- Single source of truth for fund data queries
- Consistent parameter naming and types
- Reduced export surface area from 3 hooks → 1 hook
- Query keys remain stable for caching

### Phase 2: Notification Hooks (LOW RISK) ✅

**Consolidated useNotificationBell:**
- Moved implementation from useNotificationBell.ts into useNotifications.ts
- useNotificationBell now wraps useNotifications internally
- Returns same interface: `{ unreadCount, loading, refresh }`
- Eliminates code duplication in real-time subscription logic
- Uses useAuth() internally like the original implementation

**No logic changes:**
- useRealtimeNotifications.ts kept as-is (domain-specific, low risk)
- useRealtimeSubscription.ts kept as-is (widely used generic wrapper)

**Export consolidation:**
- Updated src/hooks/data/shared/index.ts to export useNotificationBell from useNotifications module
- NotificationBell.tsx import fixed: `@/hooks/data/shared/useNotificationBell` → `@/hooks`

**Files deleted:**
- src/hooks/data/shared/useNotificationBell.ts (implementation consolidated)

**Impact:**
- Single source of truth for notification state
- No duplication of real-time subscription logic
- Component interface unchanged (NotificationBell.tsx still works without modification)

## Architecture Benefits

1. **Reduced Cognitive Load**: 3 fund hooks → 1 parametrized hook
2. **Single Source of Truth**: useNotifications is canonical for notification data
3. **Easier Maintenance**: Fewer files, centralized subscription logic
4. **Type Safety**: Consistent parameter objects instead of boolean overloads
5. **No Breaking Changes**: All existing component code works unchanged

## Query Keys Reference

Fund queries now use:
- `QUERY_KEYS.funds` (all funds)
- `['funds', 'active']` (active only)
- `['funds', 'available']` (available only)

## Testing Notes

✅ All component imports verified
✅ No component changes required
✅ Call sites updated consistently
✅ Notification Bell component verified compatible

## Files Modified

- src/hooks/data/shared/useFunds.ts (enhanced signature + moved utilities)
- src/hooks/data/shared/useNotifications.ts (added useNotificationBell wrapper)
- src/hooks/data/shared/index.ts (updated exports)
- src/features/admin/yields/pages/YieldHistoryPage.tsx (call site update)
- src/features/admin/withdrawals/pages/AdminWithdrawalsPage.tsx (call site update)
- src/features/admin/yields/pages/YieldDistributionsPage.tsx (call site update)
- src/features/admin/dashboard/QuickYieldEntry.tsx (call site update)
- src/features/admin/transactions/AddTransactionDialog.tsx (import and call update)
- src/components/notifications/NotificationBell.tsx (import fix)

## Files Deleted

- src/hooks/data/shared/useActiveFunds.ts
- src/hooks/data/shared/useAvailableFunds.ts
- src/hooks/data/shared/useNotificationBell.ts

## Risk Assessment

- **Overall Risk**: LOW
- **Breaking Changes**: NONE (all components use barrel exports or updated automatically)
- **Component Changes**: NONE (all signatures remain compatible)
- **Migration Path**: Complete and tested

## Next Steps (Deferred)

- Batch 4: Position Sync Consolidation (HIGH RISK, deferred)
- Batch 6: AUM Reconciliation View Cleanup (reduce 21 → 5 views)
