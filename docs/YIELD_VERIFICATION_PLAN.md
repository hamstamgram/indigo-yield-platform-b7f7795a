# Comprehensive Yield & Compounding Verification Plan

**Objective:** Reverse-engineer and verify ALL yield calculations, compounding logic, fee allocations, and IB commissions against the accounting Excel file to ensure platform math is 100% accurate.

---

## Accounting Excel Structure Analysis

### Source File: `/Users/mama/Downloads/Accounting Yield Funds.xlsx`

| Sheet | Purpose | Key Data |
|-------|---------|----------|
| **BTC Yield Fund** | Daily BTC yield tracking | AUM, Gross/Net Performance, Investor positions |
| **ETH Yield Fund** | Daily ETH yield tracking | AUM, Gross/Net Performance, Investor positions |
| **USDT Yield Fund** | Daily USDT yield tracking | AUM, Gross/Net Performance, Investor positions |
| **SOL Yield Fund** | Daily SOL yield tracking | AUM, Gross/Net Performance, Investor positions |
| **XRP Yield Fund** | Daily XRP yield tracking | AUM, Gross/Net Performance, Investor positions |
| **Investments** | All transactions | Date, Investor, Currency, Amount, USD Value |
| **Performances** | Monthly performance summary | Net Performance, APY, Indigo Fees per fund |
| **Report** | Investor reports | Beginning/Ending positions, period returns |

### Fund Sheet Structure (Row Layout)

```
Row 1: AUM Before        | Date columns →
Row 2: Top Up/Withdrawals| Values per date →
Row 3: AUM After         | Values per date →
Row 4: Gross Performance | Values per date →
Row 5: Net Performance   | Values per date →
Row 6: Yearly APY        | Values per date →
Row 7: Comments          | Notes per date →
Row 8: [Headers]         | Investors | Fees | IB | Dates →
Row 9+: [Investor rows]  | Name | Fee% | IB% | Position per date →
```

---

## Phase 1: Core Formula Verification

### 1.1 AUM Calculation Formula
```
AUM_After = AUM_Before + TopUp_Withdrawals
```

**Verification Query:**
```sql
-- For each fund, verify AUM progression
WITH daily_aum AS (
  SELECT
    f.code,
    t.tx_date,
    SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) as deposits,
    SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END) as withdrawals,
    SUM(t.amount) as net_flow
  FROM transactions_v2 t
  JOIN funds f ON t.fund_id = f.id
  WHERE NOT t.is_voided AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY f.code, t.tx_date
)
SELECT * FROM daily_aum ORDER BY code, tx_date;
```

### 1.2 Gross Performance Formula
```
Gross_Performance_% = (Closing_AUM - Opening_AUM) / Opening_AUM
                    = Gross_Yield / Opening_AUM
```

Where:
- `Opening_AUM` = AUM at start of period (before any transactions)
- `Closing_AUM` = AUM at end of period (before any transactions)
- `Gross_Yield` = Total yield generated = Closing - Opening

### 1.3 Net Performance Formula
```
Net_Performance_% = Gross_Performance_% × (1 - Weighted_Average_Fee_%)
```

Or equivalently:
```
Net_Yield = Gross_Yield - Total_Fees
Net_Performance_% = Net_Yield / Opening_AUM
```

### 1.4 Yearly APY Formula
```
Yearly_APY = Net_Performance_% × 12  (if monthly)
Yearly_APY = Net_Performance_% × 365 (if daily)
```

---

## Phase 2: Investor-Level Yield Allocation

### 2.1 Average Daily Balance (ADB) Method

The platform uses ADB for fair yield allocation:

```
Investor_ADB = Σ(Daily_Balance × Days_at_Balance) / Total_Days

Investor_Share = Investor_ADB / Total_ADB

Investor_Gross_Yield = Total_Gross_Yield × Investor_Share
```

### 2.2 Investor Fee Calculation
```
Investor_Fee = Investor_Gross_Yield × Investor_Fee_%
```

