# Excel-vs-DB Exact-Match Audit — Design Spec

**Goal:** Verify every number the Indigo Yield platform computed matches the source-of-truth Excel file exactly, across all 5 active funds and all investors. Pre-migration validation — zero tolerance.

**Excel file:** `/Users/mama/Downloads/Accounting Yield Funds (6).xlsx`

---

## Scope

### Funds

| Excel Sheet | DB Fund Name | Fund ID | Asset | Epochs | Investors |
|---|---|---|---|---|---|
| BTC Yield Fund | TEST BTC Yield Fund | `00746a0e-6054-4474-981c-0853d5d4f9b7` | TBTC | 55 cols / 45 dists | 18 |
| BTC Yield Fund | Bitcoin Yield Fund | `0a048d9b-c4cf-46eb-b428-59e10307df93` | BTC | 55 cols / 11 dists | 8 (partial) |
| ETH Yield Fund | Ethereum Yield Fund | `717614a2-9e24-4abc-a89d-02209a3a772a` | ETH | 38 | 16 |
| USDT Yield Fund | Stablecoin Fund | `8ef9dc49-e76c-4882-84ab-a449ef4326db` | USDT | 43 | 27 |
| SOL Yield Fund | Solana Yield Fund | `7574bc81-aab3-4175-9e7f-803aa6f9eb8f` | SOL | 17 | 6 (real, excl. placeholder `x`) |
| XRP Yield Fund | Ripple Yield Fund | `2c123c4f-76b4-4504-867e-059649855417` | XRP | 10 | 2 (real, excl. placeholder `x`) |
| DONE - BTC Boosted Program | _(no DB fund — closed, assets transferred)_ | — | — | 7 | 3 + Indigo |
| DONE - BTC TAC Program | _(no DB fund — closed, assets transferred)_ | — | — | 5 | 4 + Indigo |
| Done - ETH TAC Program | _(no DB fund — closed, assets transferred)_ | — | — | ~18 | 3 + Indigo |

**Closed programs** (Boosted, BTC TAC, ETH TAC) have no live DB fund — their assets were transferred into the main yield funds. The audit verifies the transfer amounts match, but cannot query ongoing allocations for these.

### TEST vs Production Funds

- **TEST BTC** (`00746a0e...`): fully replayed via E2E (56 epochs, 45 distributions). Complete dataset — primary validation target.
- **Production funds**: partially populated. The audit compares what exists in DB against the corresponding Excel epochs. Missing epochs are flagged as "not yet entered" (not as failures).

---

## 7 Verification Layers

### Layer 1: Transactions (deposits, withdrawals)

**Excel source:** `Investments` sheet — columns: date (serial), investor name, currency, amount.  
**DB source:** `transactions_v2` where `type IN ('DEPOSIT', 'WITHDRAWAL')` and `is_voided IS FALSE`.

| Check | Match rule |
|---|---|
| Transaction exists | Same date + investor + fund + amount in both |
| Amount | Exact decimal match |
| Direction | Positive = deposit, negative = withdrawal |

**BTC transaction count:** Excel has 61 BTC rows. DB TEST BTC has deposits/withdrawals to match.

Flag: any transaction in DB not in Excel, or vice versa. Excel rows with currency != the fund's asset are skipped (e.g., `BTC Boost`, `BTC TAC` rows belong to those programs).

### Layer 2: Per-distribution yield totals

**Excel source:** `BTC Yield Fund` sheet, rows 1-6:
- Row 1: `AUM Before` — opening AUM per epoch column
- Row 2: `Top Up / Withdrawals` — net flow per epoch
- Row 3: `AUM After` — closing AUM per epoch
- Row 4: `Gross Performance` — gross yield % per epoch
- Row 5: `Net Performance` — net yield % per epoch

**DB source:** `yield_distributions` per `effective_date`:
- `gross_yield_amount` — total gross yield in asset terms
- `total_net_amount` — total net yield
- `total_fee_amount` — total fees
- `total_ib_amount` — total IB commissions

| Check | Excel | DB | Match rule |
|---|---|---|---|
| Gross yield amount | `AUM Before × Gross %` | `gross_yield_amount` | Exact |
| Net yield amount | `AUM Before × Net %` | `total_net_amount` | Exact |
| Total fee amount | `gross - net` (implied) | `total_fee_amount` | Exact |
| Closing AUM | Row 3 value | _(derived: sum of positions after distribution)_ | Exact |

