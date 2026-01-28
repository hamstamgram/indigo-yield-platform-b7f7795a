# Comprehensive Platform Verification Plan

**Created**: 2026-01-26
**Priority**: URGENT (Same-day completion required)
**Approval Required**: CFO (Finance) + CTO (Technical)
**Issue Policy**: STOP AND FIX immediately for any critical issues

---

## Executive Summary

This plan covers end-to-end verification of the Indigo Yield Platform across:
- **Data Integrity**: Transaction ledger, position reconciliation, fee schedules
- **Calculations**: Yield distribution math, fee calculations, IB commissions
- **UI Functionality**: Admin portal, Investor portal, IB portal
- **Security**: RLS, authentication, role-based access, audit trails
- **Integration**: Email notifications via Resend

### Key Metrics

| Metric | Target |
|--------|--------|
| Position Variance Tolerance | 0.01% |
| Health Checks | 8/8 PASS |
| Ledger Reconciliation | 100% match |
| UI Test Coverage | All critical flows |
| Browser Support | Chrome |

---

## Part 1: Data Verification

### 1.1 High-Priority Accounts (Extra Scrutiny)

| Account | Fund(s) | Position | IB Relationship | Risk Level |
|---------|---------|----------|-----------------|------------|
| Sam Johnson | USDT | $4.2M | Ryan Van Der Wall (4%) | CRITICAL |
| Babak Eftekhari | ETH, USDT | Multi-fund | Lars Ahlgreen (2%) | HIGH |
| Paul Johnson | BTC, SOL, ETH | Closed | Alex Jacobs (1.5%) | MEDIUM |
| All IB accounts | Various | Various | N/A | HIGH |

### 1.2 Transaction Verification

```sql
-- Test 1: Transaction count by type
SELECT type, COUNT(*) as count
FROM transactions_v2
WHERE NOT is_voided
GROUP BY type
ORDER BY count DESC;

-- Expected:
-- DEPOSIT: 110
-- WITHDRAWAL: 27
-- YIELD: 16
-- IB_CREDIT: 1
-- TOTAL: 154
```

**Verification Steps**:
1. [ ] Count matches expected totals
2. [ ] All transactions have valid investor_id
3. [ ] All transactions have valid fund_id
4. [ ] No future-dated transactions
5. [ ] All amounts are non-zero

### 1.3 Position Reconciliation

```sql
-- Test 2: Ledger = Position for ALL investors
WITH ledger AS (
  SELECT investor_id, fund_id,
    SUM(CASE WHEN type IN ('DEPOSIT', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT') THEN amount
             WHEN type = 'WITHDRAWAL' THEN amount
             ELSE 0 END) as balance
  FROM transactions_v2
  WHERE NOT is_voided
  GROUP BY investor_id, fund_id
)
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as investor,
  f.code,
  ip.current_value,
  l.balance,
  ip.current_value - l.balance as variance
FROM investor_positions ip
JOIN ledger l USING (investor_id, fund_id)
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ABS(ip.current_value - l.balance) > 0.00000001;

-- Expected: 0 rows (no variance)
```

### 1.4 Fee Schedule Verification

```sql
-- Test 3: All positions have fee schedules
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as investor,
  f.code,
  ip.current_value,
  ifs.fee_pct
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN investor_fee_schedule ifs
  ON ip.investor_id = ifs.investor_id
  AND ip.fund_id = ifs.fund_id
  AND ifs.end_date IS NULL
WHERE ip.current_value > 0
  AND ifs.fee_pct IS NULL;

-- Expected: 0 rows (all covered)
```

### 1.5 IB Relationship Verification

```sql
-- Test 4: IB relationships configured correctly
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as investor,
  CONCAT(ib.first_name, ' ', ib.last_name) as ib_parent,
  p.ib_percentage
FROM profiles p
JOIN profiles ib ON p.ib_parent_id = ib.id
WHERE p.ib_parent_id IS NOT NULL;

-- Expected IB Relationships:
-- Sam Johnson -> Ryan Van Der Wall (4%)
-- Babak Eftekhari -> Lars Ahlgreen (2%)
```

