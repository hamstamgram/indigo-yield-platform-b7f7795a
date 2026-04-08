# Post-Launch Tech Debt — P2 Items

> **Created:** 2026-04-08
> **Priority:** P2 (non-blocking, first post-launch sprint)

---

## 1. `fund_aum_events.trigger_type` CHECK Constraint

**Problem**: The `fund_aum_events` table's `trigger_type` CHECK constraint does not include the `'transaction'` value. The `recalculate_fund_aum_for_date` RPC uses `'transaction'::aum_purpose` for the `purpose` column, which can cause insertion failures in edge cases involving crystallization on future-dated deposits.

**Impact**: Low — only affects a rare edge case not part of normal admin workflow.

**Fix**: Add `'transaction'` to the CHECK constraint or convert to an enum.

---

## 2. `v_missing_withdrawal_transactions` False Positives

**Problem**: The view reports false positives for completed withdrawals because it matches on `reference_id` format patterns that don't account for all backend-generated reference ID formats (e.g., `DUST_SWEEP_OUT:` vs `dust-sweep-`).

**Impact**: Low — informational view only, no financial impact. Creates noise in admin operations dashboard.

**Fix**: Update the view's reference_id matching logic to include both frontend (`dust-sweep-%`, `dust-credit-%`) and backend (`DUST_SWEEP_OUT:%`, `DUST_RECV:%`) patterns.

---

## 3. `v_position_transaction_variance` Incomplete Type Coverage

**Problem**: The view's computed `current_value` does not include `YIELD` type transactions in its sum. Since yields are applied through the `YIELD` transaction type, the view shows false variance for any investor who has received yield distributions.

**Impact**: Low — the authoritative `v_ledger_reconciliation` view is clean (0 violations). This view is supplementary.

**Fix**: Add `YIELD` (and potentially `FEE_CREDIT`, `IB_CREDIT`) to the transaction type filter in the view's SUM expression.

---

## 4. Security Definer Views (Linter Warnings)

**Problem**: Multiple views use `SECURITY DEFINER` property, which enforces permissions of the view creator rather than the querying user. The Supabase linter flags these as security concerns.

**Impact**: Medium — these views are intentionally `SECURITY DEFINER` to allow admin integrity checks to bypass RLS. However, they should be reviewed to ensure no unintended data exposure.

**Fix**: Audit each SECURITY DEFINER view. For views that only admins query, confirm RLS on the view itself restricts access. For views exposed to non-admin roles, consider converting to SECURITY INVOKER with explicit grants.

---

## Timeline

| Item | Effort | Sprint |
|------|--------|--------|
| #1 CHECK constraint | 30 min | Sprint 1 |
| #2 View pattern fix | 1 hour | Sprint 1 |
| #3 Type coverage | 1 hour | Sprint 1 |
| #4 SECURITY DEFINER audit | 2-3 hours | Sprint 2 |
