

# Master Vulnerability & Action Report -- Indigo Yield Platform 360 Audit

## Executive Summary

The platform's L0 ledger integrity is sound (0 violations from `qa_master_runner`). However, 14 vulnerabilities exist across 5 categories: orphaned references to dropped tables, missing advisory locks, JS precision leaks, cache invalidation gaps, and a precision downgrade in the withdrawal RPC. None are data-corrupting today at current scale, but several will cause silent drift or race conditions under concurrent admin use.

---

## Phase 1: Trigger Cascades & Ledger Invariants

| # | Vulnerability | Blast Radius | Files/Functions | Fix |
|---|---|---|---|---|
| **1.1** | **`void_yield_distribution` references dropped tables `investor_yield_events` and `fund_aum_events`** -- Lines 31-32 and 55 execute UPDATEs against tables that were dropped (view `fund_aum_events` dropped in migration `20260327105221`; `investor_yield_events` may or may not exist). No `IF EXISTS` guard. | Voiding a yield distribution with `p_void_crystals=true` will throw a runtime error, preventing the void cascade. | `supabase/migrations/20260327101406...sql` lines 31-32, 55 (the active `void_yield_distribution` definition) | Wrap in `IF EXISTS` guards identical to `void_transaction`'s pattern: `IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='investor_yield_events') THEN ... END IF;` Remove the `fund_aum_events` UPDATE entirely (view was dropped). |
| **1.2** | **`approve_and_complete_withdrawal` uses `numeric(28,10)` variables** -- All DECLARE variables use `numeric(28,10)` while the platform standard is `numeric(38,18)`. | Dust amounts smaller than 1e-10 are silently truncated to zero. Full-exit on a position with balance like `0.00000000001 BTC` leaves an active ghost position instead of sweeping. | `supabase/migrations/20260324125841...sql` lines 14-24 | Change all variable declarations from `numeric(28,10)` to `numeric(38,18)`. |
| **1.3** | **Dust cascade date-scoping is too narrow** -- `void_transaction` matches dust by `tx_date = v_tx.tx_date`. If a withdrawal was completed on a different date than its dust sweep (edge case with `settlement_date`), dust is orphaned on void. | Voiding a withdrawal with a settlement date different from the dust creation date leaves orphaned DUST_SWEEP transactions. | `void_transaction` in `20260327112754...sql` line 107 | Additionally match by `reference_id` containing the withdrawal's `reference_id` or request ID, not just by date. Or use the withdrawal request ID embedded in the reference_id (`dust-sweep-{request_id}`). |
| **1.4** | **`void_yield_distribution` does NOT call `recompute_investor_position`** -- After voiding yield transactions, positions are only updated by the `trg_ledger_sync` trigger (incremental delta). If trigger fails or is disabled, positions drift. | After voiding a yield distribution, investor positions may not reflect the voided yield amounts if triggers are skipped. | `void_yield_distribution` in `20260327101406...sql` | Add explicit `PERFORM recompute_investor_position(v_tx.investor_id, v_dist.fund_id)` for each affected investor after voiding transactions. |

---

## Phase 2: Concurrency & Advisory Lock Audit

| # | Vulnerability | Blast Radius | Files/Functions | Fix |
|---|---|---|---|---|
| **2.1** | **`crystallize_yield_before_flow` lacks advisory lock** -- This RPC is called from `approve_and_complete_withdrawal` and `apply_deposit_with_crystallization`. Two concurrent deposits for the same fund could double-crystallize. | Duplicate yield crystallization events, double-counted yield for investors, conservation violation. | `crystallize_yield_before_flow` (defined in baseline `20260307...sql` line 5258) | Add `PERFORM pg_advisory_xact_lock(hashtext('crystal:' \|\| p_fund_id::text));` at the top. The idempotency guard at line ~142 mitigates this partially but is not bulletproof under true concurrency. |
| **2.2** | **`recalculate_fund_aum_for_date` lacks advisory lock** -- Called from `void_transaction` and data heal scripts. Concurrent calls for same fund+date could produce a race. | Minor: upsert semantics make this low-risk, but concurrent partial reads of `investor_positions` during a void could snapshot a mid-transaction state. | `recalculate_fund_aum_for_date` (defined in `20260327101406...sql` line ~150+) | Add `PERFORM pg_advisory_xact_lock(hashtext('aum:' \|\| p_fund_id::text \|\| ':' \|\| p_target_date::text));` |

