# Comprehensive Multi-Month Platform Test Scenarios

## Current State Baseline (January 2026)

### Active Positions
| Investor | Type | Fund | Balance | Cost Basis | Yield Earned |
|----------|------|------|---------|------------|--------------|
| Alice Investor | investor | BTC Yield Fund | 1.008 BTC | 1.00 BTC | 0 |
| Alice Investor | investor | ETH Yield Fund | 5.00 ETH | 5.00 ETH | 0 |
| Bob Referred | investor | Stablecoin Fund | 8,656.64 USDT | 8,500.00 USDT | 156.64 USDT |
| INDIGO FEES | fees_account | BTC Yield Fund | 0.507 BTC | 0.50 BTC | 0 |
| INDIGO FEES | fees_account | Stablecoin Fund | 1,544.36 USDT | 1,500.00 USDT | 5.20 USDT |
| Dave Broker | ib | Stablecoin Fund | 9.79 USDT | 0.00 USDT | 0 |

### IB Referral Structure
- Dave Broker -> Bob Referred (USDT fund, earning commissions)
- lars ahlgreen -> Babak Eftekhari
- ryan van der wall -> Sam Johnson
- alex jacobs -> Paul Johnson

---

## TEST SCENARIO 1: January Month-End Close

### Objective
Complete January 2026 month-end process and verify all calculations

### Steps

#### 1.1 Record Final January Yield for All Funds
```
Fund: Bitcoin Yield Fund
- Gross Yield: 0.05 BTC (5% monthly rate for testing)
- Period: 2026-01-26 to 2026-01-31
- Expected: Alice gets yield on 1.008 BTC ADB
- Expected: INDIGO FEES gets yield on 0.507 BTC ADB
```

```
Fund: Stablecoin Fund
- Gross Yield: 50 USDT
- Period: 2026-01-26 to 2026-01-31
- Expected: Bob gets yield (with 20% fee, 5% to Dave IB)
- Expected: INDIGO FEES gets yield
- Expected: Dave Broker gets yield on 9.79 USDT (first time!)
```

```
Fund: Ethereum Yield Fund
- Gross Yield: 0.25 ETH
- Period: 2026-01-26 to 2026-01-31
- Expected: Alice gets yield on 5.0 ETH ADB
```

#### 1.2 Verify January Performance Data
After yields:
- [ ] investor_fund_performance updated for all investors
- [ ] MTD returns calculated correctly
- [ ] Balance equation: ending = beginning + additions - redemptions + net_income

#### 1.3 Finalize January Period
- [ ] Run finalize_statement_period RPC
- [ ] Status changes from DRAFT to FINALIZED
- [ ] Audit log entry created

#### 1.4 Generate January Statements
- [ ] Statements generated for Alice, Bob
- [ ] PDF contains correct balances
- [ ] Yield breakdown accurate

---

## TEST SCENARIO 2: February Operations (New Month)

### Objective
Test month boundary transitions and compounding

### Steps

#### 2.1 Create February Statement Period
```sql
INSERT INTO statement_periods (year, month, period_name, period_end_date, status)
VALUES (2026, 2, 'February 2026', '2026-02-28', 'DRAFT');
```

#### 2.2 New Deposits (February)
```
Alice: +2.0 BTC deposit (increases her BTC position)
Bob: +5,000 USDT deposit (increases USDT position)
New Investor Charlie: +10,000 USDT (referred by Dave Broker)
```

Expected After Deposits:
- Alice BTC: 1.008 + 2.0 = 3.008 BTC
- Bob USDT: ~8,700 + 5,000 = ~13,700 USDT
- Charlie USDT: 10,000 USDT (new position)
- Dave now has 2 referrals (Bob + Charlie)

#### 2.3 Mid-Month Withdrawal (Tests Crystallization)
```
Bob: Withdraw 1,000 USDT on Feb 15
- Must crystallize accrued yield first
- ADB calculation splits at withdrawal date
```

#### 2.4 February Yield Distributions
```
Week 1 (Feb 1-7): Record weekly yields
Week 2 (Feb 8-14): Record weekly yields
Week 3 (Feb 15-21): Record yields (post-withdrawal ADB for Bob)
Week 4 (Feb 22-28): Record final yields
```

#### 2.5 Verify February Compounding
- [ ] Alice's MTD return compounds on January ending balance
- [ ] Bob's yield reduced due to withdrawal
- [ ] Charlie receives first yield
- [ ] Dave's IB commissions accumulate
- [ ] Dave receives yield on his IB balance (now should work!)

