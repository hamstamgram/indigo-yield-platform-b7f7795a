
# Fix: Force Purpose Filter to "All" on Page Load

## Problem

When navigating to the Recorded Yields page, if the URL contains a leftover `purpose` parameter (e.g., `?purpose=reporting`), the filter persists instead of resetting to "all". The current default system only applies when no URL parameter exists.

## Solution

Add a `useEffect` hook that clears the `purpose` URL parameter on initial page mount, forcing it to reset to "all" every time the page loads.

## Changes Required

**File: `src/pages/admin/RecordedYieldsPage.tsx`**

Add a `useEffect` after the `useUrlFilters` hook to clear the purpose filter on mount:

```typescript
// URL-persisted filters
const {
  filters: urlFilters,
  setFilter,
  clearFilters,
} = useUrlFilters({
  keys: ["fundId", "purpose", "dateFrom", "dateTo"],
  defaults: { fundId: "all", purpose: "all" },
});

// Force purpose to "all" on page load
useEffect(() => {
  setFilter("purpose", "all");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty dependency - run only on mount
```

## Technical Notes

| Aspect | Detail |
|--------|--------|
| File | `src/pages/admin/RecordedYieldsPage.tsx` |
| Change Type | Add useEffect hook after line 64 |
| Behavior | Clears any existing `purpose` URL param on mount |
| Side Effect | URL will not preserve purpose filter across page navigations |

## Testing

1. Navigate to `/admin/recorded-yields?purpose=reporting`
2. Page should load with purpose filter showing "All"
3. URL should no longer contain `purpose=reporting`
4. Both transaction and reporting records should be visible
