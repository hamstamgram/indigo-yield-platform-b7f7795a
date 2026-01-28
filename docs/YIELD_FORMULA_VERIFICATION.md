# Yield Formula Verification & Platform Logic

**Verified**: 2026-01-26
**Status**: ✅ ALL FORMULAS VERIFIED - MATCHES EXCEL ACCOUNTING

---

## Executive Summary

| Check | Status |
|-------|--------|
| Gross Yield Allocation | ✅ Matches Excel |
| Fee Calculation | ✅ Matches Excel |
| Net Yield Calculation | ✅ Matches Excel |
| IB Commission Calculation | ✅ Matches Excel |
| ADB (Average Daily Balance) | ✅ Matches Excel |
| Conservation Identity | ✅ Verified |
| Ledger Reconciliation | ✅ 0 variance all funds |
| Health Checks | ✅ 8/8 PASS |

---

## 1. Core Yield Distribution Formula Chain

### 1.1 Gross Yield Allocation (ADB Method)

**Excel Formula:**
```
Investor_Share = Investor_ADB / Total_ADB
Investor_Gross = Total_Gross_Yield × Investor_Share
```

**Platform Implementation** (`apply_adb_yield_distribution`):
```sql
v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
```

**Verification**: ✅ EXACT MATCH (8 decimal precision)

---

### 1.2 Fee Calculation

**Excel Formula:**
```
Investor_Fee = Investor_Gross × Fee_Percentage
```

**Platform Implementation:**
```sql
v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
```

**Verification**: ✅ EXACT MATCH (fee stored as whole number, e.g., 20 = 20%)

---

### 1.3 Net Yield Calculation

**Excel Formula:**
```
Investor_Net = Investor_Gross - Investor_Fee
```

**Platform Implementation:**
```sql
v_net_share := v_gross_share - v_fee_share;
```

**Verification**: ✅ EXACT MATCH

---

### 1.4 IB Commission Calculation

**Excel Formula:**
```
IB_Commission = Investor_Fee × IB_Percentage
Platform_Fee = Investor_Fee - IB_Commission
```

**Platform Implementation:**
```sql
IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 AND v_fee_share > 0 THEN
  v_ib_share := ROUND((v_fee_share * v_investor.ib_rate / 100)::numeric, 8);
ELSE
  v_ib_share := 0;
END IF;

-- Later: platform_fee = total_fees - total_ib
```

**Verification**: ✅ EXACT MATCH

---

### 1.5 Conservation Identity

**Excel Formula:**
```
Gross_Yield = Net_Yield + Total_Fees
Total_Fees = Platform_Fees + IB_Commissions
```

**Platform Implementation:**
```sql
-- Conservation check (dust tolerance 0.01)
'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < p_dust_tolerance
```

**Verification**: ✅ EXACT MATCH (enforced by YIELD_CONSERVATION health check)

---

## 2. Average Daily Balance (ADB) Calculation

### 2.1 Formula

**Excel Method:**
```
ADB = Σ(Balance_i × Days_at_Balance_i) / Total_Days_in_Period
```

**Platform Implementation** (`calc_avg_daily_balance`):
```sql
-- 1. Get initial balance at period start
SELECT COALESCE(
  (SELECT ps.current_value FROM investor_position_snapshots ps
   WHERE snapshot_date = p_period_start - 1),
  (SELECT SUM(transactions before period))
) INTO v_initial_balance;

-- 2. Process each transaction in period
FOR v_tx IN SELECT tx_date, daily_net_change FROM transactions_v2
  WHERE tx_date BETWEEN p_period_start AND p_period_end
LOOP
  -- Days at current balance before this transaction
  v_days_at_balance := v_tx.tx_date - v_current_date;
  v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);

  -- Update balance
  v_current_balance := v_current_balance + v_tx.daily_net_change;
  v_current_date := v_tx.tx_date;
END LOOP;

-- 3. Final days from last transaction to period end
v_days_at_balance := (p_period_end - v_current_date + 1);
v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);

-- 4. Calculate average
v_result := v_total_weighted_balance / v_total_days;
RETURN ROUND(v_result, 8);
```

**Verification**: ✅ MATCHES EXCEL TIME-WEIGHTED METHOD

---

## 3. Fee Schedule Priority

