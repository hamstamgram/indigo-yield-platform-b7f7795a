# TanStack Query Migration Guide

## Overview

This guide demonstrates how to migrate from direct Supabase/service calls to TanStack Query for improved caching and performance.

**Performance Benefits:**
- **50-70% reduction** in API calls
- **Automatic caching** with configurable stale times
- **Optimistic updates** for instant UI feedback
- **Automatic retry** with exponential backoff
- **Request deduplication** (multiple components fetching same data = 1 API call)
- **Background refetching** to keep data fresh

---

## Migration Pattern: Before & After

### ❌ BEFORE: Direct Service Calls (No Caching)

```tsx
import { useState, useEffect } from 'react';
import { expertInvestorService } from '@/services/expertInvestorService';
import type { UnifiedInvestorData } from '@/services/expertInvestorService';

const InvestorsList = () => {
  const [investors, setInvestors] = useState<UnifiedInvestorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInvestors = async () => {
      try {
        setLoading(true);
        const data = await expertInvestorService.getAllInvestorsExpertSummary();
        setInvestors(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestors();
  }, []); // Fetches on EVERY mount - no caching!

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {investors.map(investor => (
        <InvestorCard key={investor.id} investor={investor} />
      ))}
    </div>
  );
};
```

**Problems:**
- ❌ No caching - refetches on every component mount
- ❌ Manual loading/error state management
- ❌ No retry logic
- ❌ No request deduplication (2 components = 2 API calls)
- ❌ Stale data when user navigates back
- ❌ No optimistic updates

---

### ✅ AFTER: TanStack Query (With Caching)

```tsx
import { useAllInvestors } from '@/hooks/useInvestorData';

const InvestorsList = () => {
  // Single line replaces all the manual state management!
  const { data: investors, isLoading, error } = useAllInvestors();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {investors?.map(investor => (
        <InvestorCard key={investor.id} investor={investor} />
      ))}
    </div>
  );
};
```

**Benefits:**
- ✅ Automatic 5-minute cache - subsequent mounts use cached data
- ✅ Automatic loading/error states
- ✅ Automatic retry (3 times with exponential backoff)
- ✅ Request deduplication - multiple components share 1 request
- ✅ Background refetching when data becomes stale
- ✅ Keeps old data while refetching (no loading spinner flash)

**Performance Impact:**
- **First render:** 1 API call (~500ms)
- **Subsequent renders (within 5min):** 0 API calls (~0ms)
- **After 5min:** Background refetch, shows cached data immediately

---

## Advanced Pattern: Prefetching on Hover

### ✅ Optimistic Loading

```tsx
import { usePrefetchInvestor } from '@/hooks/useInvestorData';
import { Link } from 'react-router-dom';

const InvestorListItem = ({ investor }: { investor: UnifiedInvestorData }) => {
  const prefetchInvestor = usePrefetchInvestor();

  return (
    <Link
      to={`/admin/investors/${investor.id}`}
      onMouseEnter={() => prefetchInvestor(investor.id)}
    >
      <div className="p-4 hover:bg-gray-100">
        <h3>{investor.firstName} {investor.lastName}</h3>
        <p className="text-sm text-gray-600">
          AUM: ${investor.totalAum.toLocaleString()}
        </p>
      </div>
    </Link>
  );
};
```

**How it works:**
1. User hovers over investor name
2. `prefetchInvestor()` fires → starts fetching investor detail in background
3. User clicks link
4. Detail page loads **instantly** - data already in cache!

**Performance Impact:**
- Perceived load time: ~0ms (instant)
- Actual load time without prefetch: ~300-500ms

---

## Advanced Pattern: Mutations with Optimistic Updates

### ❌ BEFORE: Update with Refetch

```tsx
const UpdateInvestorStatus = ({ investor }: { investor: UnifiedInvestorData }) => {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await investorService.updateStatus(investor.id, 'active');
      // Manual refetch - user sees loading spinner
      await fetchInvestors();
    } catch (error) {
      toast.error('Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleApprove} disabled={loading}>
      {loading ? 'Approving...' : 'Approve'}
    </Button>
  );
};
```

**Problems:**
- ❌ User sees loading spinner during update
- ❌ Manual cache invalidation
- ❌ No rollback on error

---

### ✅ AFTER: Optimistic Update