---

## TEST SCENARIO 3: Q1 End (March Close)

### Objective
Test quarter-to-date calculations and quarterly reporting

### Steps

#### 3.1 March Operations
- Process normal yields for March
- Test another mid-month transaction
- Verify QTD accumulates Jan + Feb + Mar

#### 3.2 Quarter-End Calculations
Expected QTD for Alice (BTC):
```
Jan ending: 1.008 BTC + yield
Feb ending: 3.008 BTC + yield + compound
Mar ending: balance + yield + compound

QTD Return = (Mar ending - Jan beginning + Redemptions - Additions) / (Jan beginning + avg additions)
```

#### 3.3 Verify QTD Consistency
- [ ] QTD = Sum of all MTD returns (approximately)
- [ ] QTD ending balance = Mar ending balance
- [ ] All investors have QTD data populated

---

## TEST SCENARIO 4: IB Commission Lifecycle

### Objective
Test complete IB commission flow over multiple months

### Test Data: Dave Broker
- Referral: Bob (existing), Charlie (new in Feb)
- Commission Rate: 5% of platform fees

### Monthly Commission Tracking
```
January:
- Bob yield: ~156.64 USDT (20% fee = 31.33, Dave gets 5% = 1.57 USDT)
- Dave position end Jan: ~9.79 + 1.57 = 11.36 USDT

February:
- Bob yield: (higher balance) -> higher commission
- Charlie yield: (new referral) -> new commission stream
- Dave earns yield on his 11.36 USDT balance
- Dave position end Feb: ~12+ USDT (commissions + yield on commissions)

March:
- Commissions compound further
- Dave can request withdrawal of accumulated commissions
```

### IB Withdrawal Test
```
Dave requests 5 USDT withdrawal from his balance
- Verify withdrawal request created
- Verify available balance calculation
- Process withdrawal
- Verify position updated
- Next yield should be on reduced balance
```

---

## TEST SCENARIO 5: Edge Cases

### 5.1 Zero Yield Month
```
Fund: XRP Yield Fund (no activity)
- Record 0% yield for the month
- Verify positions unchanged
- Verify performance records created (for reporting)
```

### 5.2 Large Withdrawal (> 50% of position)
```
Bob withdraws 5,000 USDT (from ~13,700)
- Crystallize accrued yield first
- Process withdrawal
- Verify position reduced correctly
- Verify future yields based on new lower balance
```

### 5.3 IB Parent Change
```
Charlie changes from Dave to Alex as IB
- Future commissions go to Alex
- Historical commissions stay with Dave
- Verify correct IB credited
```

### 5.4 Investor Offboarding
```
Charlie closes account entirely
- Withdraw full balance
- Position becomes inactive
- No future yield allocations
- Historical data preserved
```

### 5.5 Multiple Transactions Same Day
```
Alice on Feb 10:
- Deposit 1.0 BTC at 9:00 AM
- Deposit 0.5 BTC at 2:00 PM
- Withdraw 0.3 BTC at 4:00 PM

Verify:
- All transactions recorded
- ADB calculated correctly
- Day's net effect: +1.2 BTC
```

---

## TEST SCENARIO 6: Performance Metrics Verification

### 6.1 MTD Calculation
```
Modified Dietz Method:
RoR = Net Income / (Beginning Balance + (Additions - Redemptions) / 2)
```

Test with known values:
```
Alice BTC January:
- Beginning: 1.0 BTC
- Additions: 0.5 BTC (mid-month)
- Redemptions: 0
- Net Income: 0.008 BTC (yield)

Expected MTD = 0.008 / (1.0 + 0.5/2) = 0.008 / 1.25 = 0.64%
```

### 6.2 QTD Calculation
```
Link MTD records across months
QTD = Compound of Jan + Feb + Mar MTD returns
```

### 6.3 YTD Calculation
```
For year-end (December close):
YTD = Compound of all 12 monthly returns
```

### 6.4 ITD Calculation
```
Inception-to-date from first deposit to current
```

---

## TEST SCENARIO 7: Data Integrity Checks

### After Each Operation, Verify:

#### 7.1 Position-Ledger Reconciliation
```sql
SELECT * FROM investor_position_ledger_mismatch;
-- Should return 0 rows
```

#### 7.2 AUM-Position Reconciliation
```sql
SELECT * FROM fund_aum_mismatch;
-- Fund AUM should equal sum of positions
```

