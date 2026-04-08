# Fund Mapping — Source of Truth Document

**Excel Source**: Accounting Yield Funds (6).xlsx - Investments Sheet  
**Generated**: 2026-04-07  
**Purpose**: Verify UI behavior matches Excel calculations exactly  
**Status**: COMPLETE - All 8 funds mapped with 198 total transactions

---

## Executive Summary

| Fund | Transactions | Investors | Final AUM | Status |
|------|---|---|---|---|
| **BTC** | 60 | 12 | 39.08 BTC | ACTIVE |
| **BTC Boost** | 7 | 0 | -0.45 BTC Boost | NEGATIVE |
| **BTC TAC** | 7 | 3 | -6.67 BTC TAC | NEGATIVE |
| **ETH** | 47 | 10 | 745.33 ETH | ACTIVE |
| **ETH TAC** | 10 | 2 | -1.66 ETH TAC | NEGATIVE |
| **SOL** | 13 | 2 | 1,233.68 SOL | ACTIVE |
| **USDT** | 46 | 18 | 3,018,875.20 USDT | ACTIVE |
| **XRP** | 8 | 1 | 182,105.58 XRP | ACTIVE |

**Total**: 198 transactions across 8 funds

---

## Critical Test Cases (Priority Order)

### 1. XRP Fund — Negative Position Edge Case ⚠️

**Scenario**: Large withdrawal exceeding cumulative deposits

```
Deposits (45978-46006):
  45978: Sam +135,003.00 → Running: 135,003.00
  45986: Sam +49,000.00  → Running: 184,003.00
  45991: Sam +45,000.00  → Running: 229,003.00
  45999: Sam +49,500.00  → Running: 278,503.00
  46006: Sam +50,100.00  → Running: 328,603.00

Withdrawal (46024):
  46024: Sam -330,500.42 → Running: -1,897.42 ❌ NEGATIVE

Expected Behavior in UI:
  - Position should show -1,897.42 XRP (NEGATIVE state)
  - System should not prevent negative positions
  - Subsequent deposits (2025-11-17, 2025-11-25) correct the position

Post-Recovery:
  2025-11-17: Sam +135,003.00 → Running: 133,105.58 ✓
  2025-11-25: Sam +49,000.00  → Running: 182,105.58 ✓
```

**UI Verification**:
- [ ] Negative position appears (not blocked/hidden)
- [ ] Balance shows as -1,897.42 on date 46024
- [ ] Subsequent deposits correctly add to negative amount
- [ ] Final balance is 182,105.58 XRP

---

### 2. SOL Fund — Withdrawal Exceeds Deposit

**Scenario**: Paul Johnson withdraws more than he deposited (minus IB/fees)

```
Paul Johnson Activity:
  45904: Paul DEPOSIT +234.17 SOL → Balance: 234.17
    - IB: Alex Jacobs (4%)
    - Fee: 16%
    
  45933: Paul WITHDRAWAL -236.02 SOL → Balance: -1.85 ❌
    - Same IB/Fee structure
    - Net withdrawal exceeds deposit

Expected Behavior:
  - Shows withdrawal of 236.02
  - Resulting position: -1.85 (negative, in withdrawal phase)
  - INDIGO LP also goes negative at point 45995: -1,285.66 → -35.66 total
```

**UI Verification**:
- [ ] Withdrawal amounts shown correctly
- [ ] Negative positions don't cause errors
- [ ] Fund AUM reconciles with sum of all positions

---

### 3. SOL Fund — Multiple Investor Types

```
Investors in SOL Fund:
  1. INDIGO DIGITAL ASSET FUND LP (Base LP, 0% fees)
     - 45902: +1,250.00 SOL
     - 45995: -1,285.66 SOL (WITHDRAWAL)
     - Final: -35.66 SOL ❌ NEGATIVE

  2. Paul Johnson (Regular investor, 16% fee, 4% IB to Alex)
     - 45904: +234.17 SOL (DEPOSIT)
     - 45933: -236.02 SOL (WITHDRAWAL)
     - Final: -1.85 SOL ❌ NEGATIVE

  3. Jose Molla (Added later, no IB/fee info)
     - 45953: +87.98 SOL
     - 46065: +393.77 SOL
     - Final: +481.75 SOL ✓

  4. Sam Johnson (Massive positions)
     - 45978-45999: +4,870.05 SOL (4 deposits)
     - 46024: -4,873.15 SOL (WITHDRAWAL)
     - Final: -37.10 SOL ❌ NEGATIVE

  5. ALOK PAVAN BATRA (New investor, added late)
     - 46065: +826.54 SOL
     - Final: +826.54 SOL ✓

Fund Total AUM: +1,233.68 SOL ✓ (sum of all balances)
```

