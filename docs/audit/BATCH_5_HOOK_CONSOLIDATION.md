# Batch 5: Hook Consolidation Analysis

## Scope
Consolidate overlapping React Query and subscription hooks across:
- Fund data hooks (3 hooks)
- Notification hooks (4 hooks)

## Current State: Fund Hooks

### useFunds.ts
```ts
export function useFunds(activeOnly?: boolean) {
  // Returns: { data: Fund[], isLoading, isFetching, error }
  // Fetches all funds if activeOnly=false, active-only if activeOnly=true
}

export function useFund(fundId: string) { ... }
export function useCreateFund() { ... }
export function useUpdateFund() { ... }
export function useDeactivateFund() { ... }
```

**Usage:**
- YieldHistoryPage: `useFunds(true)`
- AdminWithdrawalsPage: `useFunds(true)`
- YieldDistributionsPage: `useFunds(true)`
- QuickYieldEntry: `useFunds(true)`

### useActiveFunds.ts
```ts
export function useActiveFunds() {
  // Calls: investorService.getAllFunds()
  // Returns: { data: Fund[], isLoading, ... }
}
```

**Usage:**
- AddTransactionDialog: `useActiveFunds()`
- InvestorEnrichment has its own `useActiveFunds()` wrapper

### useAvailableFunds.ts
```ts
export function useAvailableFunds() {
  // Calls: investorService.getAvailableFunds()
  // Returns: { data: Fund[], isLoading, ... }
}
```

**Usage:**
- No direct usage found in components

## Problem: Fund Hook Redundancy

**Current:**
- `useFunds(true)` → active-only (most common, 4 places)
- `useActiveFunds()` → active-only (2 places)
- `useAvailableFunds()` → available funds (0 direct usage)

**Issue:** Three different ways to get active funds. Inconsistent parameter naming (`activeOnly: boolean` vs separate hooks).

## Current State: Notification Hooks

### useNotifications.ts
```ts
export function useNotifications(userId: string) {
  // Returns: {
  //   notifications: Notification[],
  //   settings: NotificationSettings,
  //   unreadCount: number,
  //   markAsRead(id): Promise,
  //   deleteNotification(id): Promise,
  //   updateSettings(settings): Promise,
  //   clearAll(): Promise,
  //   subscribe(): Subscription
  // }
}

export function usePriceAlerts() { ... }
```

**Usage:**
- NotificationProvider.tsx: Full-featured (all methods)

### useNotificationBell.ts
```ts
export function useNotificationBell() {
  // Returns: {
  //   unreadCount: number,
  //   loading: boolean,
  //   refresh(): Promise
  // }
  // Subscriptions: INSERT/UPDATE on notifications table for current user
}
```

**Usage:**
- NotificationBell.tsx: Just unread count and loading state

### useRealtimeNotifications.ts
```ts
export function useRealtimeNotifications() {
  // Three hardcoded subscriptions:
  // 1. withdrawal_requests - status changes
  // 2. daily_yield_applications - new yields
  // 3. investors - status changes
  //
  // Returns: {
  //   notifications: RealtimeNotification[],
  //   clearNotifications(): void,
  //   removeNotification(id): void
  // }
  // Side effect: toast notifications on each event
}
```

**Usage:**
- RealtimeNotifications.tsx (admin/shared): Display real-time event stream with toast

### useRealtimeSubscription.ts
```ts
export function useRealtimeSubscription(config: SubscriptionConfig) {
  // Generic config-based real-time subscription wrapper
  // Handles: INSERT, UPDATE, DELETE events
  // Callbacks: onInsert, onUpdate, onDelete, onChange
}

export function useLedgerSubscription(investorId, onInvalidate) {
  // Specific helper for transactions_v2 subscriptions
}
```

**Usage:**
- InvestorTransactionsTab: transactions_v2
- AuditLogViewer: audit_log (2 subscriptions)
- ActivityFeed: multiple channel subscriptions
- PendingActionsPanel: withdrawal_requests
- InvestorOverviewPage: positions, transactions

## Problem: Notification Hook Redundancy