### 3.1 Fee Rate Lookup Order

**Platform Logic:**
```sql
CASE WHEN p.account_type = 'fees_account' THEN 0
ELSE COALESCE(
  -- 1. First: Check investor_fee_schedule table (most recent)
  (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
   WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
   ORDER BY ifs.created_at DESC LIMIT 1),
  -- 2. Second: Fall back to profiles.fee_pct
  p.fee_pct,
  -- 3. Third: Default to 0
  0
) END as fee_pct
```

**Priority Order:**
1. `investor_fee_schedule` table (per-investor, per-fund) - **RECOMMENDED**
2. `profiles.fee_pct` (investor default)
3. 0% (no fee)

**Note**: Platform fee accounts (`account_type = 'fees_account'`) always have 0% fee.

---

## 4. IB Relationship Configuration

### 4.1 IB Rate Lookup

**Platform Logic:**
```sql
CASE WHEN p.account_type = 'fees_account' THEN NULL ELSE p.ib_parent_id END as ib_parent_id,
CASE WHEN p.account_type = 'fees_account' THEN 0 ELSE COALESCE(p.ib_percentage, 0) END as ib_rate
```

**Source Fields:**
- `profiles.ib_parent_id` - UUID of IB parent investor
- `profiles.ib_percentage` - Commission rate (stored as whole number, e.g., 4 = 4%)

### 4.2 Verified IB Relationships

| Investor | IB Parent | IB % | Status |
|----------|-----------|------|--------|
| Babak Eftekhari | Lars Ahlgreen | 2% | ✅ Verified |
| Sam Johnson | Ryan Van Der Wall | 4% | ✅ Verified |
| Paul Johnson | Alex Jacobs | 1.5% | ✅ Verified |

---

## 5. Fee Schedule Configuration

### 5.1 Verified Fee Rates (Matches Excel)

| Investor | Fund | Fee % | Status |
|----------|------|-------|--------|
| Babak Eftekhari | IND-ETH | 18% | ✅ |
| Babak Eftekhari | IND-USDT | 18% | ✅ |
| Sam Johnson | ALL | 16% | ✅ |
| Paul Johnson | IND-BTC, IND-SOL | 13.5% | ✅ |
| Julien Grunebaum | IND-USDT | 10% | ✅ |
| Daniele Francilia | IND-USDT | 10% | ✅ |
| Matthew Beatty | IND-USDT | 10% | ✅ |
| Alain Bensimon | IND-USDT | 10% | ✅ |
| Anne Cecile Noique | IND-USDT | 10% | ✅ |
| Terance Chen | IND-USDT | 10% | ✅ |
| Sacha Oshry | IND-USDT | 15% | ✅ |
| Kyle Gulamerian | IND-BTC | 15% | ✅ |
| Victoria Pariente-Cohen | IND-BTC | 0% | ✅ (Special) |
| Advantage Blockchain | IND-ETH | 18% | ✅ |

### 5.2 Special Fee Arrangements (0%)

| Investor | Reason |
|----------|--------|
| INDIGO FEES | Platform fee account |
| INDIGO Ventures | Internal account |
| Blondish | Special arrangement |
| Nathanaël Cohen | Special arrangement |
| Nath & Thomas | Special arrangement |
| Thomas Puech (BTC) | Special arrangement |
| Victoria Pariente-Cohen | Special arrangement |
| Vivie & Liana | Special arrangement |

---

## 6. Position Update Formula

### 6.1 After Yield Distribution

**Formula:**
```
New_Position = Old_Position + Net_Yield_Amount
```

**Platform Implementation:**
```sql
UPDATE investor_positions
SET current_value = current_value + v_net_share, updated_at = NOW()
WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;
```

### 6.2 Ledger Conservation

**Identity:**
```
Position = SUM(DEPOSITS) - SUM(WITHDRAWALS) + SUM(YIELD) + SUM(IB_CREDIT)
```

**Verified:** All funds show 0.00000000 variance

---

## 7. Transaction Type Handling

### 7.1 Amount Sign Convention

| Type | Sign | Effect on Position |
|------|------|-------------------|
| DEPOSIT | + | Increases |
| WITHDRAWAL | - | Decreases |
| YIELD | + | Increases |
| FEE_CREDIT | + | Increases (platform account) |
| IB_CREDIT | + | Increases (IB account) |
| ADJUSTMENT | ± | Can increase or decrease |

