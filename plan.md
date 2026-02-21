# CTO Implementation Plan: Yield Engine Stabilization & Restore
**Date:** Feb 21, 2026
**Author:** CTO
**Status:** AWAITING APPROVAL

---

## 1. Executive Summary

The platform is in a broken state following Friday (Feb 20, 2026) changes that introduced three overlapping problems:

**Problem 1 — Dead table reference.** Both `apply_segmented_yield_distribution_v5` and `preview_segmented_yield_distribution_v5` LEFT JOIN `fund_aum_events` for crystallization segment detection. That table was dropped on Friday. Every yield preview/apply call will throw a runtime error.

**Problem 2 — Unwanted auto-crystallization.** The current `apply_transaction_with_crystallization` (from `20260301_deep_fix_aum_unification.sql`) calls `crystallize_yield_before_flow` whenever `p_new_total_aum IS NOT NULL`. The confirmed architecture is: NO auto-crystallization. Admin manually records transaction-purpose yield before deposits/withdrawals.

**Problem 3 — Frontend breakage.** Several files were rewritten on Friday (swapping `useFundAumAsOf` for `useYieldAumAsOf`, adding `reconResult`, etc.) while leaving others partially restored, creating type mismatches and inconsistent state.

**The fix:** One forward SQL migration replacing the broken engine with flat position-proportional logic, plus surgical frontend edits to restore the Thursday night baseline while keeping the IB schedule consolidation and the new yield UI components (GlobalYieldFlow, YieldConfirmDialog, yieldAumService).

---

## 2. Baseline & Scope

### 2.1 Last Known Good State
- **Git commit**: `a8d74935` (Thu Feb 19, 21:06 UTC) — verified working baseline
- **Live Supabase DB**: ALL migrations through `20260301_deep_fix_aum_unification.sql` are applied
- `fund_aum_events` table is **permanently dropped** — new engine must NOT reference it
- `profiles.fee_pct` and `profiles.ib_percentage` columns are **dropped** — use schedule functions

### 2.2 What We Are Restoring vs Keeping

| Concern | Action |
|---------|--------|
| V5 yield engine (SQL) | REWRITE with flat position-proportional logic |
| Auto-crystallization on deposit | REMOVE — admin manually records transaction yield |
| `YieldDistributionsPage.tsx` | Already at a8d74935 (no diff found — verify) |
| `useYieldOperationsState.ts` | Targeted edit (restore dual-AUM fallback, remove reconResult) |
| `depositWithYieldService.ts` | Remove `p_new_total_aum` from RPC call |
| `GlobalYieldFlow.tsx` | KEEP (new Friday component) |
| `YieldConfirmDialog.tsx` | KEEP (new Friday component) |
| `useYieldAumAsOf.ts` | KEEP (new Friday hook) |
| `yieldAumService.ts` | KEEP (new Friday service) |
| `YieldInputForm.tsx` | KEEP with Friday AUM reconciliation improvements |
| `FundSnapshotCard.tsx` | KEEP HEAD (better fallback behavior) |
| `dashboardMetricsService.ts` | KEEP HEAD (real historical AUM data) |
| `aumReconciliationService.ts` | KEEP HEAD (verify pre-flight) |
| `queryKeys.ts` | KEEP HEAD (required by kept hooks) |
| IB/fee schedule consolidation (5278315c) | KEEP ALL (all 8 files) |
| IB activation dates migration | KEEP (already in DB) |

---

## 3. Pre-Flight Checks

Run these **before applying any migration**. Re-authenticate Supabase MCP first, or use the SQL editor in the Supabase dashboard.

### 3.1 Confirm fund_aum_events is dropped
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'fund_aum_events';
-- Expected: 0 rows
```

### 3.2 Confirm profiles columns are gone
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('fee_pct', 'ib_percentage');
-- Expected: 0 rows
```

