# UI Replay Script — Excel-to-UI Verification

**Purpose**: Step-by-step instructions to replay every fund transaction in the UI and verify results match Excel exactly.

**Execution**: Perform these steps in order. Pause and document any mismatch between Excel and UI.

---

## Pre-Flight Checklist

- [ ] Access admin dashboard at `/admin`
- [ ] Ensure you're logged in as `qa.admin@indigo.fund` (QaTest2026!)
- [ ] Open Excel file side-by-side: `Accounting Yield Funds (6).xlsx`
- [ ] Have this document ready for checkmarks

---

## Fund 1: XRP Fund (Highest Priority)

### Test Case: Negative Position Edge Case

**Why this test**: This fund has a major withdrawal that exceeds deposits, leaving a negative position. Critical for edge case handling.

#### Step 1.1: Verify Fund Exists
```
UI: Go to /admin/funds
Expected: XRP fund appears in list with:
  - Asset: XRP
  - Final AUM: 182,105.58
  - Investors: 1 (Sam Johnson)
  
[ ] XRP fund exists
[ ] AUM matches
[ ] Investor count matches
```

#### Step 1.2: View Investor Sam Johnson
```
UI: Click on XRP fund → View Investors
Expected: Single investor: Sam Johnson

Excel Check:
  - All 8 transactions are for Sam Johnson ✓
  - No other investors ✓

[ ] Sam Johnson appears
[ ] No other investors present
```

#### Step 1.3: Verify Deposit Sequence
```
UI: View transaction history or investor transactions
Expected order and amounts:

Date       Amount       Running Balance      IB: Ryan    Fee: 16%
45978  +135,003.00     +135,003.00        Van Der Wall
45986   +49,000.00     +184,003.00
45991   +45,000.00     +229,003.00
45999   +49,500.00     +278,503.00
46006   +50,100.00     +328,603.00

[ ] All 5 deposits appear
[ ] Amounts match exactly
[ ] Running balance calculated correctly
[ ] IB and Fee % shown for first transaction
```

#### Step 1.4: CRITICAL - Verify Withdrawal Creates Negative Position
```
UI: View transaction for date 46024

Expected:
  - Amount: -330,500.42 XRP
  - Result: -1,897.42 XRP (NEGATIVE)
  - Status: Should NOT be blocked/rejected
  - Sam's position: NEGATIVE (allow this state)

Critical checks:
[ ] Withdrawal amount is -330,500.42 (not modified/rejected)
[ ] Resulting position shows -1,897.42
[ ] Negative position doesn't trigger error
[ ] UI allows negative balances (edge case)
[ ] No "insufficient funds" block
```

#### Step 1.5: Verify Recovery Deposits
```
UI: Look for transactions after 46024

Expected (later dates):
  2025-11-17: +135,003.00 → New balance: 133,105.58
  2025-11-25: +49,000.00  → New balance: 182,105.58

[ ] Recovery deposit 1 appears (+135,003)
[ ] Balance corrects to +133,105.58
[ ] Recovery deposit 2 appears (+49,000)
[ ] Final balance: 182,105.58 ✓
```

#### Step 1.6: Final Sam Johnson Balance
```
UI: Check investor detail page for Sam Johnson

Expected final balance:
  182,105.58 XRP
  
Calculation from Excel:
  135,003 + 49,000 + 45,000 + 49,500 + 50,100 - 330,500.42 + 135,003 + 49,000
  = 182,105.58 ✓

[ ] Final balance: 182,105.58 XRP
[ ] All transactions sum to this amount
[ ] Precision maintained to 8 decimals
```

**XRP Fund Status**: ✅ PASS / ❌ FAIL
_If FAIL, document differences below:_

```
Mismatch observed:
- Expected: [field], Got: [actual value]
- Issue: [description]
- Screenshot: [location]
```

---

## Fund 2: SOL Fund (Multiple Investor Types)

### Test Case: Mixed Fee Structures + Negative Positions

**Why this test**: Tests IB attribution, fee calculation, and handling of multiple investor types with different rules.

