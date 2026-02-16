
# Comprehensive Codebase and Backend Audit Report

## Executive Summary

The platform has a well-defined layered architecture (Components > Hooks > Services > DB) with strong foundations: a contract-first design (`src/contracts/`), an RPC gateway (`src/lib/rpc/`), and typed database views (`src/lib/db/viewTypes.ts`). However, there are structural inconsistencies, leftover legacy code, and organizational gaps that reduce maintainability and increase cognitive load.

14 findings are organized below from most critical to optional.

---

## 1. Investor Domain Has No `src/features/investor/` (Critical -- Structural Gap)

The admin domain is 95% migrated to `src/features/admin/` with well-organized subdirectories (dashboard, funds, investors, transactions, yields, etc.). The investor domain, however, is fragmented across **four separate locations**:

- `src/pages/investor/` -- 7 page files + 3 subdirectories
- `src/components/investor/` -- 4 small component files across 4 subdirs
- `src/hooks/data/investor/` -- 23 hook files
- `src/services/investor/` -- 14 service files

There is no `src/features/investor/` directory at all.

**Recommendation**: Create `src/features/investor/` mirroring the admin pattern (portfolio, statements, transactions, settings, withdrawals subdomains). Move investor pages and components into it. This is the single highest-impact structural change.

---

## 2. `src/services/api/` -- Misplaced and Partially Dead (Critical -- Dead Code)

Two files exist in `src/services/api/`:

- **`reportsApi.ts`** (330 lines) -- A `ReportsApi` class where 4 of 7 public methods return empty arrays or `null` because the underlying tables (`generated_reports`, `report_access_logs`) were dropped. Only the `report_schedules` CRUD remains functional.
- **`statementsApi.ts`** (954 lines) -- A large procedural file with direct `supabase.from()` queries, `auth.getUser()` calls, and HTML generation logic mixed together. This is the biggest single-file service-layer-isolation violator.

Both files sit in an `api/` directory that does not conform to the established `services/{domain}/` pattern.

**Recommendation**:
- Move functional `report_schedules` CRUD from `reportsApi.ts` into `src/services/admin/reportService.ts`. Delete dead methods.
- Break `statementsApi.ts` into `src/services/admin/` subdomain files (e.g., period CRUD, statement generation, email delivery). It currently mixes data access, business logic, and presentation (HTML generation).

---

## 3. `src/services/shared/` -- Oversized Catch-All (High -- Structural)

This directory has **17 files** spanning wildly different domains:

| File | Actual Domain |
|------|---------------|
| `authService.ts` | Auth (duplicate of `src/services/auth/`) |
| `transactionService.ts` | Transactions |
| `performanceService.ts` (584 lines) | Reporting/Performance |
| `performanceDataService.ts` (231 lines) | Reporting/Performance |
| `profileService.ts` | Investor/Profile |
| `statementsService.ts` | Statements |
| `investorDataExportService.ts` | GDPR/Compliance |
| `historicalDataService.ts` | Reporting |

The `shared/` directory has become a dumping ground. Files like `performanceService.ts` and `performanceDataService.ts` are large, domain-specific modules that belong in `services/admin/` or `services/reports/`.

**Recommendation**: Redistribute files to their correct domain directories. Keep only truly cross-cutting utilities (audit logging, storage, system config, notifications) in `shared/`.

---

## 4. Dual Auth Services (High -- Duplication)

Two separate auth service files exist:
- `src/services/auth/authService.ts` -- Full auth operations (sign in, sign up, sign out, password reset, OTP, OAuth) -- 206 lines
- `src/services/shared/authService.ts` -- Just `getCurrentUser()` and `getCurrentUserOptional()` -- 49 lines

Both are exported through their respective barrels. Consumers must know which one to import from.

**Recommendation**: Merge `shared/authService.ts` functions into `services/auth/authService.ts`. Update the shared barrel to re-export from auth.

---

## 5. Eight `@deprecated` Functions Still in Codebase (Medium -- Dead Code)

The previous audit flagged these and added `@deprecated` tags, but the functions themselves were not removed:

1. `feesService.getActiveFunds()` -- delegates to `fundService`
2. `profileService.getActiveFunds()` -- same
3. `profileSettingsService.changePassword()` -- delegates to `authService`
4. `authService.sendPasswordResetEmail()` -- delegates to `resetPasswordForEmail`
5. `investorPositionService.fetchPendingInvites()` -- always returns `[]`
6. `investorPortalService.revokeSession()` -- no-op
7. `transactionsV2Service.TransactionV2` type alias -- alias for `TransactionRecord`
8. `reportUpsertService.upsertInvestorReport()` -- replaced by `strictInsertStatement`

These add noise and confuse new contributors.

**Recommendation**: Delete all 8 deprecated exports. Search for any remaining consumers and update them.

---

## 6. Class-Based Service Wrappers (Medium -- Pattern Inconsistency)

The codebase has 20+ class-based service wrappers (e.g., `InvestorDataService`, `FundServiceClass`, `ProfileService`, `AssetService`, `NotificationService`, etc.) that simply wrap functional exports. These add unnecessary indirection:

```typescript
// Pattern seen in many files:
class FundServiceClass {
  getAllFunds = listFunds;
  getFundById = getFund;
}
export const fundService = new FundServiceClass();
```

The project standard says to use functional exports. These classes exist only for backwards compatibility but are no longer needed since the functional versions are the canonical exports.

**Recommendation**: Audit consumers of each `xxxService.method()` pattern. Replace with direct function imports. Remove class wrappers in a phased approach (lowest-usage classes first).

---

## 7. `src/hooks/data/shared/` Contains Admin-Specific Hooks (Medium -- Misplacement)