**Current:**
1. `useNotificationBell()` is a lightweight wrapper around `useNotifications()` functionality
2. `useRealtimeNotifications()` hardcodes three specific channels that could use `useRealtimeSubscription()`
3. Two subscription patterns: Supabase channels (useNotifications) vs postgres_changes (useRealtimeSubscription)

**Issue:**
- useNotificationBell duplicates logic that useNotifications already handles
- useRealtimeNotifications could be simplified to use useRealtimeSubscription presets
- Inconsistent subscription patterns across codebase

## Consolidation Recommendations

### Group 1: Fund Hooks (LOW RISK)

**Option A: Enhanced useFunds (Recommended)**

Replace:
```ts
useFunds(activeOnly?: boolean)
useActiveFunds()
useAvailableFunds()
```

With:
```ts
useFunds(options?: { status?: 'all' | 'active' | 'available' }) {
  // Default: status = 'all'
  // status='active': calls getAllFunds with filtering
  // status='available': calls getAvailableFunds
}
```

**Benefits:**
- Single parametrized hook instead of three
- Backward compatible: useFunds() still works (returns all)
- Clear parameter naming
- Reduces exports and cognitive load

**Implementation:**
1. Add `status` parameter to useFunds
2. Internally route to appropriate service call
3. Update all call sites
4. Delete useActiveFunds and useAvailableFunds files
5. Update exports in index.ts

**Impact:**
- 4 call sites of useFunds(true) → useFunds({ status: 'active' })
- 2 call sites of useActiveFunds() → useFunds({ status: 'active' })
- 0 call sites of useAvailableFunds() but keep option for future use

### Group 2: Notification Hooks (MEDIUM RISK)

**Option A: Consolidate useNotificationBell (Recommended)**

Replace:
```ts
export function useNotificationBell() { ... }
```

With:
```ts
// In useNotifications.ts, add export:
export function useNotificationBell() {
  const { unreadCount, loading, refetch } = useNotifications(userId);
  return { unreadCount, loading, refresh: refetch };
}
```

**Rationale:**
- useNotificationBell is a lightweight wrapper - just returns subset of useNotifications
- No code duplication needed
- Single source of truth for notification data
- Maintains current component interface

**Impact:**
- 1 file deleted (useNotificationBell.ts)
- 1 line added to useNotifications.ts
- 0 component changes
- 0 breaking changes

**Option B: Leave useRealtimeNotifications As-Is**

Rationale:
- It's a domain-specific preset for admin use case
- Hardcoding three channels is intentional (withdrawal, yield, investor events)
- Could be refactored to use useRealtimeSubscription, but adds complexity
- Currently working well, low benefit to refactor
- Deferring to future phase if needed

## Implementation Order

1. **Phase 1 (Fund Hooks):**
   - Modify useFunds to accept `{ status }` option
   - Update 6 call sites
   - Delete useActiveFunds.ts and useAvailableFunds.ts
   - Update src/hooks/data/shared/index.ts exports

2. **Phase 2 (Notification Hooks):**
   - Move useNotificationBell implementation into useNotifications.ts
   - Delete useNotificationBell.ts
   - Update src/hooks/data/shared/index.ts exports

## Files to Modify

**Modified:**
- src/hooks/data/shared/useFunds.ts
- src/hooks/data/shared/useNotifications.ts
- src/hooks/data/shared/index.ts
- 6 component/hook files that call useFunds/useActiveFunds

**Deleted:**
- src/hooks/data/shared/useActiveFunds.ts
- src/hooks/data/shared/useAvailableFunds.ts
- src/hooks/data/shared/useNotificationBell.ts

**Kept as-is (wide usage, generic):**
- src/hooks/data/shared/useRealtimeSubscription.ts

## Risk Assessment

- **Fund Hooks**: LOW RISK
  - Single parametrized hook reduces complexity
  - All call sites within Edific codebase (no external consumers)
  - Easy to test and verify

- **Notification Bell**: LOW RISK
  - Just moving implementation, no logic changes
  - Single call site (NotificationBell.tsx)
  - Return interface stays identical

- **Overall**: LOW RISK consolidation
  - No behavioral changes
  - All refactoring is internal to hook implementations
  - Components don't change
