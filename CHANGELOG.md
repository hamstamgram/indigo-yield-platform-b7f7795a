# Changelog

All notable changes to the Indigo Yield platform.

## [1.0.1.0] - 2026-05-04

### Added
- Pure calculation engine (`packages/indigo-engine/`) with exact decimal arithmetic using decimal.js
- Event sourcing model with DEPOSIT, YIELD_RECORD, WITHDRAW, and REVERSE event types
- SOL and XRP fund yield distribution scenarios validated against Excel source of truth
- INDIGO FEES and IB balances now earn yield as investors in subsequent periods
- Void operations use compensating REVERSE events instead of destructive deletes
- Shared financial utilities package with unified precision configuration (50 digits, ROUND_HALF_UP)

### Removed
- Stale operations dashboard components (OperationsPage, OperationsStats, SystemStatus)
- Deprecated integrity monitor and monthly report scheduler Edge Functions
- Invariant checks cron migration
- Obsolete system health service

### Changed
- Financial utilities extracted to `packages/shared/financial.ts` as canonical source of truth