### 3.3 Confirm schedule functions exist
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_investor_fee_pct', 'get_investor_ib_pct', '_resolve_investor_fee_pct');
-- Expected: 3 rows
```

### 3.4 Check current V5 function signatures
```sql
SELECT p.proname, pg_get_function_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'apply_segmented_yield_distribution_v5',
    'preview_segmented_yield_distribution_v5',
    'apply_transaction_with_crystallization',
    'crystallize_yield_before_flow',
    'get_fund_aum_as_of',
    'check_aum_reconciliation'
  )
ORDER BY p.proname;
```

### 3.5 Confirm fund_daily_aum partial index format
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'fund_daily_aum' AND indexdef ILIKE '%is_voided%';
-- Document exact ON CONFLICT predicate — needed for migration
```

### 3.6 Check integrity views for existing violations
```sql
SELECT 'ledger_reconciliation' as check_name, COUNT(*) FROM v_ledger_reconciliation
UNION ALL
SELECT 'yield_conservation', COUNT(*)
FROM yield_distribution_conservation_check
WHERE gross_yield_amount IS NOT NULL;
-- Expected: all 0. Document any existing violations before proceeding.
```

### 3.7 Capture current function definitions for rollback
```sql
SELECT p.proname, pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'apply_segmented_yield_distribution_v5',
    'preview_segmented_yield_distribution_v5',
    'apply_transaction_with_crystallization'
  );
-- Save this output as rollback_v5_functions.sql before proceeding
```

### 3.8 Critical: Check _resolve_investor_fee_pct for dropped column reference
```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = '_resolve_investor_fee_pct';
-- Look for any SELECT fee_pct FROM profiles reference — if present, new migration must fix this
```

---

## 4. Phase 1: SQL Forward Migration

**Migration file:** `supabase/migrations/20260302_flat_yield_engine_no_auto_crystal.sql`

### 4.1 Architecture: Flat Position-Proportional Engine

The confirmed engine logic (validated against the SOL scenario):

```
gross_yield  = p_recorded_aum - SUM(investor_positions.current_value WHERE is_active = true)
share        = investor_position.current_value / SUM_all_active_positions
gross_share  = gross_yield * share
fee_amount   = gross_share * get_investor_fee_pct(investor_id, fund_id, tx_date) / 100
ib_amount    = gross_share * get_investor_ib_pct(investor_id, fund_id, tx_date) / 100
net_amount   = gross_share - fee_amount - ib_amount

-- For negative yield months: fee=0, ib=0, net=gross_share (loss absorbed proportionally)
-- Conservation: SUM(all_gross) = SUM(all_net) + SUM(all_fee) + SUM(all_ib) + dust
```

**Validation against SOL scenario:**
- INDIGO LP: 1250/1250 = 100% of Sep 4 transaction yield → +2 SOL (gross=net, 0% fee) ✓
- INDIGO LP: 1252/1486.17 = 84.25% of Sep 30 gross → +11.65 SOL ✓
- Paul Johnson: 234.17/1486.17 = 15.75% → gross=2.177, fee=0.294 (13.5%), ib=0.033 (1.5%), net=1.85 ✓
- Conservation: 11.65 + 1.85 + 0.294 + 0.033 = 13.827 ≈ 13.83 ✓

### 4.2 Function 1: apply_transaction_with_crystallization

**Change:** Remove the auto-crystallization branch. Keep `p_new_total_aum` as a parameter that RAISES an error if passed (intentional guard, not silent removal).

Key behaviors:
- Auth check via `is_admin()`
- Guard: if `p_new_total_aum IS NOT NULL`, raise descriptive exception
- Idempotency: check `reference_id` before inserting
- Advisory lock on `hashtext(investor_id || fund_id)`
- YIELD transactions get `visibility_scope = investor_visible` when `purpose = 'reporting'`, else `admin_only`
- AUM sync: after insert, `SUM(current_value)` → upsert `fund_daily_aum` with `source = 'tx_sync'`
- `fund_daily_aum` ON CONFLICT must use exact partial index predicate (from pre-flight 3.5)