**Epoch mapping:** Excel has 55 columns for BTC, but only some are distribution dates (the rest are transaction-only dates where `AUM Before` changes due to a deposit/withdrawal but no yield is distributed). The script matches on date: if a DB distribution exists for that date, compare. If not, that column is transaction-only — skip yield comparison but still verify balances.

### Layer 3: Per-investor balance after each epoch

**Excel source:** Rows 10-27 (BTC), absolute balance per investor per epoch column.  
**DB source:** Reconstructed running balance from `transactions_v2` (type=DEPOSIT/WITHDRAWAL) + `yield_allocations` (net_amount + fee_credit + ib_credit credited to investor position).

For each epoch column date and each investor:
- Excel value = investor balance at that point in time
- DB value = sum of all deposits - withdrawals + yield allocations up to and including that date

| Check | Match rule |
|---|---|
| Balance | Exact decimal match |
| Zero balance | Excel shows 0, DB should have 0 or no position |

### Layer 4: Per-investor yield allocation (crystallization)

**Excel source:** Derived — balance change between consecutive epochs minus any deposit/withdrawal on that date.  
**DB source:** `yield_allocations` per `distribution_id`:
- `gross_amount` — gross yield before fees
- `net_amount` — net yield after fees (credited to investor)
- `fee_credit` — fee portion credited to Indigo Fees position
- `ib_credit` — IB commission credited to IB partner

For each distribution and each investor:
- `yield_allocated = balance_after - balance_before - deposits + withdrawals`
- This should equal `net_amount` from DB

| Check | Match rule |
|---|---|
| Net yield per investor per distribution | Exact |
| Fee credit per investor per distribution | Exact |

### Layer 5: Per-investor ownership share %

**Excel source:** Rows 31-48 (BTC), share % per investor per epoch column. Sum = 1.0 (row 49).  
**DB source:** `yield_allocations.ownership_pct` per distribution.

| Check | Match rule |
|---|---|
| Ownership % | Excel value vs `ownership_pct / 100` from DB |
| Sum check | All shares sum to 1.0 (100%) per epoch |

### Layer 6: Cumulative Indigo Fees

**Excel source:** Row 9 (BTC) — running cumulative balance of the `Indigo Fees` position.  
**DB source:** `Indigo Fees` investor position balance, reconstructed from initial value + all `fee_credit` amounts across distributions.

| Check | Match rule |
|---|---|
| Cumulative fee balance | Exact per epoch |

### Layer 7: Fee percentages per investor

**Excel source:** Column B (rows 10-27) — management fee % per investor (0%, 10%, 15%, 20%).  
**DB source:** `yield_allocations.fee_pct` per investor (consistent across distributions).

| Check | Match rule |
|---|---|
| Fee % | Excel col B value × 100 = DB `fee_pct` |
| IB % | Excel col C value (where present: Paul Johnson 1.5%, Sam Johnson 1.5-4%) |

---

## Investor Name Mapping

The script must map Excel investor names to DB profile display names (`first_name || ' ' || last_name`).

### BTC Yield Fund (TEST)

| Excel | DB Profile |
|---|---|
| Jose Molla | TEST Jose Molla |
| Kyle Gulamerian | TEST Kyle Gulamerian |
| Matthias Reiser | TEST Matthias Reiser |
| Thomas Puech | TEST Thomas Puech |
| Danielle Richetta | TEST Danielle Richetta |
| Kabbaj | TEST Family Kabbaj |
| Victoria Pariente-Cohen | TEST Victoria Pariente-Cohen |
| Nathanaël Cohen | TEST Nathanaël Cohen |
| Blondish | TEST Blondish Music |
| Oliver Loisel | TEST Oliver Loisel |
| Paul Johnson | TEST Paul Johnson |
| Alex Jacobs | TEST Alex Jacobs |
| Sam Johnson | TEST Sam Johnson |
| Ryan Van Der Wall | TEST Ryan Van Der Wall |
| Nath & Thomas | TEST Nath & Thomas |
| Vivie & Liana | TEST Vivie & Liana |
| NSVO Holdings | TEST NSVO Holdings |
| ALOK PAVAN BATRA | TEST ALOK PAVAN BATRA |
| Indigo Fees | Indigo Fees |

