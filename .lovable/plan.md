

# Full Codebase Audit — Post Precision Upgrade

## Audit Summary

After reviewing the codebase following the `numeric(38,18)` precision upgrade and BTC withdrawal date fixes, I found **3 bugs** (1 critical, 1 moderate, 1 low) and **1 cosmetic issue**. No new features or UI changes are needed.

---

## BUG 1 — CRITICAL: Admin "Add Transaction" withdrawal missing `settlement_date` and `request_date`

**File:** `src/features/admin/transactions/hooks/useTransactionSubmit.ts` (lines 88-99)

**Problem:** When an admin creates a withdrawal via the "Add Transaction" dialog, the `withdrawal_requests` insert omits `settlement_date` and `request_date`. Both default to `NOW()` in the database. The `approve_and_complete_withdrawal` RPC then reads `settlement_date` (falling back to `CURRENT_DATE`) for the ledger `tx_date`.

This is the **exact root cause** of the BTC withdrawal date bug we just fixed — if an admin enters a historical date (e.g., `2024-12-15`) in the form's `tx_date` field, the withdrawal request and ledger entry still get today's date.

**Fix:** Add `settlement_date: data.tx_date` and `request_date: data.tx_date` to the insert payload at line 91.

---

## BUG 2 — MODERATE: `void_and_reissue_full_exit` uses `profiles.is_admin` column instead of `is_admin()` RPC

**File:** `supabase/migrations/20260324143540_d85fc7ca-815e-410c-ad04-d0164f8f562a.sql` (line 920)

**Problem:** The function checks admin status via `SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id`, which reads the `profiles.is_admin` column directly. Per the platform security standard (documented in memory), all admin checks should use the secure `is_admin()` RPC to prevent privilege escalation via profile manipulation.

Other functions in the same migration correctly use `public.is_admin()`.

**Fix:** Replace the profile column check with `IF NOT public.is_admin() THEN RAISE EXCEPTION ...`.

---

## BUG 3 — LOW: `reconcile_investor_position_internal` cost_basis calculation differs from canonical writer

**File:** `supabase/migrations/20260324143540_d85fc7ca-815e-410c-ad04-d0164f8f562a.sql` (lines 744-755)

**Problem:** The `reconcile_investor_position_internal` function computes `cost_basis` by summing `amount` directly for DEPOSIT/WITHDRAWAL types. But WITHDRAWAL amounts are stored as negative in the ledger, so this sums them as-is. The canonical `recompute_investor_position` correctly uses `-1 * ABS(amount)` for withdrawals and `ABS(amount)` for deposits. This inconsistency means the reconciliation function may produce different cost_basis values than the canonical writer.

**Fix:** Align the cost_basis calculation in `reconcile_investor_position_internal` to match `recompute_investor_position`.

---

## COSMETIC: TypeScript type comments still reference `NUMERIC(28,10)`

**Files:** 19 TypeScript files in `src/types/domains/`

**Problem:** JSDoc comments like `@precision NUMERIC(28,10) from database` are now stale — the database columns are `numeric(38,18)`. This is documentation-only and has zero runtime impact.

**Fix:** Find-and-replace `NUMERIC(28,10)` with `NUMERIC(38,18)` in all TypeScript comment strings.

---

## What Passed Audit (No Issues Found)

- All 12 upgraded functions use `numeric(38,18)` correctly — no remaining `28,10` in live function definitions
- Position rebuild loop correctly iterates all `(investor_id, fund_id)` pairs
- BTC withdrawal date corrections applied to all 5 rows
- Yield distribution RPCs use unqualified `numeric` (unlimited precision) — no truncation risk
- `fn_ledger_drives_position` trigger correctly handles INSERT, void, and unvoid paths
- `approve_and_complete_withdrawal` correctly uses `settlement_date` from the request (when set)
- RLS policies on financial tables correctly use `is_admin()` RPC
- Canonical position writer guard (`trg_enforce_canonical_position_write`) is intact
- The `CreateWithdrawalDialog` (admin withdrawal management) correctly passes `settlement_date`

---

## Recommended Fix Priority

| # | Bug | Severity | Effort |
|---|-----|----------|--------|
| 1 | Add `settlement_date` + `request_date` to admin Add Transaction withdrawal insert | Critical | 2 lines |
| 2 | Replace `profiles.is_admin` with `is_admin()` in `void_and_reissue_full_exit` | Moderate | 1 migration |
| 3 | Align `reconcile_investor_position_internal` cost_basis logic | Low | 1 migration |
| 4 | Update TypeScript comments from 28,10 to 38,18 | Cosmetic | Find-replace |

## Files to Change

| File | Change |
|------|--------|
| `src/features/admin/transactions/hooks/useTransactionSubmit.ts` | Add `settlement_date: data.tx_date` and `request_date: data.tx_date` to withdrawal_requests insert |
| New migration | `CREATE OR REPLACE` `void_and_reissue_full_exit` with `is_admin()` check; fix `reconcile_investor_position_internal` cost_basis |
| `src/types/domains/*.ts` (19 files) | Replace `NUMERIC(28,10)` with `NUMERIC(38,18)` in comments |