### 4.3 Function 2: apply_segmented_yield_distribution_v5 (Core Engine)

**Full replacement.** Name preserved to avoid breaking TypeScript call sites. Removes ALL segment/crystallization/fund_aum_events logic.

**Algorithm:**
```
1.  Auth + canonical_rpc config
2.  Load fund; get fees_account_id
3.  Period: period_start = date_trunc('month', p_period_end); period_end = p_period_end
4.  Advisory lock on (fund_id || period_end)
5.  Uniqueness: raise if non-voided reporting distribution exists for fund + period_end
6.  v_tx_date = COALESCE(p_distribution_date, p_period_end)
7.  Read live positions: v_opening_aum = SUM(current_value) WHERE fund_id AND is_active
8.  gross_yield = p_recorded_aum - v_opening_aum
9.  Create yield_distributions header (totals = 0; update at step 16)
    calculation_method = 'flat_position_proportional_v6'
10. FOR EACH active investor position in this fund:
      share = ip.current_value / v_opening_aum
      gross = ROUND(gross_yield * share, 10)
      IF gross_yield < 0: fee=0; ib=0; net=gross  (loss month)
      ELSE:
        fee_pct = get_investor_fee_pct(investor_id, fund_id, v_tx_date)
        ib_rate = get_investor_ib_pct(investor_id, fund_id, v_tx_date)
        fee = ROUND(gross * fee_pct / 100, 10)
        ib  = ROUND(gross * ib_rate / 100, 10)
        net = gross - fee - ib
      Accumulate totals
11. Dust = gross_yield - SUM(per-investor gross) → routes to fees_account
12. FOR EACH investor allocation:
      - Call apply_transaction_with_crystallization: YIELD tx, amount=net, purpose=p_purpose
      - Insert yield_allocations row (adb_share=share, net_amount=net, ...)
      - Insert fee_allocations row if fee > 0
      - If IB: call apply_transaction_with_crystallization: IB_CREDIT tx, amount=ib
               Insert ib_commission_ledger row
13. FEE_CREDIT tx to fees_account for SUM(all_fees)
14. If purpose='reporting': auto-set ib_allocations.payout_status='paid'
15. If dust > 0: YIELD tx to fees_account for dust amount
16. Update yield_distributions header with final totals
17. Upsert fund_daily_aum: source='yield_engine', purpose=p_purpose
    ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
18. Audit log entry
19. Conservation check; return jsonb result
```

### 4.4 Function 3: preview_segmented_yield_distribution_v5

Same algorithm as apply_segmented but **read-only** — no INSERTs, no advisory locks, no audit log. Returns same jsonb shape that TypeScript `yieldPreviewService.ts` maps to `V5YieldRPCResult`.

**Before writing this function:** read `src/types/domains/yield.ts` to confirm the field names in `V5AllocationItem` and `V5YieldRPCResult`. The return jsonb must match exactly.

### 4.5 crystallize_yield_before_flow: No Changes

Leave as-is. Add comment: `-- NOTE: No longer called automatically (Feb 21, 2026). Must be called explicitly by admin.`

---

## 5. Phase 2: Frontend Surgical Edits

### 5.1 FIRST: Audit GlobalYieldFlow.tsx for reconResult

Before touching `useYieldOperationsState.ts`, read `GlobalYieldFlow.tsx` and check:
- Does it destructure `reconResult` or `reconLoading` from the hook?
- If yes: keep `useAUMReconciliation` in the hook return, but make it non-blocking
- If no: safely remove `reconResult` from the hook's return object

### 5.2 `src/hooks/data/admin/useYieldOperationsState.ts` — TARGETED EDIT