#### Step 2.1: Fund Overview
```
UI: /admin/funds → SOL fund

Expected:
  - Final AUM: 1,233.68 SOL
  - Investors: 5 total
  
Excel validation:
  INDIGO DIGITAL ASSET FUND LP: -35.66 (NEGATIVE)
  Paul Johnson:                -1.85 (NEGATIVE)
  Jose Molla:                 +481.75 (ACTIVE)
  Sam Johnson:                -37.10 (NEGATIVE)
  ALOK PAVAN BATRA:          +826.54 (ACTIVE)
  Total:                    +1,233.68 ✓

[ ] Fund AUM: 1,233.68 SOL
[ ] 5 investors listed
```

#### Step 2.2: Investor #1 - INDIGO DIGITAL ASSET FUND LP (LP Investor)
```
UI: View investor detail

Expected activity:
  45902: +1,250.00 SOL (DEPOSIT) → Balance: +1,250.00
  45995: -1,285.66 SOL (WITHDRAWAL) → Balance: -35.66

Final balance: -35.66 SOL (NEGATIVE LP position)

Verify:
  [ ] Shows as "INDIGO DIGITAL ASSET FUND LP"
  [ ] Account type: investor (or special LP type)
  [ ] Fee %: 0% (or none)
  [ ] IB: None
  [ ] Transactions show:
      - 45902: +1,250.00
      - 45995: -1,285.66
  [ ] Final balance: -35.66 (NEGATIVE - allowed)
```

#### Step 2.3: Investor #2 - Paul Johnson (Regular Investor with IB)
```
UI: View investor detail

Expected activity:
  45904: +234.17 SOL (DEPOSIT)
    - IB: Alex Jacobs
    - IB %: 4%
    - Fee %: 16%
    - Running balance: +234.17

  45933: -236.02 SOL (WITHDRAWAL)
    - IB: Alex Jacobs (same)
    - Fee %: 16% (same)
    - Running balance: -1.85 (NEGATIVE)

Final balance: -1.85 SOL (NEGATIVE - edge case)

Critical verifications:
  [ ] Name: "Paul Johnson"
  [ ] Account type: "investor"
  [ ] Fee %: 16% (not 0%, not other)
  [ ] IB attribution: "Alex Jacobs"
  [ ] IB %: 4% (or shown in breakdown)
  
  [ ] Deposit (45904):
      - Amount: 234.17 SOL
      - IB/Fee visible
  
  [ ] Withdrawal (45933):
      - Amount: -236.02 SOL (not recalculated with fees)
      - Exceeds deposit by ~1.85
  
  [ ] Final: -1.85 SOL (NEGATIVE state allowed)
  
  Question: If fees/IB are deducted on withdrawal:
    - Gross withdrawal: -236.02
    - After 16% fee: -236.02 * 0.84 = -198.26
    - After 4% IB: -236.02 * 0.96 = -226.58
    - (These are examples - verify actual calculation)
    
  RECORD THE ACTUAL CALCULATION METHOD
```

#### Step 2.4: Investor #3 - Jose Molla (No IB/Fee Info)
```
UI: View investor detail

Expected:
  45953: +87.98 SOL (TRANSFER) → Balance: +87.98
  46065: +393.77 SOL (TRANSFER) → Balance: +481.75

Final: +481.75 SOL (ACTIVE)

Verify:
  [ ] Name: "Jose Molla"
  [ ] No IB attached (or shows "-")
  [ ] No fee % specified (or shows 0% default)
  [ ] Both transactions appear
  [ ] Final balance: +481.75
```

#### Step 2.5: Investor #4 - Sam Johnson (Large Activity)
```
UI: View investor detail

Expected activity (4 deposits, 1 withdrawal):
  45978: +1,800.05 SOL → Balance: +1,800.05
  45986: +750.00 SOL  → Balance: +2,550.05
  45991: +750.00 SOL  → Balance: +3,300.05
  45999: +770.00 SOL  → Balance: +4,070.05
  46006: +766.00 SOL  → Balance: +4,836.05
  46024: -4,873.15 SOL → Balance: -37.10 (NEGATIVE)

Final: -37.10 SOL (NEGATIVE position)

Verify:
  [ ] 5 transactions total
  [ ] Final balance: -37.10 (NEGATIVE)
  [ ] All amounts match Excel exactly
  [ ] No "insufficient funds" error on withdrawal
```

