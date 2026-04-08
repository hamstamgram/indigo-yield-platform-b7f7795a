# Excel to Database Implementation Guide

**Goal**: Load all 198 transactions from Excel into the database and verify UI displays results identically to Excel.

**Files Created**:
1. `FUND_MAPPING_SOURCE_OF_TRUTH.md` - Complete fund and investor mapping
2. `UI_REPLAY_SCRIPT.md` - Step-by-step manual testing instructions
3. `fund_transactions_ledger.json` - All 198 transactions in JSON format
4. `fund_transactions_ledger.csv` - All 198 transactions in CSV format
5. This guide - Implementation mapping

---

## Part 1: Data Model

### Profiles (Investors & IB Partners)

From Excel data, extract unique names and map to profiles:

```
Excel Column B: Investor Name → profiles.id, profiles.email, profiles.name

Key Profiles to Create:
  1. Sam Johnson
     - account_type: investor
     - fee_pct: 0.16 (16%)
     - ib_parent_id: [Ryan Van Der Wall ID] (for XRP fund)
     - Appears in: XRP, SOL, ETH, USDT
  
  2. Ryan Van Der Wall
     - account_type: ib
     - fee_pct: 0
     - ib_parent_id: NULL
     - ib_percentage: 0.04 (4% IB commission)
     - Appears as: IB for Sam Johnson in XRP
  
  3. Paul Johnson
     - account_type: investor
     - fee_pct: 0.16
     - ib_parent_id: [Alex Jacobs ID]
     - Appears in: SOL, ETH, BTC
  
  4. Alex Jacobs
     - account_type: ib
     - fee_pct: 0
     - ib_parent_id: NULL
     - ib_percentage: 0.04
     - Appears as: IB for Paul Johnson in SOL
  
  5. INDIGO DIGITAL ASSET FUND LP
     - account_type: investor (or special: lp_investor)
     - fee_pct: 0 (LP has no management fee)
     - ib_parent_id: NULL
     - Appears in: ETH, SOL, USDT
  
  6. INDIGO Fees
     - account_type: fees_account
     - fee_pct: 0
     - ib_parent_id: NULL
     - Purpose: Collects platform fees
     - Appears in: BTC, ETH TAC
  
  [+ 20+ more investors from Excel Column B]
```

### Funds (Assets)

Create one fund per asset:

```
funds table:

fund_id                 asset       status      fee_bps
xrp-fund-001            XRP         active      0 (check constraint)
sol-fund-001            SOL         active      0
btc-fund-001            BTC         active      0
eth-fund-001            ETH         active      0
usdt-fund-001           USDT        active      0
btc-tac-fund-001        BTC TAC     active      0
eth-tac-fund-001        ETH TAC     active      0
btc-boost-fund-001      BTC Boost   active      0
```

### Fee Templates (Fund-Level Allocation Rules)

```
fund_fee_templates table:

For XRP Fund:
  fund_id: xrp-fund-001
  ib_percent: 0.04 (4%)
  fees_percent: 0.16 (16%)
  investor_percent: 0.80 (80%)
  effective_from: 2025-06-12 (first transaction date)

For SOL Fund:
  fund_id: sol-fund-001
  ib_percent: 0.04 (from Paul's transactions)
  fees_percent: 0.16 (from Paul's transactions)
  investor_percent: 0.80
  effective_from: 2025-06-24 (Paul's deposit date)
```

---

## Part 2: Transaction Loading

### Load Method: SQL INSERT from Excel Data

Reference: `fund_transactions_ledger.json` (all 198 transactions)

#### Basic Structure

