# Expert Pre-Launch Verification Plan - Indigo Yield Platform

**Date**: March 7, 2026
**Purpose**: Final expert verification before production go-live THIS WEEK
**Based on**: Full dev chat (590 lines, Dec 2025 - Feb 2026), 50+ test files, Feb 10 acceptance report, V5 GOLD release (Mar 6), founder interview

---

## Context from Interview

| Question | Answer |
|----------|--------|
| Fee structure | Variable per investor. Both fee and IB are SEPARATE % from GROSS yield |
| IB formula | `IB_commission = gross_yield_share * ib_pct` (NOT from fee amount) |
| Code changes since Feb 10 | YES - V5 architecture overhaul (30+ commits), dust sweep fix, fee alignment |
| Data plan | Hybrid wipe: keep investors, wipe transactions. Adriel enters real data via admin UI |
| Timeline | THIS WEEK |
| Investor count | 30-50 at launch |
| Active funds | 5 (BTC, ETH, USDT, SOL, XRP) |
| Historical data | Adriel will enter historical yields (Sep 2025+) via admin UI |
| Deployment | Lovable Cloud (https://indigo-yield-platform.lovable.app) |
| Auth routing | Fixed - admins go to /admin, investors to /investor |
| RLS testing | Deferred to post-soft-launch |
| Credentials in git | Acceptable - private repo |
| Notifications | Not critical for launch |
| AUM auto-recalc | UNKNOWN - needs verification |
| Full withdrawal void | UNKNOWN - needs manual verification |
| Phantom AUM records | UNKNOWN - needs manual verification |

---

## CRITICAL FINDINGS FROM ANALYSIS

### Finding 1: Test Formula Bug
`accounting-verification.test.ts` line 249 has WRONG formula:
```
IB commission = fee * IB%   // WRONG
IB commission = gross * IB% // CORRECT
```
**Action**: Fix the test formula.

### Finding 2: Fee Description vs Reality Mismatch
Adriel described Paul Johnson as "4% IB + 16% fees" but the math only works with **1.5% IB + 13.5% fee = 15% total**. Confirmed by founder: 1.5%/13.5% is correct. Adriel's text was a typo.

### Finding 3: Golden Values Verified
SOL scenario math independently confirmed:
- LP gross share: 13.83 * (1252/1486.17) = 11.65 ✓
- Paul gross share: 13.83 * (234.17/1486.17) = 2.1769
- Paul net: 2.1769 * (1 - 0.135 - 0.015) = 1.85 ✓
- IB: 2.1769 * 0.015 = 0.0327 ✓
- Fee: 2.1769 * 0.135 = 0.2942 ✓

XRP scenario math independently confirmed:
- Gross yield: 184,358 - 184,003 = 355 XRP
- Sam net: 355 * 0.80 = 284 ✓
- IB: 355 * 0.04 = 14.20 ✓
- Fee: 355 * 0.16 = 56.80 ✓

---

## EXECUTION PLAN (Priority Order)

### Phase 1: Build Verification (5 min)
```bash
cd ~/indigo-yield-platform-v01
npx tsc --noEmit           # TypeScript compiles cleanly
npm run build              # Production build succeeds
```

### Phase 2: Unit Tests (10 min)
```bash
npx vitest run             # Run all unit tests
```
Expected: All pass. Watch specifically for:
- `feeCalculations.test.ts` - fee hierarchy
- `transactionVoiding.test.ts` - void cascade
- `yieldReconciliation.test.ts` - conservation identity
- `accounting-verification.test.ts` - FIX the IB formula first

### Phase 3: Adriel's Golden Scenarios (E2E) (30 min)
Run against live Lovable deployment:
```bash
BASE_URL=https://indigo-yield-platform.lovable.app \
TEST_ADMIN_EMAIL=adriel@indigo.fund \
TEST_ADMIN_PASSWORD=TestAdmin2026! \
npx playwright test tests/e2e/11-adriel-real-world-scenarios.spec.ts
```
This is THE critical test - reproduces Adriel's exact SOL + XRP scenarios with golden values.

### Phase 4: Core E2E Suite (45 min)
```bash
npx playwright test tests/e2e/master-golden-path.spec.ts
npx playwright test tests/e2e/yield-waterfall.spec.ts
npx playwright test tests/e2e/transaction-engine.spec.ts
npx playwright test tests/e2e/omni-void-cascade.spec.ts
npx playwright test tests/e2e/withdrawal-engine.spec.ts
npx playwright test tests/e2e/auth-and-roles.spec.ts
```

### Phase 5: P0 Manual Verification (MUST DO)

These were Adriel's top blockers and are "not sure" status:

#### 5a. Full Withdrawal + Void Test
1. Login as admin
2. Create investor with deposit (e.g. 10,000 USDT)
3. Execute FULL withdrawal
4. Verify position = 0 and dust routed to fees account
5. VOID the full withdrawal
6. Verify position restored to original amount
7. Verify dust reversed from fees account

#### 5b. Phantom AUM Record Test
1. Create a transaction for an investor with a PAST date (e.g. Sep 4, 2025)
2. Check fund_daily_aum table
3. Verify NO extra record at TODAY's date was created
4. Verify the AUM record is at the CORRECT date only

#### 5c. AUM Auto-Recalculation Test
1. Apply a yield distribution to a fund
2. Check fund_daily_aum immediately after
3. Verify AUM was automatically updated (no manual recalculate_fund_aum_for_date needed)

### Phase 6: Database Integrity (SQL via Supabase)
```sql
-- All should return EMPTY when healthy
SELECT * FROM v_ledger_reconciliation;
SELECT * FROM fund_aum_mismatch;
SELECT * FROM yield_distribution_conservation_check;
SELECT * FROM v_orphaned_positions;
SELECT * FROM v_orphaned_transactions;
SELECT * FROM v_fee_calculation_orphans;

-- Reference ID uniqueness
SELECT reference_id, COUNT(*)
FROM transactions_v2
WHERE is_voided = false
GROUP BY reference_id
HAVING COUNT(*) > 1;

-- Run comprehensive health check
SELECT * FROM run_comprehensive_health_check();
```

### Phase 7: Pre-Wipe Checklist
Before wiping transactions for Adriel's data entry:
- [ ] Backup current database (Supabase PITR snapshot)
- [ ] Verify investor profiles are correct (names, emails, fee configs, IB relationships)
- [ ] Document current investor_fee_schedule entries
- [ ] Document current IB commission configurations
- [ ] Confirm all 5 funds exist and are active (BTC, ETH, USDT, SOL, XRP)

### Phase 8: Transaction Wipe Script
```sql
-- DANGER: Only run after backup + verification
-- Order matters due to foreign keys

-- 1. Wipe yield allocations
DELETE FROM yield_allocations;
DELETE FROM fee_allocations;
DELETE FROM ib_allocations;

-- 2. Wipe yield distributions
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  DELETE FROM yield_distributions;
END; $$;

-- 3. Wipe transactions
DELETE FROM transactions_v2;

-- 4. Reset positions
DELETE FROM investor_positions;

-- 5. Wipe AUM records
DELETE FROM fund_daily_aum;

-- 6. Clear audit log (optional - discuss with team)
-- DELETE FROM audit_log;

-- 7. Reset withdrawal requests
DELETE FROM withdrawal_requests;
```

---

## Adriel Issue Regression Map

Every bug from the chat, mapped to which test covers it:

| # | Issue | Test Coverage | Status |
|---|-------|---------------|--------|
| A1.1 | Fee calc wrong (IB from gross) | `yield-waterfall.spec.ts` test 3, `adriel-real-world-scenarios` | AUTOMATED |
| A1.2 | Yield not distributing | `master-golden-path.spec.ts` test 3 | AUTOMATED |
| A1.3 | AUM not date-aware | **MANUAL Phase 5b** | MUST TEST |
| A1.4 | Crystallization errors | `adriel-real-world-scenarios` (SOL Sep 4 yield) | AUTOMATED |
| A1.5 | Negative balance on void | `omni-void-cascade.spec.ts` tests 1-4 | AUTOMATED |
| A1.6 | Conservation identity | `yield-waterfall.spec.ts`, DB integrity views | AUTOMATED + SQL |
| A1.7 | Position not updating | `omni-void-cascade.spec.ts` test 1 (balance reverts) | AUTOMATED |
| A2.1 | Transaction creation errors | `transaction-engine.spec.ts` test 2 | AUTOMATED |
| A2.2 | Void shows "completed" | `omni-void-cascade.spec.ts` test 3 (double-void block) | AUTOMATED |
| A2.3 | Phantom AUM records | **MANUAL Phase 5b** | MUST TEST |
| A2.4 | Preflow AUM duplicate | **NOT TESTED** - needs V5 architecture check | GAP |
| A2.5 | Yield modification errors | **NOT TESTED** | GAP |
| A2.6 | Deposits not in transactions | V5 unified transaction page | ARCHITECTURE FIX |
| A3.1 | Date selection missing | `adriel-real-world-scenarios` uses date input | AUTOMATED |
| A3.2 | Date range too limited | **NOT TESTED** - need to verify dropdown | GAP |
| A3.3 | Fee display mismatch | `yield-waterfall.spec.ts` test 2 (fee assignment) | PARTIAL |
| A3.4 | Auth/role confusion | `auth-and-roles.spec.ts` | AUTOMATED (confirmed fixed) |
| A3.5 | Version not deploying | Lovable deployment issue (resolved) | N/A |
| A3.6 | Deposit menu confusion | V5 unified transaction page | ARCHITECTURE FIX |
| A4.1 | Loss scenario blocked | `yield-waterfall.spec.ts` test 4 (negative yield) | AUTOMATED |
| A4.2 | Same-date multi-investor | **NOT TESTED** | GAP |
| A4.3 | Investor creation flow | `entity-crud-management.spec.ts` | AUTOMATED |

### Coverage Summary
- **AUTOMATED**: 14/22 issues (64%)
- **MANUAL REQUIRED**: 3/22 issues (Phase 5a, 5b, 5c)
- **GAPS**: 4/22 issues (A2.4, A2.5, A3.2, A4.2) - lower priority
- **ARCHITECTURE FIX**: 2/22 (V5 unified pages)

---

## GO/NO-GO Criteria

### MUST PASS (GO blockers)
- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Production build succeeds
- [ ] Unit tests pass (especially fee calculations, void cascade)
- [ ] Adriel golden scenarios pass (SOL + XRP math matches exactly)
- [ ] Master golden path passes (deposit + yield + void + investor verify)
- [ ] Full withdrawal + void works (Manual Phase 5a)
- [ ] No phantom AUM records (Manual Phase 5b)
- [ ] All 6 integrity views return empty
- [ ] Health check returns 8/8 PASS

### SHOULD PASS (soft launch acceptable if minor issues)
- [ ] All 17 e2e tests pass
- [ ] AUM auto-recalculates after yield distribution
- [ ] Yield modification works
- [ ] Date range extends to 2024 for historical entry

### NICE TO HAVE (fix post-launch)
- [ ] RLS browser console verification
- [ ] Same-date multi-investor preflow AUM handling
- [ ] Statement generation Edge Function
- [ ] Notification emails

---

## Risk Register (Updated)

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Manual data entry errors by Adriel | HIGH | MEDIUM | Run integrity views after each batch of entries |
| AUM not auto-recalculating | HIGH | UNKNOWN | Test in Phase 5c. If broken, document manual recalc procedure |
| Full withdrawal void broken | HIGH | LOW | Test in Phase 5a. Was fixed in V5 (commit 38746f29) |
| Real data surfaces new edge cases | MEDIUM | HIGH | Monitor first yield distribution closely |
| Phantom AUM records | MEDIUM | LOW | Likely fixed in V5 architecture. Test Phase 5b |
| Investor sees wrong data | LOW | LOW | RLS is defined in SQL, low risk of regression |
| Historical yield entry (Sep-Dec 2025) creates date issues | MEDIUM | MEDIUM | Test backward-dated yield distribution before Adriel starts |

---

## Post-Launch Monitoring Plan

After Adriel enters real data:
1. Run `SELECT * FROM run_comprehensive_health_check()` after each yield distribution
2. Run `SELECT * FROM v_ledger_reconciliation` daily for first week
3. Have Adriel screenshot each yield preview before confirming
4. Keep Supabase PITR enabled with 7-day retention
5. First real yield distribution: do it together (Adriel + Hammadou on call)