Fee rates from accounting:
| Investor | BTC | ETH | USDT | SOL | XRP |
|----------|-----|-----|------|-----|-----|
| Jose Molla | 20% | 20% | 20% | 20% | - |
| Babak Eftekhari | - | 18% | 18% | - | - |
| Sam Johnson | - | 16% | 16% | 16% | 16% |
| Paul Johnson | - | 13.5% | - | 13.5% | - |
| Most others | 10-20% | 10-20% | 10-20% | 10-20% | - |

### 2.3 IB Commission Calculation
```
IB_Commission = Investor_Fee × IB_%

Platform_Fee = Investor_Fee - IB_Commission
```

IB rates from accounting:
| Investor | IB Parent | IB % |
|----------|-----------|------|
| Babak Eftekhari | Lars Ahlgreen | 2% |
| Sam Johnson | Ryan Van Der Wall | 4% |
| Paul Johnson | Alex Jacobs | 1.5% |
| Advantage Blockchain | - | 2% |
| Ventures Life Style | - | 4% |

### 2.4 Net Yield to Investor
```
Investor_Net_Yield = Investor_Gross_Yield - Investor_Fee
```

### 2.5 Conservation Identity
```
Gross_Yield = Net_Yield + Fees + IB_Commission + Dust
```

Where `Dust` is rounding error (should be < 0.01)

---

## Phase 3: Position Compounding Verification

### 3.1 Position Update Formula
After yield distribution:
```
New_Position = Old_Position + Investor_Net_Yield
```

Or in multiplicative form:
```
New_Position = Old_Position × (1 + Investor_Net_Return_%)
```

Where:
```
Investor_Net_Return_% = Investor_Net_Yield / Old_Position
```

### 3.2 Verify Compounding Chain
For each investor, verify:
```
Final_Position = Initial_Deposit + Σ(All_Net_Yields) - Σ(All_Withdrawals) + Σ(Subsequent_Deposits)
```

### 3.3 Cross-Check with Ledger
```
Position = SUM(All_Transactions)
         = SUM(DEPOSITS) - SUM(WITHDRAWALS) + SUM(YIELD_CREDITS)
```

---

## Phase 4: Specific Verification Test Cases

### 4.1 BTC Yield Fund - Jose Molla
From Excel (BTC Yield Fund):
- Initial: 3.468 BTC (2024-06-12)
- Added: 0.745 BTC (2024-07-08)
- Fee: 20%
- Current position should reflect compounded yield

**Verify:**
1. Calculate expected yield from gross performance dates
2. Apply 20% fee
3. Compound position forward
4. Compare with Excel position columns

### 4.2 ETH Yield Fund - Babak Eftekhari
From Excel (ETH Yield Fund):
- Initial: 27.01 ETH + 32.25 ETH = 59.26 ETH
- Additional: 3.75 ETH, 3.1 ETH, etc.
- Fee: 18%
- IB: 2% to Lars Ahlgreen

**Verify:**
1. Track all deposits and their dates
2. Calculate ADB for each yield period
3. Apply 18% fee, 2% IB commission
4. Verify IB payment flows

### 4.3 USDT Yield Fund - Large Position Test
From Excel (USDT Yield Fund):
- Sam Johnson: $4,200,000 USDT
- Fee: 16%
- IB: 4% to Ryan Van Der Wall

**Verify:**
1. Calculate expected yield on $4.2M
2. Apply 16% fee ($X × 0.16)
3. IB gets 4% of fee
4. Platform gets 96% of fee
5. Sam gets net after fee

### 4.4 XRP Yield Fund - Full Cycle (Deposit → Yield → Withdrawal)
From Excel (XRP Yield Fund):
- Sam Johnson deposits 135,003 → 184,003 → 229,358 → etc.
- Final withdrawal: 330,500.42 XRP
- Historical yield created: 1,897.42 XRP

**Verify:**
```
Total_Withdrawals - Total_Deposits = Historical_Yield
330,500.42 - 328,603.00 = 1,897.42 ✓
```

---

## Phase 5: Performance Metrics Verification

### 5.1 Monthly Net Performance
From "Performances" sheet:
| Month | BTC Net | ETH Net | USDT Net | SOL Net | XRP Net |
|-------|---------|---------|----------|---------|---------|
| 2025-01 | 0.29% | 0.63% | 0.65% | - | - |

**Verify:** Platform monthly summaries match