---

## Part 2: Yield Calculation Verification

### 2.1 Yield Formula Verification

**Platform Formula**:
```
GROSS_YIELD = Position × Gross_Rate
FEE = GROSS_YIELD × (Fee_Pct / 100)
NET_YIELD = GROSS_YIELD - FEE
IB_COMMISSION = FEE × IB_Percentage (if IB relationship exists)
NEW_POSITION = OLD_POSITION + NET_YIELD
```

**Conservation Identity**:
```
GROSS = NET + FEE + DUST (must equal within 10 decimal places)
```

### 2.2 Edge Case Scenarios to Test

| Scenario | Test Case | Expected Behavior |
|----------|-----------|-------------------|
| Full withdrawal with pending yield | Investor withdraws 100% | Yield crystallizes FIRST, then withdrawal |
| Same-day deposit and withdrawal | Deposit AM, withdraw PM | ADB calculated correctly for partial day |
| Fee rate change mid-period | Rate changes from 20% to 15% | New rate applies from change date |
| Negative gross yield (loss) | Fund has negative performance | No fees on losses, position decreases |
| Zero-fee investor | Fee rate = 0% | Full gross yield credited, no fee deducted |
| IB commission splitting | Investor with IB parent | Fee splits between platform and IB |

### 2.3 Sample Yield Calculation Test

**Test: Sam Johnson USDT (Feb 2026 Projection)**

| Metric | Value |
|--------|-------|
| Position | 4,200,000.00 USDT |
| Fee Rate | 16% |
| IB Rate | 4% (to Ryan Van Der Wall) |
| Gross Rate | 0.263% (monthly avg) |
| Gross Yield | 11,046.55 USDT |
| Fee (16%) | 1,767.45 USDT |
| IB Commission (4% of fee) | 70.70 USDT |
| Platform Fee | 1,696.75 USDT |
| Net Yield | 9,279.10 USDT |
| New Position | 4,209,279.10 USDT |

**Conservation Check**:
```
11,046.55 = 9,279.10 + 1,767.45 + 0 (dust)
✓ PASS
```

---

## Part 3: UI Testing (Playwright Automation)

### 3.1 Test Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | qa.admin@indigo.fund | QaTest2026! | Full admin access |
| Investor | qa.investor@indigo.fund | QaTest2026! | Test investor with position |
| IB | qa.ib@indigo.fund | QaTest2026! | Refers QA Investor |

### 3.2 Admin Portal Tests (HIGHEST PRIORITY)

#### 3.2.1 Authentication
- [ ] Admin login flow works
- [ ] Logout works
- [ ] Session persists on refresh
- [ ] Password reset flow (if implemented)

#### 3.2.2 Dashboard / Command Center
- [ ] Page loads without errors
- [ ] Fund AUM totals display correctly
- [ ] Investor count matches database
- [ ] Recent activity shows correctly

#### 3.2.3 Yield Operations (CRITICAL)
- [ ] Navigate to /admin/yield-operations
- [ ] Yield preview shows correct calculations
- [ ] Preview shows all investors with positions
- [ ] Fee calculations match expected
- [ ] IB commission calculations correct
- [ ] Conservation identity passes
- [ ] Can execute yield distribution (TEST ENVIRONMENT ONLY)
- [ ] Can void a distribution

#### 3.2.4 Transaction Management
- [ ] Navigate to /admin/transactions
- [ ] Transaction list loads
- [ ] Filtering works (by type, date, investor)
- [ ] Can view transaction details
- [ ] Can create new deposit
- [ ] Can create new withdrawal
- [ ] Withdrawal validation (cannot exceed position)
- [ ] Can void transaction

#### 3.2.5 Investor Management
- [ ] Navigate to /admin/investors
- [ ] Investor list loads
- [ ] Can search/filter investors
- [ ] Can view investor detail
- [ ] Can edit investor profile
- [ ] Can edit fee schedule
- [ ] Can set IB relationship

