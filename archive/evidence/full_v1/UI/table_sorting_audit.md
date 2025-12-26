# Table Sorting Audit

## Generated: 2024-12-22

## Summary

Column sorting has been implemented for the Report Delivery Center table.

## Implementation

### Hook: `useSortableColumns`
Location: `src/hooks/useSortableColumns.ts`

Features:
- Generic sortable hook for any data array
- Tri-state sorting: ascending → descending → unsorted
- Handles nested object paths (e.g., `profiles.first_name`)
- Automatic date string detection and sorting
- Null/undefined handling

### Component: `SortableTableHead`
Location: `src/components/ui/sortable-table-head.tsx`

Features:
- Visual sort indicators (up/down chevrons)
- Hover state with muted background
- Unsorted state shows subtle double-chevron icon

## Tables Updated

### Report Delivery Center (`ReportDeliveryCenter.tsx`)

| Column | Sort Key | Sortable |
|--------|----------|----------|
| Investor | `profiles.first_name` | ✅ |
| Email | `recipient_email` | ✅ |
| Mode | `delivery_mode` | ✅ |
| Status | `status` | ✅ |
| Attempts | `attempt_count` | ✅ |
| Sent | `sent_at` | ✅ |
| Delivered | `delivered_at` | ✅ |
| Error | - | ❌ (not sortable) |
| Actions | - | ❌ (not sortable) |

Default sort: `created_at` descending

## Usage Example

```typescript
import { useSortableColumns } from '@/hooks/useSortableColumns';
import { SortableTableHead } from '@/components/ui/sortable-table-head';

const { sortConfig, requestSort, sortedData } = useSortableColumns(
  data,
  { column: 'created_at', direction: 'desc' }
);

// In table header:
<SortableTableHead 
  column="status" 
  currentSort={sortConfig} 
  onSort={requestSort}
>
  Status
</SortableTableHead>

// In table body:
{sortedData.map(item => ...)}
```

## Future Improvements

- Add sorting to Investor Management table
- Add sorting to Transaction History table
- Add multi-column sorting support
- Add server-side sorting for large datasets
