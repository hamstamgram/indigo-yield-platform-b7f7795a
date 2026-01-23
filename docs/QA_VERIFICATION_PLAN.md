# QA Verification Plan: Indigo Yield Platform

> **Version**: 1.0
> **Date**: 2026-01-20
> **Classification**: QA Engineering + CFO Finance Verification
> **Author**: QA Agent (Automated)

---

## Executive Summary

This document defines an exhaustive admin + finance verification plan designed to prevent:
- Enum mismatches (invalid tx types)
- Missing/renamed columns
- Broken relations / orphan records
- Bypassed financial sequencing (crystallization rules)
- Ledger/position/AUM drift
- Incorrect fee/IB/yield math across months/years

---

## PHASE 0 — BASELINE (BLOCKER)

### Goal
Lock reality before doing anything. Capture the live "truth" from the database.

### 0.1 Enum Inventory (Live from Supabase)

| Enum | Values | Critical Usage |
|------|--------|----------------|
| `tx_type` | DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT | `transactions_v2.type` |
| `tx_source` | manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, correction, withdrawal_processing, withdrawal_reversal | `transactions_v2.source` |
| `visibility_scope` | investor_visible, admin_only | `transactions_v2.visibility_scope` |
| `aum_purpose` | reporting, transaction | `fund_daily_aum.purpose`, `fund_aum_events.purpose` |
| `fund_status` | active, inactive, suspended, deprecated, pending | `funds.status` |
| `withdrawal_status` | pending, approved, processing, completed, rejected, cancelled | `withdrawal_requests.status` |
| `app_role` | super_admin, admin, moderator, ib, user, investor | `profiles.role` |
| `account_type` | investor, ib, fees_account | `profiles.account_type` |
| `fee_kind` | mgmt, perf | `fee_allocations.fee_type` |

### 0.2 Finance-Critical Tables

| Table | Primary Key | Critical Relations |
|-------|-------------|-------------------|
| `transactions_v2` | `id` (uuid) | `investor_id` → profiles, `fund_id` → funds |
| `investor_positions` | `(investor_id, fund_id)` composite | → profiles, → funds |
| `withdrawal_requests` | `id` (uuid) | `investor_id` → profiles, `fund_id` → funds |
| `yield_distributions` | `id` (uuid) | `fund_id` → funds |
| `fee_allocations` | `id` (uuid) | `distribution_id` → yield_distributions, `investor_id` → profiles |
| `ib_allocations` | `id` (uuid) | `distribution_id` → yield_distributions, `source_investor_id` → profiles, `ib_investor_id` → profiles |
| `fund_daily_aum` | `id` (uuid) | `fund_id` → funds |
| `fund_aum_events` | `id` (uuid) | `fund_id` → funds |

### 0.3 Canonical Write Paths (PROTECTED TABLES)

The following tables are **PROTECTED** and must ONLY be modified through canonical RPCs:

| Table | Canonical RPC | FORBIDDEN Direct Writes |
|-------|--------------|------------------------|
| `transactions_v2` | `apply_deposit_with_crystallization`, `apply_withdrawal_with_crystallization`, `admin_create_transaction`, `void_transaction` | INSERT/UPDATE/DELETE |
| `investor_positions` | (auto-updated by triggers) | INSERT/UPDATE/DELETE |
| `yield_distributions` | `apply_daily_yield_to_fund_v3`, `apply_adb_yield_distribution_v3` | INSERT/UPDATE/DELETE |
| `fund_daily_aum` | `set_fund_daily_aum`, `update_fund_daily_aum` | INSERT/UPDATE/DELETE |
| `fund_aum_events` | (auto-inserted by RPCs) | INSERT/UPDATE/DELETE |

### 0.4 PASS/FAIL Criteria

- **PASS** if all admin flows call canonical RPCs and never bypass to direct table writes
- **FAIL** if any admin UI flow sends a direct INSERT/UPDATE to a protected table

---

## PHASE 1 — CONTRACT & DRIFT PREVENTION (P0)

### Goal
Prevent enum/column drift by validating UI → DB contracts.

### 1.1 UI-to-DB Enum Contract