#### Step 2.6: Investor #5 - ALOK PAVAN BATRA (New Investor)
```
UI: View investor detail

Expected:
  46065: +826.54 SOL (TRANSFER) → Balance: +826.54

Final: +826.54 SOL (ACTIVE, single large position)

Verify:
  [ ] Name appears: "ALOK PAVAN BATRA"
  [ ] Single transaction: 46065
  [ ] Amount: +826.54
  [ ] Final balance: +826.54 ✓
```

#### Step 2.7: Fund AUM Reconciliation
```
UI: Check fund total AUM

Manual sum:
  -35.66 (INDIGO LP)
  -1.85 (Paul Johnson)
  +481.75 (Jose Molla)
  -37.10 (Sam Johnson)
  +826.54 (ALOK PAVAN BATRA)
  = 1,233.68 SOL ✓

Verify:
  [ ] Fund AUM displayed: 1,233.68 SOL
  [ ] Matches sum of all investor balances
  [ ] Negative positions included in total
```

**SOL Fund Status**: ✅ PASS / ❌ FAIL
_Document any mismatches:_

```
Issues found:
1. [Description]
   Excel expected: [value]
   UI shows: [value]
   
2. [Description]
   ...
```

---

## Fund 3: BTC Fund (Dust Verification)

### Test Case: Small Amounts & Rounding Precision

**Why**: Tests 8-decimal precision with very small amounts.

#### Step 3.1: Quick Overview
```
UI: /admin/funds → BTC fund

Expected:
  - Final AUM: 39.08 BTC (not 39.07)
  - Investors: 12
  
Check sum:
  Sum all investor balances from Excel = 39.07656343 BTC
  
  [ ] Fund AUM: 39.08 BTC (rounded, or full precision 39.07656343?)
  [ ] Investor count: 12
```

#### Step 3.2: Find Smallest Positions (Dust)
```
UI: List all investors by balance

Excel dust amounts to verify:
  - Sam Johnson: -0.01520000 (NEGATIVE - very small)
  - Paul Johnson: -0.00130000 (NEGATIVE - dust)
  - Vivie & Liana: -0.01110000 (NEGATIVE - dust)
  - Danielle Richetta: -0.09630000 (NEGATIVE)
  - Matthias Reiser: -0.20550000 (NEGATIVE)
  - danielle Richetta: -0.13000000 (NEGATIVE)

Critical precision checks:
  [ ] Dust amounts display (not hidden/rounded to 0)
  [ ] Precision to 8 decimals maintained
  [ ] Negative dust amounts appear correctly
  [ ] No "balance too small" errors
```

#### Step 3.3: Verify INDIGO Fees Account
```
UI: Search for investor "INDIGO Fees"

Expected:
  - Single transaction: 45763
  - Amount: +0.0498 BTC
  - Final balance: +0.0498 BTC

Verify:
  [ ] "INDIGO Fees" investor appears
  [ ] Account type: special (fees_account)
  [ ] Amount: 0.0498 BTC (very small, management fee)
  [ ] This is a collected fee from fund operations
```

#### Step 3.4: Sum All Investor Balances
```
UI: Calculate or export total

Excel sum: 39.07656343 BTC

Verify:
  [ ] All 12 investors listed
  [ ] Sum of all balances = 39.07656343 (or 39.08 rounded)
  [ ] Matches fund AUM
```

**BTC Fund Status**: ✅ PASS / ❌ FAIL

---

## Fund 4: USDT Fund (Large Scale)

### Test Case: Large AUM, Many Investors, Performance

#### Step 4.1: Fund Overview
```
UI: /admin/funds → USDT

Expected:
  - Final AUM: $3,018,875.20 USDT
  - Investors: 18
  - Transactions: 46
  
Verify:
  [ ] Fund shows in list
  [ ] AUM: $3,018,875.20 (exact)
  [ ] 18 investors
```

#### Step 4.2: Largest Position
```
UI: List investors by balance, sort descending

Expected top:
  Monica Levy Chicheportiche: +$840,168.03 (single large deposit)

Verify:
  [ ] Appears first in sorted list
  [ ] Amount: $840,168.03 (large number displays correctly)
  [ ] No truncation/overflow
  [ ] Only 1 transaction (45968)
```

