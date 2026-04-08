# Transaction-Yield Allocation Logic: Source of Truth

**Last Updated**: 2026-04-07  
**Based on**: XRP Fund (Sam Johnson) + SOL Fund (Paul Johnson, Alex Jacobs) data flows

---

## Core Concept

**NOT about performance reporting or monthly APY.** This is about:
1. **Transaction Input**: Investor deposits with fee structure
2. **Yield Recording**: Month-end AUM vs. prior baseline
3. **Yield Allocation**: Split yield by fee template to investor, IB, and INDIGO

---

## Transaction Lifecycle

### Step 1: Transaction Input
```
Investor makes deposit with optional fee structure:
- Investor name
- Amount
- Date
- Fee % (goes to INDIGO)
- IB % (goes to Intro Broker)
- Implied investor share: 100% - Fee% - IB%
```

**Example**:
```
Sam Johnson: +135,003 XRP (17/11/2025)
  Fee: 16% → INDIGO Fees
  IB: 4% → Ryan Van Der Wall (Intro Broker)
  Investor: 80% ← Sam Johnson
```

### Step 2: Yield Record
```
At month-end, record total fund AUM and all pending transactions.
Yield = Current AUM - Sum of all transaction inputs
```

**Example**:
```
Date: 30/11/2025
Total AUM: 184,358 XRP

Transactions to date:
  + 135,003 XRP (Sam, 17/11)
  + 49,000 XRP (Sam, 25/11, no fees)
  ──────────
  184,003 XRP

Yield = 184,358 - 184,003 = 355 XRP
```

### Step 3: Yield Allocation (THE CRITICAL RULE)
```
Fee structure from FIRST transaction with fees applies to ALL yield.

If multiple transactions with different fees:
  → Use fee structure from the FIRST transaction that specified fees
  → Subsequent transactions inherit those percentages for yield purposes

Allocation formula:
  Yield_to_IB = Total_Yield × IB%
  Yield_to_Fees = Total_Yield × Fee%
  Yield_to_Investor = Total_Yield × (100% - IB% - Fee%)
```

**Example (XRP)**:
```
Total Yield: 355 XRP
Fee Structure (from Transaction 1): IB=4%, Fees=16%, Investor=80%

Allocation:
  Ryan (IB 4%):     355 × 0.04 = 14.20 XRP
  INDIGO (16%):     355 × 0.16 = 56.80 XRP
  Sam (80%):        355 × 0.80 = 284.00 XRP
  ────────────────────────────────
  Total:                         355.00 XRP ✓
```

### Step 4: Fund State Update
```
For each recipient, add their yield allocation to their cumulative balance.
New_Balance = Prior_Balance + Yield_Allocation
```

**Example (XRP Fund State at 30/11/2025)**:
```
Before Yield:
  Sam Johnson:      135,003 + 49,000 = 184,003 XRP
  Ryan Van Der Wall: 0 XRP
  INDIGO Fees:      0 XRP

After Yield Allocation:
  Sam Johnson:      184,003 + 284.00 = 184,287 XRP ✓
  Ryan Van Der Wall: 0 + 14.20 = 14.20 XRP ✓
  INDIGO Fees:      0 + 56.80 = 56.80 XRP ✓
  
  Total AUM: 184,358 XRP ✓
```

---

## Multi-Transaction Scenario (XRP Continued)

**New transaction after month-end reporting:**

```
Transaction: Sam Johnson +45,000 XRP (30/11/2025)
Status: AFTER the 30/11 reporting (no yield on this deposit yet)

Next Yield Record: 08/12/2025 → AUM = 229,731 XRP

Calculation:
  Prior balances (30/11): Sam 184,287 + Ryan 14.20 + INDIGO 56.80 + new deposit 45,000
  = 229,358 XRP
  
  Yield = 229,731 - 229,358 = 373 XRP
  
  Allocation (using same 4%/16%/80% template):
    Ryan (4%):     373 × 0.04 = 14.93 XRP
    INDIGO (16%):  373 × 0.16 = 59.76 XRP
    Sam (80%):     373 × 0.80 = 298.31 XRP
  
  Updated Fund State (08/12):
    Sam:     184,287 + 45,000 + 298.31 = 229,585.31 XRP
    Ryan:    14.20 + 14.93 = 29.13 XRP
    INDIGO:  56.80 + 59.76 = 116.56 XRP
    ─────────────────────────────────────
    Total:                      229,731 XRP ✓
```

---

## Key Rules

1. **One Fee Template Per Fund**
   - Set by the first transaction that specifies IB% and/or Fee%
   - All subsequent yield allocations use this template
   - New transactions don't change the template; they inherit it

2. **Transaction Timing Matters**
   - **Before month-end reporting**: Included in AUM baseline, eligible for current month's yield
   - **After month-end reporting**: Included in next month's AUM baseline, yield allocated in next period

