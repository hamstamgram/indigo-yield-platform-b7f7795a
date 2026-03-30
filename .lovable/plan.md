

# Expert Excel-to-Platform Reconciliation Analysis

## What This Is

A data analysis task (NOT a code change) that produces a comprehensive reconciliation report comparing every number in the uploaded Excel (Accounting_Yield_Funds_6.xlsx) against the live database. The output is a document at `/mnt/documents/reconciliation-report.md`.

## Excel Structure (from parsing)

| Sheet (Page) | Fund | Content |
|---|---|---|
| Page 1 | BTC Boosted Program | 6 periods, 3 investors + Indigo Fees |
| Page 2 | Investments | ~130 rows: investor, date (Excel serial), currency, amount |
| Page 3 | BTC Yield Fund | 56 periods, ~20 investors with 19-decimal balances |
| Page 4 | ETH Yield Fund | 39 periods, ~15 investors |
| Page 5 | USDT Yield Fund | 44 periods, ~23 investors |
| Page 6 | SOL Yield Fund | 18 periods, ~7 investors |
| Page 7 | XRP Yield Fund | 10 periods, ~3 investors |
| Page 8 | Report | Capital Account Summaries per investor per fund (MTD/QTD/YTD/ITD) |

## Execution Plan

### Step 1: Extract Final Balances from Excel
Parse each fund sheet to extract the **last column** balance per investor. These are the "golden" reference values.

### Step 2: Query Platform Positions
Run `SELECT investor_id, fund_id, current_value FROM investor_positions WHERE is_active = true` and join with profiles and funds for names.

### Step 3: Position-Level Comparison
For each investor-fund pair, compute `variance = platform_balance - excel_balance`. Flag any variance exceeding asset-specific dust thresholds.

### Step 4: Yield Distribution Verification
For each yield event (Gross Performance row in each fund sheet):
- Match to `yield_distributions` by fund + period_end
- Compare `gross_pct` from Excel vs platform
- Verify conservation: `gross = net + fees + ib + dust`

### Step 5: Transaction Count Verification
Compare Investments sheet row count per investor-fund against `transactions_v2` deposit/withdrawal count.

### Step 6: Report Tab Verification
Cross-reference the Capital Account Summary values (Beginning Balance, Additions, Redemptions, Net Income, Ending Balance, Rate of Return) against the platform's `statements` table and `investor_fund_performance` records.

### Step 7: Integrity Views
Run all 6 integrity views and confirm zero violations.

### Step 8: Compile Report
Generate `/mnt/documents/reconciliation-report.md` with:
- Summary table: Layer | Checks | Pass | Fail | Max Variance
- Per-investor variance tables for any failures
- Conservation identity check results per distribution
- Statement/report parity results

## Technical Approach

- Copy the Excel to `/tmp/` and use Python (openpyxl + decimal) to extract exact values with full precision
- Use `psql` queries against the live database
- All comparisons use Python `Decimal` for 18-decimal precision
- Asset-specific tolerances: BTC/ETH/SOL/XRP: `0.00000001`, USDT/USDC: `0.0001`

## Output

A single reconciliation report document with pass/fail per layer, plus detailed variance tables. No code changes to the platform.