#### 7.3 Conservation of Value
```sql
SELECT * FROM yield_distribution_conservation_check;
-- Gross yield = Net yield + Fees + IB commissions
```

#### 7.4 IB Allocation Consistency
```sql
SELECT * FROM ib_allocation_consistency;
-- IB credits match allocations
```

---

## TEST SCENARIO 8: Admin Dashboard Verification

### 8.1 Command Center
- [ ] Total AUM accurate (sum of all fund positions)
- [ ] Active investors count correct
- [ ] Pending withdrawals count correct
- [ ] Recent activity shows latest transactions

### 8.2 Fund Management
- [ ] Each fund shows correct AUM
- [ ] Investor count per fund accurate
- [ ] Yield history displays correctly

### 8.3 Integrity Dashboard
- [ ] All reconciliation views show green
- [ ] No orphaned positions
- [ ] No ledger mismatches
- [ ] Audit log captures all actions

### 8.4 Yield Operations
- [ ] Preview shows correct ADB allocations
- [ ] Apply creates correct transactions
- [ ] IB commissions calculated correctly
- [ ] Platform fees routed to INDIGO FEES

---

## TEST SCENARIO 9: Investor Portal Verification

### 9.1 Overview Page
- [ ] Holdings show LIVE position data (not stale performance data)
- [ ] Recent transactions accurate
- [ ] Pending withdrawals shown

### 9.2 Portfolio Page
- [ ] Token amounts from investor_positions
- [ ] Cost basis accurate
- [ ] Unrealized P&L calculated

### 9.3 Performance Page
- [ ] MTD/QTD/YTD/ITD tabs work
- [ ] Returns calculated correctly
- [ ] Balance flow breakdown accurate

### 9.4 Yield History Page
- [ ] All yield events shown
- [ ] Gross/Fee/Net breakdown correct
- [ ] Monthly grouping works

### 9.5 Transactions Page
- [ ] Only investor_visible transactions shown
- [ ] Filters work (type, asset, date)
- [ ] Detail view accurate

### 9.6 Statements Page
- [ ] Monthly statements available
- [ ] PDF download works
- [ ] Data matches performance records

---

## TEST EXECUTION CHECKLIST

### Phase 1: January Close (Current)
- [ ] Record final January yields for all funds
- [ ] Update investor_fund_performance data
- [ ] Finalize January period
- [ ] Generate statements
- [ ] Verify all integrity checks pass

### Phase 2: February Simulation
- [ ] Create February period
- [ ] Add new deposits (Alice, Bob, Charlie)
- [ ] Process mid-month withdrawal
- [ ] Record weekly yields
- [ ] Verify compounding works
- [ ] Close February

### Phase 3: March/Q1 Close
- [ ] Process March operations
- [ ] Verify QTD calculations
- [ ] Generate quarterly reports
- [ ] Verify IB accumulated commissions

### Phase 4: Edge Case Testing
- [ ] Zero yield month
- [ ] Large withdrawal
- [ ] IB parent change
- [ ] Multiple same-day transactions

### Phase 5: Full Verification
- [ ] All integrity views green
- [ ] All investor portals accurate
- [ ] All admin dashboards correct
- [ ] Audit trail complete

---

## Expected Outcomes After 3 Months

### Alice Investor
- BTC: Started 1.0 -> ~3.0+ BTC (deposits + compounded yield)
- ETH: Started 5.0 -> 5.0+ ETH (compounded yield)
- Performance: MTD, QTD, YTD all populated

### Bob Referred
- USDT: Started 8,500 -> fluctuates with deposits/withdrawals + yield
- IB commissions flowing to Dave

### Dave Broker (IB)
- Started 0 -> 15+ USDT (commissions + yield on commissions)
- Demonstrates IB earning yield on their balance

### INDIGO FEES
- Platform fees accumulated across all funds
- Earning yield on accumulated fees

### Charlie (New)
- Onboarded in February
- 2 months of yield history
- Contributing to Dave's commissions

---

## Success Criteria

1. **No data integrity errors** - All reconciliation views return 0 rows
2. **Accurate compounding** - YTD = compound of all MTD returns
3. **IB yield working** - Dave earns yield on commission balance
4. **Crystallization works** - Mid-month transactions handled correctly
5. **Performance metrics accurate** - Modified Dietz calculations verified
6. **Statements generate** - PDFs contain correct data
7. **Audit trail complete** - All operations logged
