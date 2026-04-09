

## Comprehensive Architecture Audit Report

### Executive Summary
The codebase is well-structured for a financial platform of this complexity. Feature-based modular architecture is correctly implemented, RLS is comprehensive, and the service layer separation is solid. The findings below are ordered from most impactful to optional polish.

---

### CRITICAL — Architectural Boundary Violations

#### 1. Bidirectional Feature Imports: `admin` ↔ `investor`
**Problem:** 15 files in `features/admin` import from `features/investor`, and 4 files in `features/investor` import from `features/admin`. This creates tight coupling between the two portals and violates the modular-feature-architecture standard.

**Examples (admin → investor):**
- `useAdminWithdrawals.ts` imports `withdrawalService` from `features/investor`
- `useTransactionForm.ts` imports `useInvestorBalance` from `features/investor/portfolio`
- `FeeScheduleSection.tsx` imports hooks from `features/investor/settings` and `features/investor/shared`
- `InvestorOverviewTab.tsx` imports `useInvestorOverview` from `features/investor`

**Examples (investor → admin):**
- `useInvestorSettings.ts` imports from `features/admin/investors/services`
- `useFeeSchedule.ts` imports `feeScheduleService` from `features/admin`
- `useInvestorYieldData.ts` imports yield services from `features/admin/yields`

**Fix:** Extract shared services (withdrawal, fee schedule, IB schedule, investor data queries) into `src/features/shared/services/` or `src/services/shared/`. Both portals should import from this neutral ground.

#### 2. `src/services/investor/index.ts` is a 148-line mega-barrel re-exporting from 8 feature paths
**Problem:** This barrel file re-exports functions from `features/investor/portfolio`, `features/investor/withdrawals`, `features/investor/yields`, `features/investor/transactions`, plus its own local services. It's a dependency magnet — any consumer importing from `@/services/investor` transitively pulls in half the investor feature tree.

**Fix:** Features should import directly from canonical service paths. This barrel should be thinned to only export the local services (`depositService`, `investmentService`, `fundViewService`, `investorPortalService`, `investorDataService`, `investorLookupService`).

---

### HIGH — Separation of Concerns Issues

#### 3. DB calls in a hook: `useInvestorInvite.ts`
**Problem:** `features/investor/shared/hooks/useInvestorInvite.ts` directly calls `supabase.from("platform_invites").insert(...)` inside a mutation handler. All other DB operations go through service files.

**Fix:** Move the insert into a service function (e.g., `adminInviteService.createInvite()`).

#### 4. Stale shim barrels with zero consumers
**Problem:** Several barrel files exist solely as backward-compatibility re-exports but have zero importers:
- `src/components/support/index.ts` — empty barrel, zero imports
- `src/components/admin/fees/index.ts` — re-exports from `features/admin/fees`, zero imports
- `src/components/profile/index.ts` — exports `OverviewTab`, zero imports
- `src/components/reports/index.ts` — re-exports from `features/admin/reports`, zero imports

**Fix:** Delete these dead barrel files.

#### 5. `src/templates/` — unused email template module
**Problem:** The `renderTemplate` function and all HTML templates are imported by nothing (confirmed: zero imports outside the file itself). Email sending is handled by edge functions which have their own templates.

**Fix:** Confirm whether edge functions duplicate this logic. If so, delete `src/templates/` entirely.

#### 6. `src/lib/statements/monthlyEmailGenerator.ts` — orphaned module
**Problem:** Zero imports anywhere in the codebase.

**Fix:** Delete the file.

---

### MEDIUM — Structural Improvements

#### 7. `src/hooks/data/shared/` is oversized (21 files)
**Problem:** This catch-all directory contains hooks for funds, assets, profiles, notifications, withdrawals, storage, and real-time subscriptions — all lumped together. It's hard to navigate and doesn't align with the feature-based structure used elsewhere.

**Fix:** Migrate domain-specific hooks into their feature directories over time (e.g., `useFundAUM.ts` → `features/admin/funds/hooks/`, `useWithdrawalFormData.ts` → `features/investor/withdrawals/hooks/`). Keep truly cross-cutting hooks (e.g., `useRealtimeSubscription`, `useStorage`) in `src/hooks/`.

#### 8. `src/services/shared/emailService.ts` — misplaced and likely dead
**Problem:** Email sending is an edge function concern. A client-side `emailService.ts` in shared services is architecturally wrong (the client can't send emails directly).

**Fix:** Verify usage; if it's just a type definition or stub, remove it.

#### 9. Dual notification services
**Problem:** Notifications are split between `src/services/shared/notificationService.ts` and `src/services/notifications/` (3 files: deposit, withdrawal, yield). This creates confusion about where notification logic lives.

**Fix:** Consolidate into `src/services/notifications/` or move domain-specific notification helpers alongside their feature services.

#### 10. `src/services/core/` contains admin-only services
**Problem:** `dataIntegrityService.ts`, `reportUpsertService.ts`, `systemHealthService.ts` are admin-only operations living under a generic "core" label.

**Fix:** Move to `src/features/admin/system/services/` where related services already exist.

---

### LOW — Code Quality and Maintainability

#### 11. `src/services/ib/` should move to `src/features/admin/ib/services/`
**Problem:** The IB management service is only consumed by admin IB hooks. Having it in a top-level `services/ib/` directory is inconsistent with the feature architecture.

#### 12. `src/lib/export/` contains only CSV export
**Problem:** A single file (`csv-export.ts`) in its own directory with a barrel. Could be a utility.

**Fix:** Move to `src/utils/export/csv-export.ts` (pure utility, no framework dependency).

#### 13. `src/lib/pdf/` contains statement-specific generators
**Problem:** `statementGenerator.ts` and `chart-export.ts` are domain-specific (reports/statements), not generic PDF infrastructure.

**Fix:** Move to `src/features/admin/reports/lib/` to co-locate with consumers.

#### 14. `src/components/account/` has 3 shared components
**Problem:** `ProfileTab`, `SecurityTab`, `NotificationsTab` are used by both admin and investor settings pages. They sit in `components/account/` which is fine but could be more discoverable as `components/settings/`.

**Fix:** Optional rename for clarity, or leave as-is.

---

### DATABASE — Clean

- DB linter: **zero issues**
- Security scan: **all findings are positive/informational** (properly ignored)
- RLS: **comprehensive across all 116 tables**
- All previous audit fixes verified clean

---

### Recommended Implementation Order

| Priority | Step | Files | Risk |
|----------|------|-------|------|
| 1 | Delete dead barrels (`components/support`, `components/admin/fees`, `components/profile`, `components/reports`) | 4 files | None |
| 2 | Delete orphaned modules (`lib/statements/monthlyEmailGenerator.ts`, verify `templates/`) | 1-7 files | None |
| 3 | Extract shared services to break admin↔investor coupling | ~8 services | Medium — requires updating 20+ import paths |
| 4 | Thin `services/investor/index.ts` mega-barrel | 1 file + importers | Medium |
| 5 | Move DB call from `useInvestorInvite.ts` to service layer | 2 files | Low |
| 6 | Relocate `services/core/` into `features/admin/system/services/` | 4 files | Low |
| 7 | Relocate `services/ib/` into `features/admin/ib/services/` | 3 files | Low |
| 8 | Move `lib/export/`, `lib/pdf/` closer to consumers | 3-4 files | Low |
| 9 | Gradually decompose `hooks/data/shared/` into feature directories | 15+ files | Low — can be done incrementally |

Steps 1-2 are pure cleanup with zero risk. Steps 3-4 are the highest-value structural improvements. Steps 5-9 are incremental polish.

