# Excel Mapping Package — Complete Guide

## What You Have Now

This package contains everything needed to verify that the Indigo Yield Platform UI displays and processes fund data identically to the Excel source.

### The 5 Documents

#### 1. **FUND_MAPPING_SOURCE_OF_TRUTH.md**
**What**: Complete inventory of all 8 funds with 198 transactions

**Contains**:
- Fund summary (AUM, investor count, date range)
- Detailed transaction sequence for each fund
- Running balances showing state after each transaction
- Final balances for every investor
- Key test scenarios (negative positions, withdrawals, dust)
- Success criteria for UI testing

**Use case**: Understand the complete data picture, identify test priorities

---

#### 2. **UI_REPLAY_SCRIPT.md**
**What**: Step-by-step manual testing instructions

**Contains**:
- Pre-flight checklist
- 5 detailed test cases (one per major fund):
  - XRP: Negative position edge case
  - SOL: Multiple investor types + IB attribution
  - BTC: Dust/rounding precision
  - ETH: Mixed activity
  - USDT: Large scale (millions, 18 investors)
- Quick pass/fail for remaining funds
- Summary verification matrix
- Sign-off section

**Use case**: Run through UI manually, verify each fund displays correctly

**How to execute**:
1. Open Excel side-by-side with UI
2. Navigate to each fund page
3. Check off each item in the script
4. Document any mismatches found

---

#### 3. **fund_transactions_ledger.json**
**What**: All 198 transactions in machine-readable format

**Structure**:
```json
[
  {
    "row_excel": 2,
    "date": "2025-06-12",
    "investor_name": "Jose Molla",
    "asset": "BTC",
    "amount": 2.723,
    "ib_name": null,
    "ib_pct": null,
    "fee_pct": null,
    "account_type": null,
    "tx_type": "TRANSFER",
    "ref_id": null
  },
  ... (196 more)
]
```

**Use case**:
- Programmatic data import
- Automated test scripts
- Data validation queries
- Bulk load into database

---

#### 4. **fund_transactions_ledger.csv**
**What**: Same transaction data in spreadsheet format

**Use case**:
- Open in Excel to review
- Import into database using CSV tools
- Create pivot tables for analysis
- Share with non-technical stakeholders

---

#### 5. **EXCEL_TO_DATABASE_IMPLEMENTATION.md**
**What**: How to load Excel data and verify it in the database

**Contains**:
- Data model (profiles, funds, fee templates)
- SQL INSERT templates
- Transaction processing order
- Running balance verification
- Yield allocation templates (future)
- Edge case handling
- SQL verification queries
- Final sign-off checklist

**Use case**: Implement data import, verify database state

---

## The Core Problem Solved

**Excel Source of Truth** (Accounting Yield Funds (6).xlsx):
- 8 funds (BTC, BTC Boost, BTC TAC, ETH, ETH TAC, SOL, USDT, XRP)
- 198 transactions across all funds
- Multiple investor types with different fee/IB structures
- Complex scenarios: negative positions, dust amounts, large withdrawals

**What was missing**: A complete map showing:
- ✅ Exactly what data exists in Excel
- ✅ How it maps to database schema
- ✅ What the UI should display
- ✅ How to verify it matches

**What you get now**:
- ✅ Complete inventory of all transactions
- ✅ Running balances showing state after each transaction
- ✅ Step-by-step manual testing guide
- ✅ Programmatic verification queries
- ✅ Edge case handling documentation

---

## How to Use This Package

### Scenario 1: Manual UI Testing

1. Open `UI_REPLAY_SCRIPT.md`
2. Open UI to `/admin/funds` in one window
3. Open Excel file in another window
4. Work through each test case step-by-step
5. Check off items as you verify them
6. Document any mismatches

**Time**: ~2-3 hours for complete coverage

### Scenario 2: Automated Testing

1. Use `fund_transactions_ledger.json` to load transactions
2. Run SQL verification queries from `EXCEL_TO_DATABASE_IMPLEMENTATION.md`
3. Compare database state to expected values
4. Assert all positions match Excel sums

### Scenario 3: Data Migration

1. Review `EXCEL_TO_DATABASE_IMPLEMENTATION.md` Part 1-3
2. Create database migration using `fund_transactions_ledger.csv`
3. Run reconciliation queries
4. Verify all investor_positions auto-sync via triggers

### Scenario 4: Yield Implementation (Future)

1. Refer to `FUND_MAPPING_SOURCE_OF_TRUTH.md` for fee/IB structures
2. Review templates in `EXCEL_TO_DATABASE_IMPLEMENTATION.md` Part 4
3. Implement yield allocation logic matching documented percentages
4. Verify conservation identity: gross = net + fee + ib

---

## Key Facts About The Data

### Funds Overview

| Fund | Transactions | Investors | Final AUM | Status |
|------|---|---|---|---|
| XRP | 8 | 1 | 182,105.58 | ACTIVE |
| SOL | 13 | 5 | 1,233.68 | ACTIVE |
| BTC | 60 | 12 | 39.08 | ACTIVE |
| ETH | 47 | 10 | 745.33 | ACTIVE |
| USDT | 46 | 18 | 3,018,875.20 | ACTIVE |
| BTC TAC | 7 | 3 | -6.67 | NEGATIVE |
| ETH TAC | 10 | 4 | -1.66 | NEGATIVE |
| BTC Boost | 7 | 4 | -0.45 | NEGATIVE |