#### 3.2.6 System Health
- [ ] Navigate to /admin/system-health (or equivalent)
- [ ] All 8 health checks display
- [ ] All checks show PASS status
- [ ] No violations displayed

### 3.3 Investor Portal Tests

#### 3.3.1 Authentication
- [ ] Investor login flow works
- [ ] Cannot access admin pages
- [ ] Session management works

#### 3.3.2 Dashboard
- [ ] Shows current positions
- [ ] Shows correct USD values
- [ ] Shows performance metrics

#### 3.3.3 Transaction History
- [ ] Shows all investor transactions
- [ ] Correct amounts and dates
- [ ] Filter/search works

#### 3.3.4 Data Isolation (SECURITY)
- [ ] Cannot see other investors' data
- [ ] Cannot access other investor IDs via URL manipulation

### 3.4 IB Portal Tests

#### 3.4.1 Commission Dashboard
- [ ] Shows total commissions earned
- [ ] Shows pending commissions
- [ ] Shows paid commissions

#### 3.4.2 Referred Investors
- [ ] Lists all referred investors
- [ ] Shows their positions (if allowed)
- [ ] Shows commission rate per investor

#### 3.4.3 Commission History
- [ ] Shows per-distribution breakdown
- [ ] Amounts match IB calculations

---

## Part 4: Security Verification

### 4.1 Row Level Security (RLS)

```sql
-- Test as investor user (not admin)
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "[INVESTOR_UUID]", "role": "investor"}';

-- Should only return own data
SELECT * FROM investor_positions;
SELECT * FROM transactions_v2;

-- Should return 0 rows (cannot see others)
SELECT * FROM profiles WHERE id != '[INVESTOR_UUID]';
```

### 4.2 Role-Based Access Control

| Action | Admin | Investor | IB |
|--------|-------|----------|-----|
| View all investors | Yes | No | Own referrals |
| Create transaction | Yes | No | No |
| Run yield distribution | Yes | No | No |
| View own position | Yes | Yes | Yes |
| Edit fee schedule | Yes | No | No |

### 4.3 Audit Trail Verification

```sql
-- Check all mutations are logged
SELECT
  table_name,
  operation,
  COUNT(*) as count
FROM audit_log
GROUP BY table_name, operation
ORDER BY count DESC;

-- Verify recent operations have user_id
SELECT *
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 day'
  AND user_id IS NULL;
-- Expected: 0 rows
```

---

## Part 5: Known Issues Investigation

### 5.1 UI Issues to Investigate

| Issue Type | Priority | Investigation Steps |
|------------|----------|---------------------|
| Navigation/routing | HIGH | Check all route definitions, test 404 handling |
| Data display | CRITICAL | Compare UI values vs database values |
| Form/input | HIGH | Test all forms with valid/invalid data |
| Styling/layout | MEDIUM | Visual inspection on Chrome |

### 5.2 Calculation Discrepancies to Investigate

| Issue | Investigation | Resolution |
|-------|---------------|------------|
| Position totals don't match | Compare ledger vs stored position | Run reconciliation query |
| Fee calculations incorrect | Verify fee_pct in fee_schedule | Check calculation formula |
| Yield distribution math | Verify conservation identity | Check gross = net + fee |
| AUM/Fund totals off | Sum positions vs fund_aum | Reconcile difference |

### 5.3 Missing Features

| Feature | Status | Priority |
|---------|--------|----------|
| Bulk operations | NOT IMPLEMENTED | HIGH |
| User/role management | PARTIAL | HIGH |
| System configuration | NOT IMPLEMENTED | MEDIUM |
| Email via Resend | NOT VERIFIED | HIGH |

---

## Part 6: Email Integration (Resend)

### 6.1 Email Types to Test

