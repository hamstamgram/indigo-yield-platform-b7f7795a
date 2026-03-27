

# Fix: Yield History Allocation Columns (Fees Paid, IB Comm. empty + Remove Credits Earned)

## Problem

When expanding a distribution in the Yield History table, the "Fees Paid", "IB Comm.", and "Credits Earned" columns are always empty/"-". Root cause: the V5 yield engine writes `0` to `yield_allocations.fee_amount`, `ib_amount`, and `fee_credit`. The actual fee and IB data lives in the `fee_allocations` and `ib_allocations` tables respectively. The "Credits Earned" column maps to `fee_credit` which is always `0` and has no real-world meaning -- it should be removed.

## Data Verification

```text
yield_allocations.fee_amount  = always 0  (confirmed via DB query)
yield_allocations.ib_amount   = always 0  (confirmed via DB query)
yield_allocations.fee_credit  = always 0  (confirmed via DB query)

fee_allocations.fee_amount    = actual fee values (e.g. 56.80, 59.66, 78.03)
ib_allocations.ib_fee_amount  = actual IB values  (e.g. 14.20, 14.91, 19.50)
```

## Plan

### Step 1: Enrich allocations with real fee/IB data in the service layer

**File:** `src/services/admin/yields/yieldDistributionsPageService.ts`

- After fetching `yield_allocations`, also fetch `fee_allocations` and `ib_allocations` for ALL distribution IDs (not just the fallback set)
- Build lookup maps: `{distribution_id}:{investor_id}` -> `fee_amount` and `ib_fee_amount`
- When constructing `AllocationRow[]`, populate `fee_amount` and `ib_amount` from these maps instead of the zero values from `yield_allocations`

### Step 2: Remove "Credits Earned" column from UI

**File:** `src/features/admin/yields/components/YieldsTable.tsx`

- Remove the `<TableHead>Credits Earned</TableHead>` header (line 405)
- Remove the corresponding `<TableCell>` that renders `alloc.fee_credit` (lines 437-443)

### Step 3: Clean up the AllocationRow type

**File:** `src/services/admin/yields/yieldDistributionsPageService.ts`

- Remove `fee_credit` from the `AllocationRow` type definition (line 54)
- Remove `fee_credit` from the Supabase select query (line 201)

## Technical Details

The service enrichment query will look like:

```typescript
// Fetch fee_allocations for ALL distributions to enrich yield_allocations
const { data: allFeeRows } = await supabase
  .from("fee_allocations")
  .select("distribution_id, investor_id, fee_amount")
  .in("distribution_id", distributionIds)
  .eq("is_voided", false);

const { data: allIbRows } = await supabase
  .from("ib_allocations")
  .select("distribution_id, source_investor_id, ib_fee_amount")
  .in("distribution_id", distributionIds)
  .eq("is_voided", false);

// Build maps keyed by "distribution_id:investor_id"
const feeMap = new Map((allFeeRows || []).map(r => 
  [`${r.distribution_id}:${r.investor_id}`, r.fee_amount]
));
const ibMap = new Map((allIbRows || []).map(r => 
  [`${r.distribution_id}:${r.source_investor_id}`, r.ib_fee_amount]
));

// Enrich each allocation
allocations.forEach(a => {
  const key = `${a.distribution_id}:${a.investor_id}`;
  a.fee_amount = feeMap.get(key) || a.fee_amount;
  a.ib_amount = ibMap.get(key) || a.ib_amount;
});
```

### Files Changed
| File | Change |
|------|--------|
| `yieldDistributionsPageService.ts` | Enrich allocations with fee/IB data from their tables; remove `fee_credit` from type and query |
| `YieldsTable.tsx` | Remove "Credits Earned" column header and cell |