Restore the Thursday night dual-AUM fallback pattern:
- Replace `useYieldAumAsOf` with `useFundAumAsOf` (from `@/features/admin/funds/hooks/useFundAumAsOf`)
- Restore: fetch reporting-purpose AUM first; fall back to transaction-purpose AUM
- Keep: `yieldPurpose` defaults to `'reporting'` when dialog opens
- Keep: `distributionDate` defaults to last day of month
- Remove: `reconResult`/`reconLoading` from return object (if GlobalYieldFlow audit confirms safe)

### 5.3 `src/services/admin/depositWithYieldService.ts` — REMOVE PARAMETER

Remove `p_new_total_aum` from the `callRPC("apply_transaction_with_crystallization", {...})` call. This prevents the new guard from raising an error on deposits.

### 5.4 `src/features/admin/yields/pages/YieldDistributionsPage.tsx` — VERIFY

```bash
git diff a8d74935 HEAD -- src/features/admin/yields/pages/YieldDistributionsPage.tsx
```
If empty diff: no action. If diff exists: revert to a8d74935 using `git show a8d74935:src/... > src/...`

### 5.5 Files Confirmed to KEEP (no action)
- `FundSnapshotCard.tsx` — better zero-fallback behavior
- `aumReconciliationService.ts` — asOfDate support
- `dashboardMetricsService.ts` — real historical AUM
- `queryKeys.ts` — required by hooks

### 5.6 `src/contracts/rpcSignatures.ts` — VERIFY & UPDATE

Check `apply_transaction_with_crystallization` signature type. Change `p_new_total_aum` from required to optional (`p_new_total_aum?: number`). Update the signature description to reflect it now raises an error if passed.

---

## 6. Phase 3: Integration & Verification

### 6.1 TypeScript Build
```bash
npx tsc --noEmit   # Must be 0 errors
npm run build      # Must be clean
```

### 6.2 SOL Scenario DB Smoke Test
```
1. INDIGO LP deposits 1250 SOL (Sep 2) — no p_new_total_aum
2. Admin records TRANSACTION yield: AUM=1252, Sep 4
   → Verify: INDIGO LP +2 SOL, visibility=admin_only, fees=0
3. Paul Johnson deposits 234.17 SOL (Sep 10) — no p_new_total_aum
4. Admin records REPORTING yield: AUM=1500, Sep 30
   → Verify: conservation residual < 0.00000001
   → Verify: SUM(investor_positions) = 1500
   → Verify: Paul Johnson net +1.85 SOL, investor_visible
   → Verify: fees_account gets fee credit, Alex Jacobs gets IB credit
```

### 6.3 Integrity Views
```sql
SELECT COUNT(*) FROM v_ledger_reconciliation;          -- 0
SELECT COUNT(*) FROM yield_distribution_conservation_check
WHERE gross_yield_amount IS NOT NULL;                  -- 0
SELECT * FROM run_invariant_checks();                  -- 16/16 pass
```

### 6.4 UI Smoke Test
1. `/admin/yield` — dialog opens, Purpose=Reporting default, AUM display correct
2. `/admin/yield-distributions` — distributions listed correctly with dates
3. `/admin` dashboard — fund AUM cards render
4. `/investor` — yield history shows ONLY reporting yields

---

## 7. Risk Registry

| ID | Risk | Severity | Mitigation |
|----|------|----------|-----------|
| R1 | `GlobalYieldFlow` reads `reconResult` from hook — breaks after hook edit | HIGH | Audit GlobalYieldFlow BEFORE editing hook |
| R2 | `_resolve_investor_fee_pct` still references dropped `profiles.fee_pct` | HIGH | Pre-flight 3.8 — fix in migration if found |
| R3 | `fund_daily_aum` ON CONFLICT predicate mismatch | HIGH | Pre-flight 3.5 — use exact index format |
| R4 | Preview RPC return shape doesn't match TS `V5AllocationItem` | MEDIUM | Read `src/types/domains/yield.ts` before writing preview |
| R5 | Dust rounding produces conservation residual > tolerance | MEDIUM | NUMERIC(28,10) throughout; test with exact SOL values |
| R6 | `rpcSignatures.ts` types `p_new_total_aum` as required | MEDIUM | Make optional before `tsc` |
| R7 | Existing QA distributions violate integrity views with new engine | MEDIUM | Pre-flight 3.6 — void/reissue QA data if needed |
| R8 | `check_aum_reconciliation` RPC signature mismatch | LOW | Pre-flight 3.4 reveals live DB signature |

