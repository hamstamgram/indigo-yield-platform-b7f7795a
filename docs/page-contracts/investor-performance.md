# Investor Performance Page Contract

## Route
`/investor/performance`

## Purpose
Displays performance metrics and historical returns for the logged-in investor, broken down by asset class and time period.

## Data Dependencies

### Primary Tables
- `investor_positions` - Current holdings and balances
- `yield_distributions` - Historical yield records
- `funds` - Fund metadata and performance data
- `daily_nav` - Historical NAV for return calculations

### Query Keys
- `QUERY_KEYS.investorPerformance(assetCode)`
- `QUERY_KEYS.investorPositions(investorId)`
- `QUERY_KEYS.yieldDistributions()`
- `QUERY_KEYS.funds`

## User Actions

### View Performance
- See overall portfolio performance
- View returns by time period (MTD, QTD, YTD, ITD)
- Compare against benchmark indices
- Toggle between gross and net returns

### Filter by Asset
- Select specific asset class (BTC, ETH, etc.)
- View asset-specific performance metrics
- See yield history for selected asset

### View Charts
- Performance trend over time
- Asset allocation breakdown
- Yield distribution history

## Components
- `InvestorPerformancePage` - Main page container
- `PerformanceOverview` - Summary cards
- `PerformanceChart` - Time series visualization
- `AssetBreakdown` - Per-asset performance table
- `YieldHistory` - Historical yield list

## Hooks
- `useInvestorPerformance` - Performance calculations
- `useInvestorPositions` - Current holdings
- `useYieldData` - Historical yields

## Permissions
- Requires authenticated investor
- Only shows own data (RLS enforced)

## Performance Considerations
- Cache performance calculations (expensive queries)
- Use `staleTime: 5 * 60 * 1000` for performance data
- Lazy load historical chart data