---

## Phase 3: Yield Engine & Waterfall Logic

| # | Vulnerability | Blast Radius | Files/Functions | Fix |
|---|---|---|---|---|
| **3.1** | **`yieldPreviewService.ts` uses `Number()` for financial values** -- Lines 98, 111, 117, 143, 193, 205 all convert `numeric(38,18)` database values to JS `Number`, losing precision beyond 15 significant digits. | Preview allocations displayed to admin may show incorrect per-investor breakdowns for large AUM values. Admin may approve a distribution based on imprecise preview data. | `src/services/admin/yields/yieldPreviewService.ts` lines 98, 111, 117, 143 | Replace all `Number(...)` with `parseFinancial(...)` or `toNum()`. Keep as strings where possible and only convert for non-financial comparisons. |
| **3.2** | **IB commission isolation on void** -- `void_yield_distribution` voids `ib_commission_ledger` and `ib_allocations`, but does NOT void the corresponding `IB_CREDIT` transactions if they use a different reference pattern than `ib_credit_{dist_id}_%`. | If IB_CREDIT reference IDs diverge from expected pattern, voiding a yield leaves orphaned IB credits in the ledger, inflating IB positions. | `void_yield_distribution` lines 46-47 | Audit that all IB_CREDIT transactions created by the V5 engine match the `ib_credit_v5_{dist_id}_{investor_id}` pattern. Add a fallback: `UPDATE transactions_v2 SET is_voided=true WHERE distribution_id = p_distribution_id AND type = 'IB_CREDIT' AND NOT is_voided;` |

---

## Phase 4: Frontend Precision & Cache

| # | Vulnerability | Blast Radius | Files/Functions | Fix |
|---|---|---|---|---|
| **4.1** | **`parseFloat()` used in financial input validation** -- 19 files use `parseFloat()` on financial amounts. While most are for validation (not arithmetic), some feed into comparisons that could silently pass invalid values. | Low immediate risk, but `parseFloat("0.000000000000000001")` returns `1e-18` which behaves differently than Decimal in boundary comparisons. | `src/features/admin/transactions/pages/AdminManualTransaction.tsx` line 52, `YieldInputForm.tsx` lines 301-307, `FundPositionCard.tsx` line 90, `FeesStep.tsx` lines 84/142 | Replace financial `parseFloat` with `parseFinancial()` from `@/utils/financial`. Keep `parseFloat` only for non-financial UI (percentages, counts). |
| **4.2** | **`statementCalculations.ts` converts Decimal back to `number` mid-pipeline** -- Lines 265-318 repeatedly call `.toNumber()` on intermediate Decimal results, then feed those numbers back into `parseFinancial()` on the next iteration. Each round-trip loses precision. | Statement PDF/HTML reports may show balances that differ from the ledger by dust amounts, eroding investor trust. | `src/utils/statementCalculations.ts` lines 263-350 | Keep all intermediate values as `Decimal` objects. Only call `.toNumber()` at the final display point, or better, use `.toString()` and pass to `FinancialValue` component. |
| **4.3** | **`FormattedNumber.tsx` and `KPI.tsx` use `parseFloat` for display** -- These display components convert string amounts to `number` for formatting, which can show rounded values for 18-decimal precision amounts. | Cosmetic: displayed values may differ from ledger by dust, but no data corruption. | `src/components/common/FormattedNumber.tsx` line 57, `KPI.tsx` line 36 | Use `parseFinancial(value).toFixed(decimals)` instead of `parseFloat` + `Intl.NumberFormat`. |
| **4.4** | **`invalidateAfterYieldOp` does not invalidate position keys** -- After voiding a yield, the function invalidates yield-related and AUM keys but does NOT invalidate `investorPositions()`. Positions are changed by voided yield transactions but the cache is stale. | After voiding a yield distribution, investor portfolio pages show pre-void balances until manual page refresh. | `src/utils/cacheInvalidation.ts` `invalidateAfterYieldOp()` lines 187-193 | Add `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions() });` and `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ledgerReconciliation });` |

