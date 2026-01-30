
# Fix: Recorded Yields Page Displaying Wrong Records

## Problem Identified

**Two issues found:**

1. **Ghost records not filtered when no column filters are active**
   - The `YieldsTable.tsx` filter at lines 90-97 that hides `position_sync` records only runs when there are active column filters
   - When no column filters are applied, ghost sync records (like `tx_position_sync`) appear in the table

2. **Default filter hides transaction records**
   - `RecordedYieldsPage.tsx` defaults to `purpose: "reporting"` (line 63)
   - User's record has `purpose: "transaction"`, so it's hidden by default
   - The ghost record with `source: tx_position_sync` and `purpose: transaction` may be what the user saw

## Database Evidence

| aum_date | purpose | source | created_at | Status |
|----------|---------|--------|------------|--------|
| 2025-09-04 | transaction | tx_sync | Jan 30, 12:36 | User's intended record |
| 2025-09-02 | transaction | tx_sync | Jan 30, 12:32 | User's record |
| 2026-01-30 | transaction | tx_position_sync | Jan 30, 12:20 | Ghost sync record |

## Solution

### File 1: `src/components/admin/yields/YieldsTable.tsx`

**Move the ghost record filter to apply ALWAYS, not just when column filters are active:**

```typescript
// Current (broken) - filter only runs with active column filters
const filteredData = useMemo(() => {
  const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.trim() !== "");
  if (activeFilters.length === 0) return sortedData; // Bug: returns all including ghosts
  
  return sortedData.filter((record) => {
    // Ghost filter here is never reached when no column filters
    if (record.source?.includes("position_sync")) return false;
    // ...
  });
}, [columnFilters, sortedData]);

// Fixed - always filter ghost records first
const filteredData = useMemo(() => {
  // Step 1: Always filter out ghost/sync records
  const baseData = sortedData.filter((record) => {
    if (
      record.source?.includes("trigger:position_sync") ||
      record.source?.includes("tx_position_sync") ||
      record.source?.includes("position_sync")
    ) {
      return false;
    }
    return true;
  });
  
  // Step 2: Apply column filters if any
  const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.trim() !== "");
  if (activeFilters.length === 0) return baseData;
  
  return baseData.filter((record) => {
    // Column-based filtering logic...
  });
}, [columnFilters, sortedData]);
```

### File 2: `src/pages/admin/RecordedYieldsPage.tsx`

**Change default filter to show all purposes:**

```typescript
// Current
defaults: { fundId: "all", purpose: "reporting" },

// Fixed - show all purposes by default so transaction records are visible
defaults: { fundId: "all", purpose: "all" },
```

## Technical Summary

| Change | File | Impact |
|--------|------|--------|
| Always filter ghost records | YieldsTable.tsx | Prevents `position_sync` records from appearing |
| Default to all purposes | RecordedYieldsPage.tsx | Users see both transaction and reporting records |

## Testing After Implementation

1. Navigate to `/admin/recorded-yields`
2. Verify the ghost record (Jan 30, 2026, `tx_position_sync`) is NOT visible
3. Verify the user's actual record (Sep 4, 2025, `tx_sync`) IS visible
4. Confirm the purpose filter dropdown defaults to "All"
