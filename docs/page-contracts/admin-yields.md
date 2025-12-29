# Admin Yields Page Contract

## Route
`/admin/yields`

## Purpose
Allows administrators to view, create, edit, and void yield distributions across all funds, with full audit trail and correction capabilities.

## Data Dependencies

### Primary Tables
- `yield_distributions` - Core yield records
- `fee_allocations` - Associated fee deductions
- `ib_allocations` - Associated IB commissions
- `funds` - Fund metadata
- `investor_positions` - Position data for distribution

### Query Keys
- `QUERY_KEYS.yieldRecords`
- `QUERY_KEYS.recordedYields(filters)`
- `QUERY_KEYS.yieldDistributions(fundId)`
- `QUERY_KEYS.yieldDetails(recordId)`
- `QUERY_KEYS.canEditYields`
- `QUERY_KEYS.canVoidYield(recordId)`

## User Actions

### View Yields
- List all yield distributions
- Filter by fund, date range, status
- View yield details and breakdown
- See affected investors

### Create Yield Distribution
- Select fund and period
- Enter gross yield amount
- Preview fee and IB calculations
- Apply distribution

### Edit Yield
- Modify yield amount (if period not closed)
- Recalculate fees and IB allocations
- Preserve audit trail

### Void Yield
- Select distribution to void
- Enter void reason
- System creates reversal entries
- Recalculates affected positions

### Corrections
- View correction history
- Apply period corrections
- Track delta amounts

## Cache Invalidation
After yield operations, use `invalidateAfterYieldOp()`:
- `QUERY_KEYS.yieldRecords`
- `QUERY_KEYS.investorPositions()`
- `QUERY_KEYS.transactions()`
- `QUERY_KEYS.feeAllocations()`
- `QUERY_KEYS.ibAllocations()`

## Components
- `YieldOperationsPage` - Main page container
- `YieldRecordsTable` - List with filters
- `YieldDetailsPanel` - Breakdown view
- `CreateYieldDialog` - New distribution form
- `YieldPreview` - Pre-apply preview
- `VoidYieldDialog` - Void confirmation

## Hooks
- `useYieldData` - Yield records
- `useYieldOperations` - CRUD mutations
- `useFunds` - Fund options

## Permissions
- Requires `admin` role
- Void/edit requires period not closed
- Corrections require `super_admin`