**UI Verification**:
- [ ] All 5 investors appear
- [ ] Balances match above (including negatives)
- [ ] Total AUM = sum of all positions = 1,233.68
- [ ] Investor roles/types display correctly

---

### 4. USDT Fund — Large-Scale Multi-Investor

```
Characteristics:
  - 46 transactions
  - 18 investors
  - $3M+ in AUM
  - Mix of deposits, withdrawals, transfers
  - Some investors go negative

Key Test Points:
  1. Sam Johnson large activity (highest value)
     - 46041-46089: Multiple large deposits/withdrawals (millions)
     - Final: -45,353.80 USDT ❌ NEGATIVE

  2. Monica Levy Chicheportiche (single large deposit)
     - 45968: +840,168.03 USDT (one transaction)
     - Final: +840,168.03 USDT ✓

  3. INDIGO entities (fees, ventures, LP)
     - Appear multiple times with different roles
     - Some withdraw, some negative
     - Final states vary

  4. Multiple negative positions
     - Track which ones are negative
     - Verify they don't break UI
```

**UI Verification**:
- [ ] All 18 investors load
- [ ] Large numbers display without overflow (840K+)
- [ ] Negative positions appear correctly
- [ ] Total AUM = 3,018,875.20 USDT
- [ ] Search/filter works with many investors

---

## Test Execution Checklist

### Phase 1: Data Load Verification

```sql
-- For each fund, verify these match Excel:

-- XRP Fund
SELECT 
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_withdrawals,
  SUM(amount) as net_aum
FROM transactions_v2
WHERE fund_id = 'xrp-fund-001'
-- Expected: deposits=328603, withdrawals=-330500.42, net=-1897.42 (before recovery)

-- SOL Fund  
SELECT 
  COUNT(*) as total_txns,
  COUNT(DISTINCT investor_id) as unique_investors,
  SUM(amount) as total_aum
FROM transactions_v2  
WHERE fund_id = 'sol-fund-001'
-- Expected: txns=13, investors=5, aum=1233.68
```

### Phase 2: Investor Account Verification

For each investor, verify:
1. **Name matches** Excel sheet exactly
2. **Final balance** matches Excel cumulative sum
3. **Transaction count** per investor matches
4. **IB attribution** shows correctly (if applicable)
5. **Fee percentage** stored correctly (if applicable)

Example for XRP Fund (Sam Johnson):
- Name: "Sam Johnson" ✓
- Balance: 182,105.58 XRP ✓
- Transactions: 8 ✓
- IB: "Ryan Van Der Wall" ✓
- IB %: 4% ✓
- Fee %: 16% ✓

### Phase 3: Withdrawal Scenarios

**Test XRP Withdrawal (46024)**:
```
Input: Sam Johnson wants to withdraw from XRP Fund
Current balance: 328,603.00 XRP
Withdrawal amount: 330,500.42 XRP (exceeds balance)

Expected output:
  - Transaction created: -330,500.42
  - New balance: 328,603.00 - 330,500.42 = -1,897.42
  - Status: NEGATIVE (but allowed)
  - Investor can still transact
```

**Test SOL Withdrawal (Paul Johnson, 45933)**:
```
Input: Paul Johnson withdraws 236.02 SOL
Current balance before withdrawal: 234.17 SOL
Fee structure: 16% fee, 4% IB to Alex

Expected output (if fees/IB applied on withdrawal):
  - Gross withdrawal: 236.02 SOL
  - Fee amount: 236.02 * 0.16 = 37.76 SOL
  - IB amount: 236.02 * 0.04 = 9.44 SOL
  - Net to investor: 236.02 - 37.76 - 9.44 = 188.82 SOL
  
  BUT Excel shows raw -236.02, so check if fees/IB are:
  a) Applied on withdrawal (resulting in larger deduction)
  b) Not applied (raw amount only)
  c) Applied differently (e.g., only on deposits)
```

