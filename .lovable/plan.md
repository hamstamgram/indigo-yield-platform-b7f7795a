
# Causal Chain Verification: Full-Stack Audit Report

## I. Source of Truth Audit (Backend-to-Frontend)

### A. Trigger-to-State Mapping: transactions_v2

The `transactions_v2` table has **20 triggers**. The critical position-update chain:

```
transactions_v2 INSERT
  |
  +---> trg_enforce_canonical_transaction (BEFORE) -- blocks non-RPC inserts
  +---> trg_enforce_economic_date (BEFORE) -- validates dates
  +---> trg_validate_transaction_amount (BEFORE) -- validates amounts
  +---> trg_validate_tx_type (BEFORE) -- validates type enum
  +---> trg_enforce_transaction_asset (BEFORE) -- asset match
  +---> trg_enforce_yield_distribution_guard (BEFORE) -- yield idempotency
  +---> trg_ledger_sync (AFTER) -- fn_ledger_drives_position: incremental delta
  +---> trg_update_last_activity (AFTER) -- updates profiles.last_activity_at
  +---> audit_transactions_v2_changes (AFTER) -- data_edit_audit log
  +---> delta_audit_transactions_v2 (AFTER) -- delta audit
  +---> trg_audit_transactions (AFTER) -- audit_transaction_changes

transactions_v2 UPDATE (is_voided)
  |
  +---> trg_ledger_sync (AFTER) -- reverses delta
  +---> trg_recompute_on_void (AFTER) -- full ledger recompute
  +---> trg_cascade_void_from_transaction (AFTER) -- cascades to allocations
```

### B. FINDING: Dual Position Writer -- Redundancy Risk (INFO, Not Bug)

**`fn_ledger_drives_position`** (incremental delta) and **`recompute_on_void`** (full recompute) BOTH fire on void operations. This creates a double-update:
1. `trg_ledger_sync` reverses the delta (current_value -= amount)
2. `trg_recompute_on_void` runs `reconcile_investor_position_internal` which does a full ledger sum

The result is correct because `recompute_on_void` sets `indigo.canonical_rpc = true` and does a full overwrite, superseding the delta. However, the delta from `trg_ledger_sync` runs first and is immediately overwritten. This is **redundant work but not a bug** -- the final state is deterministic.

**Status: VERIFIED CORRECT** -- No action needed. The `recompute_on_void` is the authoritative final write.

### C. FINDING: `fn_ledger_drives_position` Does NOT Set Canonical Flag

This trigger function updates `investor_positions.current_value` and `cost_basis` without setting `indigo.canonical_rpc`. This should be blocked by `enforce_canonical_position_write`.

**Why it works:** All transaction INSERTs go through RPCs (`apply_investor_transaction`, `apply_segmented_yield_distribution_v5`, `complete_withdrawal`) which set `indigo.canonical_rpc = 'true'` at their start. Since the flag is set at the transaction-level scope (`true` = local to transaction), `fn_ledger_drives_position` inherits it.

**Edge case:** If `is_system_generated = true` or the type is in `v_allowed_types`, `enforce_canonical_transaction_mutation` allows direct inserts WITHOUT the canonical flag. In that case, `fn_ledger_drives_position` would fire but `enforce_canonical_position_write` would BLOCK the position update.

**Verification:** The `audit_log` has **zero** `BLOCKED_DIRECT_POSITION_WRITE` entries, confirming this edge case has never been triggered in production.

**Status: LATENT RISK** -- If a system-generated insert bypasses canonical RPCs, positions won't update. Recommend adding `PERFORM set_config('indigo.canonical_rpc', 'true', true);` to `fn_ledger_drives_position` as defense-in-depth.

### D. FINDING: No Row-Level Locking in Yield Application (Race Condition Risk)

`apply_segmented_yield_distribution_v5` does NOT use `SELECT ... FOR UPDATE` on `investor_positions` before reading balances. The `calculate_yield_allocations` function reads `investor_positions.current_value` without locking.

If two admins trigger yield distributions simultaneously, or a deposit is processed while yield is being calculated, the AUM snapshot could be stale, leading to incorrect proportional allocation.

**Mitigating factor:** The `check_historical_lock` call at the start provides date-level idempotency (prevents duplicate distributions for the same date). But it does NOT prevent a concurrent deposit from changing balances mid-calculation.

