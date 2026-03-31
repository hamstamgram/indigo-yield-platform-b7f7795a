# Bolt's Journal - Performance Optimizations

## 2025-05-15 - N+1 Query Bottleneck in performanceService.ts
**Learning:** Identified an N+1 query pattern in `getPerAssetStats` and `buildPerformanceHistoryFromTxs` where transaction data for multiple funds was being fetched sequentially inside a loop. This pattern scales poorly as the number of investor positions increases.
**Action:** Use batch fetching for transactions and perform in-memory grouping/filtering to reduce database round-trips.

## 2025-05-15 - Scope Constraint: Avoid Infrastructure and Migration Tampering
**Learning:** Attempting to fix CI/CD infrastructure (switching from pnpm to npm) or renaming existing database migrations is out of scope for a performance optimization task and can lead to dangerous side effects in a production environment.
**Action:** Stick strictly to code-level optimizations within the requested scope. Address CI/CD issues only if they are directly related to the optimization or explicitly requested.

## 2025-05-15 - Database Migration Persistence in CI
**Learning:** Renaming existing migration files in Supabase, even without changing their content, causes CI failures (SQLSTATE 42P13) because the migration history/state is tied to the original filenames. The CI environment attempts to re-apply migrations that it thinks are new.
**Action:** Never rename or delete existing migration files. Always verify that migration files match the target branch exactly before submission.
