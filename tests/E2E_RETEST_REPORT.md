# Indigo Yield Platform — E2E Retest Report (Post-Remediation)

**Date**: 2026-02-03
**Target**: `https://indigo-yield-platform-v01.lovable.app` (UI) + Supabase MCP (SQL)
**Method**: Playwright MCP browser automation + Supabase MCP SQL verification
**Scope**: Verify all 12 bugs from `tests/E2E_FINAL_REPORT.md` are resolved
**Plan File**: `/Users/mama/.claude/plans/whimsical-hatching-rivest.md`

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Bugs Verified Fixed | 12/12 |
| Security Findings Resolved | WARN reduced from 20+ to 5 (all SECURITY DEFINER functions fixed) |
| Health Check | 8/8 SQL PASS |
| Data Integrity | 15/16 PASS (1 pre-existing orphan auth user) |
| Conservation Violations | 0 |
| Baselines Intact | YES — exact match to original Phase 0 |
| Regressions Introduced | 0 |
| Type Check (tsc --noEmit) | 0 errors |
| Build (npm run build) | SUCCESS |

**Overall Verdict: ALL 12 BUGS RESOLVED — NO REGRESSIONS**

---

## Remediation Summary

### Migrations Applied (7 total)

| Migration | Bug(s) | Description |
|-----------|--------|-------------|
| `20260203100001_fix_void_daily_aum_cascade_v3.sql` | #9, #5 | Rewrite void_fund_daily_aum with distribution-based cascade, adds ib_commission_ledger + platform_fee_ledger voiding |
| `20260203100002_fix_force_delete_investor_v3.sql` | #12 | Remove allocation_pct reference, clean up test profile |
| `20260203100003_create_void_and_reissue_rpc.sql` | #11 | Create void_and_reissue_transaction RPC (2 overloads) |
| `20260203100004_add_future_date_guard.sql` | #8 | Add FUTURE_DATE_NOT_ALLOWED guard to yield RPCs |
| `20260203100005_fix_get_void_aum_impact_v3.sql` | #6 | Rewrite get_void_aum_impact with distribution-based matching + monetary totals |
| `20260203100006_add_fund_min_withdrawal.sql` | #7 | Add min_withdrawal_amount column to funds table |
| `20260203100007_fix_remaining_search_paths.sql` | #4, Security | Fix search_path on all SECURITY DEFINER functions, recreate check_duplicate_ib_allocations with is_voided filter |

### Frontend Files Modified (13 total)

| File | Bug(s) | Change |
|------|--------|--------|
| `src/features/admin/transactions/hooks/useTransactionSubmit.ts` | #3 | Large deposit confirmation (>1M or >10x AUM) |
| `src/features/admin/transactions/AddTransactionDialog.tsx` | #3 | Confirmation dialog UI |
| `src/hooks/admin/useYieldOperationsState.ts` | #8 | Future date validation in validateEffectiveDate() |
| `src/features/admin/yields/components/YieldInputForm.tsx` | #8 | Calendar disabled callback for future dates |
| `src/features/admin/yields/hooks/useYieldCrystallization.ts` | #10 | Add includeVoided option to yield events hook |
| `src/services/admin/yieldCrystallizationService.ts` | #10 | Add includeVoided filter to service layer |
| `src/features/admin/investors/components/yields/InvestorYieldHistory.tsx` | #10 | Voided badge + line-through + opacity styling |
| `src/types/domains/fund.ts` | #7 | Add min_withdrawal_amount to Fund type |
| `src/services/investor/withdrawalService.ts` | #7 | Query min_withdrawal_amount on fund selection |
| `src/components/withdrawal/WithdrawalRequestForm.tsx` | #7 | Min withdrawal validation + helper text |
| `src/contracts/rpcSignatures.ts` | #11 | Fix void_and_reissue_transaction contract |
| `src/integrations/supabase/types.ts` | All | Regenerated Supabase TypeScript types |
| `src/services/admin/integrityOperationsService.ts` | — | Type alignment from regenerated types |
| `src/services/operations/positionAdjustmentService.ts` | — | Type alignment from regenerated types |

---

## Bug-by-Bug Verification

### CRITICAL Severity

#### Bug #9: Void AUM Cascade Now Voids Yield Transactions — FIXED
- **Verification**: Confirmed `void_fund_daily_aum` source uses distribution-based matching via `yield_allocations.distribution_id`
- **Evidence**: Function collects `v_distribution_ids` from `yield_distributions`, then voids transactions via `yield_allocations` linkage (transaction_id, fee_transaction_id, ib_transaction_id)
- **Cascade tables**: yield_distributions, yield_allocations, transactions_v2, investor_yield_events, fee_allocations, ib_allocations, ib_commission_ledger, platform_fee_ledger
- **Position recompute**: Calls `recompute_investor_position` per affected investor

