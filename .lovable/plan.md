

# Full Platform Verification Checklist — Remaining Bugs & Gaps

## STATUS OF PREVIOUS FIXES

The withdrawal state machine bugs (BUGs 1-5) are **FIXED** — `routeToFees`, `rejectWithdrawal`, `restoreWithdrawal`, `deleteWithdrawal`, and `requestsQueueService.rejectWithdrawal` all correctly use RPCs now.

Database hardening (Phases 1-4) is **DONE** — redundant triggers dropped, `search_path` hardened, views converted to `SECURITY INVOKER`.

Core integrity views (`v_ledger_reconciliation`, `v_cost_basis_mismatch`, `v_position_transaction_variance`) all return **0 violations**.

---

## REMAINING ISSUES TO FIX (4 items)

### 1. `getPerAssetStats` missing `purpose` filter (LATENT BUG)

**File**: `src/services/shared/performanceService.ts` line 434-437

The query on `investor_fund_performance` does not filter by `purpose = 'reporting'`. For investors this is masked by RLS, but admin views of investor stats (via `useInvestorAssetStats`) would mix transaction-purpose and reporting-purpose rows, potentially showing doubled or conflicting performance data.

**Fix**: Add `.eq("purpose", "reporting")` to the query at line 437.

### 2. Investor transactions service missing `visibility_scope` filter (DEFENSE-IN-DEPTH)

**File**: `src/features/investor/transactions/services/transactionsV2Service.ts` line 45-53

`getByInvestorId` does not filter `visibility_scope = 'investor_visible'`. System transactions (FEE_CREDIT, IB_CREDIT, DUST_SWEEP) marked `admin_only` could leak to investors if RLS is ever relaxed. The overview queries in `useInvestorOverviewQueries.ts` already apply this filter correctly — this service is the gap.

**Fix**: Add `.eq("visibility_scope", "investor_visible")` after the `.eq("is_voided", false)` on line 51.

### 3. `v_missing_withdrawal_transactions` false positives (3 rows)

The view currently returns 3 completed withdrawals as "missing transactions." The view's JOIN looks for `reference_id LIKE 'WDR-%' OR 'dust-sweep-%' OR 'DUST_SWEEP_OUT:%'` but the actual `approve_and_complete_withdrawal` RPC uses a different reference pattern. These are false positives — the transactions exist but don't match the view's pattern.

**Fix**: Update the view to also match the actual reference patterns used by the RPC (e.g., `withdrawal-%` or check by `withdrawal_request_id` in `meta` column instead).

### 4. Statement generation has no empty-data guard

**File**: `src/features/admin/reports/hooks/useAdminStatementsPage.ts` line 67

If `getMonthlyReports` returns empty for a period (no yield distributed that month), the system generates a blank PDF statement without warning the admin.

**Fix**: Before generating, check if reports data is empty and show a warning toast ("No reporting data for this period") instead of producing a blank statement.

---

## VERIFIED WORKING — NO ISSUES

These areas have been confirmed functional and correct:

| Area | Status | Details |
|------|--------|---------|
| Deposit flow | OK | `apply_investor_transaction` → position created via `recompute_investor_position` |
| Yield preview | OK | `preview_segmented_yield_distribution_v5` returns per-investor breakdown |
| Yield apply | OK | `apply_segmented_yield_distribution_v5` → YIELD + FEE_CREDIT + IB_CREDIT transactions → conservation identity checked |
| Void yield distribution | OK | `void_yield_distribution` cascades to fee_allocations, ib_allocations, platform_fee_ledger, ib_commission_ledger |
| Partial withdrawal | OK | `approve_and_complete_withdrawal(is_full_exit=false)` → WITHDRAWAL tx → position updated |
| Full exit + dust | OK | `approve_and_complete_withdrawal(is_full_exit=true)` → crystallize → WITHDRAWAL → DUST_SWEEP → position deactivated |
| Void completed withdrawal | OK | `void_completed_withdrawal` → voids WITHDRAWAL + DUST_SWEEP → recomputes position |
| Void & reissue | OK | `void_and_reissue_full_exit` → void → re-activate → new request → re-approve |
| Reject withdrawal | OK | Now uses `reject_withdrawal` RPC with audit trail |
| Cancel withdrawal | OK | Uses `void_completed_withdrawal` or `cancel_withdrawal_by_admin_v2` |
| Restore withdrawal | OK | Uses `restore_withdrawal_by_admin_v2` RPC |
| Route to fees | OK | Uses `route_withdrawal_to_fees` RPC |
| Onboarding triggers | OK | `trg_check_duplicate_profile`, `trg_check_email_uniqueness` fire correctly |
| Ledger sync | OK | `trg_ledger_sync` updates positions on every transaction |
| State machine guard | OK | `trg_guard_withdrawal_state` blocks non-RPC status changes |
| Void cascade | OK | `trg_cascade_void_from_transaction` + `trg_recompute_on_void` |
| Integrity views | OK | All 6 core views return 0 violations |
| Audit triggers | OK | Deduped — no more triple-logging |
| Security hardening | OK | `search_path` set on all SECURITY DEFINER functions |
| `include_in_reporting` | NOT USED | Field exists but no code queries it — safe to ignore for now |

---

## IMPLEMENTATION

All 4 fixes are small, low-risk changes:

1. **performanceService.ts** — 1-line filter addition
2. **transactionsV2Service.ts** — 1-line filter addition
3. **Migration SQL** — Recreate `v_missing_withdrawal_transactions` with correct reference patterns
4. **useAdminStatementsPage.ts** — Add empty-data guard before PDF generation

Estimated effort: ~20 minutes total.

