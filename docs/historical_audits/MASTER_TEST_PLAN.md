# Indigo Yield Platform - Master Test Plan

> **Version**: 1.0
> **Date**: February 6, 2026
> **Duration**: 3 Months (Feb - Apr 2026)
> **Team**: Lead + 1-2 testers
> **Status**: DRAFT - Pending approval

---

## Executive Summary

This plan provides comprehensive testing of the Indigo Yield Platform across all three portals (Admin, Investor, IB), all financial flows, and all data integrity mechanisms. The goal is to prove **launch readiness** for 30+ real investors with real crypto assets across 7 funds (BTC, USDT, ETH, SOL, XRP, EURC, xAUT).

**Current State**: Hybrid deployment with mix of real and test data. 49 investor profiles (30+ real), 17 active positions across BTC and USDT funds, 4 yield distributions (rebuilt after audit wipe), all 4 financial flows operational (deposits, yields, withdrawals, IB commissions).

**Key Constraints**:
- Real investor profiles must be preserved
- IBs have dual-role (IB portal + investor portal)
- Fee rates vary per investor (default ~30% performance fee)
- Manual admin entry for deposits
- Monthly yield distribution cadence
- Investors access via mixed devices (desktop + mobile)
- 2FA removed for now
- Statements currently manual (Excel/PDF) - platform-generated planned

---

## Table of Contents