| UI Component | Form Field | Expected DB Enum | Validation Layer |
|--------------|------------|------------------|------------------|
| Admin Deposit Form | `type` | `tx_type` | Zod: `TxTypeSchema` |
| Admin Transaction Form | `type` | `tx_type` | Zod: `TxTypeSchema` |
| Admin Transaction Form | `source` | `tx_source` | Zod: (validate) |
| Admin Transaction Form | `visibility_scope` | `visibility_scope` | Zod: (validate) |
| Yield Distribution | `purpose` | `aum_purpose` | Zod: `AumPurposeSchema` |
| Withdrawal Status | `status` | `withdrawal_status` | Backend enforced |

### 1.2 Known UI-Only Values

| UI Value | DB Mapping | Notes |
|----------|-----------|-------|
| `FIRST_INVESTMENT` | `DEPOSIT` | UI-only label, mapped via `mapUITypeToDb()` |

### 1.3 Validation Checks

**Check 1.3.1**: Verify all UI dropdowns for transaction types use values from `TX_TYPE_VALUES` constant
**Check 1.3.2**: Verify UI never sends freeform strings for enum fields
**Check 1.3.3**: Network inspector: Capture all RPC payloads and validate enum fields

### 1.4 PASS/FAIL Criteria

- **PASS** if 100% of UI inputs map to valid DB enum values
- **FAIL** if any mismatched value is possible (even if not yet observed)

---

## PHASE 2 — TEST DATA STRATEGY (P0)

### Goal
Create deterministic test scenarios across 24 months.

### 2.1 Test Cohort Definition

| Entity | Count | Configuration |
|--------|-------|---------------|
| Funds | 3 | ALPHA (USDC, stable), BETA (ETH, volatile), GAMMA (BTC, low-liquidity) |
| Investors | 6 | 2 single-fund, 2 multi-fund, 1 high-frequency, 1 long-term |
| IBs | 2 | IB-A (5 referrals), IB-B (1 referral) |
| Internal Fee Account | 1 | `account_type = 'fees_account'` |
| Admin Operator | 1 | `role = 'admin'` |

### 2.2 24-Month Timeline

| Period | Activities |
|--------|------------|
| Month 1-3 | Onboarding: First investments, irregular deposits |
| Month 4-6 | Withdrawals: Partial, full, rejection scenarios |
| Month 7-12 | Yield cycles: Monthly distributions, fee routing, IB commissions |
| Month 13-18 | Corrections: Voids, adjustments, position repairs |
| Month 19-24 | Stress: Multi-month rollover, year-end carryover, edge cases |

### 2.3 Naming Convention (Collision Prevention)

```
Test entities use prefix: QA_TEST_
Example: QA_TEST_INV_001, QA_TEST_FUND_ALPHA, QA_TEST_IB_A
```

### 2.4 PASS/FAIL Criteria

- **PASS** if test sequences complete without constraint violations
- **FAIL** if reruns duplicate financial effects (idempotency failure)

---

## PHASE 3 — TRANSACTION GAUNTLET (P0)

### Goal
Prove all transaction flows are safe and consistent.

### 3.1 Deposit Scenarios

| Scenario | Inputs | Expected Outcome |
|----------|--------|------------------|
| D1: First deposit | investor with no position | Position created, cost_basis set |
| D2: Second deposit | existing position | Position updated, cost_basis += amount |
| D3: Same-day multiple | 2 deposits same day | Both recorded, AUM correct |
| D4: Mid-month deposit | day 15 of month | Position adjusted, yield allocation prorated |

### 3.2 Withdrawal Scenarios

| Scenario | Inputs | Expected Outcome |
|----------|--------|------------------|
| W1: Partial withdrawal | 50% of position | Position reduced, AUM reduced |
| W2: Full withdrawal | 100% of position | Position = 0, closed |
| W3: Excessive withdrawal | > position | REJECTED with error |
| W4: Approval flow | pending → approved → completed | Status transitions validated |

### 3.3 Fee Scenarios

| Scenario | Expected Outcome |
|----------|------------------|
| F1: Fee to INDIGO | Fee credited to fees_account position |
| F2: Fee on zero yield | No fee transaction created |