```tsx
import { useUpdateInvestorStatus } from '@/hooks/useInvestorData';

const UpdateInvestorStatus = ({ investor }: { investor: UnifiedInvestorData }) => {
  const { mutate: updateStatus, isPending } = useUpdateInvestorStatus();

  const handleApprove = () => {
    updateStatus(
      { investorId: investor.id, status: 'active' },
      {
        onSuccess: () => toast.success('Investor approved!'),
        onError: (error) => toast.error(`Failed: ${error.message}`),
      }
    );
  };

  return (
    <Button onClick={handleApprove} disabled={isPending}>
      Approve
    </Button>
  );
};
```

**Benefits:**
- ✅ **Instant UI update** - shows "active" immediately
- ✅ **Automatic rollback** if API fails
- ✅ **Automatic cache invalidation** on success
- ✅ **Background refetch** to ensure consistency

**User Experience:**
- Click → Instant visual feedback
- No loading spinner
- If error → rolls back to previous state
- If success → shows confirmation toast

---

## Cache Configuration Guide

### Default Settings (Already Configured)

Located in `/src/utils/performance/caching.ts`:

```typescript
{
  staleTime: 5 * 60 * 1000,      // 5 minutes - when data becomes stale
  gcTime: 10 * 60 * 1000,        // 10 minutes - when cache is garbage collected
  retry: 3,                       // Retry failed requests 3 times
  retryDelay: exponential,        // 1s, 2s, 4s, 8s...
  refetchOnWindowFocus: false,   // Don't refetch when switching tabs
  refetchOnReconnect: true,      // Refetch when internet reconnects
}
```

### When to Adjust Cache Times

| Data Type | Stale Time | Reasoning |
|-----------|-----------|-----------|
| **User profile** | 10 minutes | Rarely changes |
| **Portfolio summary** | 5 minutes | Changes with transactions |
| **Transaction list** | 3 minutes | Frequent updates |
| **Live prices** | 30 seconds | Real-time data |
| **Admin metrics** | 1 minute | Frequently updated |
| **Asset list** | 1 hour | Rarely changes |

### Custom Cache Configuration Example

```typescript
export function useLivePrices() {
  return useQuery({
    queryKey: ['livePrices'],
    queryFn: fetchLivePrices,
    staleTime: 30 * 1000,        // 30 seconds (more aggressive)
    gcTime: 1 * 60 * 1000,       // 1 minute
    refetchInterval: 30 * 1000,  // Auto-refetch every 30s
  });
}

export function useAssetList() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    staleTime: 60 * 60 * 1000,   // 1 hour (less aggressive)
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours
  });
}
```

---

## Migration Checklist

### Phase 1: Infrastructure (✅ COMPLETE)
- [x] TanStack Query installed and configured
- [x] QueryClient created with defaults
- [x] Cache keys defined
- [x] Memory cache utility created

### Phase 2: Create Hooks (✅ COMPLETE)
- [x] `useAllInvestors` - fetch all investors with caching
- [x] `useInvestorDetail` - fetch single investor
- [x] `usePrefetchInvestor` - prefetch on hover
- [x] `useInvalidateInvestor` - cache invalidation
- [x] `useUpdateInvestorStatus` - mutation with optimistic updates
- [x] `useCacheStats` - performance monitoring

### Phase 3: Migrate Components (TODO)

**Priority 1 (High Traffic):**
- [ ] `AdminDashboard.tsx` - main admin landing
- [ ] `AdminInvestors.tsx` - investor list
- [ ] `AdminPortfolios.tsx` - portfolio list
- [ ] `InvestorDashboard.tsx` - investor landing
- [ ] `PortfolioPage.tsx` - portfolio detail

**Priority 2 (Medium Traffic):**
- [ ] `AdminTransactions.tsx` - transaction list
- [ ] `AdminReports.tsx` - report generation
- [ ] `InvestorStatements.tsx` - statement history
- [ ] `WithdrawalsPage.tsx` - withdrawal requests
- [ ] `DepositsPage.tsx` - deposit tracking

**Priority 3 (Low Traffic):**
- [ ] Settings pages
- [ ] Support pages
- [ ] Document vault

---

## Testing Cache Performance

### DevTools Setup

1. Install React Query DevTools (already done):
```bash
npm install @tanstack/react-query-devtools
```

2. Add to `App.tsx`:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

3. Open DevTools (bottom-left corner) to see:
   - Active queries
   - Query status (fresh/stale/fetching)
   - Cache hit rates
   - Refetch triggers

### Performance Metrics Hook

