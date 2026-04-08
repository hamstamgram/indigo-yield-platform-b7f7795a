# Excel Structure Gap Analysis

**Status**: CRITICAL DATA STRUCTURE MISMATCH FOUND  
**Date**: 2026-04-07  
**Impact**: Cannot implement transaction-yield allocation without resolving

---

## THE PROBLEM

You provided **transaction-yield examples** with IB and Fee data:
```
Sam Johnson: +135,003 XRP (17/11/2025)
IB: Ryan Van Der Wall (4%)
Fees: 16%
```

But the **Investments sheet** (transaction ledger) has **NO IB or Fee columns**.

**Current Investments columns**:
- A: Investment Date
- B: Investor Name
- C: Currency (Fund/Asset)
- D: Amount
- E-X: EMPTY

**Missing columns**:
- ❌ Intro Broker Name (who is the IB?)
- ❌ IB Percentage (what % do they get?)
- ❌ Fee Percentage (what % does INDIGO take?)
- ❌ Transaction Type (is this a deposit, yield, fee credit, etc.?)
- ❌ Reference ID (for idempotency)

---

## TWO EXCEL FORMATS FOUND

### Format 1: OLD (Boosted/TAC Programs)
**Sheets**: "DONE - BTC Boosted Program", "DONE - BTC TAC Program", "Done - ETH TAC Program"

**Structure**:
```
Column A: Date
Column B: AUM
Column C: Gross Performance (%)
Column D: Gross Performance (BTC/ETH)
Column E: Net Performance
Column F: Yearly APY
Column G: Comments
Column I: Investors (investor name per row)
Column J: Fees (fee % per investor)
Columns K+: Allocation amounts by date
```

**Data Entry**:
- Investor rows list each investor with their fee %
- Allocation formulas compute investor shares by date

**Issue**: This format tracks ALLOCATIONS, not TRANSACTIONS. It's derived data, not source.

### Format 2: NEW (Yield Funds)
**Sheets**: "BTC Yield Fund", "ETH Yield Fund", "USDT Yield Fund", "SOL Yield Fund", "XRP Yield Fund"

**Structure**:
```
Column A: AUM Before
Column B-C: Top Up / Withdrawals
Column D-onwards: AUM After (by date)
Row 2: SUMIFS from Investments sheet (pull by fund/currency)
Row 4: Gross Performance %
Row 5-6: Net Performance, APY
```

**Data Entry**:
- Uses SUMIFS formulas to aggregate Investments sheet data
- Investments sheet is source of truth for all transactions

**Issue**: Investments sheet has only 4 columns (Date, Investor, Currency, Amount). **No IB or Fee data.**

---

## ROOT CAUSE

The Investments sheet was designed as a **simple transaction log** (what/when/who/how much), but **NOT** as a complete financial ledger.

It's missing the **fee structure and IB attribution** that your business logic requires.

---

## SOLUTION (Required Before Launch)

### Option A: Add Columns to Investments Sheet (Recommended)
**Pros**: Single source of truth, works with current formulas  
**Cons**: Need to backfill 1000+ rows with IB/Fee data

**Add these columns**:
```
Column E: Intro Broker Name (optional, e.g., "Ryan Van Der Wall")
Column F: IB Percentage (e.g., 0.04 for 4%, or 0 if none)
Column G: Fee Percentage (e.g., 0.16 for 16%)
Column H: Transaction Type (DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT)
Column I: Reference ID (for idempotency)
Column J: Notes
```

**Backfill strategy**:
1. Query existing transactions from your database (if they exist)
2. Add to Investments sheet
3. Validate: Sum of allocations in old format = sum of transactions in new format

### Option B: Keep Separate Fee Master Table
**Pros**: Simpler data entry, fees don't change per transaction  
**Cons**: Requires external lookup, more complex RPC logic

**Create separate sheet**: "Fee Templates"
```
Fund    | IB Name              | IB %  | Fee % | Investor %
--------|----------------------|-------|-------|----------
BTC     | (none)               | 0%    | 0%    | 100%
ETH     | (none)               | 0%    | 0%    | 100%
XRP     | Ryan Van Der Wall    | 4%    | 16%   | 80%
SOL     | Alex Jacobs          | 4%    | 16%   | 80%
```

Then RPC joins `apply_adb_yield_distribution_v3` with this table.

---

## IMMEDIATE ACTION ITEMS

### 1. Decision: Where Does Fee Structure Live?
- **Option A**: In Investments sheet (transaction-level, can vary per investor)?
- **Option B**: In separate Fee Templates sheet (fund-level, same for all investors)?
- **Option C**: In your database, not Excel?

**MUST DECIDE** because it affects:
- Excel schema (add columns or create new sheet)
- RPC implementation (where to read fees from)
- Backend code (how to validate)

### 2. Backfill Data
Once you decide where fees live:
- [ ] Gather IB and fee data for all existing transactions
- [ ] Add to Excel (either Investments sheet or Fee Templates sheet)
- [ ] Validate against your database records

