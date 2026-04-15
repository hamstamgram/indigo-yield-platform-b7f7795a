# Indigo Yield — Remaining Work Plan

**Updated:** 2026-06-17
**Project:** `/Users/mama/ai-lab/repo/indigo-yield`
**Supabase:** `nkfimvovosdehmyyjubn`

---

## COMPLETED (2026-06-17 Session)

| # | Task | Details | Status |
|---|------|---------|--------|
| 1 | Error propagation fix | Flipped `userMessage || message` to `message || userMessage` in 10 service files + 6 new error patterns in rpcErrors.ts | ✅ |
| 2 | `v_liquidity_risk` 404 spam | `useRiskAlerts.ts` now returns `[]` gracefully, no retry on 404, no polling | ✅ |
| 3 | `void_and_reissue_transaction` migration | `20260617000000_fix_void_and_reissue_canonical_rpc.sql` — re-creates both functions with defense-in-depth `set_config` | ✅ Written |
| 4 | InvestorReports DialogDescription | Added `<DialogDescription>` to preview dialog | ✅ |
| 5 | void_and_reissue_full_exit migration | Included in same migration file | ✅ Written |

---

## P0 TASKS — DO FIRST

### TASK 1 — Apply `void_and_reissue` Migration to Remote DB

**Priority:** CRITICAL — Void & Reissue is broken until this is applied
**Effort:** 2 min
**File:** `supabase/migrations/20260617000000_fix_void_and_reissue_canonical_rpc.sql`

**How:** Run the SQL in Supabase Dashboard SQL Editor or via MCP tool

**Verify:**
```sql
-- Test void & reissue on a test transaction
-- Step 1: Note a transaction ID from the ledger
-- Step 2: Click Void & Reissue in the UI
-- Step 3: Expect: success with corrected transaction created
-- Step 4: Check console — should NOT show CANONICAL_MUTATION_REQUIRED
```

---

### TASK 2 — Create `v_liquidity_risk` and `v_concentration_risk` Views

**Priority:** HIGH — Risk panels show no data until views exist
**Effort:** 30 min

The `useLiquidityRisk()` and `useConcentrationRisk()` hooks are now gracefully degraded (return `[]` on 404), but the Risk panels need real data.

**Option A: Create the views in the DB**
```sql
-- Example: v_liquidity_risk
CREATE OR REPLACE VIEW public.v_liquidity_risk AS
SELECT
  ip.fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  ip.investor_id,
  p.email,
  ip.current_value AS position_value,
  SUM(ip.current_value) OVER (PARTITION BY ip.fund_id) AS fund_total_aum,
  CASE
    WHEN ip.current_value / NULLIF(SUM(ip.current_value) OVER (PARTITION BY ip.fund_id), 0) > 0.25
    THEN 'HIGH'
    WHEN ip.current_value / NULLIF(SUM(ip.current_value) OVER (PARTITION BY ip.fund_id), 0) > 0.10
    THEN 'MEDIUM'
    ELSE 'LOW'
  END AS concentration_level
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
WHERE p.account_type = 'investor'
  AND ip.current_value > 0;
```

**Option B: Remove the hooks entirely** if risk monitoring is not needed yet.

---

### TASK 3 — Configure `notify-yield-applied` Edge Function

**Priority:** MEDIUM — Push notifications not working
**Effort:** 5 min

1. Go to Supabase Dashboard → Edge Functions → `notify-yield-applied` → Settings
2. Add env var: `SUPABASE_SERVICE_ROLE_KEY` = `<your service role key>`
3. Test: Apply a yield distribution and verify no 500 in console

---

## P1 TASKS — Next Sprint

### TASK 4 — Fix `void_yield_distribution` reference_id Pattern Mismatch

**Priority:** HIGH — Yield void may not cascade to transactions
**Effort:** 1-2 hours

**Problem:** The `void_yield_distribution` function uses `reference_id` LIKE patterns (`yield_adb_`, `yield_v5_`, `fee_credit_`, `ib_credit_`) to find linked transactions. If `apply_segmented_yield_distribution_v5` uses different patterns, the void cascade finds 0 transactions and logs `noCascade`.

**Diagnostic query:**
```sql
-- Check what reference_id patterns exist for yield transactions
SELECT DISTINCT reference_id
FROM transactions_v2
WHERE type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
  AND is_voided = false
ORDER BY reference_id
LIMIT 50;
```

**Fix:** Update `void_yield_distribution` to also match by `distribution_id` column on `transactions_v2`, which is more reliable than pattern matching.

---

### TASK 5 — Select Controlled/Uncontrolled Warning

**Priority:** LOW — React console warning only
**Effort:** 30 min

Find all `Select` components where `value` could be `undefined` and add fallback:
```tsx
// BEFORE (causes warning)
<Select value={someFilter} onValueChange={setFilter}>

// AFTER (no warning)
<Select value={someFilter ?? "all"} onValueChange={setFilter}>
```

---

## Yield Calculation Verification (Sam Johnson Scenario)

The following scenario was verified mathematically:

| Step | Date | Action | Amount |
|------|------|--------|--------|
| T1 | 2025-11-17 | Sam deposit | +135,003 XRP |
| T2 | 2025-11-25 | Sam deposit | +49,000 XRP |
| Y1 | 2025-11-30 | Reporting AUM | 184,358 XRP |
| Y1 result | | Sam: +284, Ryan (IB 4%): +14.20, Fees (16%): +56.80 | Total: 355 XRP |
| T3 | 2025-11-30 | Sam deposit (after reporting) | +45,000 XRP |
| Y2 | 2025-12-08 | AUM | 229,731 XRP |
| Y2 result | | Sam: +298.31, Ryan: +14.93, Fees: +59.76 | Total: 373 XRP |

**Verification:**
- Y1: 184,287 + 14.20 + 56.80 = 184,358 ✓
- Fees = 16% of total yield, IB = 4% of total yield (both taken from gross before investor net)
- Yield rate Y1: 355/184,358 ≈ 0.193% monthly
- Yield rate Y2: 373/229,731 ≈ 0.163% monthly

**Platform should replicate these numbers exactly.** If it doesn't, the fee/IB split percentages or the yield gross-to-net calculation needs adjustment.

---

## KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `supabase/migrations/20260617000000_fix_void_and_reissue_canonical_rpc.sql` | Fix void & reissue canonical RPC guard (NEEDS APPLY) |
| `src/lib/errors/rpcErrors.ts` | Error pattern matching — 6 new patterns added |
| `src/features/admin/system/hooks/useRiskAlerts.ts` | Risk panel hooks — graceful 404 handling |
| `src/features/admin/transactions/services/adminTransactionHistoryService.ts` | Transaction service — error propagation fix |
| `docs/POST_LAUNCH_TECH_DEBT.md` | Full tech debt registry |