---

## 8. Rollback Plan

A full git revert to `a8d74935` DB state is impossible without data loss. All rollbacks are forward-fixes.

### 8.1 If new distribution data is corrupted
```sql
UPDATE yield_distributions
SET is_voided = true, voided_at = NOW(), void_reason = 'rollback_flat_engine'
WHERE calculation_method = 'flat_position_proportional_v6' AND is_voided = false;

-- Recompute positions for affected funds
SELECT recompute_investor_position(ip.investor_id, ip.fund_id)
FROM investor_positions ip WHERE ip.fund_id IN (
  SELECT DISTINCT fund_id FROM yield_distributions
  WHERE calculation_method = 'flat_position_proportional_v6'
);
```

### 8.2 If migration fails mid-apply
Run in a transaction block. Postgres rolls back automatically on error.

### 8.3 Frontend rollback
```bash
git checkout HEAD <file>   # per-file revert
```

---

## 9. Success Criteria

### TypeScript
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — clean

### Database Integrity
- [ ] `v_ledger_reconciliation` — 0 rows
- [ ] `yield_distribution_conservation_check` (non-null gross) — 0 rows
- [ ] `run_invariant_checks()` — 16/16 pass

### Yield Engine Correctness (SOL Scenario)
- [ ] Transaction yield (Sep 4): INDIGO LP +2 SOL, `admin_only`
- [ ] Reporting yield (Sep 30, AUM=1500): position sum = 1500.0000000000
- [ ] Paul Johnson: net=1.85 SOL `investor_visible`, fee → fees_account, IB → Alex Jacobs
- [ ] Conservation residual < 0.00000001
- [ ] `yield_allocations` rows exist for reporting distribution

### Frontend UI
- [ ] Yield dialog opens with Purpose=Reporting as default
- [ ] AUM reference shows correctly (reporting→transaction fallback for new funds)
- [ ] `/admin/yield-distributions` loads and shows distributions with correct dates/periods
- [ ] Investor portal shows ONLY reporting yields

### No Regressions
- [ ] Existing QA harness data intact
- [ ] `void_yield_distribution` works
- [ ] Deposit without `p_new_total_aum` creates clean DEPOSIT tx
- [ ] `apply_transaction_with_crystallization(p_new_total_aum=<value>)` raises clear error

---

## Critical File Reference

| File | Role |
|------|------|
| `supabase/migrations/20260228_fix_v5_opening_balance_allocation.sql` | Current V5 apply with broken fund_aum_events JOIN — superseded by new migration |
| `supabase/migrations/20260301_deep_fix_aum_unification.sql` | Current apply_tx with auto-crystal — superseded |
| `src/hooks/data/admin/useYieldOperationsState.ts` | Yield dialog state — targeted edit |
| `src/services/admin/depositWithYieldService.ts` | Remove p_new_total_aum |
| `src/features/admin/yields/components/GlobalYieldFlow.tsx` | Audit for reconResult usage FIRST |
| `src/services/admin/yields/yieldApplyService.ts` | Verify param list matches new V5 signature |
| `src/services/admin/yields/yieldPreviewService.ts` | Verify return shape mapping |
| `src/types/domains/yield.ts` | V5AllocationItem type — must match preview jsonb |
| `src/contracts/rpcSignatures.ts` | Make p_new_total_aum optional |

---

**AWAITING APPROVAL — respond "yes" to begin implementation.**