### Phase 4: Dust/Precision Verification

Check for very small balances (dust):

```
Watch for amounts like:
  - 0.00000001 BTC
  - 0.000001 ETH
  - 0.01 USDT

From Excel data found:
  - Danielle Richetta (BTC): -0.09630000 ✓
  - Paul Johnson (BTC): -0.00130000 ✓
  - Victoria Pariente-Cohen (BTC TAC): +0.00080000 ✓
  - Danielle Richetta (BTC TAC): -0.01110000 ✓

Verify:
  - Dust amounts display correctly
  - Accumulation doesn't cause issues
  - Precision maintained to 8 decimal places
```

---

## Fund-by-Fund Breakdown

### BTC Fund (60 transactions, 39.08 BTC AUM)

**Key investors** (final balances > 1 BTC):
- Thomas Puech: +8.81 BTC
- Jose Molla: +7.33 BTC
- Kabbaj: +6.66 BTC
- ALOK PAVAN BATRA: +6.00 BTC
- Blondish: +4.10 BTC

**Characteristics**:
- Mostly transfers (no explicit DEPOSIT/WITHDRAWAL markers in rows 1-60)
- Some negative positions (rounding issues?)
- INDIGO Fees: +0.05 BTC (management fee receipt)

**Test focus**: Verify dust accumulation doesn't break balance calcs

---

### ETH Fund (47 transactions, 745.33 ETH AUM)

**Key investors**:
- Tomer Zur: +190.54 ETH (highest)
- Monica Levy Chicheportiche: (in USDT, not ETH)
- Blondish: +124.58 ETH
- Jose Molla: +113.65 ETH

**Characteristics**:
- Mix of real deposits/transfers
- Several negative positions (rounding/corrections)
- INDIGO LP goes negative: -3.37 ETH
- Fee accounts tracked

**Test focus**: Large position tracking, negative LP position handling

---

### USDT Fund (46 transactions, $3.02M AUM)

**Huge scale test case**:
- Largest fund by AUM
- Most transactions (46)
- Most investors (18)
- Highest individual position: Monica +$840K

**Notable**:
- Sam Johnson: -$45K (negative despite deposits)
- Multiple negative positions
- Large numbers (not truncated in display)

**Test focus**: Large-scale data handling, number formatting, precision at millions scale

---

## Excel-to-Database Mapping

When loading Excel data into UI/database:

```
Excel Column A (Investment Date) → transactions_v2.tx_date
Excel Column B (Investor Name) → profiles.name (lookup) → investor_id
Excel Column C (Currency/Asset) → transactions_v2.asset / funds.asset_code
Excel Column D (Amount) → transactions_v2.amount
Excel Column E (Intro Broker Name) → profiles.name (IB lookup) → ib_parent_id
Excel Column F (IB Percentage) → profiles.ib_percentage
Excel Column G (Fee Percentage) → profiles.fee_pct
Excel Column H (Account Type) → profiles.account_type
Excel Column I (Transaction Type) → transactions_v2.tx_type (DEPOSIT, WITHDRAWAL, TRANSFER)
Excel Column J (Reference ID) → transactions_v2.reference_id (for idempotency)
```

---

## Success Criteria

### ✅ Data Accuracy
- All 198 transactions load correctly
- All balances match Excel sums
- No precision loss (to 8 decimal places)

### ✅ Edge Case Handling
- Negative positions don't error
- Large numbers display correctly
- Dust amounts tracked precisely

### ✅ UI Functionality
- Fund pages load all 8 funds
- Investor lists show all accounts
- Withdrawal flow works for all scenarios
- Filters/search work at scale

### ✅ Yield Calculations
- Fee/IB attribution shows correctly
- Yield allocation conserves total (gross = net + fee + ib)
- Crystallization before withdrawals works

---

## Next Steps

1. **Load this data into test database** (staging/QA)
2. **Verify each fund page** matches above balances
3. **Test withdrawal flow** for each scenario
4. **Validate yield calculations** against Excel
5. **Check precision** on dust amounts
6. **Performance test** with 3M+ AUM and 18 simultaneous investors

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-07  
**Owner**: Indigo Yield Platform Team  
**Ready for QA**: ✅ YES