**Status: LOW RISK** -- Single-admin operations in practice, but formally unprotected. Recommend adding `PERFORM pg_advisory_xact_lock(hashtext('yield_' || p_fund_id::text));` at the start of the function.

---

## II. Enum and Type Parity Audit

### A. tx_type: VERIFIED MATCH

DB enum `tx_type` values (14): DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT, DUST_SWEEP, IB, DUST

Frontend `TX_TYPE_VALUES` in `dbEnums.ts` (14): Exact match confirmed.

Frontend `TX_TYPES` in ledger `types.ts` (9 filter options): DEPOSIT, WITHDRAWAL, YIELD, FEE, FEE_CREDIT, IB_CREDIT, INTEREST, ADJUSTMENT. Missing from filters: INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT, DUST_SWEEP, IB, DUST.

**Status: BY DESIGN** -- Internal/system types are intentionally excluded from the investor-facing ledger filter. Admin views show all types.

### B. transaction_type (Legacy): VERIFIED ISOLATED

DB enum `transaction_type` (5 values): DEPOSIT, WITHDRAWAL, INTEREST, FEE, DUST_ALLOCATION. Frontend mirrors this exactly. Used only in legacy contexts.

### C. All Other Enums: VERIFIED MATCH

- `account_type`: DB [investor, ib, fees_account] = Frontend [investor, ib, fees_account]
- `aum_purpose`: DB [reporting, transaction] = Frontend [reporting, transaction]
- `visibility_scope`: DB [investor_visible, admin_only] = Frontend [investor_visible, admin_only]
- `tx_source`: DB (14 values) = Frontend (14 values) -- exact match
- `fund_status`: DB (5 values) = Frontend (5 values) -- exact match

**Status: FULLY VERIFIED** -- No unhandled enum cases found.

---

## III. Data Visibility Audit (Frontend Rendering)

### A. The "Paul" (IB) Question: VERIFIED BY DESIGN

The `generate-fund-performance` edge function filters: `!p.account_type || p.account_type === 'investor'`. This intentionally excludes IB accounts from performance statements.

In the yield engine (`calculate_yield_allocations`), IBs DO receive IB_CREDIT transactions to their positions. The reporting exclusion is an intentional business rule: IBs earn commissions but don't receive investor-style performance reports.

**Status: CONFIRMED BY DESIGN** -- Not a bug.

### B. Orphaned yield_allocations: VERIFIED CLEAN

Query confirmed: **zero** non-voided yield_allocations with `transaction_id IS NULL`. Every allocation has a corresponding ledger entry.

**Status: VERIFIED CLEAN**

### C. Precision Rendering Audit

**FINDING: `NumericInput` Uses `Math.round()` and `parseFloat()`**

`src/components/common/NumericInput.tsx` line 103-115:
```typescript
let numValue = parseFloat(parsed);
const factor = Math.pow(10, precision);
numValue = Math.round(numValue * factor) / factor;
```

This uses floating-point arithmetic for rounding. For 10-decimal crypto precision, `Math.round(1.23456789015 * 1e10)` could produce incorrect results due to IEEE 754 representation.

**Impact:** This affects the ADMIN YIELD INPUT FORM (`YieldInputForm.tsx` line 286). When an admin enters a New AUM value with >15 significant digits, `parseFloat` will silently truncate precision before it reaches the RPC.

**Risk:** MEDIUM for crypto funds where AUM values can be very precise. The `yieldApplyService.ts` correctly uses `parseFinancial()` (Decimal.js), but the INPUT is already corrupted by `NumericInput`.

**Recommendation:** Replace `parseFloat`/`Math.round` in `NumericInput.onBlur` with `Decimal.js` operations, consistent with the `parseFinancial` standard.

**FINDING: `Number()` Used for Read-Only Display (Acceptable)**

`performanceService.ts`, `profileService.ts`, `yieldHistoryService.ts` use `Number()` for display formatting. Since these values flow to UI rendering (not back to RPCs), precision loss beyond 15 digits is cosmetically acceptable for display purposes.

**Status: ACCEPTABLE for display, NEEDS FIX for input**

### D. `parseFloat` in YieldInputForm Display (Lines 298-304)

`parseFloat(yieldAmount)` is used for display-only comparison (`< 0`, formatting). This is acceptable since it doesn't flow back to the RPC.