---

## Phase 5: Automated Jobs & Statements

| # | Vulnerability | Blast Radius | Files/Functions | Fix |
|---|---|---|---|---|
| **5.1** | **`monthly-report-scheduler` uses `x-cron-secret` header but pg_cron sends via `Authorization: Bearer`** -- The scheduler validates `req.headers.get("x-cron-secret")` but the pg_cron job typically sends secrets in the `Authorization` header via `net.http_post headers`. If the cron job is configured with `Authorization: Bearer {ANON_KEY}` and `x-cron-secret` separately, this works. But if misconfigured, the scheduler silently rejects all cron invocations. | Monthly statements are never generated. Investors receive no end-of-month reports. | `supabase/functions/monthly-report-scheduler/index.ts` lines 43-49 | Verify the pg_cron SQL includes `"x-cron-secret": "{CRON_SECRET}"` in the headers JSON. Add a fallback check: also accept `Authorization: Bearer {CRON_SECRET}` as valid auth. Log the rejection reason clearly. |
| **5.2** | **Statement generation queries use no date-bounded ledger snapshot** -- `statementCalculations.ts` queries ALL transactions for an investor (no upper date bound), meaning a statement generated for January could include February transactions if they exist at generation time. | Historical statements are non-deterministic -- regenerating a past month's statement after new transactions produces different numbers. | `src/utils/statementCalculations.ts` (the transaction query) | Add `AND tx_date <= period_end_date` filter to the transaction query used for statement generation. |

---

## Priority Matrix

| Priority | Bugs | Impact |
|---|---|---|
| **P0 -- Fix immediately** | 1.1 (void_yield_distribution crashes on dropped tables), 4.4 (yield void cache miss) | Blocks admin yield voids; stale UI after operations |
| **P1 -- Fix this sprint** | 1.2 (precision downgrade), 2.1 (crystallization race), 3.1 (preview precision), 3.2 (IB void orphan), 5.2 (statement date bounds) | Financial precision drift, potential double-crystallization, incorrect statements |
| **P2 -- Fix next sprint** | 1.3 (dust date scope), 1.4 (explicit recompute after yield void), 2.2 (AUM recalc lock), 4.1 (parseFloat in inputs), 4.2 (statement precision), 4.3 (display precision), 5.1 (cron auth) | Edge cases, cosmetic precision, hardening |

---

## Implementation Plan

### Migration 1 (P0): Fix `void_yield_distribution` dropped-table references
```sql
-- Replace lines 31-32 and 55 with guarded versions
-- Remove fund_aum_events UPDATE (view dropped)
-- Add IF EXISTS guard for investor_yield_events
-- Add position invalidation after void
```

### Migration 2 (P1): Upgrade `approve_and_complete_withdrawal` precision
```sql
-- Change all DECLARE from numeric(28,10) to numeric(38,18)
```

### Migration 3 (P1): Add advisory lock to `crystallize_yield_before_flow`
```sql
-- Add pg_advisory_xact_lock at function entry
```

### Code changes (P0-P1):
- `src/utils/cacheInvalidation.ts`: Add position invalidation to `invalidateAfterYieldOp`
- `src/services/admin/yields/yieldPreviewService.ts`: Replace `Number()` with `parseFinancial()`
- `src/utils/statementCalculations.ts`: Add date bound to transaction query; keep Decimal throughout pipeline

### Code changes (P2):
- `src/components/common/FormattedNumber.tsx`, `KPI.tsx`: Use Decimal for display
- `src/features/admin/transactions/pages/AdminManualTransaction.tsx` etc: Replace financial `parseFloat`

