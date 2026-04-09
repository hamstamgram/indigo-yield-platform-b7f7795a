

## Full-Graph Expert Audit — Findings & Fix Plan

### Finding 1 — CRITICAL: `crystallize_yield_before_flow` references dropped `fund_aum_events` table

**Status**: Unguarded. Will crash at runtime.

The function has **two** fallback code paths (lines 83-88 and 128-131) that query `fund_aum_events`, which does **not exist** — confirmed no table, no view, no materialized view. The function `get_existing_preflow_aum` that it calls also does not exist in the DB, meaning line 64 will crash even before reaching the `fund_aum_events` fallback.

These paths execute when `fund_daily_aum` has no matching record for the fund/date combination. In that case the function falls through to the `fund_aum_events` query and crashes with `relation "fund_aum_events" does not exist`.

**Fix**: Replace the `fund_aum_events` fallback blocks with position-sum fallback (sum of `investor_positions.current_value`), which is already used on line 135-137 of the same function. Also guard the `get_existing_preflow_aum` call with an existence check or remove it if the function doesn't exist.

---

### Finding 2 — CRITICAL: `run_integrity_pack` Check 2 references non-existent `fund_aum_mismatch` view

The view `fund_aum_mismatch` does not exist (confirmed: not in `pg_class`, not in `pg_views`). Check 2 (lines 27-37) will crash the entire integrity pack when it tries to query this view, **silently preventing all 13 checks from running**.

**Fix**: Either create the `fund_aum_mismatch` view, or remove Check 2 from the pack. Given that `fund_daily_aum` is the only AUM table remaining, the view should compare `fund_daily_aum.total_aum` against `SUM(investor_positions.current_value)` per fund.

---

### Finding 3 — CRITICAL: `run_integrity_pack` Check 3 references wrong column `conservation_gap`

The `yield_distribution_conservation_check` view uses column `residual`, not `conservation_gap`. Lines 42 and 47 will crash with `column "conservation_gap" does not exist`, again killing the entire integrity pack.

**Fix**: Change `conservation_gap` to `residual` in Check 3.

---

### Finding 4 — MEDIUM: `rpcSignatures.ts` contract has `securityDefiner: false` for 100+ SECURITY DEFINER functions

Nearly every function in the DB is `SECURITY DEFINER`, but the contract marks most as `false`. This is informational only (Supabase JS doesn't use this flag), but it means the contract is unreliable as documentation.

**Fix**: Bulk-update all `securityDefiner` flags in the contract to match the DB. This is a metadata-only change with zero runtime impact.

---

### Finding 5 — MEDIUM: `adjust_investor_position` contract marks `p_tx_date` as optional but DB requires it

DB signature: `(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_tx_date date, p_reason text, p_admin_id uuid DEFAULT NULL)` — only `p_admin_id` has a default.

Contract: `requiredParams: ["p_amount", "p_fund_id", "p_investor_id", "p_reason"], optionalParams: ["p_admin_id", "p_tx_date"]`

**Current risk**: Low — the sole caller (`transactionService.ts:202`) always passes `p_tx_date`. But any future caller trusting the contract would crash.

**Fix**: Move `p_tx_date` from `optionalParams` to `requiredParams`.

---

### Finding 6 — MEDIUM: `apply_segmented_yield_distribution_v5` missing from `rpcSignatures.ts`

The V5 yield engine is the primary yield distribution path. It exists in the DB and is called from `yieldApplyService.ts:59` via `callRPC as any` (type cast bypass). It's missing from the contract entirely, meaning no compile-time param validation.

**Fix**: Add the V5 signature to the contract with correct params: `requiredParams: ["p_fund_id", "p_period_end", "p_recorded_aum", "p_purpose"], optionalParams: ["p_opening_aum", "p_admin_id", "p_distribution_date"]`.

---

### Finding 7 — LOW: `force_delete_investor` references `investor_daily_balance` (dropped table)

Line 289 of `force_delete_investor` runs `DELETE FROM investor_daily_balance WHERE investor_id = p_investor_id`. This table does not exist. However, the DELETE will crash without an IF EXISTS guard.

Similarly, `purge_fund_hard` and `reset_platform_data` reference this table.

**Fix**: Add IF EXISTS guards for `investor_daily_balance` in all 3 functions.

---

### Finding 8 — LOW: `get_health_trend` and `get_latest_health_status` are dead stubs

Both return empty result sets. They exist in the frontend contract and are called from the health dashboard. Safe but wasteful.

**Fix**: Optionally drop from contract if no UI references, or leave as-is.

---

### Summary of Changes

**Migration 1 — Critical fixes (3 items)**
1. Rewrite `crystallize_yield_before_flow` to remove `fund_aum_events` fallbacks and the `get_existing_preflow_aum` call, replacing with position-sum fallback
2. Fix `run_integrity_pack` Check 2: replace `fund_aum_mismatch` with a working AUM comparison query or create the missing view
3. Fix `run_integrity_pack` Check 3: change `conservation_gap` to `residual`

**Migration 2 — Guard fixes**
4. Add IF EXISTS guard for `investor_daily_balance` in `force_delete_investor`, `purge_fund_hard`, `reset_platform_data`

**Frontend fix**
5. Fix `adjust_investor_position` contract: move `p_tx_date` to required
6. Add `apply_segmented_yield_distribution_v5` to `rpcSignatures.ts`
7. Bulk-fix `securityDefiner` flags (optional, documentation-only)

### Risk Assessment
- Migrations are defensive (guards, column renames, fallback rewrites)
- No business logic changes — same data flows, same calculations
- The `crystallize_yield_before_flow` rewrite removes dead references but preserves the position-sum fallback that already exists in the function