#### Bug #5: ib_commission_ledger Now Voided in Cascade — FIXED
- **Verification**: Confirmed `void_fund_daily_aum` includes `UPDATE ib_commission_ledger SET is_voided = true ... WHERE yield_distribution_id = ANY(v_distribution_ids)`
- **Evidence**: Also voids `platform_fee_ledger` (cascade alignment with `void_yield_distribution`)
- **Aligned paths**: Both `void_fund_daily_aum` AND `void_yield_distribution` now void the same 8 tables

### HIGH Severity

#### Bug #11: void_and_reissue_transaction RPC Exists — FIXED
- **Verification**: `SELECT proname FROM pg_proc WHERE proname = 'void_and_reissue_transaction'` returns 2 rows (overloads)
- **Signature**: `(p_original_tx_id uuid, p_admin_id uuid, p_new_amount numeric, p_new_date date, p_new_notes text, p_new_tx_hash text, p_closing_aum numeric, p_reason text)`
- **Frontend**: Contract at `src/contracts/rpcSignatures.ts` aligned; dialog at `VoidAndReissueDialog.tsx` already built

#### Bug #12: force_delete_investor No Longer References allocation_pct — FIXED
- **Verification**: `SELECT prosrc FROM pg_proc WHERE proname = 'force_delete_investor'` — confirmed no `allocation_pct` reference in function body
- **Test artifact**: `qa.investor2@indigo.fund` profile cleaned up in same migration

#### Bug #8: Future Date Validation Active — FIXED
- **SQL Verification**: `SELECT apply_daily_yield_with_validation(...)` with `p_yield_date => CURRENT_DATE + 1` returns `FUTURE_DATE_NOT_ALLOWED` exception
- **Guard added to**: `apply_daily_yield_with_validation`, `apply_daily_yield_to_fund_v3`, `apply_yield_correction_v2`
- **Frontend**: Calendar disabled callback `(date) => date > new Date()` in `YieldInputForm.tsx`; date validation in `useYieldOperationsState.ts`
- **Note**: Frontend changes require Lovable deployment to take effect in production UI; SQL guard is the critical backstop

### MEDIUM Severity

#### Bug #1: perf_fee_bps Conversion Audit — NO CODE CHANGES NEEDED
- **Verification**: Full audit of all `perf_fee_bps` paths confirmed correct conversion everywhere
- **Finding**: All SQL functions use `fee_pct / 100` for calculations; all TypeScript uses `/100` for display
- **Status**: No mismatches found — original concern was theoretical, not an actual bug

#### Bug #2: ADB Dust Conservation — ALREADY RESOLVED
- **Verification**: `SELECT COUNT(*) FROM yield_distributions WHERE ABS(dust_amount) > 0 AND is_voided = false` returns 0
- **Evidence**: Previously resolved by migration `20260201000002` (dust elimination)

#### Bug #6: get_void_aum_impact RPC Working — FIXED
- **SQL Verification**: Function source confirms distribution-based matching with monetary totals
- **Returns**: `{transaction_count, investor_count, distribution_count, total_yield_amount, total_fee_amount, total_ib_amount, ib_ledger_count, platform_fee_count}`
- **UI Verification**: Admin → Recorded Yields → Void dialog → CASCADE IMPACT PREVIEW loads correctly showing 3 transactions, 1 investor (Jose Molla), -0.3192 yield amount
- **Console**: No `get_void_aum_impact` errors in browser console

#### Bug #7: Asset-Specific Withdrawal Minimums — FIXED
- **Verification**: `SELECT name, asset, min_withdrawal_amount FROM funds WHERE status = 'active'`
  - IND-BTC: 0.00100000
  - IND-ETH: 0.01000000
  - IND-USDT: 10.00000000
- **Frontend**: `WithdrawalRequestForm.tsx` shows minimum, validates input, displays helper text

#### Bug #10: Voided Yield Entries Handled — FIXED
- **Verification**: `investor_yield_events` table has `is_voided` column (boolean, default false)
- **Admin UI**: `InvestorYieldHistory.tsx` passes `includeVoided: true`, shows voided entries with red "Voided" badge + line-through + reduced opacity
- **Investor portal**: Correctly filters `is_voided = false` (voided entries not shown to investors)