| Email Type | Trigger | Priority |
|------------|---------|----------|
| Welcome/Onboarding | New investor creation | HIGH |
| Transaction confirmation | Deposit/withdrawal | HIGH |
| Yield distribution notice | Monthly yield credit | HIGH |
| Monthly report | Scheduled (1st of month) | MEDIUM |

### 6.2 Email Testing Steps

1. [ ] Verify Resend API key is configured
2. [ ] Check email templates exist
3. [ ] Test welcome email on investor creation
4. [ ] Test transaction email on deposit
5. [ ] Test yield notice on distribution
6. [ ] Verify email delivery (check spam)

---

## Part 7: Test Execution Order

### Phase 1: Data Verification (30 min)
1. Run all SQL verification queries
2. Document any discrepancies
3. Fix critical data issues immediately

### Phase 2: Health Checks (15 min)
1. Run comprehensive health check
2. Verify all 8 checks PASS
3. Investigate any failures

### Phase 3: Admin UI Testing (1 hour)
1. Login as admin
2. Test all critical flows
3. Screenshot any issues
4. Document bugs found

### Phase 4: Investor/IB UI Testing (30 min)
1. Login as investor
2. Verify dashboard, transactions
3. Login as IB
4. Verify commission features

### Phase 5: Security Testing (30 min)
1. Test RLS policies
2. Test role-based access
3. Verify audit logging

### Phase 6: Email Testing (30 min)
1. Test each email type
2. Verify delivery
3. Check formatting

### Phase 7: Report Generation (30 min)
1. Compile all findings
2. Create verification report
3. Present to CFO/CTO for approval

---

## Part 8: Success Criteria

### Must Pass (Critical)

| Criteria | Target | Blocker if Fail |
|----------|--------|-----------------|
| Ledger reconciliation | 100% match | YES |
| Health checks | 8/8 PASS | YES |
| Position variance | < 0.01% | YES |
| Admin login | Works | YES |
| Yield preview | Correct math | YES |

### Should Pass (High Priority)

| Criteria | Target | Blocker if Fail |
|----------|--------|-----------------|
| Investor portal | All features work | NO (workaround) |
| IB portal | All features work | NO (workaround) |
| Email delivery | All types work | NO (manual backup) |

### Nice to Have

| Criteria | Target | Blocker if Fail |
|----------|--------|-----------------|
| Bulk operations | Implemented | NO |
| System config UI | Implemented | NO |

---

## Part 9: Issue Escalation

### Critical (Stop and Fix)
- Any ledger mismatch
- Health check failure
- Security breach (data isolation failure)
- Admin cannot run yield distribution

### High (Fix Before Go-Live)
- UI showing wrong numbers
- Email not sending
- Forms not working

### Medium (Document for Later)
- Styling issues
- Missing non-critical features
- Performance concerns

---

## Appendix: Quick Reference

### Key Database Tables

| Table | Purpose |
|-------|---------|
| profiles | Investor/admin/IB user accounts |
| funds | Fund definitions (BTC, ETH, etc.) |
| investor_positions | Current position balances |
| transactions_v2 | All transaction history |
| investor_fee_schedule | Fee rates per investor/fund |
| yield_distributions | Yield distribution records |
| fee_allocations | Per-investor fee breakdown |
| ib_allocations | IB commission records |
| audit_log | Audit trail |

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| run_comprehensive_health_check() | Run all 8 health checks |
| get_yield_preview() | Preview yield distribution |
| execute_yield_distribution() | Run yield distribution |
| create_transaction() | Create deposit/withdrawal |

### Platform URLs

| Page | URL |
|------|-----|
| Admin Dashboard | /admin |
| Yield Operations | /admin/yield-operations |
| Transactions | /admin/transactions |
| Investors | /admin/investors |
| System Health | /admin/system-health |
| Investor Dashboard | /dashboard |
| IB Dashboard | /ib-dashboard |

---

*Plan created: 2026-01-26*
*Timeline: URGENT - Complete today*
*Approval: Pending CFO + CTO sign-off*