### 3.4 Adjustment Scenarios

| Scenario | Expected Outcome |
|----------|------------------|
| A1: Positive adjustment | Position increases |
| A2: Negative adjustment | Position decreases (must not go negative) |
| A3: Adjustment reversal | Original + reversal = net zero |

### 3.5 Post-Operation Invariants

After EVERY operation:
1. `investor_positions.current_value = SUM(transactions_v2 WHERE is_voided=false)`
2. No negative balances (unless explicitly permitted)
3. `reference_id` uniqueness maintained
4. UI displays correct values without manual refresh

### 3.6 PASS/FAIL Criteria

- **PASS** if all scenarios complete and invariants hold
- **FAIL** if any scenario produces inconsistent state

---

## PHASE 4 — CRYSTALLIZATION & PERIOD SEQUENCING (P0)

### Goal
Validate end-of-period state carries correctly into next period.

### 4.1 Crystallization Rules

| Rule | Enforcement |
|------|-------------|
| Yield MUST be crystallized before deposit | `enforce_crystallization_before_flow` trigger |
| Yield MUST be crystallized before withdrawal completion | `complete_withdrawal()` internally calls crystallization |
| No same-day yield distribution | Temporal lock: AUM must be T-1 snapshot |

### 4.2 Period Transition Scenarios

| Scenario | Checks |
|----------|--------|
| P1: Month-end yield → Next-month deposit | Carried balance matches post-yield state |
| P2: Year-end transition | No double counting, carryover correct |
| P3: 12-month consecutive yields | Cumulative balances compound correctly |

### 4.3 PASS/FAIL Criteria

- **PASS** if 24 consecutive monthly transitions are consistent
- **FAIL** if any month introduces drift

---

## PHASE 5 — FAIR YIELD ALLOCATION (MID-MONTH DEPOSITS) (P0)

### Goal
Ensure mid-period investors don't earn full-period yield unfairly.

### 5.1 Allocation Method

The platform uses **pro-rata allocation** based on position at yield time:
```
investor_yield = (position / total_aum) * gross_yield
```

Alternative: ADB (Average Daily Balance) via `apply_adb_yield_distribution_v3` for time-weighted fairness.

### 5.2 Test Scenarios

| Scenario | Day 1 | Day 15 | Day 29 | Expected Yield Ratio |
|----------|-------|--------|--------|---------------------|
| Equal deposit | 1000 | - | - | Full month |
| Mid-month | - | 1000 | - | ~50% of full (ADB) or pro-rata at yield |
| Late entry | - | - | 1000 | Minimal (ADB) or pro-rata at yield |

### 5.3 Conservation Law

```
SUM(investor_allocations) + dust = gross_yield
```

### 5.4 PASS/FAIL Criteria

- **PASS** if allocations sum to gross yield (within dust tolerance)
- **FAIL** if conservation law violated

---

## PHASE 6 — INTERNAL FEES ACCOUNT (P0)

### Goal
Fee routing must not corrupt investor state.

### 6.1 Fee Account Identification

```sql
SELECT id, email FROM profiles WHERE account_type = 'fees_account';
```

### 6.2 Fee Routing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| FR1: Fee debit from investor | Position decreases by fee amount |
| FR2: Fee credit to INDIGO | Fees account position increases |
| FR3: Yield on fees account | May or may not participate (policy check) |

### 6.3 Conservation Check

```
SUM(investor_fee_debits) = SUM(fees_account_credits)
```

### 6.4 PASS/FAIL Criteria

- **PASS** if fee routing is balanced over 24 months
- **FAIL** if fees account diverges from expected

---

## PHASE 7 — IB FLOWS (P0)

### Goal
IB commissions must match policy and remain historically correct.

### 7.1 IB Commission Model

```sql
ib_commission = gross_yield * investor.ib_percentage
-- Stored in: ib_allocations
```

### 7.2 IB Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| IB1: New investor with IB | Future yields generate IB_CREDIT |
| IB2: Reassignment | Historical commissions unchanged |
| IB3: IB payout marking | `payout_status = 'paid'` |