### BTC Yield Fund (Production)

| Excel | DB Profile |
|---|---|
| Jose Molla | Jose Molla |
| Kyle Gulamerian | Kyle Gulamerian |
| Matthias Reiser | Matthias Reiser |
| Thomas Puech | Thomas Puech |
| Danielle Richetta | Danielle Richetta |
| Kabbaj | Family Kabbaj |
| Nath & Thomas | Nath & Thomas |
| Vivie & Liana | Vivie & Liana |
| Indigo Fees | Indigo Fees |

Mapping for ETH/USDT/SOL/XRP investors will be built dynamically: the script queries all `profiles` for each fund's `investor_positions`, then fuzzy-matches against Excel names. Unmatched names are flagged.

---

## Excel Sheet Structure (all funds follow this pattern)

```
Row 1:  AUM Before         | [epoch1] | [epoch2] | ...
Row 2:  Top Up/Withdrawals | [epoch1] | [epoch2] | ...
Row 3:  AUM After           | [epoch1] | [epoch2] | ...
Row 4:  Gross Performance   | [epoch1] | [epoch2] | ...
Row 5:  Net Performance     | [epoch1] | [epoch2] | ...
Row 6:  Yearly APY          | [epoch1] | [epoch2] | ...
Row 7:  Comments            | [text]   | [text]   | ...
Row 8:  Investors | Fees | IB | [date1] | [date2] | ...  ← header
Row 9:  Indigo Fees | 0.0 | — | [cumulative fee balance per epoch]
Row 10: [Investor 1] | [fee%] | [ib%] | [balance per epoch]
...
Row N:  Total AUM | — | — | [sum check per epoch]
(blank row)
Row N+2: Indigo Fees | 0.0 | — | [share % per epoch]  ← share section
Row N+3: [Investor 1] | [fee%] | [ib%] | [share % per epoch]
...
Row M:  Total AUM | — | — | [1.0 per epoch]  ← sum check = 100%
```

Dates in row 8 are Excel serial numbers → converted via `excelSerialToDate()`.

---

## Precision

All numeric comparisons use `Decimal.js`:
- `new Decimal(excelValue).equals(new Decimal(dbValue))`
- No tolerance, no rounding
- If Excel stores fewer decimal places than DB (e.g., Excel `3.468` vs DB `3.468000000000000000`), the comparison truncates DB to Excel's precision using `Decimal.toDecimalPlaces(excelDP)`
- Negative yields (loss distributions) are compared the same way

---

## Script Architecture

**File:** `scripts/excel-audit-exact.mjs`

**Dependencies:** `xlsx` (npm: SheetJS for .xlsx parsing), `decimal.js`, `@supabase/supabase-js`

**Structure:**

```
main()
├── loadExcel(path)           → parsed sheets with typed data
├── connectSupabase()         → authenticated client
├── for each fund config:
│   ├── parseExcelFund(sheet) → { epochs[], investors[], balances[][], shares[][], fees, distributions }
│   ├── fetchDBFund(fundId)   → { distributions[], allocations[], transactions[], positions[] }
│   ├── auditTransactions()   → Layer 1 results
│   ├── auditDistributions()  → Layer 2 results
│   ├── auditBalances()       → Layer 3 results
│   ├── auditAllocations()    → Layer 4 results
│   ├── auditShares()         → Layer 5 results
│   ├── auditFees()           → Layer 6 results
│   └── auditFeePercents()    → Layer 7 results
└── printReport()             → summary + details
```

**Fund config array:**