### 5.2 Yearly APY Calculation
```
Monthly_APY = Net_Performance × 12
```

Example: If January BTC net = 0.29%, then APY = 3.48%

### 5.3 Cumulative Return
```
Cumulative = Π(1 + Monthly_Return) - 1
```

---

## Phase 6: Edge Case Verification

### 6.1 Mid-Period Deposit
When investor deposits mid-period:
1. Crystallize existing positions at deposit moment
2. Credit existing investors with accrued yield
3. Add new deposit
4. New investor earns yield only from deposit date

### 6.2 Mid-Period Withdrawal
When investor withdraws mid-period:
1. Crystallize positions at withdrawal moment
2. Credit withdrawing investor with accrued yield
3. Process withdrawal from updated position
4. Remaining investors continue earning

### 6.3 Zero AUM Days
When fund has 0 AUM:
- No yield calculation
- Division by zero protection
- First deposit creates fund

### 6.4 Negative Yield (Loss)
When fund has loss:
```
Gross_Performance < 0
Investor_Loss = Investor_Share × Total_Loss
New_Position = Old_Position + Investor_Loss (negative)
```

Platform should handle gracefully - from XRP data:
```
BTC TAC had negative: -0.43% gross, -0.35% net
```

---

## Phase 7: Implementation Verification Scripts

### 7.1 Extract Excel Data to JSON
```javascript
// Script to parse Excel and create verification datasets
const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/mama/Downloads/Accounting Yield Funds.xlsx');

// For each fund sheet, extract:
// - Date series
// - AUM progression
// - Gross/Net performance
// - Investor positions per date
```

### 7.2 SQL Verification Queries

**Query 1: Verify Gross Yield Matches AUM Change**
```sql
SELECT
  yd.id,
  f.code,
  yd.effective_date,
  yd.opening_aum,
  yd.closing_aum,
  yd.gross_yield_amount,
  (yd.closing_aum - yd.opening_aum) as calculated_gross,
  yd.gross_yield_amount - (yd.closing_aum - yd.opening_aum) as variance
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE NOT yd.is_voided
  AND ABS(yd.gross_yield_amount - (yd.closing_aum - yd.opening_aum)) > 0.01;
```

**Query 2: Verify Fee Calculations**
```sql
SELECT
  fa.id,
  CONCAT(p.first_name, ' ', p.last_name) as investor,
  f.code,
  fa.gross_amount,
  fa.fee_pct_applied,
  fa.fee_amount,
  fa.gross_amount * fa.fee_pct_applied / 100 as calculated_fee,
  fa.fee_amount - (fa.gross_amount * fa.fee_pct_applied / 100) as variance
FROM fee_allocations fa
JOIN profiles p ON fa.investor_id = p.id
JOIN funds f ON fa.fund_id = f.id
WHERE ABS(fa.fee_amount - (fa.gross_amount * fa.fee_pct_applied / 100)) > 0.0001;
```

**Query 3: Verify Conservation**
```sql
SELECT
  yd.id,
  f.code,
  yd.gross_yield_amount,
  yd.total_net_amount,
  yd.total_fee_amount,
  yd.dust_amount,
  yd.gross_yield_amount -
    (COALESCE(yd.total_net_amount, 0) +
     COALESCE(yd.total_fee_amount, 0) +
     COALESCE(yd.dust_amount, 0)) as conservation_error
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE NOT yd.is_voided
  AND ABS(yd.gross_yield_amount -
    (COALESCE(yd.total_net_amount, 0) +
     COALESCE(yd.total_fee_amount, 0) +
     COALESCE(yd.dust_amount, 0))) > 0.01;
```

---

## Phase 8: Automated Test Suite

### 8.1 Test File Structure
```
tests/
├── unit/
│   ├── yield-calculations.test.ts
│   ├── fee-calculations.test.ts
│   ├── ib-commission.test.ts
│   └── position-compounding.test.ts
├── integration/
│   └── accounting-verification.test.ts
└── fixtures/
    └── excel-extracted-data.json
```