### 7.3 IB Dashboard Reconciliation

```
IB_dashboard_total = SUM(ib_allocations WHERE ib_investor_id = X)
```

### 7.4 PASS/FAIL Criteria

- **PASS** if IB totals reconcile across months
- **FAIL** if commissions drift or change retroactively

---

## PHASE 8 — VOID / REVERSAL / IMPACT PREVIEW (P0)

### Goal
Voiding is safe, conservative, and auditable.

### 8.1 Void Scenarios

| Scenario | RPC | Expected Behavior |
|----------|-----|-------------------|
| V1: Void deposit | `void_transaction` | Position recalculated, AUM adjusted |
| V2: Void withdrawal | `void_transaction` | Position restored |
| V3: Void yield distribution | `void_yield_distribution` | Cascade void to investor_yield_events |
| V4: Void with dependent yields | `void_transaction` | Warning returned, yields affected |

### 8.2 Impact Preview

| RPC | Purpose |
|-----|---------|
| `get_void_transaction_impact` | Preview what voiding will change |
| `get_void_yield_impact` | Preview yield void cascade |

### 8.3 Void Invariants

1. Preview impact MUST equal applied impact
2. No orphan allocations after void
3. No half-voided dependency graphs
4. `is_voided = true` never mutated back to `false`

### 8.4 PASS/FAIL Criteria

- **PASS** if preview == apply and system remains consistent
- **FAIL** if partial state remains or reconciliation breaks

---

## PHASE 9 — UI ADMIN E2E (P0)

### Goal
Admin UI is a true, reliable control surface.

### 9.1 Playwright Test Coverage

| Page | Actions to Test |
|------|-----------------|
| `/admin/deposits` | Create deposit, verify success toast, verify balance update |
| `/admin/withdrawals` | Create, approve, reject, complete, cancel |
| `/admin/yield` | Preview yield, apply yield, verify distribution |
| `/admin/transactions` | View, void, edit |
| `/admin/investors` | View, assign IB, view positions |
| `/admin/funds` | View, edit |
| `/admin/integrity` | View reconciliation, run health check |

### 9.2 UI Assertions

For every operation:
1. No "unexpected error occurred" toast
2. No manual refresh needed
3. Correct success/error messages
4. Values update immediately
5. Network calls use valid enum values

### 9.3 Error Capture

```typescript
// Playwright: Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') captureError(msg);
});

// Capture network failures
page.on('response', resp => {
  if (resp.status() >= 400) captureError(resp);
});
```

### 9.4 PASS/FAIL Criteria

- **PASS** only if UI is stable across full scenario run with zero console errors
- **FAIL** if any error or refresh hack needed

---

## PHASE 10 — GLOBAL INVARIANTS (P0)

### Must Hold After Every Scenario

| Invariant | Verification Query |
|-----------|-------------------|
| 1. Ledger ↔ Position sync | `SELECT * FROM v_ledger_reconciliation WHERE mismatch_amount <> 0` |
| 2. AUM = Sum of positions | `SELECT * FROM fund_aum_mismatch` |
| 3. Yield conservation | `SELECT * FROM yield_distribution_conservation_check WHERE violation = true` |
| 4. No orphan positions | `SELECT * FROM v_orphaned_positions` |
| 5. No orphan transactions | `SELECT * FROM v_orphaned_transactions` |
| 6. No duplicate reference_ids | `SELECT * FROM check_duplicate_transaction_refs()` |
| 7. No invalid enum values | Zod validation on all inputs |
| 8. No unauthorized writes | RLS policy enforcement |

### 10.1 Automated Health Check

```sql
SELECT * FROM run_comprehensive_health_check();
-- All rows should show check_status = 'PASS'
```

### 10.2 PASS/FAIL Criteria

- **PASS** if all invariants hold continuously
- **FAIL** if any invariant breaks even once

---

## TEST MATRIX