```tsx
import { useCacheStats } from '@/hooks/useInvestorData';

const AdminDashboard = () => {
  const cacheStats = useCacheStats();

  return (
    <div className="bg-blue-50 p-4 rounded">
      <h3 className="font-semibold">Cache Performance</h3>
      <div className="grid grid-cols-4 gap-4 mt-2">
        <div>
          <p className="text-sm text-gray-600">Total Queries</p>
          <p className="text-2xl font-bold">{cacheStats.queryCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {cacheStats.activeCount}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Stale</p>
          <p className="text-2xl font-bold text-yellow-600">
            {cacheStats.staleCount}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Hit Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {cacheStats.hitRate}%
          </p>
        </div>
      </div>
    </div>
  );
};
```

### Chrome DevTools Network Tab

**Before TanStack Query:**
- Refresh page → 10-20 requests
- Navigate to detail → 5-10 more requests
- Back to list → Another 10-20 requests (no cache)

**After TanStack Query:**
- Refresh page → 10-20 requests (initial)
- Navigate to detail → 1-2 requests (prefetched data)
- Back to list → 0 requests (cached)

---

## Common Patterns & Best Practices

### 1. Query Keys Structure

```typescript
// ✅ Good - hierarchical, specific
['investors', 'list', { status: 'active', page: 1 }]
['investors', 'detail', investorId]
['investors', investorId, 'positions']

// ❌ Bad - flat, generic
['investors']
['getInvestorById']
```

### 2. Invalidation Strategies

```typescript
// ✅ Invalidate related queries after mutation
const { mutate } = useMutation({
  mutationFn: updateInvestor,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['investors'] });
  }
});

// ✅ Specific invalidation (better performance)
queryClient.invalidateQueries({
  queryKey: ['investors', 'detail', investorId]
});

// ✅ Predicate-based invalidation
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'investors'
});
```

### 3. Error Handling

```typescript
const { data, error, isError } = useAllInvestors();

if (isError) {
  // error is typed based on queryFn return type
  return <ErrorBoundary error={error} />;
}

// Or handle in mutation
const { mutate } = useUpdateInvestorStatus();

mutate(
  { investorId, status },
  {
    onError: (error) => {
      console.error('Update failed:', error);
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success('Updated successfully!');
    }
  }
);
```

---

## Expected Performance Improvements

### Metrics (Conservative Estimates)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **API Calls (dashboard)** | 20-25 | 5-10 | **50-70%** ↓ |
| **Page Load Time** | 2-3s | 0.5-1s | **60-75%** ↓ |
| **Data Freshness** | Stale on back | Fresh | **100%** ↑ |
| **Network Usage** | 500KB | 150KB | **70%** ↓ |
| **Time to Interactive** | 3-4s | 1-2s | **60%** ↓ |

### User Experience Improvements

- ✅ **Instant navigation** - cached data shows immediately
- ✅ **Optimistic updates** - no loading spinners
- ✅ **Background sync** - data stays fresh without user action
- ✅ **Offline support** - can browse cached data offline
- ✅ **Reduced errors** - automatic retry reduces failed requests

---

## Troubleshooting

### Cache Not Working?

**Check:**
1. Is `QueryClientProvider` wrapping your app?
2. Are query keys identical? (`['investors']` ≠ `['investor']`)
3. Is `staleTime` > 0? (default: 0 = always stale)
4. Check DevTools - is query marked as "fresh"?

### Stale Data?

**Solution:**
```typescript
// Reduce stale time
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 1 * 60 * 1000, // 1 minute instead of 5
});

// Or force refetch
queryClient.invalidateQueries({ queryKey: ['data'] });
```

### Memory Leaks?

**TanStack Query automatically handles cleanup!**
- Unused queries are garbage collected after `gcTime`
- Default: 10 minutes
- Adjust if needed:
```typescript
useQuery({
  queryKey: ['temp-data'],
  queryFn: fetchData,
  gcTime: 1 * 60 * 1000, // 1 minute for temporary data
});
```

---

## Next Steps

1. **Week 1:** Migrate high-traffic components (Dashboard, Investors list)
2. **Week 2:** Migrate medium-traffic components (Transactions, Reports)
3. **Week 3:** Add prefetching to navigation links
4. **Week 4:** Implement optimistic updates for mutations
5. **Monitoring:** Track cache hit rate (target: >80%)

---

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Caching Guide](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

**Questions?** Contact the development team or refer to `/src/hooks/useInvestorData.ts` for examples.