```sql
INSERT INTO transactions_v2 (
  id,
  investor_id,
  fund_id,
  amount,
  tx_date,
  tx_type,
  visibility_scope,
  reference_id,
  created_at,
  asset
) VALUES (
  gen_random_uuid(),  -- Unique transaction ID
  (SELECT id FROM profiles WHERE name = 'Sam Johnson' LIMIT 1),  -- Lookup investor
  (SELECT id FROM funds WHERE asset_code = 'XRP' LIMIT 1),       -- Lookup fund
  135003.00,          -- Amount from Excel Column D
  '2025-06-12',       -- Date from Excel Column A
  'DEPOSIT',          -- Type from Excel Column I (or 'TRANSFER' if null)
  'investor_visible', -- Who can see it
  'xrp-sam-135003-2025-06-12',  -- Reference ID (idempotency key)
  NOW(),
  'XRP'
);
```

#### Processing Order

Process transactions in date order (Excel column A) to maintain running balance accuracy:

```
1. Group by date
2. Sort by asset (alphabetically) within each date
3. Load in order
4. Verify investor_positions updates via trigger after each
```

---

## Part 3: Running Balance Verification

### Track Expected Position After Each Transaction

For XRP Fund (Sam Johnson):

```
After Tx 1 (2025-06-12, +135,003):
  investor_positions.current_value = 135,003.00
  
After Tx 2 (2025-06-20, +49,000):
  investor_positions.current_value = 184,003.00
  
After Tx 3 (2025-06-25, +45,000):
  investor_positions.current_value = 229,003.00
  
After Tx 4 (2025-07-03, +49,500):
  investor_positions.current_value = 278,503.00
  
After Tx 5 (2025-07-10, +50,100):
  investor_positions.current_value = 328,603.00
  
After Tx 6 (2025-07-28, -330,500.42):
  investor_positions.current_value = -1,897.42  ❌ NEGATIVE

After Tx 7 (2025-11-17, +135,003):
  investor_positions.current_value = 133,105.58  ✓ RECOVERED
  
After Tx 8 (2025-11-25, +49,000):
  investor_positions.current_value = 182,105.58  ✓ FINAL
```

### Verification Query

```sql
-- Check current position for Sam Johnson in XRP
SELECT 
  i.investor_id,
  p.name as investor_name,
  i.fund_id,
  f.asset_code,
  i.current_value,
  SUM(t.amount) as ledger_sum
FROM investor_positions i
JOIN profiles p ON i.investor_id = p.id
JOIN funds f ON i.fund_id = f.id
LEFT JOIN transactions_v2 t ON (
  i.investor_id = t.investor_id 
  AND i.fund_id = t.fund_id
)
WHERE f.asset_code = 'XRP' 
  AND p.name = 'Sam Johnson'
GROUP BY i.investor_id, p.name, i.fund_id, f.asset_code, i.current_value
HAVING i.current_value = SUM(t.amount);  -- Should match exactly

-- Expected result:
-- investor_id | investor_name | fund_id | asset_code | current_value | ledger_sum
-- [id]        | Sam Johnson   | [id]    | XRP        | 182105.58     | 182105.58 ✓
```

---

## Part 4: Yield & Fee Allocation (Future)

### When Yield Distribution Implemented

Each fund will need yield allocation logic. Template:

```sql
-- For XRP Fund (monthly crystallization)
-- Date: 2025-11-30 (month-end)
-- Prior AUM: 328,603 XRP (from last transaction before yield)
-- New AUM: 329,000 XRP (simulated growth, 397 XRP yield)

-- Expected allocation (16% fee, 4% IB, 80% investor):
-- Investor (Sam): 397 * 0.80 = 317.60 XRP
-- INDIGO Fee: 397 * 0.16 = 63.52 XRP
-- IB (Ryan): 397 * 0.04 = 15.88 XRP
-- Total: 317.60 + 63.52 + 15.88 = 397.00 ✓

INSERT INTO yield_distributions (
  id, fund_id, distribution_date, gross_yield, status, created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM funds WHERE asset_code = 'XRP'),
  '2025-11-30',
  397.00,
  'applied',
  NOW()
);
```

---

