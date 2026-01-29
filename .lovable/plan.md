

# Date and Time Filter for Admin Transactions Page

## Current Behavior
The admin transactions page (`/admin/transactions`) filters using date-only inputs (`<input type="date">`) which query the `tx_date` column (a `date` type in the database). Users can only filter by date boundaries, not specific times.

## Proposed Change
Upgrade the date filters to include time selection, allowing administrators to filter transactions by both date AND time for more precise queries.

## Technical Approach

### Option Analysis

| Column | Type | Suitable for Time Filtering |
|--------|------|----------------------------|
| `tx_date` | date | No - only stores date (YYYY-MM-DD) |
| `created_at` | timestamptz | Yes - full timestamp with timezone |

**Recommendation**: Filter on `created_at` instead of `tx_date` when time filtering is enabled, since `tx_date` doesn't store time information.

---

## Implementation Details

### 1. Create a DateTimePicker Component
**File**: `src/components/ui/date-time-picker.tsx`

A reusable component that combines:
- Shadcn Calendar for date selection
- Time input (hours:minutes) for time selection
- Returns a full ISO datetime string

### 2. Update AdminTransactionsPage Filters
**File**: `src/pages/admin/transactions/AdminTransactionsPage.tsx`

Changes:
- Replace `<Input type="date">` with the new `DateTimePicker` component
- Update state from `dateFrom`/`dateTo` (date strings) to `datetimeFrom`/`datetimeTo` (ISO datetime strings)
- Update quick filter presets (This Month, Last Month, YTD) to include time (start of day / end of day)
- Pass datetime strings to the hook/service

### 3. Update Service Layer
**File**: `src/services/admin/adminTransactionHistoryService.ts`

Changes:
- Modify `fetchTransactions()` to filter on `created_at` column instead of `tx_date` when datetime values include time
- Use `gte` and `lte` with the full timestamp values
- Fallback to `tx_date` filtering if only date portion is provided (backward compatibility)

### 4. Update Type Definitions
**File**: `src/types/domains/transaction.ts`

Changes:
- Extend `AdminTransactionFilters` interface to support datetime:
```typescript
interface AdminTransactionFilters {
  fundId?: string;
  type?: TransactionType;
  dateFrom?: string;      // "YYYY-MM-DD" (date only, filters tx_date)
  dateTo?: string;
  datetimeFrom?: string;  // ISO timestamp (filters created_at)
  datetimeTo?: string;
  showVoided?: boolean;
  page?: number;
  pageSize?: number;
}
```

### 5. Update Query Keys
**File**: `src/hooks/data/admin/useAdminTransactionHistory.ts`

Include datetime values in query key for proper cache isolation.

---

## UI Design

### Filter Section Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Quick Filters: [This Month] [Last Month] [YTD] [Clear All]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From: [📅 Jan 15, 2026] [🕐 09:00]                            │
│                                                                 │
│  To:   [📅 Jan 29, 2026] [🕐 17:30]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The datetime picker will:
- Open a popover with calendar + time input
- Display selected date and time in a readable format
- Allow clearing the time portion to revert to date-only filtering

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/date-time-picker.tsx` | Reusable DateTimePicker component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/transactions/AdminTransactionsPage.tsx` | Replace date inputs with DateTimePicker, update state/logic |
| `src/services/admin/adminTransactionHistoryService.ts` | Add `created_at` filtering logic |
| `src/types/domains/transaction.ts` | Add `datetimeFrom`/`datetimeTo` to filters |
| `src/hooks/data/admin/useAdminTransactionHistory.ts` | Include datetime in query keys |
| `src/components/ui/index.ts` | Export new DateTimePicker component |

---

## Edge Cases

1. **Timezone handling**: Use local time for display, convert to ISO/UTC for database queries
2. **Partial input**: If user selects date but not time, default to start-of-day (00:00) for "from" and end-of-day (23:59:59) for "to"
3. **Quick presets**: This Month / Last Month / YTD will set time to 00:00:00 for start and 23:59:59 for end
4. **Backward compatibility**: If no time is specified, continue filtering on `tx_date` for consistency with existing behavior

---

## Testing Considerations

After implementation, verify:
- DateTime picker opens and allows date/time selection
- Quick filter buttons set correct datetime values
- Transactions filter correctly by timestamp
- Clearing filters resets both date and time
- Time zone handling works across different user locales