Several hooks in the `shared/` directory are admin-only:
- `useDashboardMetrics.ts` -- admin dashboard metrics
- `useDashboardQueries.ts` -- admin dashboard queries
- `useInvestorEnrichment.ts` -- admin investor enrichment
- `useInvestorDetailHooks.ts` -- admin investor detail
- `useInvestorMutations.ts` -- admin investor mutations
- `useInvestorQueries.ts` -- admin investor queries

These are not "shared" -- they are admin-specific data hooks that should live in `src/hooks/data/admin/`.

**Recommendation**: Move these 6 files to `src/hooks/data/admin/exports/` or directly into the admin barrel.

---

## 8. Yield Service Sprawl (Medium -- Fragmentation)

The admin services directory has **8 yield-related files**:

1. `yieldApplyService.ts`
2. `yieldCrystallizationService.ts`
3. `yieldDistributionService.ts`
4. `yieldDistributionsPageService.ts`
5. `yieldHistoryService.ts`
6. `yieldManagementService.ts`
7. `yieldPreviewService.ts`
8. `yieldReportsService.ts`

Plus `recordedYieldsService.ts` and `depositWithYieldService.ts`. This makes it hard to know where new yield logic should go.

**Recommendation**: Consolidate into a `src/services/admin/yields/` subdirectory with a clear internal barrel, similar to how `src/services/admin/reports/` is organized.

---

## 9. `src/components/dashboard/index.ts` is Empty (Low -- Dead Module)

This file contains only a comment with no exports. It is a dead module.

**Recommendation**: Delete the file and directory.

---

## 10. Report Components Outside Feature Directory (Low -- Misplacement)

`src/components/reports/ReportHistory.tsx` and `src/components/reports/ReportBuilder.tsx` import directly from `src/services/api/reportsApi.ts`. These components should be in `src/features/admin/reports/components/` and should use hooks rather than calling service APIs directly.

**Recommendation**: Move to `src/features/admin/reports/components/`. Create corresponding hooks if they do not exist.

---

## 11. Redundant Performance Services (Low -- Duplication)

Two performance services exist in `shared/`:
- `performanceService.ts` (584 lines) -- Read-only queries, RoR calculations, formatting
- `performanceDataService.ts` (231 lines) -- CRUD operations on `investor_fund_performance`

Plus `src/services/admin/investorPerformanceService.ts` which handles admin-specific performance updates.

Three files for one domain table is excessive. The read vs. write split across two shared files is arbitrary.

**Recommendation**: Merge `performanceService.ts` and `performanceDataService.ts` into a single `performanceService.ts` in `services/admin/` (since only admins write performance data). Keep investor-facing reads as a thin wrapper.

---

## 12. `src/lib/security/` Has Two PII Redaction Files (Low -- Duplication)

- `redact-pii.ts` -- Full implementation
- `redact-pii-simple.ts` -- Simplified version

Having both creates confusion about which to use.

**Recommendation**: Consolidate into a single file with an optional `simple` mode parameter.

---

## 13. `src/hooks/admin/` vs `src/hooks/data/admin/` (Low -- Confusing Structure)

Two admin hook directories exist:
- `src/hooks/admin/` -- Contains `yield/` subdir and `useYieldOperationsState.ts`
- `src/hooks/data/admin/` -- Main admin data hooks

The first directory has only 2 files and overlaps conceptually with the second.

**Recommendation**: Move `src/hooks/admin/` contents into `src/hooks/data/admin/` for a single source of truth.

---

## 14. `src/utils/` Has Overlapping Numeric Utilities (Optional -- Cleanup)

Three files deal with numbers:
- `numeric.ts`
- `numericHelpers.ts`
- `financial.ts`

All provide number formatting and precision utilities. Some functions may overlap.

**Recommendation**: Audit for duplicates. Consolidate into `numericHelpers.ts` (the canonical file per project memory) and `financial.ts` (for finance-specific formatters).

---

## Prioritized Action Steps

| Step | Finding | Impact | Effort |
|------|---------|--------|--------|
| 1 | Delete 8 `@deprecated` functions (#5) | Reduces confusion immediately | Low |
| 2 | Merge dual auth services (#4) | Eliminates import ambiguity | Low |
| 3 | Delete empty `components/dashboard/` (#9) | Remove dead code | Trivial |
| 4 | Move admin hooks from `shared/` to `admin/` (#7) | Correct categorization | Low |
| 5 | Consolidate `services/api/` into proper domains (#2) | Remove dead code, fix isolation | Medium |
| 6 | Reorganize yield services into subdirectory (#8) | Reduce sprawl | Medium |
| 7 | Redistribute `services/shared/` files (#3) | Clean shared boundary | Medium |
| 8 | Remove class-based wrappers (#6) | Align with functional standard | Medium |
| 9 | Create `features/investor/` structure (#1) | Complete feature-first migration | High |
| 10 | Consolidate performance services (#11) | Reduce fragmentation | Medium |
| 11 | Move report components (#10) | Complete feature isolation | Low |
| 12 | Merge PII redaction files (#12) | Minor cleanup | Trivial |
| 13 | Merge hooks/admin directories (#13) | Single source of truth | Low |
| 14 | Consolidate numeric utilities (#14) | Minor cleanup | Low |

---

## Backend/RLS Notes

The previous audit addressed the critical backend issues (GRANT permissions, division-by-zero, insecure admin checks). The current RLS posture is solid with a consistent pattern of `is_admin()` for admin tables and `investor_id = auth.uid()` for investor tables. The `fund_aum_events` table still uses `profiles.is_admin` in its RLS policies rather than `is_admin()`, which was flagged in the prior audit's security memory. No new backend gaps were identified beyond what was already addressed.