### Critical Edge Cases

1. **Negative Positions**
   - Sam Johnson (XRP): -1,897.42 before recovery
   - Paul Johnson (SOL): -1.85 after withdrawal
   - INDIGO LP (ETH): -3.37
   - Multiple USDT positions in negative
   - System must allow these (not block)

2. **Dust Amounts** (very small balances)
   - Sam Johnson (BTC): -0.0152
   - Paul Johnson (BTC): -0.0013
   - Must display to 8 decimal places
   - Must not round to zero

3. **Large Amounts** (millions)
   - Sam Johnson (USDT): $4.2M+ deposits, $7M+ withdrawals
   - Monica Levy (USDT): $840K+ single deposit
   - Must format correctly, no truncation

4. **Fee/IB Attribution**
   - XRP: 16% fee, 4% IB to Ryan Van Der Wall
   - SOL: 16% fee, 4% IB to Alex Jacobs
   - Must track and display correctly

---

## Verification Checklist

- [ ] Read `FUND_MAPPING_SOURCE_OF_TRUTH.md` → Understand what's in Excel
- [ ] Review `UI_REPLAY_SCRIPT.md` → Understand how to test
- [ ] Load `fund_transactions_ledger.json` into database (or spreadsheet)
- [ ] Run SQL queries from `EXCEL_TO_DATABASE_IMPLEMENTATION.md`
- [ ] Navigate to each fund in UI
- [ ] Verify balances match Excel sums
- [ ] Test withdrawal scenarios
- [ ] Verify negative positions handled correctly
- [ ] Confirm fund AUM = sum of investor positions
- [ ] Document any mismatches
- [ ] Sign off when all verified

---

## Next Steps

### If Testing UI Manually

```
1. Open /admin/funds
2. Check that all 8 funds appear
3. Click XRP fund
4. Verify Sam Johnson balance: 182,105.58
5. View all 8 transactions
6. Verify running balances match script
7. Repeat for SOL, BTC, ETH, USDT
8. Check negative funds display correctly
```

### If Loading into Database

```
1. Parse fund_transactions_ledger.json
2. Create profiles for all investors
3. Create 8 funds
4. Load all 198 transactions in date order
5. Verify investor_positions auto-calculated
6. Run reconciliation queries
7. Check no position != ledger_sum
```

### If Implementing Yield

```
1. Review fee/IB percentages in FUND_MAPPING_SOURCE_OF_TRUTH
2. Design yield allocation RPC
3. Test with XRP example: 355 yield → 284 investor, 56.80 fees, 14.20 IB
4. Verify conservation identity holds
5. Test monthly crystallization
```

---

## File Manifest

```
/Users/mama/Downloads/indigo-yield-platform-v01-main/

├── Accounting Yield Funds (6).xlsx          ← SOURCE OF TRUTH
├── FUND_MAPPING_SOURCE_OF_TRUTH.md          ← Fund inventory
├── UI_REPLAY_SCRIPT.md                      ← Manual testing guide
├── fund_transactions_ledger.json             ← All 198 transactions (JSON)
├── fund_transactions_ledger.csv              ← All 198 transactions (CSV)
├── EXCEL_TO_DATABASE_IMPLEMENTATION.md      ← Implementation guide
└── README_EXCEL_MAPPING.md                  ← This file
```

---

## Questions This Package Answers

✅ **"What transactions are in the Excel?"**
→ See `FUND_MAPPING_SOURCE_OF_TRUTH.md` for complete list

✅ **"What should each investor's balance be?"**
→ See running balances in `FUND_MAPPING_SOURCE_OF_TRUTH.md` for each fund

✅ **"How do I test if the UI matches Excel?"**
→ Follow `UI_REPLAY_SCRIPT.md` step-by-step

✅ **"How do I load this data into the database?"**
→ Use `fund_transactions_ledger.json` + template SQL from `EXCEL_TO_DATABASE_IMPLEMENTATION.md`

✅ **"How do I verify data integrity?"**
→ Run SQL queries from `EXCEL_TO_DATABASE_IMPLEMENTATION.md` Part 7

✅ **"What edge cases should I watch for?"**
→ See edge cases in both `FUND_MAPPING_SOURCE_OF_TRUTH.md` and `EXCEL_TO_DATABASE_IMPLEMENTATION.md`

✅ **"How does yield allocation work?"**
→ Review fee/IB percentages in `FUND_MAPPING_SOURCE_OF_TRUTH.md` and templates in `EXCEL_TO_DATABASE_IMPLEMENTATION.md` Part 4

---

## Summary

You now have a **complete source-of-truth mapping** of all Excel data that allows you to:

1. **Understand exactly what's in Excel** (all 198 transactions, all 8 funds)
2. **Map it to the database schema** (profiles, funds, transactions, positions)
3. **Test the UI manually** (step-by-step guide for each fund)
4. **Verify programmatically** (SQL queries and JSON data)
5. **Implement yield allocation** (fee/IB structures documented)
6. **Handle edge cases** (negative positions, dust, large amounts)

**You can now verify that the Indigo Yield Platform displays every fund with 100% accuracy matching Excel.**

---

**Document Package Version**: 1.0  
**Generated**: 2026-04-07  
**Excel Source**: Accounting Yield Funds (6).xlsx  
**Status**: ✅ COMPLETE AND READY FOR USE