| Operation | Inputs | DB Changes | Invariants | UI Assertion |
|-----------|--------|------------|------------|--------------|
| **Deposit** | investor, fund, amount, date | transactions_v2 +1, position updated, AUM updated | Position = Ledger | Balance increases in UI |
| **Withdrawal Request** | investor, fund, amount | withdrawal_requests +1 | Available balance reduced | Status = pending |
| **Withdrawal Approve** | request_id | withdrawal_requests status → approved | Audit log entry | Status badge updates |
| **Withdrawal Complete** | request_id, closing_aum | transactions_v2 +1, position reduced, AUM reduced | Position = Ledger | Balance decreases |
| **Yield Apply** | fund, date, yield% | yield_distributions +1, transactions +N, positions +N | Conservation, Position = Ledger | All positions increase |
| **Void Transaction** | transaction_id | is_voided = true, position recalc | Position = Ledger | Transaction shows voided |
| **IB Commission** | (auto from yield) | ib_allocations +1 | IB total = sum(allocations) | IB dashboard shows commission |

---

## FAILURE PLAYBOOK

### When a Failure Occurs

**DO NOT PATCH IMMEDIATELY.** Follow this sequence:

1. **Capture**
   - Exact UI action + timestamp
   - Network request payload (DevTools)
   - Network response (status, body)
   - Console errors

2. **Identify**
   - Which schema element rejected it? (enum, constraint, FK, RLS)
   - What was the expected vs actual value?

3. **Classify Root Cause**

| Category | Symptoms | Resolution Path |
|----------|----------|-----------------|
| Contract Drift | Invalid enum value in payload | Bind UI to DB enum values |
| Bypass Mutation | Direct table write blocked by RLS | Route through canonical RPC |
| Sequencing Violation | "CRYSTALLIZATION_REQUIRED" error | Ensure crystallization called first |
| Math Model Bug | Conservation check fails | Fix allocation algorithm |
| Idempotency Hole | Duplicate reference_id error | Generate unique reference_id |

4. **Propose Redesign Fix**
   - Document the systemic issue
   - Propose architectural change (not patch)

---

## SYSTEM REDESIGN RECOMMENDATIONS

### 1. Schema Contract Lock

**Problem**: UI can potentially send enum values that don't exist in DB.

**Solution**:
```typescript
// UI MUST fetch allowed values from backend
const txTypes = await rpc.call('get_allowed_tx_types');
// OR use compile-time contract
import { TX_TYPE_VALUES } from '@/contracts/dbEnums';
```

**Status**: Already implemented via `src/contracts/dbEnums.ts`

### 2. Single Mutation Gateway

**Problem**: Multiple code paths could write to protected tables.

**Solution**: All mutations must go through `src/lib/rpc.ts` which validates RPC names.

**Status**: Canonical RPCs defined in `src/contracts/rpcSignatures.ts`

### 3. Write-Time Guards

**Problem**: Invalid states could be written and "healed" later.

**Solution**: Database triggers reject impossible states at write time:
- `enforce_crystallization_before_flow`
- `validate_transaction_has_aum`
- Conservation checks on yield distributions

**Status**: Active triggers documented in ARCHITECTURE.md

### 4. Monitoring & Alerting

**Problem**: Issues discovered too late in nightly batch.

**Solution**: Real-time alert triggers:
- `trg_alert_aum_position_mismatch`
- `trg_alert_yield_conservation`
- `trg_alert_ledger_drift`

**Status**: Active per ARCHITECTURE.md (2026-01 upgrade)

### 5. Test Discipline

**Problem**: No release gate for financial integrity.

**Recommendation**:
- Run `run_comprehensive_health_check()` before every deploy
- Block deploy if any check fails
- Run full 24-month scenario suite as integration test

---

## TOP 10 FAILURE PATTERNS IN HEDGE-FUND PLATFORMS

| # | Pattern | How This Plan Catches It |
|---|---------|--------------------------|
| 1 | Invalid enum sent to DB | Phase 1: UI-to-DB contract validation |
| 2 | Position/ledger drift | Phase 10: `v_ledger_reconciliation` check |
| 3 | Yield conservation failure | Phase 5, 10: Conservation law verification |
| 4 | Mid-month deposit unfairness | Phase 5: Time-weighted allocation test |
| 5 | Double yield distribution | Phase 4: Idempotency via reference_id |
| 6 | Void cascade incomplete | Phase 8: Void impact preview validation |
| 7 | IB commission drift | Phase 7: Historical commission immutability |
| 8 | Fee routing imbalance | Phase 6: Fee conservation check |
| 9 | Crystallization bypass | Phase 4: Mandatory crystallization enforcement |
| 10 | Year-end carryover error | Phase 4: 24-month consecutive transition test |