3. **Yield Only on Positive Growth**
   - Yield = Max(0, Current AUM - Prior Baseline)
   - If AUM declines: Yield = 0, no allocation needed

4. **Fund State is Cumulative**
   - Each investor's balance grows by yield allocation
   - Each IB's balance grows by their yield share
   - INDIGO Fees accumulate over time

5. **No Rebalancing Between Allocations**
   - Once yield is allocated and recorded, balances don't reshift
   - New yield is based on NEW AUM vs. NEW baseline (including all prior allocations)

---

## Excel Sheet Structure (Fund Level)

For testing/reference, fund sheets should track:

| Column | Header | Type | Notes |
|--------|--------|------|-------|
| A | Date | Date | Reporting/yield record date (typically month-end) |
| B | AUM Total | Float | Total fund value at this date |
| C | Prior Baseline | Float | Sum of all transactions up to prior period |
| D | Yield Amount | Formula | =B-C |
| E | Fee Template (IB%) | Text | Reference to fee structure (e.g., "4%") |
| F | Fee Template (Fees%) | Text | Reference to fee structure (e.g., "16%") |
| G | Fee Template (Investor%) | Text | Reference to fee structure (e.g., "80%") |

**Per-Investor Rows** (repeating for each entity):

| Column | Header | Type | Notes |
|--------|--------|------|-------|
| H | Entity Name | Text | Investor, IB name, or "INDIGO Fees" |
| I | Yield Allocation | Formula | =D * (Fee% for this entity) |
| J | Cumulative Balance | Formula | =Prior_Balance + Yield_Allocation |

---

## Common Test Scenarios

### Scenario A: Simple Single Investor
```
Input:
  Alice: +1000 USDT (16% fees, 4% IB to Bob)
  Yield Record: 1100 USDT

Expected:
  Yield: 100 USDT
  Bob (IB 4%):    4 USDT
  INDIGO (16%):   16 USDT
  Alice (80%):    80 USDT
```

### Scenario B: Multiple Deposits, Same Structure
```
Input:
  Alice: +1000 USDT (16% fees, 4% IB to Bob)
  Charlie: +500 USDT (no fees, added after Alice)
  Yield Record: 1650 USDT

Expected:
  Yield: 1650 - 1500 = 150 USDT
  Bob (IB 4%):     6 USDT (150 × 4%)
  INDIGO (16%):    24 USDT (150 × 16%)
  Alice (80%):     120 USDT (150 × 80%)
  
  Balances:
    Alice:    1000 + 120 = 1120 USDT
    Bob:      0 + 6 = 6 USDT
    INDIGO:   0 + 24 = 24 USDT
    Charlie:  500 (no yield share, added after template set)
```

### Scenario C: Transaction After Reporting
```
Input (Month 1):
  Alice: +1000 USDT (16% fees, 4% IB to Bob)
  Yield Record: 1100 USDT
  → Alice: 1080, Bob: 4, INDIGO: 16

Input (Month 2):
  Bob deposits: +100 USDT (after 1/30 reporting)
  Yield Record: 1210 USDT
  Calculation: 1210 - (1080 + 4 + 16 + 100) = 10 USDT yield
  Allocation (4%/16%/80%):
    Bob (IB): 0.4 USDT
    INDIGO:   1.6 USDT
    Alice:    8 USDT
```

---

## Anti-Patterns (What NOT To Do)

❌ **Don't calculate yield based on individual investor contributions**
- WRONG: Paul's yield = (Paul's amount / Total) × Total Yield
- RIGHT: Total yield split by fee template percentages

❌ **Don't change fee structure mid-stream**
- WRONG: New transaction with different fees → New template
- RIGHT: New transaction inherits existing template

❌ **Don't rebalance after allocation**
- WRONG: Adjust investor shares after yield recorded
- RIGHT: Once allocated, balances are fixed until next yield

❌ **Don't hardcode yield amounts**
- WRONG: =1000 (hardcoded yield value)
- RIGHT: =AUM - Prior_Baseline (formula-driven)

❌ **Don't mix performance % with allocation %**
- WRONG: APY calculation used for fee distribution
- RIGHT: Fee % is only for yield distribution, not performance reporting

---

## Verification Checklist

- [ ] **Fee template set from first transaction** with IB or Fees specified
- [ ] **All subsequent transactions inherit the template** (no changes)
- [ ] **Yield = AUM - Prior Sum of all transactions**
- [ ] **Allocation: 4% IB, 16% Fees, 80% Investor** (or template from T1)
- [ ] **Fund state updates: Prior balance + Allocation**
- [ ] **Total AUM = Sum of all entity balances** (reconciles)
- [ ] **Transactions after reporting NOT included in that month's yield**
- [ ] **No hardcoded allocation amounts** (all formulas)