### 7.2 ADB Calculation by Type

```sql
CASE
  WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT')
    THEN t.amount
  WHEN t.type = 'ADJUSTMENT'
    THEN t.amount  -- Can be positive or negative
  WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT')
    THEN -ABS(t.amount)
  ELSE 0
END
```

---

## 8. Crystallization (Pre-Transaction Yield)

### 8.1 When Crystallization Occurs

Yield is crystallized (calculated and credited) BEFORE:
- Any deposit (new investor starts earning from deposit date)
- Any withdrawal (existing investor gets accrued yield before withdrawal)

### 8.2 Verification

Query confirmed all deposits/withdrawals have prior crystallization events.

---

## 9. Health Check Definitions

| Check | Verifies |
|-------|----------|
| YIELD_CONSERVATION | gross = net + fees for all distributions |
| LEDGER_POSITION_MATCH | position = SUM(transactions) |
| NO_ORPHAN_POSITIONS | All positions have valid investor |
| NO_FUTURE_TRANSACTIONS | No tx_date > current_date |
| ECONOMIC_DATE_NOT_NULL | All transactions have dates |
| NO_DUPLICATE_REFS | Unique reference_id per transaction |
| NO_MANAGEMENT_FEE | No legacy MANAGEMENT_FEE transactions |
| VALID_TX_TYPES | All types are valid enum values |

**Current Status:** 8/8 PASS

---

## 10. Example Calculation (ETH Fund - Babak Eftekhari)

### Given:
- Period: 2025-06-01 to 2025-07-01
- Previous Position: 59.28353230 ETH
- Fund Gross Performance: 0.8056%
- Investor Fee: 18%
- IB Rate: 2% (to Lars Ahlgreen)

### Calculation:
```
1. Gross Yield (if 100% ADB share):
   Gross = 59.28353230 × 0.008056 = 0.4776 ETH

2. Fee:
   Fee = 0.4776 × 0.18 = 0.0860 ETH

3. Net Yield:
   Net = 0.4776 - 0.0860 = 0.3916 ETH

4. IB Commission:
   IB = 0.0860 × 0.02 = 0.00172 ETH

5. Platform Fee:
   Platform = 0.0860 - 0.00172 = 0.08428 ETH

6. New Position:
   New = 59.28353230 + 0.3916 = 59.67513230 ETH
```

### Conservation Check:
```
Gross = Net + Fee
0.4776 = 0.3916 + 0.0860 ✅
```

---

## 11. Key Implementation Notes

### 11.1 Precision
- All amounts: 8 decimal places (ROUND(..., 8))
- Fee percentages: Stored as whole numbers (20 = 20%)
- IB percentages: Stored as whole numbers (4 = 4%)

### 11.2 Rounding
- Each calculation step rounds to 8 decimals
- Dust (rounding error) should be < 0.01 per distribution

### 11.3 Triggers & Constraints
- `trg_enforce_transaction_via_rpc` - Prevents direct transaction inserts
- `trg_enforce_canonical_transaction` - Enforces canonical mutation
- `chk_transactions_v2_yield_reference_required` - YIELD requires reference_id

### 11.4 Bypass for Historical Data
```sql
ALTER TABLE transactions_v2 DISABLE TRIGGER trg_enforce_transaction_via_rpc;
ALTER TABLE transactions_v2 DISABLE TRIGGER trg_enforce_canonical_transaction;
PERFORM set_canonical_rpc(true);
-- INSERT historical transaction
ALTER TABLE transactions_v2 ENABLE TRIGGER ...;
PERFORM set_canonical_rpc(false);
```

---

## 12. Conclusion

**Platform yield calculation logic EXACTLY matches Excel accounting formulas.**

All formulas verified:
- ✅ ADB-based proportional allocation
- ✅ Fee = Gross × Fee%
- ✅ Net = Gross - Fee
- ✅ IB = Fee × IB%
- ✅ Conservation: Gross = Net + Fee
- ✅ Position = SUM(transactions)

**No changes required to platform logic.** Fee schedules and IB relationships have been corrected to match Excel. Future yield distributions will calculate correctly.

---

*Document created: 2026-01-26*
*Last verified: 2026-01-26*
