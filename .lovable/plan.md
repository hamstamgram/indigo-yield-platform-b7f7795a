

# Zero Trust Forensic Audit Report

## SECTION 1: FINANCIAL CORE ("The Money Audit")

### 1. The "Dust" and Precision Inquiry

**RED FLAG REPORT -- Files Using Floating-Point Math for Financial Values:**

| File | Line(s) | Pattern | Severity |
|------|---------|---------|----------|
| `src/services/admin/yields/yieldPreviewService.ts` | 144-145 | `Number(result.opening_aum) * 100` for yield percentage | MEDIUM |
| `src/services/admin/yields/yieldHistoryService.ts` | 290-292 | `Number(row.current_value)` for composition values | MEDIUM |
| `src/services/shared/transactionService.ts` | 190, 202, 286, 297 | `parseFloat(String(params.amount))` passed to RPC | LOW (SQL handles precision) |
| `src/services/investor/transactionsV2Service.ts` | 180 | `Number(tx.amount)` for summary accumulation | HIGH |
| `src/features/admin/yields/components/YieldEventsTable.tsx` | 90 | `parseFloat(String(e.net_yield_amount))` for sum | HIGH |
| `src/features/admin/dashboard/QuickYieldEntry.tsx` | 46-56 | `parseFloat(newAUM)` for yield calc | MEDIUM (display only) |
| `src/services/admin/feesService.ts` | 207 | `parseFloat(String(p.current_value || 0))` for balances | HIGH |
| `src/services/shared/performanceService.ts` | 386-416 | `Number(r.mtd_beginning_balance)` etc. | LOW (display mapping) |

**Rounding Mode:** Backend SQL uses `ROUND(value::numeric, 8)` which is PostgreSQL "round half away from zero." Frontend Decimal.js defaults to `ROUND_HALF_UP`. These are compatible. Dust residual in V5 is assigned to the largest non-fees investor (correct).

**Verdict:** Core yield engine (preview/apply RPCs and apply service) correctly uses `parseFinancial()` (Decimal.js). However, several peripheral services and UI components use raw `Number()` / `parseFloat()` for financial aggregation, which can cause dust-level discrepancies in display totals.

### 2. Conservation of Value Check

**Status: PASS**

- The V5 engine enforces `v_total_gross = v_total_net + v_total_fees + v_total_ib` in the RPC return.
- Dust residual is explicitly tracked and assigned (not lost).
- Opening AUM now correctly includes all account types (fixed in prior session).

**Orphaned Remainder Handling:** Dust goes to the largest non-fees investor. This is acceptable.

### 3. Historical Immutability

**Status: PASS**

- `trg_protect_immutable_fields` triggers on `transactions_v2`, `fee_allocations`, `ib_allocations`, `audit_log`, and `yield_distributions` prevent modification of `created_at`, `reference_id`, and actor fields.
- Voiding is the only way to "undo" -- creates a new void transaction, never edits the original.
- `trg_enforce_canonical_position_write` blocks direct position edits.

### 4. Zero and Negative Yield

**Status: Partially Addressed**

- Zero yield: Frontend block removed (prior session). Backend handles it correctly.
- Negative yield: V5 engine **skips** segments with negative yield (`IF v_seg_yield > 0`). Losses are not distributed. This is a **design decision**, not a bug, but it means the platform cannot report losses.

---

## SECTION 2: SYSTEM INTEGRITY ("The Code Audit")

### 5. Concurrency and Race Conditions ("Double Spend")

**THE LOCK REPORT -- Status: PASS**

| Operation | Lock Mechanism | Idempotency Key |
|-----------|---------------|-----------------|
| Yield Distribution (V5) | `pg_advisory_xact_lock(md5(fund_id + period_end))` | `reference_id` unique constraint on `transactions_v2` |
| Deposit/Withdrawal | `pg_advisory_xact_lock(hashtext('crystallize:' + fund_id))` | `reference_id` unique per trigger reference |
| Void Transaction | `SELECT ... FOR UPDATE` on transaction row | N/A (row-level lock) |

Two admins clicking "Apply" simultaneously: the second will block on the advisory lock and then fail on the existing distribution check (idempotency). **No double-spend possible.**

### 6. Zombie and Ghost Accounts

**THE ORPHAN REPORT -- Status: CLEAN**

| Check | Result |
|-------|--------|
| Ledger entries without valid profile | **0 orphans** |
| Positions without valid profile | **0 orphans** |
| Zero-balance positions still marked active | **0 zombies** |

The system also has dedicated integrity views (`v_orphaned_transactions`, `v_orphaned_positions`, `v_fee_calculation_orphans`) monitored via the Integrity Dashboard.

### 7. The "Super-Admin" God Mode -- RBAC Audit

**Status: 5 tables use insecure `profiles.is_admin` instead of `is_admin()` RPC**