1. [Test Data Strategy](#1-test-data-strategy)
2. [Month 1: Foundation & Core Flows](#2-month-1-foundation--core-flows)
3. [Month 2: Edge Cases, Multi-Fund & Stress](#3-month-2-edge-cases-multi-fund--stress)
4. [Month 3: UAT, Regression & Launch Certification](#4-month-3-uat-regression--launch-certification)
5. [Feature Test Catalog](#5-feature-test-catalog)
6. [Appendix: Test Execution Checklists](#6-appendix-test-execution-checklists)

---

## 1. Test Data Strategy

### Principle
Preserve all real investor profiles. Create a dedicated QA test universe alongside them using QA-prefixed accounts.

### QA Test Universe

| Entity | Name | Email | Fund | Role | Notes |
|--------|------|-------|------|------|-------|
| Admin | QA Admin | qa.admin@indigo.fund | - | admin | Full admin access |
| Investor A | QA Alice | qa.alice@indigo.fund | USDT | investor | Standard investor, no IB |
| Investor B | QA Bob | qa.bob@indigo.fund | BTC | investor | Standard investor, no IB |
| Investor C | QA Carol | qa.carol@indigo.fund | USDT+BTC | investor | Multi-fund investor, IB parent = QA Dave |
| Investor D | QA Dave | qa.dave@indigo.fund | USDT | ib + investor | IB with own investments (dual portal) |
| Investor E | QA Eve | qa.eve@indigo.fund | ETH | investor | New fund testing |
| Investor F | QA Frank | qa.frank@indigo.fund | USDT | investor | Withdrawal testing (full exit) |
| Investor G | QA Grace | qa.grace@indigo.fund | BTC | investor | Negative yield testing |
| Investor H | QA Hugo | qa.hugo@indigo.fund | SOL | investor | New fund testing |
| Fees Account | INDIGO Fees | (existing) | - | fees_account | Platform fee recipient |

### QA Deposit Amounts (for math verification)

| Investor | Fund | Deposit | Date | Fee Rate | IB Rate | Notes |
|----------|------|---------|------|----------|---------|-------|
| QA Alice | USDT | 10,000 | 2025-12-01 | 20% | 0% | Clean round number |
| QA Bob | BTC | 1.00000000 | 2025-12-01 | 25% | 0% | 1 BTC exactly |
| QA Carol | USDT | 25,000 | 2025-12-01 | 30% | 5% | Has IB (Dave) |
| QA Carol | BTC | 0.50000000 | 2025-12-15 | 30% | 5% | Mid-month, second fund |
| QA Dave | USDT | 5,000 | 2025-12-01 | 15% | 0% | IB's own investment |
| QA Eve | ETH | 10.00000000 | 2026-01-01 | 20% | 0% | New fund test |
| QA Frank | USDT | 15,000 | 2025-12-01 | 20% | 0% | Will withdraw 100% |
| QA Grace | BTC | 2.00000000 | 2025-12-01 | 20% | 0% | Negative yield test |
| QA Hugo | SOL | 100.000000 | 2026-01-01 | 20% | 0% | New fund test |

**Total QA USDT AUM**: 55,000 USDT
**Total QA BTC AUM**: 3.50000000 BTC
**Total QA ETH AUM**: 10.00000000 ETH
**Total QA SOL AUM**: 100.000000 SOL

### Expected Math (Verification Anchors)

**USDT Fund - January 2026 Yield @ 5% gross:**
- Fund gross yield: 55,000 * 0.05 = 2,750.0000 USDT
- QA Alice (10k, 20% fee, no IB): gross = 500.00, fee = 100.00, net = 400.00
- QA Carol (25k, 30% fee, 5% IB): gross = 1,250.00, fee = 375.00, ib = 62.50, net = 812.50
- QA Dave (5k, 15% fee, no IB): gross = 250.00, fee = 37.50, net = 212.50
- QA Frank (15k, 20% fee, no IB): gross = 750.00, fee = 150.00, net = 600.00
- Conservation: 2,750.00 = 400.00 + 812.50 + 212.50 + 600.00 + 100.00 + 375.00 + 37.50 + 150.00 + 62.50 = 2,750.00

---

## 2. Month 1: Foundation & Core Flows

**Goal**: Verify all core financial operations work correctly with clean test data. Establish baseline confidence.

**Duration**: Weeks 1-4

### Week 1: Environment Setup & Smoke Tests

#### 1.1 Environment Verification
- [ ] Run `npx tsc --noEmit` - zero errors
- [ ] Run `npm run build` - clean build
- [ ] Run `npm run contracts:verify` - enum contracts match DB
- [ ] Run `npm run sql:hygiene` - no violations
- [ ] Verify QA credentials work for all 3 portals
- [ ] Verify existing real investor data is intact and untouched
- [ ] Run health checks: `SELECT * FROM run_integrity_check('test_plan')`
- [ ] Verify conservation check returns zero violations

#### 1.2 Seed QA Test Data
- [ ] Create QA investor profiles (Alice through Hugo)
- [ ] Create QA IB profile (Dave) with IB role + investor role
- [ ] Set fee schedules per investor (varying rates as table above)
- [ ] Set IB parent for QA Carol -> QA Dave
- [ ] Verify all profiles visible in Admin investor list
- [ ] Verify QA Dave has dual portal access (IB + Investor)

#### 1.3 Portal Access Smoke Tests
- [ ] **Admin Portal**: Log in as qa.admin, verify dashboard loads, all nav items accessible
- [ ] **Investor Portal**: Log in as qa.alice (after deposit), verify dashboard loads
- [ ] **IB Portal**: Log in as qa.dave, verify IB dashboard loads
- [ ] **IB Dual Portal**: Log in as qa.dave, switch to investor view, verify positions visible
- [ ] **Mobile**: Repeat all logins on mobile viewport (375x812)
- [ ] **Cookie/Install banners**: Verify they appear and can be dismissed

### Week 2: Deposit Flow Testing

#### 2.1 Standard Deposits
For each QA investor, execute the deposit via Admin portal:

| Test ID | Investor | Fund | Amount | Expected |
|---------|----------|------|--------|----------|
| DEP-001 | QA Alice | USDT | 10,000 | Position created, AUM updated |
| DEP-002 | QA Bob | BTC | 1.00000000 | Position created, AUM updated |
| DEP-003 | QA Carol | USDT | 25,000 | Position created, IB parent recorded |
| DEP-004 | QA Dave | USDT | 5,000 | Position created (as investor) |
| DEP-005 | QA Frank | USDT | 15,000 | Position created |
| DEP-006 | QA Grace | BTC | 2.00000000 | Position created |
| DEP-007 | QA Eve | ETH | 10.00000000 | First deposit in ETH fund |
| DEP-008 | QA Hugo | SOL | 100.000000 | First deposit in SOL fund |

**After each deposit, verify**:
- [ ] Transaction appears in `transactions_v2` with correct type=DEPOSIT
- [ ] `investor_positions.current_value` matches deposit amount
- [ ] `fund_daily_aum` updated correctly
- [ ] Audit log entry created
- [ ] Transaction visible in Admin transaction history
- [ ] Position visible in Admin investor detail page
- [ ] Conservation: position == SUM(transactions) for this investor

#### 2.2 Mid-Month Deposit (Crystallization Test)
- [ ] DEP-009: QA Carol deposits 0.5 BTC into BTC fund on 2025-12-15 (after yield cycle)
- [ ] Verify crystallization triggered before deposit
- [ ] Verify YIELD transaction created for accrued yield (pre-deposit)
- [ ] Verify FEE_CREDIT transaction created
- [ ] Verify IB_CREDIT transaction created (Carol has IB parent)
- [ ] Verify new position value = previous value + yield + deposit
- [ ] Verify AUM updated

#### 2.3 Deposit Validation Tests
- [ ] DEP-010: Try deposit with amount = 0 -> should fail
- [ ] DEP-011: Try deposit with negative amount -> should fail
- [ ] DEP-012: Try deposit to inactive fund -> should fail
- [ ] DEP-013: Try deposit with future date -> should fail or warn
- [ ] DEP-014: Try duplicate deposit (same reference_id) -> should be blocked by idempotency

#### 2.4 Deposit UI Verification (Admin Portal)
- [ ] Navigate to Transactions page -> Add Transaction
- [ ] Verify investor dropdown shows all investors (real + QA)
- [ ] Verify fund dropdown shows active funds
- [ ] Verify amount input accepts correct precision per asset
- [ ] Verify date picker works correctly
- [ ] Verify success toast appears after deposit
- [ ] Verify transaction appears in list immediately (cache invalidation)

### Week 3: Yield Distribution Testing

#### 3.1 Standard Monthly Yield (USDT Fund)
Execute yield distribution for USDT fund, January 2026:

| Step | Action | Expected |
|------|--------|----------|
| YLD-001 | Navigate to Apply Yield page | Page loads, fund selector visible |
| YLD-002 | Select USDT fund | Current AUM displayed (55,000 USDT) |
| YLD-003 | Select purpose = Reporting | Reporting month selector appears |
| YLD-004 | Select January 2026 | Effective date auto-set |
| YLD-005 | Enter new AUM = 57,750 (5% yield) | Gross yield calculated = 2,750 |
| YLD-006 | Click Preview | Preview shows per-investor breakdown |
| YLD-007 | **VERIFY PREVIEW MATH** | See expected math table above |
| YLD-008 | Click Apply | Distribution applied |
| YLD-009 | Verify transactions created | YIELD, FEE_CREDIT, IB_CREDIT transactions |
| YLD-010 | Verify conservation | gross = net + fees + ib + dust |

**Preview Verification Checklist (YLD-007)**:
- [ ] QA Alice: gross=500, fee=100, net=400 (20% fee)
- [ ] QA Carol: gross=1250, fee=375, ib=62.50, net=812.50 (30% fee, 5% IB)
- [ ] QA Dave: gross=250, fee=37.50, net=212.50 (15% fee)
- [ ] QA Frank: gross=750, fee=150, net=600 (20% fee)
- [ ] Fees account total: 100+375+37.50+150 = 662.50
- [ ] IB total (Dave): 62.50
- [ ] Conservation: 2750 = 400+812.50+212.50+600+662.50+62.50 = 2750

**Post-Apply Verification**:
- [ ] All positions updated with new current_value
- [ ] Yield transactions created for each investor (visibility_scope = investor_visible for reporting)
- [ ] Fee transactions created (FEE_CREDIT to fees account)
- [ ] IB transaction created (IB_CREDIT to QA Dave)
- [ ] yield_distributions record with status = 'applied'
- [ ] fee_allocations records created
- [ ] ib_allocations records created
- [ ] fund_daily_aum updated
- [ ] Audit log entry
- [ ] `SELECT * FROM yield_distribution_conservation_check` returns empty (no violations)

#### 3.2 Standard Monthly Yield (BTC Fund)
Execute yield distribution for BTC fund, January 2026:

| Investor | Starting | Gross (2%) | Fee | IB | Net | Ending |
|----------|----------|-----------|-----|-----|-----|--------|
| QA Bob | 1.0 BTC | 0.02 | 0.005 (25%) | 0 | 0.015 | 1.015 |
| QA Carol | 0.5 BTC | 0.01 | 0.003 (30%) | 0.0005 (5%) | 0.0065 | 0.5065 |
| QA Grace | 2.0 BTC | 0.04 | 0.008 (20%) | 0 | 0.032 | 2.032 |

- [ ] YLD-011: Preview BTC fund yield @ 2% -> verify math above
- [ ] YLD-012: Apply BTC fund yield
- [ ] YLD-013: Verify BTC conservation: 0.07 = 0.015 + 0.0065 + 0.032 + 0.005 + 0.003 + 0.008 + 0.0005

#### 3.3 Transaction-Purpose Yield
- [ ] YLD-014: Create a transaction-purpose yield for USDT fund
- [ ] YLD-015: Verify transactions have visibility_scope = admin_only
- [ ] YLD-016: Verify investors CANNOT see transaction-purpose yields in their portal
- [ ] YLD-017: Verify IB allocations have payout_status = 'pending' (not 'paid')

#### 3.4 Yield Edge Cases
- [ ] YLD-018: Try to apply yield to same fund+date twice -> should be blocked
- [ ] YLD-019: Negative yield test (BTC fund loses value): new AUM < old AUM
  - Verify fee = 0, IB = 0, full loss goes to investors
  - Verify conservation still holds
- [ ] YLD-020: Yield with zero gross (AUM unchanged) -> should handle gracefully
- [ ] YLD-021: Verify T-1 temporal lock (try same-day AUM + yield -> should be blocked)

#### 3.5 Yield UI Verification
- [ ] Preview page shows all investors with allocations
- [ ] Fee breakdown is clear and accurate
- [ ] IB commission column appears only for investors with IB parents
- [ ] Purpose selector (reporting vs transaction) works correctly
- [ ] Reporting month dropdown lists available months
- [ ] Apply button disabled until preview is confirmed
- [ ] Success message after apply
- [ ] Recorded Yields page shows the new distribution

### Week 4: Withdrawal Flow Testing

#### 4.1 Standard Withdrawal Request
| Test ID | Investor | Fund | Amount | Expected |
|---------|----------|------|--------|----------|
| WTH-001 | QA Frank | USDT | 15,600 (full) | Full exit after yield |
| WTH-002 | QA Alice | USDT | 2,000 (partial) | Partial withdrawal |
| WTH-003 | QA Bob | BTC | 0.50000000 | Partial BTC withdrawal |

**For each withdrawal, test the full lifecycle**:
1. [ ] Investor submits request via Investor Portal -> status = pending
2. [ ] Admin sees request in Withdrawal Management page
3. [ ] Admin approves -> status = approved
4. [ ] Admin starts processing -> status = processing
5. [ ] Admin completes withdrawal -> status = completed
6. [ ] Crystallization triggers before completion
7. [ ] WITHDRAWAL transaction created in ledger
8. [ ] Position updated (reduced by withdrawal amount)
9. [ ] Fund AUM updated
10. [ ] Audit log at each status change

#### 4.2 Full Exit (QA Frank)
- [ ] WTH-004: QA Frank requests withdrawal of full balance (including accrued yield)
- [ ] Verify max withdrawal = current_value
- [ ] After completion: position.current_value = 0, position.is_active = false
- [ ] Verify Frank still appears in historical records but no longer in active positions
- [ ] Verify Frank's portal shows zero balance

#### 4.3 Withdrawal Validation
- [ ] WTH-005: Try withdrawal exceeding balance -> should fail
- [ ] WTH-006: Try withdrawal while another is pending -> should warn/block
- [ ] WTH-007: Admin rejects a withdrawal -> status = rejected, balance unchanged
- [ ] WTH-008: Investor cancels pending withdrawal -> status = cancelled, balance unchanged
- [ ] WTH-009: Try withdrawal from fund with zero balance -> should fail

#### 4.4 Withdrawal UI Verification
- [ ] Investor can see "Request Withdrawal" button
- [ ] Available balance displayed correctly (total - pending withdrawals)
- [ ] Withdrawal request form validates amount
- [ ] Pending withdrawal visible in investor's withdrawal history
- [ ] Admin withdrawal list shows all pending requests with investor name, amount, fund
- [ ] Approval/rejection buttons work
- [ ] Status badges update correctly (pending=yellow, approved=blue, completed=green, rejected=red)

---

## 3. Month 2: Edge Cases, Multi-Fund & Stress

**Goal**: Test complex scenarios, multi-fund operations, and boundary conditions. Begin testing all 7 funds.

**Duration**: Weeks 5-8

### Week 5: Multi-Fund & Cross-Fund Testing

#### 5.1 New Fund Activation (ETH, SOL)
- [ ] MF-001: Verify ETH fund has QA Eve's deposit
- [ ] MF-002: Verify SOL fund has QA Hugo's deposit
- [ ] MF-003: Apply yield to ETH fund -> verify math
- [ ] MF-004: Apply yield to SOL fund -> verify math
- [ ] MF-005: Verify each fund's AUM is independent

#### 5.2 Multi-Fund Investor (QA Carol: USDT + BTC)
- [ ] MF-006: Verify Carol's investor portal shows both positions
- [ ] MF-007: Verify Carol receives yield in both funds independently
- [ ] MF-008: Verify Carol's total portfolio value aggregates both positions
- [ ] MF-009: Verify Carol's IB commissions calculated separately per fund
- [ ] MF-010: Carol withdraws from one fund only -> other fund unaffected

#### 5.3 Remaining Funds (XRP, EURC, xAUT)
- [ ] MF-011: Create QA deposit in XRP fund -> verify position created
- [ ] MF-012: Create QA deposit in EURC fund -> verify position created
- [ ] MF-013: Create QA deposit in xAUT fund -> verify position created
- [ ] MF-014: Apply yield to each of the 3 new funds
- [ ] MF-015: Verify all 7 funds have correct independent AUM

### Week 6: IB Commission Deep Testing

#### 6.1 IB Commission Flow
- [ ] IB-001: Verify QA Dave (IB) received IB_CREDIT from Carol's USDT yield
- [ ] IB-002: Verify QA Dave received IB_CREDIT from Carol's BTC yield
- [ ] IB-003: Verify IB commission = gross_yield * ib_percentage for each allocation
- [ ] IB-004: Verify ib_allocations records link to correct yield_distribution
- [ ] IB-005: Verify IB portal shows commission breakdown by referral

#### 6.2 IB Dual-Portal Testing
- [ ] IB-006: QA Dave logs in -> sees IB portal (commissions, referrals)
- [ ] IB-007: QA Dave switches to Investor view -> sees own USDT position and yields
- [ ] IB-008: Verify Dave's investor yields are separate from commission income
- [ ] IB-009: Verify Dave's commission from Carol does NOT appear as yield in investor view
- [ ] IB-010: Verify Dave's own position earns yield at his fee rate (15%)

#### 6.3 IB Edge Cases
- [ ] IB-011: Reporting-purpose yield -> IB allocations auto-marked as paid (payout_status='paid')
- [ ] IB-012: Transaction-purpose yield -> IB allocations payout_status='pending'
- [ ] IB-013: Add second referral to QA Dave -> verify commissions aggregate correctly
- [ ] IB-014: Carol (IB child) makes withdrawal -> verify IB commission recalculated correctly

### Week 7: Void, Correction & Recovery

#### 7.1 Transaction Void
- [ ] VOID-001: Void a QA deposit transaction
  - Verify position recalculated from ledger
  - Verify AUM updated
  - Verify void reason recorded
  - Verify audit log entry
- [ ] VOID-002: Void a deposit that has subsequent yield distributions
  - Verify dependent yield warning shown
  - Verify admin can choose to proceed or cancel
  - Verify dependent yields flagged for review
- [ ] VOID-003: Void a yield distribution
  - Verify all investor yield transactions reversed
  - Verify fee_allocations reversed
  - Verify ib_allocations reversed
  - Verify positions recalculated
  - Verify conservation still holds after void

#### 7.2 Correction Workflow
- [ ] CORR-001: Wrong deposit amount -> void and re-enter correct amount
  - Verify final position matches correct deposit
  - Verify audit trail shows both void and new deposit
- [ ] CORR-002: Wrong investor -> void transaction, re-enter for correct investor
- [ ] CORR-003: Wrong fund -> void, re-enter for correct fund

#### 7.3 Recovery Testing
- [ ] REC-001: After voids, run integrity check -> zero violations
- [ ] REC-002: After voids, check `v_ledger_reconciliation` -> zero drift
- [ ] REC-003: After voids, check `fund_aum_mismatch` -> zero mismatches
- [ ] REC-004: Verify voided transactions still visible in admin history (marked as voided)
- [ ] REC-005: Verify voided transactions NOT visible in investor portal

### Week 8: Negative Yield, Dust & Precision

#### 8.1 Negative Yield Month
- [ ] NEG-001: BTC fund has negative month (AUM drops 3%)
  - QA Grace: 2.032 BTC -> new AUM 1.97104 (loss of 0.06096)
  - Verify fee = 0 (no fees on losses)
  - Verify IB = 0 (no commissions on losses)
  - Verify full loss allocated pro-rata to investors
  - Verify conservation: loss = SUM(investor losses)
- [ ] NEG-002: Verify investor portal shows negative yield for the month
- [ ] NEG-003: Verify performance chart handles negative month correctly
- [ ] NEG-004: Verify MTD/YTD performance calculations correct after negative month

#### 8.2 Precision & Dust Testing
- [ ] DUST-001: BTC yield that creates sub-satoshi dust (< 0.00000001)
  - Verify dust routed to fees account
  - Verify dust within tolerance
  - Verify conservation holds
- [ ] DUST-002: USDT yield with 4-decimal precision
- [ ] DUST-003: Verify all financial values displayed with correct precision per asset
  - BTC: 8 decimals
  - ETH: 8 decimals
  - USDT: 4 decimals (or 2 in UI)
  - SOL: 6 decimals

#### 8.3 Boundary Values
- [ ] BOUND-001: Minimum deposit (smallest meaningful amount per asset)
- [ ] BOUND-002: Very large deposit (test number formatting and overflow)
- [ ] BOUND-003: Yield of exactly 0.00000001 BTC (minimum BTC unit)
- [ ] BOUND-004: 100% fee rate (investor gets nothing) -> should work but unusual
- [ ] BOUND-005: 0% fee rate -> full yield to investor

---

## 4. Month 3: UAT, Regression & Launch Certification

**Goal**: Full regression, real-world scenario testing, final certification.

**Duration**: Weeks 9-12

### Week 9: Full Lifecycle Scenarios

#### 9.1 Complete Investor Lifecycle
Execute end-to-end for one QA investor (new account through full exit):
1. [ ] LIFE-001: Admin creates investor profile
2. [ ] LIFE-002: Admin records initial deposit
3. [ ] LIFE-003: Month 1 yield distribution -> verify in investor portal
4. [ ] LIFE-004: Mid-month additional deposit (crystallization)
5. [ ] LIFE-005: Month 2 yield distribution -> verify updated balance
6. [ ] LIFE-006: Partial withdrawal -> verify balance reduced
7. [ ] LIFE-007: Month 3 yield (reduced balance) -> verify correct allocation
8. [ ] LIFE-008: Full exit withdrawal -> verify zero balance
9. [ ] LIFE-009: Verify complete transaction history in investor portal
10. [ ] LIFE-010: Verify statements for each month

#### 9.2 Complete IB Lifecycle
1. [ ] IBLIFE-001: Create IB profile with investor access
2. [ ] IBLIFE-002: Assign referral investor
3. [ ] IBLIFE-003: Referral makes deposit
4. [ ] IBLIFE-004: Yield distribution -> verify IB commission
5. [ ] IBLIFE-005: Second yield -> verify cumulative commissions
6. [ ] IBLIFE-006: IB's own position earns yield -> verify separate from commissions
7. [ ] IBLIFE-007: Verify IB portal shows all referrals and earnings
8. [ ] IBLIFE-008: Verify IB investor portal shows own positions only

#### 9.3 Multi-Month Simulation
Simulate 3 months of operations with varying scenarios:

| Month | USDT Yield | BTC Yield | Event |
|-------|-----------|----------|-------|
| Month 1 | +5% | +3% | Normal month |
| Month 2 | +2% | -1% | BTC negative, mid-month deposit |
| Month 3 | +4% | +5% | Recovery month, withdrawal |

- [ ] SIM-001: Execute Month 1 yields for both funds
- [ ] SIM-002: Execute Month 2 (negative BTC)
- [ ] SIM-003: Add mid-month deposit in Month 2
- [ ] SIM-004: Execute Month 3 yields
- [ ] SIM-005: Process withdrawal in Month 3
- [ ] SIM-006: **RECONCILE**: Final positions == SUM(all transactions) for every investor
- [ ] SIM-007: **RECONCILE**: Fund AUM == SUM(active positions) for every fund
- [ ] SIM-008: **CONSERVATION**: Every yield distribution passes conservation check

### Week 10: Admin Portal Full Page Verification

#### 10.1 Dashboard (Command Center)
- [ ] ADM-001: Total AUM displays correctly (sum of all fund AUMs)
- [ ] ADM-002: Active investors count correct
- [ ] ADM-003: Pending items count (withdrawals, approvals) correct
- [ ] ADM-004: Recent activity feed shows last 10 actions
- [ ] ADM-005: Quick actions bar works (all buttons navigate correctly)
- [ ] ADM-006: Charts load and display correct data
- [ ] ADM-007: Command palette (Cmd+K) searches pages and investors

#### 10.2 Investor Management
- [ ] ADM-008: Investor list loads with all investors
- [ ] ADM-009: Search/filter works (by name, email)
- [ ] ADM-010: Click investor -> detail page loads with positions, transactions, yields
- [ ] ADM-011: Position summary matches ledger
- [ ] ADM-012: Transaction history complete and chronological
- [ ] ADM-013: Fee schedule visible and editable
- [ ] ADM-014: IB parent assignment visible for referred investors

#### 10.3 Transaction Management
- [ ] ADM-015: Transaction list loads with all transactions
- [ ] ADM-016: Filter by type (deposit, withdrawal, yield, etc.)
- [ ] ADM-017: Filter by fund
- [ ] ADM-018: Filter by date range
- [ ] ADM-019: Click transaction -> detail page with full metadata
- [ ] ADM-020: Void button visible (for non-voided transactions)
- [ ] ADM-021: Voided transactions shown with strikethrough/badge

#### 10.4 Yield Management
- [ ] ADM-022: Apply Yield page loads correctly
- [ ] ADM-023: Fund selector shows all active funds with current AUM
- [ ] ADM-024: Purpose toggle works (reporting vs transaction)
- [ ] ADM-025: Preview shows correct math
- [ ] ADM-026: Apply creates all expected records
- [ ] ADM-027: Recorded Yields page lists all historical distributions
- [ ] ADM-028: Click distribution -> shows breakdown by investor

#### 10.5 Withdrawal Management
- [ ] ADM-029: Pending withdrawals list
- [ ] ADM-030: Approve/reject buttons
- [ ] ADM-031: Processing workflow
- [ ] ADM-032: Completion records transaction

#### 10.6 Fund Management
- [ ] ADM-033: Fund list with all 7 funds
- [ ] ADM-034: Fund detail page shows positions, AUM history
- [ ] ADM-035: Fund KPIs (yield history, investor count)
- [ ] ADM-036: Create new fund (if applicable)
- [ ] ADM-037: Deactivate fund

#### 10.7 IB Management
- [ ] ADM-038: IB list with all IBs
- [ ] ADM-039: IB detail page shows referrals and commissions
- [ ] ADM-040: Commission ledger accurate
- [ ] ADM-041: Assign/unassign referrals

#### 10.8 System Health & Integrity
- [ ] ADM-042: System health page loads
- [ ] ADM-043: All 12 health checks pass
- [ ] ADM-044: Integrity dashboard shows zero violations
- [ ] ADM-045: Audit log viewer works with filters
- [ ] ADM-046: Reconciliation views show zero drift

#### 10.9 Reports & Statements
- [ ] ADM-047: Report generation page loads
- [ ] ADM-048: Generate investor statement -> PDF correct
- [ ] ADM-049: Email delivery tracking
- [ ] ADM-050: Custom report builder (if exists)

#### 10.10 Fees Overview
- [ ] ADM-051: Fees page shows total platform fees collected
- [ ] ADM-052: Breakdown by fund
- [ ] ADM-053: Breakdown by investor
- [ ] ADM-054: Fee schedule management
- [ ] ADM-055: Fees account balance matches SUM(FEE_CREDIT transactions)

### Week 11: Investor & IB Portal Full Verification

#### 11.1 Investor Portal
- [ ] INV-001: Dashboard loads with correct current balance
- [ ] INV-002: Portfolio page shows all positions across funds
- [ ] INV-003: Each position shows: invested amount, current value, total yield, return %
- [ ] INV-004: Transaction history shows deposits, yields, withdrawals
- [ ] INV-005: Transaction-purpose yields NOT visible (admin_only)
- [ ] INV-006: Reporting yields VISIBLE (investor_visible)
- [ ] INV-007: Yield history page shows monthly yields
- [ ] INV-008: Statements page lists available monthly statements
- [ ] INV-009: Download statement -> PDF opens correctly
- [ ] INV-010: Withdrawal request form works
- [ ] INV-011: Pending withdrawal visible with status
- [ ] INV-012: Settings page loads (profile info)
- [ ] INV-013: Mobile layout responsive and usable
- [ ] INV-014: Logout works correctly

#### 11.2 IB Portal
- [ ] IB-PORT-001: Dashboard shows total referrals, total commissions
- [ ] IB-PORT-002: Referrals list shows all assigned investors
- [ ] IB-PORT-003: Click referral -> detail page with investor's AUM and commission history
- [ ] IB-PORT-004: Commission ledger shows all IB_CREDIT transactions
- [ ] IB-PORT-005: Reporting yields show as paid commissions
- [ ] IB-PORT-006: Transaction yields show as pending commissions
- [ ] IB-PORT-007: Portal switch to Investor view works
- [ ] IB-PORT-008: In Investor view: own positions and yields visible (not commission data)
- [ ] IB-PORT-009: Settings page loads (IB profile info)
- [ ] IB-PORT-010: Mobile layout responsive

### Week 12: Final Certification

#### 12.1 Full Regression Run
Re-execute critical tests from Months 1 & 2:
- [ ] REG-001: Deposit flow (1 per fund type)
- [ ] REG-002: Yield distribution (1 per active fund)
- [ ] REG-003: Withdrawal lifecycle (1 complete)
- [ ] REG-004: Void and recovery (1 transaction)
- [ ] REG-005: IB commission flow (1 cycle)
- [ ] REG-006: All portal access (admin, investor, IB)

#### 12.2 Data Integrity Final Audit
- [ ] CERT-001: `v_ledger_reconciliation` -> ZERO drift for ALL investors
- [ ] CERT-002: `fund_aum_mismatch` -> ZERO mismatches for ALL funds
- [ ] CERT-003: `yield_distribution_conservation_check` -> ZERO violations
- [ ] CERT-004: `v_orphaned_positions` -> ZERO orphans
- [ ] CERT-005: `v_orphaned_transactions` -> ZERO orphans
- [ ] CERT-006: `v_fee_calculation_orphans` -> ZERO orphans
- [ ] CERT-007: Run `run_integrity_check('final_certification')` -> ALL PASS
- [ ] CERT-008: Position = SUM(ledger) for EVERY active investor
- [ ] CERT-009: Fund AUM = SUM(active positions) for EVERY fund
- [ ] CERT-010: Fees account balance = SUM(FEE_CREDIT) - SUM(FEE_DEBIT)

#### 12.3 Security Verification
- [ ] SEC-001: Investor A cannot see Investor B's data (RLS test)
- [ ] SEC-002: Investor cannot access admin routes (401/403)
- [ ] SEC-003: IB can only see own referrals (not other IBs')
- [ ] SEC-004: Non-admin cannot call admin RPCs
- [ ] SEC-005: Protected tables block direct mutations
- [ ] SEC-006: No console.log in production code
- [ ] SEC-007: No hardcoded credentials in codebase
- [ ] SEC-008: All SECURITY DEFINER functions have SET search_path
- [ ] SEC-009: Immutable fields (created_at, reference_id) cannot be modified

#### 12.4 Performance Baseline
- [ ] PERF-001: Admin dashboard loads < 3 seconds
- [ ] PERF-002: Investor dashboard loads < 2 seconds
- [ ] PERF-003: Transaction list (100+ records) loads < 2 seconds
- [ ] PERF-004: Yield preview calculation < 5 seconds
- [ ] PERF-005: Yield apply < 10 seconds

#### 12.5 Launch Certification Checklist
- [ ] All CERT tests pass
- [ ] All SEC tests pass
- [ ] All PERF tests meet thresholds
- [ ] Zero known CRITICAL or HIGH bugs
- [ ] Build passes (`npm run build`)
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Contract verification passes
- [ ] Test evidence documented (screenshots, logs, SQL output)
- [ ] Sign-off by lead tester
- [ ] Sign-off by platform owner

---

## 5. Feature Test Catalog

### Feature Matrix (by page/feature)

| # | Feature | Page/Route | Admin | Investor | IB | Priority | Month |
|---|---------|------------|-------|----------|-----|----------|-------|
| F01 | Dashboard | `/admin`, `/investor`, `/ib` | X | X | X | P0 | 1 |
| F02 | Deposit Recording | `/admin/transactions` | X | | | P0 | 1 |
| F03 | Yield Preview | `/admin/yield` | X | | | P0 | 1 |
| F04 | Yield Apply | `/admin/yield` | X | | | P0 | 1 |
| F05 | Withdrawal Request | `/investor/withdrawals` | | X | | P0 | 1 |
| F06 | Withdrawal Approval | `/admin/withdrawals` | X | | | P0 | 1 |
| F07 | Portfolio View | `/investor/portfolio` | | X | | P0 | 2 |
| F08 | Transaction History | `/admin/transactions`, `/investor/transactions` | X | X | | P0 | 1 |
| F09 | Investor Management | `/admin/investors` | X | | | P1 | 2 |
| F10 | Fund Management | `/admin/funds` | X | | | P1 | 2 |
| F11 | IB Commissions | `/ib/commissions` | X | | X | P1 | 2 |
| F12 | IB Referrals | `/ib/referrals` | | | X | P1 | 2 |
| F13 | IB Dual Portal | portal switcher | | X | X | P1 | 2 |
| F14 | Transaction Void | `/admin/transactions/:id` | X | | | P1 | 2 |
| F15 | Yield Distribution Void | `/admin/recorded-yields` | X | | | P1 | 2 |
| F16 | Negative Yield | `/admin/yield` | X | | | P1 | 2 |
| F17 | Crystallization | (automatic) | X | | | P1 | 1 |
| F18 | Conservation Check | integrity views | X | | | P0 | 1-3 |
| F19 | Integrity Dashboard | `/admin/integrity` | X | | | P1 | 3 |
| F20 | Audit Log | `/admin/audit-log` | X | | | P2 | 3 |
| F21 | System Health | `/admin/system-health` | X | | | P2 | 3 |
| F22 | Statements (PDF) | `/admin/investor-reports`, `/investor/statements` | X | X | | P1 | 3 |
| F23 | Email Delivery | `/admin/email-tracking` | X | | | P2 | 3 |
| F24 | Fee Schedule | `/admin/investors/:id` | X | | | P1 | 2 |
| F25 | Fees Overview | `/admin/fees` | X | | | P1 | 3 |
| F26 | Command Palette | (Cmd+K) | X | | | P2 | 3 |
| F27 | Quick Actions | dashboard | X | | | P2 | 1 |
| F28 | Multi-Fund Portfolio | `/investor/portfolio` | | X | | P1 | 2 |
| F29 | Mobile Responsiveness | all pages | X | X | X | P1 | 3 |
| F30 | Login/Logout | `/login` | X | X | X | P0 | 1 |
| F31 | Performance Charts | `/investor/performance` | | X | | P2 | 3 |
| F32 | Settings | `/admin/settings`, `/investor/settings` | X | X | X | P2 | 3 |

### Priority Key
- **P0**: Must work perfectly for launch. Blocks everything.
- **P1**: Important for launch. Must work, minor issues tolerable.
- **P2**: Nice to have. Can launch with known limitations.

---

## 6. Appendix: Test Execution Checklists

### A. Before Each Test Session
- [ ] Verify QA credentials work
- [ ] Check system health (zero violations)
- [ ] Note current data counts (positions, transactions, distributions)
- [ ] Clear browser cache/storage if testing auth flows

### B. After Each Test Session
- [ ] Run conservation check: `SELECT * FROM yield_distribution_conservation_check`
- [ ] Run ledger reconciliation: `SELECT * FROM v_ledger_reconciliation WHERE drift != 0`
- [ ] Run AUM check: `SELECT * FROM fund_aum_mismatch`
- [ ] Document results (pass/fail, screenshots, notes)
- [ ] Log any bugs found with reproduction steps

### C. Monthly Milestone Sign-Off

**Month 1 Exit Criteria**:
- [ ] All deposits work correctly
- [ ] Yield distribution works for USDT and BTC funds
- [ ] Withdrawal lifecycle works end-to-end
- [ ] Conservation holds for all distributions
- [ ] Positions match ledger for all investors
- [ ] All 3 portals accessible and functional

**Month 2 Exit Criteria**:
- [ ] All 7 funds tested with deposits and yields
- [ ] IB commission flow verified end-to-end
- [ ] Void/recovery workflow verified
- [ ] Negative yield handled correctly
- [ ] Multi-fund investor verified
- [ ] IB dual portal verified

**Month 3 Exit Criteria**:
- [ ] Full lifecycle scenario passes
- [ ] 3-month simulation reconciles perfectly
- [ ] All admin pages verified
- [ ] All investor pages verified
- [ ] All IB pages verified
- [ ] Security checks pass
- [ ] Performance meets thresholds
- [ ] Launch certification signed

### D. SQL Verification Queries

```sql
-- 1. Position-Ledger Reconciliation (must return 0 rows)
SELECT * FROM v_ledger_reconciliation WHERE abs(drift) > 0.0001;

-- 2. Fund AUM Mismatch (must return 0 rows)
SELECT * FROM fund_aum_mismatch;

-- 3. Yield Conservation (must return 0 rows)
SELECT * FROM yield_distribution_conservation_check;

-- 4. Orphaned Records (must return 0 rows each)
SELECT * FROM v_orphaned_positions;
SELECT * FROM v_orphaned_transactions;
SELECT * FROM v_fee_calculation_orphans;

-- 5. All Positions Match Ledger
SELECT
  ip.investor_id,
  p.first_name || ' ' || p.last_name as name,
  f.code as fund,
  ip.current_value as position_value,
  COALESCE(SUM(
    CASE
      WHEN t.tx_type IN ('DEPOSIT','YIELD','FEE_CREDIT','IB_CREDIT','INTERNAL_CREDIT') THEN t.amount
      WHEN t.tx_type IN ('WITHDRAWAL','FEE','INTERNAL_WITHDRAWAL','IB_DEBIT') THEN -t.amount
      ELSE 0
    END
  ), 0) as ledger_sum,
  ip.current_value - COALESCE(SUM(
    CASE
      WHEN t.tx_type IN ('DEPOSIT','YIELD','FEE_CREDIT','IB_CREDIT','INTERNAL_CREDIT') THEN t.amount
      WHEN t.tx_type IN ('WITHDRAWAL','FEE','INTERNAL_WITHDRAWAL','IB_DEBIT') THEN -t.amount
      ELSE 0
    END
  ), 0) as drift
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided
WHERE ip.is_active = true
GROUP BY ip.investor_id, p.first_name, p.last_name, f.code, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(
  CASE
    WHEN t.tx_type IN ('DEPOSIT','YIELD','FEE_CREDIT','IB_CREDIT','INTERNAL_CREDIT') THEN t.amount
    WHEN t.tx_type IN ('WITHDRAWAL','FEE','INTERNAL_WITHDRAWAL','IB_DEBIT') THEN -t.amount
    ELSE 0
  END
), 0)) > 0.0001;

-- 6. Full Integrity Check
SELECT * FROM run_integrity_check('manual_test');

-- 7. Fund AUM vs Position Sum
SELECT
  f.code,
  f.asset,
  COALESCE(SUM(ip.current_value), 0) as positions_sum,
  (SELECT total_aum FROM fund_daily_aum fda
   WHERE fda.fund_id = f.id
   ORDER BY recorded_date DESC LIMIT 1) as recorded_aum
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
WHERE f.status = 'active'
GROUP BY f.id, f.code, f.asset;
```

### E. Bug Report Template

```
## Bug Report

**ID**: BUG-XXX
**Severity**: CRITICAL / HIGH / MEDIUM / LOW
**Feature**: F## - Feature Name
**Test ID**: TST-XXX

**Steps to Reproduce**:
1.
2.
3.

**Expected**:

**Actual**:

**Evidence**: (screenshot, SQL output, console error)

**Impact**:

**Workaround**:
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CTO / Lead | | | |
| Tester 1 | | | |
| Tester 2 | | | |

---

*Document generated: February 6, 2026*
*Next review: Start of Month 1*