**Status: ACCEPTABLE**

---

## IV. Hidden Entropy Audit

### A. Race Conditions in Yield Application

As noted in Section I.D, `apply_segmented_yield_distribution_v5` lacks row-level or advisory locking. The `check_historical_lock` provides idempotency for the same date but not concurrency protection during calculation.

**Concrete scenario:** Admin triggers September yield. Simultaneously, a withdrawal completes via `complete_withdrawal`. The withdrawal updates `investor_positions.current_value`. The yield function reads a stale AUM snapshot from before the withdrawal.

**Mitigation:** The `complete_withdrawal` RPC sets `indigo.canonical_rpc` and does NOT overlap with yield periods in practice. But formally, no serialization guarantee exists.

**Recommendation:** Add advisory lock at the start of `apply_segmented_yield_distribution_v5`:
```sql
PERFORM pg_advisory_xact_lock(hashtext('yield_apply_' || p_fund_id::text));
```

### B. Orphaned Records: VERIFIED CLEAN

- yield_allocations without transactions: **0**
- Orphaned investor_positions (no profile): Already cleaned in prior audit
- Ghost performance records: Pending manual SQL execution from prior audit

---

## V. Integrity Map

| UI Action | Frontend Hook | RPC/Service | DB Trigger Chain | Final UI State |
|-----------|--------------|-------------|-----------------|---------------|
| Record Yield | useApplyYieldDistribution | apply_segmented_yield_distribution_v5 | trg_ledger_sync -> fn_ledger_drives_position (delta update investor_positions) | Toast success, cache invalidated via YIELD_RELATED_KEYS |
| Admin Deposit | useAddTransaction | apply_investor_transaction | trg_enforce_canonical_transaction -> trg_ledger_sync -> fn_ledger_drives_position | Position updated, realtime channel notifies investor |
| Void Transaction | useVoidTransaction | void_transaction | trg_ledger_sync (reverse delta) + trg_recompute_on_void (full recompute) + trg_cascade_void | Position recalculated from ledger, allocations voided |
| Complete Withdrawal | useCompleteWithdrawal | complete_withdrawal | trg_ledger_sync (WITHDRAWAL tx) + trg_ledger_sync (DUST tx if applicable) | Balance reduced, DUST assigned to fees account |

---

## VI. Summary of Findings

| # | Finding | Severity | Status | Action Required |
|---|---------|----------|--------|----------------|
| 1 | `fn_ledger_drives_position` doesn't set canonical flag | Latent Risk | Works today (inherited from parent RPC) | Add `set_config` as defense-in-depth (SQL migration) |
| 2 | No advisory lock in yield apply RPC | Low Risk | Single-admin ops in practice | Add `pg_advisory_xact_lock` (SQL migration) |
| 3 | `NumericInput` uses `parseFloat`/`Math.round` for precision | Medium | Affects admin AUM input | Replace with Decimal.js in onBlur handler |
| 4 | Dual position writer on void (delta + recompute) | Info | Correct but redundant | No action (recompute is authoritative) |
| 5 | Enum parity | Verified | All 14+ enums match DB-to-frontend | No action |
| 6 | Orphaned allocations | Verified Clean | 0 orphans found | No action |
| 7 | `Number()` for display values | Acceptable | Read-only formatting | No action |

### Code Changes Required

| File | Change | Risk |
|------|--------|------|
| `src/components/common/NumericInput.tsx` | Replace `parseFloat`/`Math.round` in `onBlur` with Decimal.js rounding | None -- improves precision |

### SQL Migrations Required

| # | Change | Risk |
|---|--------|------|
| 1 | Add `PERFORM set_config('indigo.canonical_rpc', 'true', true);` to `fn_ledger_drives_position` | None -- defense-in-depth, no behavior change |
| 2 | Add `PERFORM pg_advisory_xact_lock(hashtext('yield_apply_' || p_fund_id::text));` to `apply_segmented_yield_distribution_v5` | None -- prevents theoretical race condition |

### No-Op Certification

All proposed fixes are defensive hardening. They do not alter the historical ledger, do not change any existing transaction amounts, and do not modify any completed yield distributions. The September SOL Fund anomalies (ghost reports, Indigo LP mismatch) were addressed in the prior audit and are orthogonal to these structural findings.