#### Step 4.3: Negative Positions in USDT
```
UI: Find negative balances

Expected negatives:
  - Daniele Francilia: -$5,091.59
  - Nath & Thomas: -$1,522.83
  - INDIGO DIGITAL ASSET FUND LP: -$2,471.65
  - INDIGO Fees: -$20,000.00
  - Jose Molla: -$213.00
  - Sam Johnson: -$45,353.80
  - Thomas Puech: -$47,373.77

Verify:
  [ ] All 7 negative positions appear
  [ ] All amounts match exactly
  [ ] Included in fund AUM calculation
```

#### Step 4.4: Reconcile Fund Total
```
Manual calculation from Excel:
  Sum of all 18 investor final balances = $3,018,875.20

Verify:
  [ ] Fund total: $3,018,875.20
  [ ] Matches sum
  [ ] No rounding errors
```

**USDT Fund Status**: ✅ PASS / ❌ FAIL

---

## Fund 5: ETH Fund

### Test Case: Mixed Activity, Multiple Transaction Types

#### Step 5.1: Quick Stats
```
Expected:
  - Final AUM: 745.33 ETH
  - Investors: 10
  - Transactions: 47
  
[ ] All match
```

#### Step 5.2: Test INDIGO LP Position
```
UI: Find "INDIGO DIGITAL ASSET FUND LP"

Expected:
  - 45803: +175.00 ETH (DEPOSIT)
  - 45868: -178.37 ETH (WITHDRAWAL)
  - Final: -3.37 ETH (NEGATIVE)

Verify:
  [ ] Both transactions show
  [ ] Exact amounts: +175.00, -178.37
  [ ] Final: -3.37 (NEGATIVE LP position allowed)
```

#### Step 5.3: Check Fund Total
```
[ ] Fund AUM: 745.33 ETH
[ ] 10 investors listed
```

**ETH Fund Status**: ✅ PASS / ❌ FAIL

---

## Funds 6-8: Quick Pass/Fail

### BTC TAC, ETH TAC, BTC Boost (Negative Funds)

These 3 funds have **negative total AUM** - unusual but important for edge case handling.

```
BTC TAC:
  [ ] Fund AUM: -6.67 BTC TAC (NEGATIVE)
  [ ] Shows despite being underwater
  [ ] 3 investors with mixed balances

ETH TAC:
  [ ] Fund AUM: -1.66 ETH TAC (NEGATIVE)
  [ ] 4 investors
  [ ] Appears in fund list

BTC Boost:
  [ ] Fund AUM: -0.45 BTC Boost (NEGATIVE)
  [ ] 4 investors
  [ ] All have negative balances
  
Critical: Can UI display negative-AUM funds without errors?
  [ ] Yes - all funds appear
  [ ] No - missing from list
  [ ] Partially - appear but with errors
```

---

## Summary & Sign-Off

### Verification Matrix

| Fund | Status | Investors | AUM Matches | Edge Cases | Notes |
|------|--------|-----------|-------------|-----------|-------|
| XRP | ✅/❌ | / 1 | | Negative pos | |
| SOL | ✅/❌ | / 5 | | Neg + IB attr | |
| BTC | ✅/❌ | / 12 | | Dust amounts | |
| ETH | ✅/❌ | / 10 | | Neg LP | |
| USDT | ✅/❌ | / 18 | | Large scale | |
| BTC TAC | ✅/❌ | / 3 | | Neg fund | |
| ETH TAC | ✅/❌ | / 4 | | Neg fund | |
| BTC Boost | ✅/❌ | / 4 | | Neg fund | |

### Critical Findings

List all mismatches found:

```
Fund: [Name]
Mismatch: [What didn't match]
  Excel expected: [value]
  UI showed: [value]
  Severity: BLOCKING / HIGH / MEDIUM / LOW
  
---
```

### Overall Assessment

- [ ] **PASS**: All funds verified, Excel matches UI exactly
- [ ] **CONDITIONAL PASS**: Minor issues found, none blocking
- [ ] **FAIL**: Critical issues prevent launch
- [ ] **FAIL - NEEDS REDESIGN**: Architecture issues

---

**Execution Date**: _________  
**Tester Name**: _________  
**Sign-off**: _________