---

## FIRST EXECUTION RUN OUTLINE

### Day 1: Baseline & Setup
1. Query all enums from Supabase information_schema
2. Create test cohort (3 funds, 6 investors, 2 IBs)
3. Document baseline AUM state

### Day 2-3: Transaction Gauntlet
1. Run all deposit scenarios (D1-D4)
2. Run all withdrawal scenarios (W1-W4)
3. Verify invariants after each

### Day 4-5: Yield Distribution
1. Apply yield for Month 1
2. Verify conservation and allocations
3. Run mid-month deposit fairness test

### Day 6-7: 24-Month Simulation
1. Script automated sequence for 24 months
2. Deposit/yield/withdrawal rotation
3. Capture state snapshots at each month-end

### Day 8: Void & Reversal Testing
1. Void various transaction types
2. Verify cascade behavior
3. Check reconciliation views

### Day 9: UI E2E
1. Playwright run through all admin pages
2. Capture any console errors
3. Verify all operations via UI

### Day 10: Final Report
1. Run `run_comprehensive_health_check()`
2. Document all PASS/FAIL results
3. Generate redesign recommendations

---

## APPENDIX: SQL Verification Queries

### A. Check All Enums
```sql
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
ORDER BY t.typname, e.enumsortorder;
```

### B. Ledger-Position Reconciliation
```sql
SELECT * FROM v_ledger_reconciliation WHERE mismatch_amount <> 0;
```

### C. AUM Mismatch
```sql
SELECT * FROM fund_aum_mismatch;
```

### D. Yield Conservation
```sql
SELECT * FROM yield_distribution_conservation_check WHERE ABS(gross_yield - (net_yield + total_fees)) > 0.0001;
```

### E. Orphaned Records
```sql
SELECT * FROM v_orphaned_positions;
SELECT * FROM v_orphaned_transactions;
```

### F. Comprehensive Health
```sql
SELECT * FROM run_comprehensive_health_check();
```

---

## USER INTERVIEW FINDINGS (2026-01-20)

### System Configuration Confirmed

| Setting | Value | Notes |
|---------|-------|-------|
| **Primary Yield Method** | `apply_adb_yield_distribution_v3` (ADB) | Time-weighted allocation |
| **Fees Account** | Participates in yield | Not excluded from distributions |
| **Crystallization** | Automatic in RPC | Admin doesn't manually trigger |
| **Period Locking** | Soft lock + super_admin override | Not strict blocking |
| **Dust Tolerance** | Zero tolerance | **NEEDS VERIFICATION** - how RPC handles residuals |
| **Multi-fund** | Yes | Investors can hold multiple positions |
| **Pending WD + Yield** | Yield on full position | Pending WD doesn't reduce base |
| **IB Commission Base** | GROSS yield | Not net or fee share |

### Test Environment Decisions

| Decision | Choice |
|----------|--------|
| **Environment** | Production with QA_TEST_* prefixes |
| **Date Strategy** | Relative dates (today -24 months) |
| **Cleanup** | Full cleanup - delete all QA_TEST_* after tests |
| **Risk Level** | Low - all operations reversible |

### Known Issues to Verify (PRIORITY)

1. **Ledger/position mismatch after void operations**
2. **Yield conservation violations on edge amounts**
3. **IB commission calculation errors**
4. **Withdrawal state machine violations**

### Additional Edge Cases Required

| Edge Case | Test Strategy |
|-----------|---------------|
| Yield distribution when AUM is zero | Apply yield to empty fund |
| Backdated transactions to locked periods | Attempt insert with past date |
| Concurrent deposits from multiple admins | Simulate race condition |

### Security Configuration