| Table | Policies Using `profiles.is_admin` | Risk |
|-------|-----------------------------------|------|
| `fund_aum_events` | INSERT, UPDATE, SELECT (3 policies) | HIGH -- privilege escalation if profile field manipulated |
| `global_fee_settings` | ALL (1 policy) | HIGH -- fee config exposed |
| `investor_fund_performance` | ALL (1 policy) | MEDIUM -- performance data write access |
| `statement_periods` | ALL (1 policy) | MEDIUM |
| `system_config` | ALL (1 policy) | HIGH -- system config exposed |

**The Fix:** Replace all `profiles.is_admin = true` checks with `is_admin()` which queries the `user_roles` table (the secure source of truth).

### 8. The "Indigo Fee" Recursive Loop Check

**Status: CORRECTLY HANDLED**

- INDIGO FEES has `fee_pct = 0.000` in profiles and `account_type = 'fees_account'`.
- The V5 engine explicitly checks: `IF v_inv.account_type = 'fees_account' THEN v_fee_pct := 0`.
- **Result:** INDIGO earns gross yield, pays zero fees. The house does not pay fees to the house.

**IB Accounts:** IBs (Ryan, Lars, Alex) have `fee_pct = 20.000` in their profile. The V5 engine does NOT override IB fees to 0. This means **IBs pay platform fees on their own yield earnings**. This may or may not be intentional -- it depends on the business rule. If IBs should not pay fees on commission-earned capital, their fee schedule needs an override (either in `investor_fee_schedule` or via an `account_type = 'ib'` check in the V5 engine similar to `fees_account`).

---

## SECTION 3: DATA and STATE ("The Truth Audit")

### 9. Timezone and Date Boundary

**Status: PASS (with enforced standard)**

- All date-to-string conversions use `date-fns.format(date, "yyyy-MM-dd")` via `formatDateForDB()`.
- `toISOString().split("T")[0]` is prohibited (documented in memory).
- PostgreSQL stores dates as timezone-agnostic `date` type for financial dates.

### 10. Yield Percentage Calculation Precision Bug

**File:** `src/services/admin/yields/yieldPreviewService.ts` lines 143-145

```typescript
yieldPercentage:
  result.opening_aum && Number(result.opening_aum) > 0
    ? String(((Number(result.gross_yield) || 0) / Number(result.opening_aum)) * 100)
    : "0",
```

This uses `Number()` division for a financial percentage. Should use `parseFinancial(result.gross_yield).div(parseFinancial(result.opening_aum)).times(100).toString()`.

---

## PRIORITIZED FIX PLAN

### Priority 1: SECURITY -- RLS Policies Using `profiles.is_admin` (5 tables, 7 policies)

**Database migration** to replace all `profiles.is_admin = true` checks with `is_admin()` on:
- `fund_aum_events` (3 policies)
- `global_fee_settings` (1 policy)
- `investor_fund_performance` (1 policy)
- `statement_periods` (1 policy)
- `system_config` (1 policy)

### Priority 2: PRECISION -- Floating-Point in Financial Aggregation (3 files)

| File | Fix |
|------|-----|
| `src/services/investor/transactionsV2Service.ts` line 180 | Replace `Number(tx.amount)` accumulation with `parseFinancial()` chain |
| `src/features/admin/yields/components/YieldEventsTable.tsx` line 90 | Replace `parseFloat(String(...))` sum with `parseFinancial()` reduce |
| `src/services/admin/feesService.ts` line 207 | Replace `parseFloat()` accumulation with `parseFinancial()` |

### Priority 3: PRECISION -- Yield Percentage Calculation (1 file)

| File | Fix |
|------|-----|
| `src/services/admin/yields/yieldPreviewService.ts` lines 143-145 | Use `parseFinancial` division instead of `Number()` |

### Priority 4: DESIGN DECISION -- IB Fee-on-Yield Policy

IB accounts (Ryan, Lars, Alex) have `fee_pct = 20%` in their profiles. When they earn yield on their commission capital, 20% of that yield goes to INDIGO FEES as a platform fee. **Confirm with business whether this is intended.** If not, add `account_type = 'ib'` to the fee exemption logic in the V5 engine alongside `fees_account`.

### Summary

| Category | Issues Found | Critical | Needs Fix |
|----------|-------------|----------|-----------|
| Floating-point precision | 8 files flagged | 3 HIGH | 3 files |
| Concurrency/Locks | All critical paths locked | 0 | None |
| Orphaned records | 0 found | 0 | None |
| Historical immutability | Triggers enforce | 0 | None |
| RLS security (profiles.is_admin) | 7 policies on 5 tables | 3 HIGH | DB migration |
| Fee recursive loop | Correctly handled for INDIGO | 0 | IB policy TBD |
| Conservation of value | Enforced in V5 | 0 | None |

