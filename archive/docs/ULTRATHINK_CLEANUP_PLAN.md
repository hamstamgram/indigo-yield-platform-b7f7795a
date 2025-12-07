# ULTRATHINK CODEBASE CLEANUP PLAN

## 1. Executive Summary
This plan addresses the accumulated technical debt, documentation clutter, and obsolete code artifacts resulting from recent rapid development cycles (Fee removal, Data Recovery, RLS fixes). Executing this plan will reduce repository noise, improve developer experience, and prevent future confusion.

## 2. Documentation Hygiene
**Action:** Create `docs/archive/` and move the following obsolete files into it.
*Rationale:* These files provide historical context but pollute the root directory.

**Files to Move:**
- `*_AUDIT_REPORT.md`
- `*_ANALYSIS_*.md`
- `*_SUMMARY.md`
- `*_CHECKLIST.md`
- `*_GUIDE.md` (except core guides like `CONTRIBUTING.md`)
- `*_PLAN.md`
- `*_STATUS.md`
- `*_FIXES.md`
- `CODE_REVIEW_*.md`
- `SECURITY_*.md` (Keep the most recent final report if critical, archive others)
- `QUICK_FIXES.md`
- `NEXT_STEPS.md` (Unless current)
- `TODAY_SUMMARY.md`

**Files to Keep in Root:**
- `README.md`
- `CONTRIBUTING.md`
- `START_HERE.md` (If it exists/relevant)
- `DEPLOY_NOW.md` (Maybe rename to `DEPLOYMENT.md`)
- `.env.*` files
- Configuration files (`package.json`, `tsconfig.json`, etc.)

## 3. Database Migration Cleanup
**Action:** Remove obsolete and temporary migration files.
*Rationale:* Disabled migrations create noise and confusion about the schema state.

**Files to Delete (`supabase/migrations/`):**
- `*.disabled` (All 50+ files)
- `20251206000500_check_auth_insert.sql` (Temp check)
- `20251206001000_check_investor_count.sql` (Temp check)
- `20251206001500_verify_recovery.sql` (Temp check)
- `20251206000000_import_master_transactions_smart.sql` (Superseded by `reapply_transactions`)

## 4. Frontend Code Cleanup
**Action:** Delete unused React components related to the deprecated Fee structure.
*Rationale:* Dead code increases bundle size and maintenance burden.

**Directories/Files to Delete:**
- `src/components/admin/fees/` (Entire directory)
  - `FeeCalculationsTable.tsx`
  - `FeeStats.tsx`
  - `FeeStructuresTable.tsx`
  - `MonthlyFeeSummaryChart.tsx`
  - `PlatformFeeManager.tsx`

## 5. Script Cleanup
**Action:** Clean up the `scripts/` directory.
*Rationale:* One-off SQL scripts and temp generators should be archived or removed.

**Files to Delete/Archive:**
- `scripts/generate_migration.js` (Move to `scripts/utils/` or `scripts/archive/`)
- `scripts/*.sql` (If they duplicates of migrations)
  - `scripts/grant_admin_h_lodumonoja.sql`
  - `scripts/apply-rls-fix-only.sql`
  - `scripts/verify-rls.sql`

## 6. Edge Function Review
**Action:** Keep `seed-master-users` but document it as "Disaster Recovery Only".
*Rationale:* It is a critical tool for resetting the environment if needed again.

## 7. Execution Steps
1.  **Run Documentation Archive Command.**
2.  **Run Migration Deletion Command.**
3.  **Run Component Deletion Command.**
4.  **Commit Changes.**
