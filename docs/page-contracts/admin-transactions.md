# Admin Transactions Page Contract

## Route
`/admin/transactions`

## Purpose
Allows administrators to view, filter, and manage all financial transactions across the platform, including deposits, withdrawals, yields, and manual adjustments.

## Data Dependencies

### Primary Tables
- `transactions_v2` - Core transaction records
- `profiles` - Investor names and details
- `funds` - Fund information for filtering

### Query Keys
- `QUERY_KEYS.adminTransactions`
- `QUERY_KEYS.adminTransactionsHistory(filters)`
- `QUERY_KEYS.transactions()`
- `QUERY_KEYS.profiles`
- `QUERY_KEYS.funds`

## User Actions

### View Transactions
- Filter by date range, type, status, fund, investor
- Search by transaction reference or investor name
- Paginate through results
- Sort by date, amount, type

### Create Manual Transaction
- Select investor and fund
- Enter amount and transaction type
- Add notes/description
- Submit for processing

### Void Transaction
- Select transaction to void
- Enter void reason
- Confirm void action
- System creates reversal entry

### Export Data
- Export filtered results to CSV/Excel
- Include all visible columns

## Cache Invalidation
After transaction operations, invalidate:
- `QUERY_KEYS.transactions()`
- `QUERY_KEYS.adminTransactions`
- `QUERY_KEYS.investorPositions()`
- `QUERY_KEYS.fundAumAll`
- `QUERY_KEYS.dashboardStats`

Use `invalidateAfterTransaction()` from `@/utils/cacheInvalidation`

## Components
- `AdminTransactionsPage` - Main page container
- `TransactionFilters` - Filter controls
- `TransactionTable` - Data table with actions
- `AddTransactionDialog` - Manual transaction form
- `VoidTransactionDialog` - Void confirmation

## Hooks
- `useAdminTransactionHistory` - Paginated transaction list
- `useTransactionMutations` - Create/void operations
- `useProfiles` - Investor lookup
- `useFunds` - Fund options

## Permissions
- Requires `admin` role
- Void operations may require `super_admin`