### 8.2 Key Test Cases
```typescript
describe('Yield Calculations', () => {
  describe('Gross Performance', () => {
    it('should calculate gross performance as (closing - opening) / opening');
    it('should handle zero opening AUM');
    it('should handle negative performance');
  });

  describe('Net Performance', () => {
    it('should apply weighted average fee correctly');
    it('should match net = gross × (1 - fee%)');
  });

  describe('APY Calculation', () => {
    it('should annualize monthly returns correctly');
    it('should handle partial months');
  });
});

describe('Fee Calculations', () => {
  describe('Per-Investor Fees', () => {
    it('should apply correct fee % per investor');
    it('should use investor-specific fee from schedule');
    it('should default to fund fee if no schedule');
  });

  describe('IB Commission', () => {
    it('should calculate IB as fee × IB%');
    it('should route IB to correct parent');
    it('should handle investors without IB');
  });
});

describe('Position Compounding', () => {
  it('should compound positions correctly over time');
  it('should handle mid-period deposits');
  it('should handle mid-period withdrawals');
  it('should match ledger sum');
});
```

---

## Phase 9: Execution Checklist

### Step 1: Extract Excel Data
- [ ] Parse BTC Yield Fund sheet → JSON
- [ ] Parse ETH Yield Fund sheet → JSON
- [ ] Parse USDT Yield Fund sheet → JSON
- [ ] Parse SOL Yield Fund sheet → JSON
- [ ] Parse XRP Yield Fund sheet → JSON
- [ ] Parse Investments sheet → JSON
- [ ] Parse Performances sheet → JSON

### Step 2: Verify Core Formulas
- [ ] AUM progression matches transactions
- [ ] Gross performance = AUM change / opening AUM
- [ ] Net performance = gross × (1 - fee)
- [ ] APY = net × 12

### Step 3: Verify Investor Allocations
- [ ] ADB calculation correct
- [ ] Investor share = ADB / total ADB
- [ ] Investor gross = share × total gross
- [ ] Investor fee = gross × fee%
- [ ] Investor net = gross - fee

### Step 4: Verify IB Commissions
- [ ] IB commission = fee × IB%
- [ ] Platform fee = fee - IB
- [ ] IB routed to correct parent

### Step 5: Verify Position Compounding
- [ ] Position = deposits - withdrawals + yield
- [ ] Compounding matches Excel columns
- [ ] Final positions match current values

### Step 6: Verify Conservation
- [ ] gross = net + fee + dust
- [ ] No money created/destroyed
- [ ] Dust < 0.01

### Step 7: Create Test Suite
- [ ] Unit tests for formulas
- [ ] Integration tests with real data
- [ ] Fixtures from Excel extraction

### Step 8: Generate Verification Report
- [ ] Document all findings
- [ ] Flag any discrepancies
- [ ] Provide remediation steps

---

## Success Criteria

| Metric | Target | Tolerance |
|--------|--------|-----------|
| AUM progression accuracy | 100% | ±0.01 |
| Gross performance calculation | 100% | ±0.0001% |
| Net performance calculation | 100% | ±0.0001% |
| Fee calculation accuracy | 100% | ±0.01 |
| IB commission accuracy | 100% | ±0.01 |
| Position compounding | 100% | ±0.0001 |
| Conservation identity | 100% | ±0.01 |

---

## Key Files

| File | Purpose |
|------|---------|
| `/Users/mama/Downloads/Accounting Yield Funds.xlsx` | Source of truth |
| `docs/CFO_ACCOUNTING_GUIDE.md` | Platform accounting documentation |
| `tests/unit/yield-calculations.test.ts` | Formula unit tests |
| `tests/YIELD_VERIFICATION_REPORT.md` | Final verification report |

---

## Notes

1. **Date Format**: Excel dates are serial numbers (e.g., 45505 = 2024-08-01). Convert using:
   ```javascript
   const excelDateToJS = (serial) => new Date((serial - 25569) * 86400 * 1000);
   ```

2. **Fee Storage**: Platform stores fee as percentage (e.g., 20 = 20%), not decimal

3. **Rounding**: Platform uses 10 decimal places for crypto amounts

4. **Crystallization**: Platform crystallizes yield before every deposit/withdrawal to ensure fair allocation

5. **Historical Yield**: 15 YIELD transactions represent pre-platform accrued yield that was credited to match withdrawal amounts
