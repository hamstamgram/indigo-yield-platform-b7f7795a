

# Sprint 1 Remaining Work — Implementation Plan

## Current State (verified live)

| Item | Status | Notes |
|------|--------|-------|
| auth_rls_initplan WARN | **10 policies** use bare `auth.uid()` | 6 tables: ib_allocations, investor_device_tokens, notifications, transactions_v2, user_sessions, yield_distributions |
| multiple_permissive_policies | **1 table** (yield_distributions SELECT) | Not 73 — only `admin_yield_select` + `investor_yield_read_own_fund` overlap |
| Tech debt #1 (fund_aum_events) | **N/A** | Table does not exist in current schema — already dropped |
| Tech debt #2 (v_missing_withdrawal_transactions) | **Open** | Still uses simple JOIN match, no reference_id pattern matching |
| Tech debt #3 (v_position_transaction_variance) | **Already fixed** | View already includes YIELD, FEE_CREDIT, IB_CREDIT, DUST_SWEEP |
| Tech debt #4 (SECURITY DEFINER views) | **Already fixed** | All 28 views are `security_invoker = true` |
| Gate 2 (E2E harness) | **Open** | Separate task |
| Gate 3 (Excel parity) | **Open** | Separate task |

---

## Migration C: RLS Performance + Policy Consolidation + View Fix

**Single migration covering all remaining DB work:**

### 1. Wrap bare `auth.uid()` in `(SELECT auth.uid())` (10 policies)

Drop and recreate each policy with the wrapped form. Affected:

- `ib_allocations.ib_allocations_read_policy`
- `investor_device_tokens.investor_device_tokens_insert`
- `investor_device_tokens.investor_device_tokens_delete`
- `notifications.notifications_update_own` (USING + WITH CHECK)
- `notifications.notifications_delete_own`
- `transactions_v2.investor_transactions_read_policy`
- `user_sessions.user_sessions_self`
- `user_sessions.user_sessions_insert`
- `user_sessions.user_sessions_update`
- `yield_distributions.investor_yield_read_own_fund`

### 2. Consolidate yield_distributions duplicate SELECT policies

Merge `admin_yield_select` and `investor_yield_read_own_fund` into a single policy with combined USING clause.

### 3. Fix `v_missing_withdrawal_transactions` false positives

Replace the simple JOIN-based match with reference_id pattern matching that covers both frontend and backend formats:
- `WR-%`, `WDR-%` (frontend withdrawal references)
- `DUST_SWEEP_OUT:%`, `DUST_RECV:%` (backend dust sweep references)

### 4. Remove tech debt items #1, #3, #4 from POST_LAUNCH_TECH_DEBT.md

Mark as resolved (table dropped, already fixed, already fixed). Keep #2 as resolved-in-this-sprint.

---

## Code Changes

### Update `docs/POST_LAUNCH_TECH_DEBT.md`

Mark items #1, #3, #4 as resolved. Mark #2 as fixed in Migration C.

### Update `docs/gates/gate-0-report.md`

Add RLS performance fixes to the completed items section.

---

## Not in this migration (Gate 2 + Gate 3)

- **Gate 2 (E2E harness):** Requires QA admin role setup and Command Center selector fixes — separate task with its own test suite changes.
- **Gate 3 (Excel parity):** Requires fund-by-fund export comparison against source spreadsheet — manual validation task.

---

## Estimated effort

| Task | Time |
|------|------|
| Migration C (RLS wrap + consolidate + view fix) | 30 min |
| Doc updates | 10 min |
| **Total** | **40 min** |