### 3. Verify Against Known Examples
Once data is in Excel:
- [ ] Run XRP example: Sam +135K, +49K → yield 355 → verify 284/14.20/56.80
- [ ] Run SOL example: INDIGO +1250, Paul +234.17 → yield 15.83 → verify allocation
- [ ] Confirm Excel matches your manual calculations

### 4. Update RPC & Backend
Once Excel is correct:
- [ ] Update `apply_adb_yield_distribution_v3` to read fees from correct source
- [ ] Add validation: Transaction fees must match fund template (Option A) or fund/investor match (Option B)
- [ ] Test: Backfill production database with fee templates

---

## WHAT NEEDS TO BE TRUE FOR LAUNCH

**Minimum requirements**:
1. ✅ Transaction ledger (Investments sheet) is **complete and accurate**
2. ⚠️ **IB and Fee data exists somewhere** (Excel or database)
3. ⚠️ **Fee structure per fund is documented** (fund-level or investor-level?)
4. ✅ **Yield calculation matches Excel examples** (XRP, SOL verified)
5. ⚠️ **RPC reads fees from correct source**

---

## EXCEL STRUCTURE RECOMMENDATION

**Final state** (Option A recommended):

```
Investments Sheet:
A: Investment Date
B: Investor Name
C: Currency (Fund code: BTC, ETH, USDT, SOL, XRP)
D: Amount (numeric, positive for deposits, negative for withdrawals)
E: Intro Broker Name (optional, blank if none)
F: IB Percentage (0 if none)
G: Fee Percentage (0 if none; if blank, assume 0%)
H: Transaction Type (DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT, ADJUSTMENT)
I: Reference ID (UUID, for idempotency)
J: Notes (optional)
K: Status (PENDING, APPLIED, VOIDED)
```

**Example data**:
```
Investment Date | Investor Name  | Currency | Amount  | IB Name          | IB % | Fee % | Type      | Reference ID                         | Status
2025-11-17      | Sam Johnson    | XRP      | 135003  | Ryan Van Der Wall| 4%   | 16%   | DEPOSIT   | txn-2025-11-17-sam-001               | APPLIED
2025-11-25      | Sam Johnson    | XRP      | 49000   |                  | 0%   | 16%   | DEPOSIT   | txn-2025-11-25-sam-002               | APPLIED
2025-11-30      | (System)       | XRP      | 355     |                  | 0%   | 0%    | YIELD     | yield-2025-11-30-xrp-fund-001        | APPLIED
```

---

## SUMMARY TABLE

| Aspect | Current State | Required | Gap | Risk |
|--------|---------------|----------|-----|------|
| **Transaction ledger** | ✅ Exists (Investments) | ✅ Complete | ⚠️ IB/Fee columns missing | HIGH |
| **Fee structure** | ❌ Not tracked | ✅ Per-fund or per-investor | Critical | **BLOCKER** |
| **IB attribution** | ❌ Not tracked | ✅ Investor → IB mapping | Critical | **BLOCKER** |
| **Yield allocation** | ⚠️ Formulas exist (old format) | ✅ Unified logic | ⚠️ Mismatch | HIGH |
| **Fund templates** | ❌ Not persisted | ✅ In DB or Excel | Critical | **BLOCKER** |
| **Transaction types** | ⚠️ Implicit (amounts only) | ✅ Explicit enum | Minor | LOW |
| **Reference IDs** | ❌ Not tracked | ✅ For idempotency | Minor | LOW |

---

## NEXT STEPS (For You)

1. **Review the Investments sheet data** — Do you have IB and Fee information in a different system?
2. **Choose Option A or B** — Where should fee structure live?
3. **Gather/backfill the missing data** — IB names and percentages for all transactions
4. **Update Excel schema** — Add columns or create Fee Templates sheet
5. **Validate with examples** — Run XRP/SOL scenarios, verify allocation amounts match
6. **Update RPC & backend** — Implement fee validation and allocation logic
7. **Backfill production database** — Sync fee templates from Excel to DB
8. **Test end-to-end** — Full transaction → yield → allocation flow

**Time estimate**: 4-6 hours to resolve this gap  
**Blocker for launch**: Yes, cannot deploy without fee structure defined

---

## QUESTIONS FOR YOU

1. **Do you have IB and Fee data for all 1000+ transactions in the Investments sheet?**
   - If yes, where is it? (Database? Another file? Verbal agreements?)
   - If no, how should we handle transactions without fees/IB?

2. **Are fees fund-level (same for all investors in XRP) or investor-level (vary by investor)?**
   - XRP example shows 4% IB / 16% fee for ALL transactions
   - But can Paul Johnson have different fees than Sam Johnson in same fund?

3. **Does every investor have an IB, or only some?**
   - XRP: Sam has IB=Ryan
   - SOL: Paul has IB=Alex
   - INDIGO LP: Has no IB (0%)
   - Is IB optional?

4. **Should fees be editable per transaction, or locked per fund?**
   - Transaction-level: More flexible, harder to audit
   - Fund-level: Simpler, more consistent

**These answers will determine the final schema and implementation path.**