| Setting | Value |
|---------|-------|
| **Approval Workflow** | Super_admin role check only |
| **RLS Verification** | Out of scope (trust existing) |
| **Dual-approval** | Not implemented |

### Critical Gaps Identified

1. **No automated enum contract tests** - Must add `verify-enum-contracts.ts` to CI/CD
2. **Past enum errors in production** - Multiple incidents confirmed
3. **Partial test data isolation** - Need stricter QA_TEST_* enforcement
4. **Dust handling unknown** - Need to verify `apply_adb_yield_distribution_v3` behavior

---

## REVISED P0 TEST MATRIX (Based on Interview)

### Bug Regression Tests (HIGHEST PRIORITY)

| Bug | Test | Verification |
|-----|------|--------------|
| **Void → Position Mismatch** | Void deposit, check position | `v_ledger_reconciliation` |
| **Yield Conservation Edge** | 0.000001 yield, verify balance | `yield_distribution_conservation_check` |
| **IB Commission Wrong** | 10% IB on 1000 yield = 100 | Query `ib_allocations` |
| **Withdrawal State Skip** | Try pending → completed | Should fail |

### Edge Case Tests

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EC-01 | Yield on zero AUM fund | RPC should handle gracefully (no error, no allocations) |
| EC-02 | Backdated tx to locked period | Should fail with PERIOD_LOCKED error |
| EC-03 | Concurrent deposit race | Advisory lock should serialize |

### Enum Contract Tests (NEW - MUST IMPLEMENT)

```typescript
// verify-enum-contracts.ts
import { TX_TYPE_VALUES } from '@/contracts/dbEnums';

async function verifyEnums() {
  const dbEnums = await fetchDbEnums('tx_type');

  // UI values must be subset of DB values
  TX_TYPE_VALUES.forEach(uiValue => {
    assert(dbEnums.includes(uiValue), `${uiValue} not in DB enum`);
  });

  // FIRST_INVESTMENT should NOT be in DB (it's UI-only)
  assert(!dbEnums.includes('FIRST_INVESTMENT'), 'FIRST_INVESTMENT leaked to DB');
}
```

---

## EXECUTION CHECKLIST

### Day 1: Pre-flight

- [ ] Verify Supabase connection
- [ ] Query live enum values (confirm match with dbEnums.ts)
- [ ] Create test admin account (QA_TEST_ADMIN)
- [ ] Document baseline position counts

### Day 2: Test Data Setup

- [ ] Create QA_TEST_FUND_ALPHA (USDC)
- [ ] Create QA_TEST_FUND_BETA (ETH)
- [ ] Create QA_TEST_FUND_GAMMA (BTC)
- [ ] Create 6 QA_TEST_INV_* investors
- [ ] Create 2 QA_TEST_IB_* introducing brokers
- [ ] Verify INDIGO fees account exists

### Day 3-5: Core Flow Testing

- [ ] Deposit flows (D1-D4)
- [ ] Withdrawal flows (W1-W4)
- [ ] Yield distribution (ADB method)
- [ ] IB commission verification

### Day 6-7: Bug Regression

- [ ] Void transaction → position check
- [ ] Edge amount yield conservation
- [ ] IB percentage calculation
- [ ] Withdrawal state machine

### Day 8: Edge Cases

- [ ] Zero AUM yield
- [ ] Locked period backdating
- [ ] Concurrent operation (if testable)

### Day 9: 24-Month Simulation

- [ ] Script monthly cycle (deposit → yield → withdrawal rotation)
- [ ] Verify carryover each month
- [ ] Check year-end transition

### Day 10: Cleanup & Report

- [ ] Run `run_comprehensive_health_check()`
- [ ] Generate all output formats (MD, JSON, SQL)
- [ ] Delete all QA_TEST_* data
- [ ] Publish final report

---

## OUTPUT ARTIFACTS

1. **Markdown Report**: `docs/QA_TEST_REPORT_2026-01-XX.md`
2. **JSON Results**: `tests/results/qa-verification-2026-01-XX.json`
3. **SQL Verification**: `tests/sql/qa-verification-queries.sql`

---

*Document updated with user interview findings - Ready for execution*
