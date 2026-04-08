# Post-Launch Tech Debt — P2 Items

> **Created:** 2026-04-08
> **Priority:** P2 (non-blocking, first post-launch sprint)
> **Status:** ✅ ALL RESOLVED (Sprint 1)

---

## 1. `fund_aum_events.trigger_type` CHECK Constraint — ✅ N/A

**Resolution:** Table `fund_aum_events` was dropped prior to launch. No action needed.

---

## 2. `v_missing_withdrawal_transactions` False Positives — ✅ RESOLVED

**Problem**: The view reported false positives for completed withdrawals because it matched on `reference_id` format patterns that don't account for all backend-generated reference ID formats.

**Fix (Migration C — 2026-04-08):**
- Added `INTERNAL_WITHDRAWAL` to the transaction type match
- Added `fund_id` join condition for accuracy
- Excluded dust sweep reference patterns (`DUST_SWEEP_OUT:%`, `DUST_RECV:%`, `dust-sweep-%`, `dust-credit-%`)

---

## 3. `v_position_transaction_variance` Incomplete Type Coverage — ✅ ALREADY FIXED

**Resolution:** View already includes `YIELD`, `FEE_CREDIT`, `IB_CREDIT`, and `DUST_SWEEP` in its SUM expression. No action needed.

---

## 4. Security Definer Views (Linter Warnings) — ✅ ALREADY FIXED

**Resolution:** All 28 public views are configured with `security_invoker = true`. Supabase linter reports 0 warnings.

---

## Timeline

| Item | Status | Sprint |
|------|--------|--------|
| #1 CHECK constraint | ✅ N/A (table dropped) | — |
| #2 View pattern fix | ✅ Fixed in Migration C | Sprint 1 |
| #3 Type coverage | ✅ Already fixed | — |
| #4 SECURITY DEFINER audit | ✅ Already fixed | — |
