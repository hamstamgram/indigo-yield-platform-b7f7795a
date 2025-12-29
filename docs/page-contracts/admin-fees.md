# Admin Fees Page Contract

## Route
`/admin/fees`

## Purpose
Provides administrators with a comprehensive view of fee allocations, IB commissions, and fee routing audit trails for compliance and reconciliation.

## Data Dependencies

### Primary Tables
- `fee_allocations` - INDIGO management/performance fees
- `ib_allocations` - Introducing broker commissions
- `yield_distributions` - Source distributions for fees
- `profiles` - Investor and IB names
- `funds` - Fund metadata

### Query Keys
- `QUERY_KEYS.adminFeesOverview`
- `QUERY_KEYS.feeAllocations(fundId)`
- `QUERY_KEYS.ibAllocations(fundId)`
- `QUERY_KEYS.yieldDistributions(fundId)`

## User Actions

### View Fee Summary
- Total fees collected by period
- Breakdown by fee type (management, performance)
- IB commission totals
- Fee routing verification

### Filter & Search
- Filter by date range
- Filter by fund
- Filter by investor
- Search by allocation ID

### Audit Trail
- View fee calculation details
- See source yield distribution
- Verify fee percentages applied
- Track voided/corrected allocations

### Export
- Export fee report to CSV
- Generate PDF audit report

## Components
- `FeesOverviewPage` - Main page container
- `FeeSummaryCards` - Aggregate metrics
- `FeeAllocationTable` - Detailed allocations
- `IBCommissionTable` - IB payout details
- `FeeAuditPanel` - Calculation breakdown

## Hooks
- `useFees` - Fee overview data
- `useIBAllocationsForPayout` - IB commission data
- `useYieldData` - Source distributions

## Permissions
- Requires `admin` role
- Full fee details may require `super_admin`

## Calculations
- Management fee: `position_value * mgmt_fee_bps / 10000`
- Performance fee: `net_income * perf_fee_bps / 10000`
- IB commission: `source_net_income * ib_percentage / 100`