```javascript
const FUND_CONFIGS = [
  {
    sheet: 'BTC Yield Fund',
    fundId: '00746a0e-6054-4474-981c-0853d5d4f9b7', // TEST
    namePrefix: 'TEST ',
    nameOverrides: { 'Kabbaj': 'TEST Family Kabbaj', 'Blondish': 'TEST Blondish Music' },
  },
  {
    sheet: 'BTC Yield Fund',
    fundId: '0a048d9b-c4cf-46eb-b428-59e10307df93', // Production
    namePrefix: '',
    nameOverrides: { 'Kabbaj': 'Family Kabbaj' },
  },
  {
    sheet: 'ETH Yield Fund',
    fundId: '717614a2-9e24-4abc-a89d-02209a3a772a',
    namePrefix: '',
    nameOverrides: {},
  },
  {
    sheet: 'USDT Yield Fund',
    fundId: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
    namePrefix: '',
    nameOverrides: {},
  },
  {
    sheet: 'SOL Yield Fund',
    fundId: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    namePrefix: '',
    nameOverrides: {},
  },
  {
    sheet: 'XRP Yield Fund',
    fundId: '2c123c4f-76b4-4504-867e-059649855417',
    namePrefix: '',
    nameOverrides: {},
  },
];
```

**Environment:**

```bash
# Required
SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Optional
EXCEL_PATH=/Users/mama/Downloads/Accounting\ Yield\ Funds\ \(6\).xlsx  # default
FUND_FILTER=BTC           # run only matching funds (substring match on sheet name)
```

---

## Output Format

```
╔══════════════════════════════════════════════════════╗
║  EXCEL vs DB EXACT-MATCH AUDIT                       ║
║  Excel: Accounting Yield Funds (6).xlsx              ║
║  DB: nkfimvovosdehmyyjubn (Indigo Yield)             ║
╚══════════════════════════════════════════════════════╝

━━━ BTC Yield Fund → TEST BTC Yield Fund ━━━

Layer 1: Transactions (61 Excel / 61 DB)
  ✓ 2024-07-01 Jose Molla DEPOSIT 3.468
  ✓ 2024-08-21 Kyle Gulamerian DEPOSIT 2.0
  ✗ 2024-12-15 Kyle Gulamerian WITHDRAWAL excel=-2.0336 db=-2.026 diff=0.0076
  ...
  RESULT: 59/61 passed, 2 mismatches

Layer 2: Distribution Totals (45 distributions)
  ✓ 2024-07-31 gross=0.022 net=0.0187 fees=0.0033
  ✗ 2024-09-30 gross: excel=0.029991 db=0.029966 diff=0.000025
  ...
  RESULT: 43/45 passed, 2 mismatches

Layer 3: Investor Balances (55 epochs × 19 investors = 1045 checks)
  ✓ 2024-07-01 Jose Molla: 3.468
  ✗ 2025-07-11 Kabbaj: excel=2.998875035 db=3.000476665 diff=0.001601630
  ...
  RESULT: 1040/1045 passed, 5 mismatches

Layer 4: Yield Allocations (45 distributions × ~8 avg investors = ~360 checks)
  ✓ 2024-07-31 Jose Molla: net=0.0187
  ...
  RESULT: 358/360 passed

Layer 5: Ownership Shares (45 distributions × ~8 avg investors = ~360 checks)
  ...

Layer 6: Cumulative Indigo Fees (55 epoch values)
  ...

Layer 7: Fee Percentages (19 investors)
  ...

━━━ ETH Yield Fund → Ethereum Yield Fund ━━━
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRAND TOTAL: 4,523 checks — 4,510 passed, 13 mismatches
EXIT CODE: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Handling

- Missing investor in DB → flag as `MISSING_INVESTOR`, don't crash
- Missing distribution for an epoch date → flag as `NO_DISTRIBUTION` (expected for transaction-only epochs)
- Excel value is `None`/`0` and DB has no record → treat as pass (investor not active in that epoch)
- Excel has `#DIV/0!` or error values → skip that cell, log as `EXCEL_ERROR`
- DB returns negative dust values (e.g., `-0.000000000035377103`) → treat as zero for comparison against Excel 0

---

## How to Run

```bash
# Full audit — all funds
node scripts/excel-audit-exact.mjs

# Single fund
FUND_FILTER=BTC node scripts/excel-audit-exact.mjs

# Custom Excel path
EXCEL_PATH=/path/to/file.xlsx node scripts/excel-audit-exact.mjs
```

---

## Success Criteria

- Exit 0: every number in the Excel matches the corresponding DB value exactly
- Exit 1: at least one mismatch — report shows exactly which numbers differ
- The report is detailed enough to identify and fix every discrepancy without re-running