### LOW Severity

#### Bug #3: Large Deposit Confirmation Dialog — FIXED
- **Verification**: `useTransactionSubmit.ts` implements threshold check: `amount > 1_000_000 || (closingAum > 0 && amount > closingAum * 10)`
- **UI**: `AddTransactionDialog.tsx` shows amber confirmation alert with amount context and "Confirm Amount is Correct" / "Cancel" buttons
- **Note**: Frontend changes require Lovable deployment

#### Bug #4: no_duplicate_ib_allocations Check Fixed — FIXED
- **Verification**: `check_duplicate_ib_allocations()` source includes `WHERE is_voided = false` filter
- **SQL test**: `SELECT check_duplicate_ib_allocations()` returns 0 (no false positives)
- **UI**: Data Integrity page → IB checks → `no_duplicate_ib_allocations` PASS

---

## Security Remediation

### SECURITY DEFINER Functions — search_path Fixed
- **Before**: 20+ functions with mutable search_path
- **After**: 0 SECURITY DEFINER functions without `search_path = 'public'`
- **Verification**: `SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig))` returns 0

### Remaining Advisors
- **5 ERROR**: All `security_definer_view` issues (views, not functions — out of scope for this remediation)
- **5 WARN**: Remaining `function_search_path_mutable` findings are for non-SECURITY DEFINER functions (lower risk)

---

## Data Integrity Check

Ran full integrity check from Admin → Data Integrity page:

| Category | Result |
|----------|--------|
| Core Checks (5/5) | ALL PASS |
| IB Checks (4/4) | ALL PASS |
| Temporal Checks (4/4) | ALL PASS |
| Auth Checks (3/3) | 2 PASS, 1 FAIL |
| **Total** | **15/16 PASS** |

**Single failure**: `no_orphan_auth_users` (1 violation) — pre-existing orphan auth user, not related to this remediation.

---

## Baseline Integrity

All Phase 0 baselines from the original E2E test remain exactly intact:

| Metric | Phase 0 Baseline | Post-Retest | Match |
|--------|-----------------|-------------|-------|
| Jose Molla BTC position | 3.8936 | 3.8936 | MATCH |
| INDIGO FEES BTC position | 0.1064 | 0.1064 | MATCH |
| USDT positions | 0 rows | 0 rows | MATCH |
| BTC txn DEPOSIT count/sum | 1 / 3.468 | 1 / 3.468 | MATCH |
| BTC txn YIELD count/sum | 1 / 0.4256 | 1 / 0.4256 | MATCH |
| BTC txn FEE_CREDIT count/sum | 1 / 0.1064 | 1 / 0.1064 | MATCH |
| Non-voided yield distributions | 1 (`7eadc52f`) | 1 (`7eadc52f`) | MATCH |
| Non-voided IB commissions | 0 rows | 0 rows | MATCH |
| SQL health check | 8/8 PASS | 8/8 PASS | MATCH |
| Conservation violations | 0 | 0 | MATCH |

---

## HARD FAIL Criteria Re-Evaluation

| Criterion | Result |
|-----------|--------|
| Conservation identity violated | NOT TRIGGERED |
| Position-ledger mismatch | NOT TRIGGERED |
| Health check FAIL | NOT TRIGGERED |
| Baseline not restored | NOT TRIGGERED |
| Regression in existing functionality | NOT TRIGGERED |

**All HARD FAIL criteria: CLEAR**

---

## Deployment Status

| Layer | Status | Notes |
|-------|--------|-------|
| SQL Migrations (7) | DEPLOYED | All applied to production Supabase via MCP |
| TypeScript Types | REGENERATED | `src/integrations/supabase/types.ts` updated |
| Frontend Changes (13 files) | CODE COMPLETE | Require Lovable/Vercel deployment to take effect in production |
| Type Check | PASS | `npx tsc --noEmit` = 0 errors |
| Build | PASS | `npm run build` = success |

**Note**: Frontend changes for Bugs #3, #7, #8, #10 are in the codebase but not yet deployed to the production URL. SQL guards serve as the critical backstop for Bug #8 (future dates). All other SQL fixes are live.

---

## Console Health

Browser console at production URL shows:
- 0 application errors
- 4 font loading warnings (woff2 404s — cosmetic, pre-existing)
- 0 network failures to API endpoints

---

*Report generated: 2026-02-03*
*Remediation: 4 implementation sessions + 1 verification session*
*Test framework: Playwright MCP + Supabase MCP*
*Model: Claude Opus 4.5*