## Part 5: UI Verification Checklist

### Fund Pages (/admin/funds)

- [ ] All 8 funds load (BTC, BTC Boost, BTC TAC, ETH, ETH TAC, SOL, USDT, XRP)
- [ ] Fund AUM displays correctly:
  - BTC: 39.08
  - ETH: 745.33
  - SOL: 1,233.68
  - USDT: 3,018,875.20
  - XRP: 182,105.58
  - (Others have negative AUM)
- [ ] Negative AUM funds display (not hidden/errors)
- [ ] Total investors count accurate
- [ ] Click-through to investor detail works

### Investor Detail Pages

For each investor, verify:

**Sam Johnson (XRP)**:
- [ ] Shows XRP position: 182,105.58
- [ ] Lists all 8 transactions in order
- [ ] IB attribution: Ryan Van Der Wall
- [ ] Fee %: 16% visible
- [ ] Negative position history visible (was -1,897.42 on 2025-07-28)

**Paul Johnson (SOL)**:
- [ ] Shows SOL position: -1.85 (NEGATIVE)
- [ ] Shows 2 transactions: +234.17 (deposit), -236.02 (withdrawal)
- [ ] IB attribution: Alex Jacobs
- [ ] Fee %: 16%
- [ ] Withdrawal not blocked despite exceeding deposit

**Jose Molla (Multi-fund)**:
- [ ] Appears in BTC (+7.33), ETH TAC (+/-62.63), SOL (+481.75), USDT (+/-97695)
- [ ] Each position calculated correctly
- [ ] Cross-fund balances maintained

**INDIGO DIGITAL ASSET FUND LP (LP Investor)**:
- [ ] Appears as account_type: investor (or special)
- [ ] ETH position: -3.37 (NEGATIVE LP)
- [ ] SOL position: -35.66 (NEGATIVE LP)
- [ ] USDT position: -2,471.65 (NEGATIVE LP)
- [ ] Fee %: 0% (no management fee on LP)

### Transaction History (/admin/transactions)

- [ ] All 198 transactions load
- [ ] Filterable by fund, investor, date
- [ ] Sorted by date (oldest first)
- [ ] Large amounts display without truncation (e.g., 4.2M USDT)
- [ ] Negative amounts show with minus sign
- [ ] Reference IDs visible (for idempotency checking)

### Withdrawal Testing

**Test Case**: Simulate Paul Johnson SOL withdrawal

```
Input: Investor requests 100 SOL withdrawal
Current balance: -1.85 SOL

Expected behavior:
  Option A: Reject (insufficient funds - negative already)
  Option B: Allow, resulting balance: -101.85 SOL
  
Excel shows: Paul made withdrawal after negative, so system allows it
UI should: Allow negative withdrawals (matches Excel)
```

---

## Part 6: Edge Cases to Handle

### 1. Negative Positions

**Issue**: Many investors have negative final balances.

**Root causes**:
- Withdrawal amount > deposit amount (Paul, SOL)
- Complex transfer sequences with rounding (BTC fund)
- LP withdrawals > deposits (INDIGO LP in multiple funds)

**UI Handling**:
- [ ] Display negative balances (not hidden)
- [ ] Include in fund AUM calculations
- [ ] Don't block transactions to negative accounts
- [ ] Show status as "NEGATIVE" or similar

### 2. Very Small Amounts (Dust)

**Examples**:
- Sam Johnson (BTC): -0.0152
- Paul Johnson (BTC): -0.0013
- Victoria Pariente-Cohen (BTC TAC): +0.0008

**UI Handling**:
- [ ] Display to 8 decimal places
- [ ] Don't round to zero
- [ ] Don't hide from displays
- [ ] Include in AUM calculations

### 3. Large Amounts (Millions)

**Examples**:
- Sam Johnson (USDT): $4.2M, $7M+ withdrawals
- Monica Levy Chicheportiche (USDT): $840K+

**UI Handling**:
- [ ] Format with commas: $4,200,000
- [ ] No truncation/overflow
- [ ] Display all decimals if relevant
- [ ] Search/filter works with large numbers

### 4. Multi-Fund Investors

**Sam Johnson** appears in:
- XRP: 182,105.58
- SOL: -37.10
- ETH: -1.23
- USDT: -45,353.80

**UI Handling**:
- [ ] Portfolio view shows all positions
- [ ] Cross-fund balances correct
- [ ] Total net position calculated correctly
- [ ] Per-fund views show only that fund

### 5. Fee/IB Attribution

**Scenario**: Withdrawal with fee/IB structure

Current behavior (Excel):
- Raw withdrawal amount applied (not reduced by fees)

**Clarification needed**:
- [ ] Are fees/IB applied on withdrawal? (YES/NO)
- [ ] If YES, how is deduction calculated?
- [ ] If NO, are fees/IB applied only on deposits?

---

## Part 7: SQL Verification Queries

Run these queries to verify data integrity:

### 1. Transaction Count
```sql
SELECT fund_id, COUNT(*) as tx_count
FROM transactions_v2
GROUP BY fund_id
ORDER BY tx_count DESC;

-- Expected:
-- usdt-fund-001: 46
-- btc-fund-001: 60
-- eth-fund-001: 47
-- sol-fund-001: 13
-- xrp-fund-001: 8
-- ... etc
```

### 2. Fund AUM Reconciliation
```sql
SELECT 
  f.asset_code,
  SUM(ip.current_value) as total_aum,
  COUNT(DISTINCT ip.investor_id) as investor_count
FROM funds f
LEFT JOIN investor_positions ip ON f.id = ip.fund_id
GROUP BY f.asset_code
ORDER BY f.asset_code;

-- Expected (XRP example):
-- asset_code | total_aum    | investor_count
-- XRP        | 182105.58    | 1
```

### 3. Investor Balance Verification
```sql
SELECT 
  p.name as investor_name,
  f.asset_code,
  ip.current_value as position_balance,
  SUM(t.amount) as ledger_sum
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON (
  ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
)
GROUP BY p.name, f.asset_code, ip.current_value
HAVING ip.current_value != SUM(t.amount);  -- Shows mismatches

-- If empty: All positions reconcile correctly ✓
-- If results: Position != ledger sum, investigate trigger
```

### 4. Negative Position Check
```sql
SELECT 
  p.name,
  f.asset_code,
  ip.current_value
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value < 0
ORDER BY ip.current_value ASC;

-- Expected to return many rows (negative positions exist)
-- Verify system doesn't reject these
```

---

## Part 8: Final Sign-Off

- [ ] All 198 transactions loaded into database
- [ ] All 8 funds appear in UI
- [ ] All investor balances match Excel sums
- [ ] Negative positions display correctly
- [ ] Large numbers format correctly
- [ ] Fund AUM reconciles (sum of positions = fund total)
- [ ] No data loss or rounding errors
- [ ] Withdrawal flow works for all scenarios
- [ ] Fee/IB attribution visible where applicable
- [ ] Negative positions included in AUM calculations

**Status**: ✅ READY FOR YIELD LAUNCH / ❌ ISSUES FOUND

---

## Reference

**Files in this package**:
1. `FUND_MAPPING_SOURCE_OF_TRUTH.md` - Human-readable fund mapping
2. `UI_REPLAY_SCRIPT.md` - Step-by-step manual testing guide
3. `fund_transactions_ledger.json` - All transactions (JSON)
4. `fund_transactions_ledger.csv` - All transactions (CSV)
5. `EXCEL_TO_DATABASE_IMPLEMENTATION.md` - This guide

**Excel Source**: `/Users/mama/Downloads/indigo-yield-platform-v01-main/Accounting Yield Funds (6).xlsx`

**Generated**: 2026-04-07
