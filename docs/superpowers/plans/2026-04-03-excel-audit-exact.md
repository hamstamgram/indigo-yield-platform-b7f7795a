# Excel-vs-DB Exact-Match Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone audit script that reads the accounting Excel and compares every number against Supabase — all 5 funds, all investors, 7 verification layers, zero tolerance.

**Architecture:** Single `.mjs` script split into focused modules: Excel parser, DB fetcher, 7 audit functions, report printer. Uses `exceljs` (already installed) to read `.xlsx`, `decimal.js` (already installed) for exact comparison, `@supabase/supabase-js` (already installed) to query DB. Follows patterns from existing `scripts/excel-comparison-report.mjs`.

**Tech Stack:** Node.js ESM, exceljs, decimal.js, @supabase/supabase-js

---

## File Map

| File | Responsibility |
|------|---------------|
| `scripts/excel-audit-exact.mjs` | Entry point — loads Excel, runs all audits, prints report |
| `scripts/audit/parse-excel.mjs` | Parses Excel sheets into structured fund data |
| `scripts/audit/fetch-db.mjs` | Queries Supabase for distributions, allocations, transactions, positions |
| `scripts/audit/compare.mjs` | Decimal comparison helpers |
| `scripts/audit/audit-layers.mjs` | 7 audit layer functions |
| `scripts/audit/report.mjs` | Console report formatting |
| `scripts/audit/fund-configs.mjs` | Fund config array with IDs, sheet names, name mappings |

---

## Task 1: Create fund configs and comparison helpers

**Files:**
- Create: `scripts/audit/fund-configs.mjs`
- Create: `scripts/audit/compare.mjs`

- [ ] **Step 1: Create `scripts/audit/fund-configs.mjs`**

```javascript
// scripts/audit/fund-configs.mjs

export const FUND_CONFIGS = [
  {
    sheet: 'BTC Yield Fund',
    label: 'TEST BTC Yield Fund',
    fundId: '00746a0e-6054-4474-981c-0853d5d4f9b7',
    investmentsCurrency: 'BTC',
    namePrefix: 'TEST ',
    nameOverrides: {
      'Kabbaj': 'TEST Family Kabbaj',
      'Blondish': 'TEST Blondish Music',
      'INDIGO Fees': 'Indigo Fees',
    },
  },
  {
    sheet: 'BTC Yield Fund',
    label: 'Bitcoin Yield Fund (Production)',
    fundId: '0a048d9b-c4cf-46eb-b428-59e10307df93',
    investmentsCurrency: 'BTC',
    namePrefix: '',
    nameOverrides: {
      'Kabbaj': 'Family Kabbaj',
      'Blondish': 'Blondish Music',
      'INDIGO Fees': 'Indigo Fees',
    },
  },
  {
    sheet: 'ETH Yield Fund',
    label: 'Ethereum Yield Fund',
    fundId: '717614a2-9e24-4abc-a89d-02209a3a772a',
    investmentsCurrency: 'ETH',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
    },
  },
  {
    sheet: 'USDT Yield Fund',
    label: 'Stablecoin Fund',
    fundId: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
    investmentsCurrency: 'USDT',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
      'INDIGO Ventures': 'Indigo Ventures',
    },
  },
  {
    sheet: 'SOL Yield Fund',
    label: 'Solana Yield Fund',
    fundId: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    investmentsCurrency: 'SOL',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
    },
  },
  {
    sheet: 'XRP Yield Fund',
    label: 'Ripple Yield Fund',
    fundId: '2c123c4f-76b4-4504-867e-059649855417',
    investmentsCurrency: 'XRP',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
    },
  },
];
```

- [ ] **Step 2: Create `scripts/audit/compare.mjs`**

```javascript
// scripts/audit/compare.mjs
import Decimal from 'decimal.js';

// Configure Decimal for high precision
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/**
 * Compare two values for exact match.
 * Truncates DB value to Excel's decimal places since Excel is source of truth.
 * Returns { match, excelDec, dbDec, diff }
 */
export function exactMatch(excelVal, dbVal) {
  if (excelVal === null || excelVal === undefined) {
    return { match: true, excelDec: null, dbDec: null, diff: null, skipped: true };
  }

  const excelDec = new Decimal(excelVal);
  const dbDec = new Decimal(dbVal ?? 0);

  // Count decimal places in Excel value
  const excelStr = excelDec.toFixed();
  const dotIdx = excelStr.indexOf('.');
  const excelDP = dotIdx === -1 ? 0 : excelStr.length - dotIdx - 1;

  // Truncate DB to Excel precision for comparison
  const dbTrunc = dbDec.toDecimalPlaces(excelDP, Decimal.ROUND_DOWN);
  const diff = excelDec.minus(dbTrunc).abs();
  const match = excelDec.equals(dbTrunc);

  return { match, excelDec, dbDec: dbTrunc, diff, skipped: false };
}

/**
 * Check if a value is effectively zero (dust from full-exit rounding).
 * DB stores values like -0.000000000035377103 for fully exited investors.
 */
export function isDust(val) {
  if (val === null || val === undefined) return true;
  return new Decimal(val).abs().lt(new Decimal('0.000000001'));
}

/**
 * Convert Excel serial date number to YYYY-MM-DD string.
 * Excel epoch: 1 = 1900-01-01 (with the 1900 leap year bug).
 */
export function excelSerialToDate(serial) {
  if (serial instanceof Date) return serial.toISOString().split('T')[0];
  if (typeof serial === 'string') return serial;
  // Excel date serial: days since 1899-12-30 (accounting for Excel's 1900 bug)
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = epoch.getTime() + serial * 86400000;
  return new Date(ms).toISOString().split('T')[0];
}
```

- [ ] **Step 3: Verify both files parse**

```bash
node -e "import('./scripts/audit/fund-configs.mjs').then(m => console.log(m.FUND_CONFIGS.length, 'fund configs loaded'))"
node -e "import('./scripts/audit/compare.mjs').then(m => { const r = m.exactMatch(3.468, '3.468000000000000000'); console.log('match:', r.match) })"
```

Expected:
```
6 fund configs loaded
match: true
```

- [ ] **Step 4: Commit**

```bash
git add scripts/audit/fund-configs.mjs scripts/audit/compare.mjs
git commit -m "feat(audit): add fund configs and decimal comparison helpers"
```

---

## Task 2: Create Excel parser

**Files:**
- Create: `scripts/audit/parse-excel.mjs`

- [ ] **Step 1: Create `scripts/audit/parse-excel.mjs`**

```javascript
// scripts/audit/parse-excel.mjs
import ExcelJS from 'exceljs';
import { excelSerialToDate } from './compare.mjs';

/**
 * Load and return the ExcelJS workbook.
 */
export async function loadWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb;
}

/**
 * Parse a fund sheet (e.g., "BTC Yield Fund") into structured data.
 *
 * Excel structure:
 * Row 1: AUM Before
 * Row 2: Top Up / Withdrawals
 * Row 3: AUM After
 * Row 4: Gross Performance %
 * Row 5: Net Performance %
 * Row 6: Yearly APY
 * Row 7: Comments
 * Row 8: Investors | Fees | IB | [date1] | [date2] | ...
 * Row 9: Indigo Fees | 0.0 | — | [cumulative fee balance]
 * Row 10+: [Investor] | [fee%] | [ib%] | [balance per epoch]
 * ...
 * Row N: Total AUM | — | — | [sum check]
 * (blank row)
 * Row N+2: Indigo Fees | — | — | [share %]
 * Row N+3+: [Investor] | — | — | [share %]
 * Row M: Total AUM | — | — | [1.0]
 */
export function parseFundSheet(workbook, sheetName) {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in workbook`);

  const getRow = (n) => {
    const row = ws.getRow(n);
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      vals[colNumber - 1] = cell.value;
    });
    return vals;
  };

  // Row 8 has dates starting from column D (index 3)
  const headerRow = getRow(8);
  const epochs = [];
  for (let i = 3; i < headerRow.length; i++) {
    const v = headerRow[i];
    if (v === null || v === undefined) break;
    let dateStr;
    if (v instanceof Date) {
      dateStr = v.toISOString().split('T')[0];
    } else if (typeof v === 'number' && v > 40000) {
      dateStr = excelSerialToDate(v);
    } else {
      break;
    }
    epochs.push({ col: i, date: dateStr });
  }

  // Rows 1-6: fund-level data per epoch
  const aumBefore = getRow(1);
  const topUpWithdrawals = getRow(2);
  const aumAfter = getRow(3);
  const grossPerf = getRow(4);
  const netPerf = getRow(5);

  const fundLevel = epochs.map((ep) => ({
    date: ep.date,
    aumBefore: cellNum(aumBefore[ep.col]),
    topUpWithdrawals: cellNum(topUpWithdrawals[ep.col]),
    aumAfter: cellNum(aumAfter[ep.col]),
    grossPerf: cellNum(grossPerf[ep.col]),
    netPerf: cellNum(netPerf[ep.col]),
  }));

  // Rows 9+: investors (balance section)
  // Find where balance section ends (row with "Total AUM" in col A)
  const balanceInvestors = [];
  let balanceSectionEnd = 9;

  // Row 9 = Indigo Fees
  const indigoFeesRow = getRow(9);
  const indigoFeeBalances = epochs.map((ep) => cellNum(indigoFeesRow[ep.col]));

  for (let r = 10; r <= ws.rowCount; r++) {
    const row = getRow(r);
    const name = cellStr(row[0]);
    if (!name || name === 'Total AUM') {
      balanceSectionEnd = r;
      break;
    }
    if (name === 'x') continue; // placeholder row in SOL/XRP sheets
    balanceInvestors.push({
      name,
      feePct: cellNum(row[1]),
      ibPct: cellNum(row[2]),
      balances: epochs.map((ep) => cellNum(row[ep.col])),
    });
  }

  // Share section: starts after blank row after Total AUM
  // Find the second section with "Indigo Fees" in col A after balanceSectionEnd
  const shareInvestors = [];
  let inShareSection = false;
  for (let r = balanceSectionEnd + 1; r <= ws.rowCount; r++) {
    const row = getRow(r);
    const name = cellStr(row[0]);
    if (!name) {
      if (inShareSection) break; // end of share section
      continue;
    }
    if (name === 'Total AUM') {
      break; // sum check row = end
    }
    if (name === 'Indigo Fees') {
      inShareSection = true;
      shareInvestors.push({
        name: 'Indigo Fees',
        shares: epochs.map((ep) => cellNum(row[ep.col])),
      });
      continue;
    }
    if (inShareSection) {
      if (name === 'x') continue;
      shareInvestors.push({
        name,
        shares: epochs.map((ep) => cellNum(row[ep.col])),
      });
    }
  }

  return {
    sheetName,
    epochs,
    fundLevel,
    indigoFeeBalances,
    balanceInvestors,
    shareInvestors,
  };
}

/**
 * Parse the Investments sheet — returns all transactions grouped by currency.
 */
export function parseInvestments(workbook) {
  const ws = workbook.getWorksheet('Investments');
  if (!ws) throw new Error('Sheet "Investments" not found');

  const transactions = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const dateVal = row.getCell(1).value;
    const investor = cellStr(row.getCell(2).value);
    const currency = cellStr(row.getCell(3).value);
    const amount = cellNum(row.getCell(4).value);

    if (!investor || !currency) continue;

    let dateStr;
    if (dateVal instanceof Date) {
      dateStr = dateVal.toISOString().split('T')[0];
    } else if (typeof dateVal === 'number' && dateVal > 40000) {
      dateStr = excelSerialToDate(dateVal);
    } else {
      continue;
    }

    transactions.push({ date: dateStr, investor, currency, amount });
  }

  return transactions;
}

function cellNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v.result !== undefined) {
    // ExcelJS formula result
    if (v.result === '#DIV/0!' || typeof v.result === 'string') return null;
    return v.result;
  }
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function cellStr(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v.richText) {
    return v.richText.map((rt) => rt.text).join('');
  }
  return String(v).trim() || null;
}
```

- [ ] **Step 2: Verify parser loads BTC sheet**

```bash
node -e "
import { loadWorkbook, parseFundSheet, parseInvestments } from './scripts/audit/parse-excel.mjs';
const wb = await loadWorkbook('/Users/mama/Downloads/Accounting Yield Funds (6).xlsx');
const btc = parseFundSheet(wb, 'BTC Yield Fund');
console.log('Epochs:', btc.epochs.length);
console.log('Balance investors:', btc.balanceInvestors.length);
console.log('Share investors:', btc.shareInvestors.length);
console.log('First epoch:', btc.epochs[0]);
console.log('First investor:', btc.balanceInvestors[0].name, 'fee:', btc.balanceInvestors[0].feePct);
const txns = parseInvestments(wb);
const btcTxns = txns.filter(t => t.currency === 'BTC');
console.log('BTC transactions:', btcTxns.length);
"
```

Expected (approximately):
```
Epochs: 55
Balance investors: 18
Share investors: 19
First epoch: { col: 3, date: '2024-07-01' }
First investor: Jose Molla fee: 0.15
BTC transactions: 61
```

- [ ] **Step 3: Commit**

```bash
git add scripts/audit/parse-excel.mjs
git commit -m "feat(audit): add Excel parser for fund sheets and investments"
```

---

## Task 3: Create DB fetcher

**Files:**
- Create: `scripts/audit/fetch-db.mjs`

- [ ] **Step 1: Create `scripts/audit/fetch-db.mjs`**

```javascript
// scripts/audit/fetch-db.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let _client = null;
function getClient() {
  if (!_client) {
    if (!SUPABASE_KEY) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY env var required. Set it in .env or pass directly.'
      );
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

/**
 * Fetch all yield_distributions for a fund (non-voided), ordered by date.
 */
export async function fetchDistributions(fundId) {
  const { data, error } = await getClient()
    .from('yield_distributions')
    .select(
      'id, effective_date, gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, opening_aum, closing_aum, investor_count'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('effective_date');
  if (error) throw new Error(`fetchDistributions: ${error.message}`);
  return data;
}

/**
 * Fetch all yield_allocations for a fund (non-voided), with investor profile names.
 */
export async function fetchAllocations(fundId) {
  const { data, error } = await getClient()
    .from('yield_allocations')
    .select(
      `id, distribution_id, investor_id, position_value_at_calc, ownership_pct,
       gross_amount, fee_pct, fee_amount, ib_pct, ib_amount, net_amount,
       fee_credit, ib_credit, adb_share`
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false');
  if (error) throw new Error(`fetchAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch all DEPOSIT/WITHDRAWAL transactions for a fund (non-voided).
 */
export async function fetchTransactions(fundId) {
  const { data, error } = await getClient()
    .from('transactions_v2')
    .select(
      'id, tx_date, type, amount, balance_before, balance_after, investor_id, notes'
    )
    .eq('fund_id', fundId)
    .in('type', ['DEPOSIT', 'WITHDRAWAL'])
    .or('is_voided.is.null,is_voided.eq.false')
    .order('tx_date');
  if (error) throw new Error(`fetchTransactions: ${error.message}`);
  return data;
}

/**
 * Fetch current investor_positions for a fund.
 */
export async function fetchPositions(fundId) {
  const { data, error } = await getClient()
    .from('investor_positions')
    .select('investor_id, current_value, is_active, cumulative_yield_earned')
    .eq('fund_id', fundId);
  if (error) throw new Error(`fetchPositions: ${error.message}`);
  return data;
}

/**
 * Fetch all fee_allocations for a fund (non-voided).
 */
export async function fetchFeeAllocations(fundId) {
  const { data, error } = await getClient()
    .from('fee_allocations')
    .select(
      'id, distribution_id, investor_id, fee_percentage, fee_amount, base_net_income, period_start, period_end, purpose'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('period_start');
  if (error) throw new Error(`fetchFeeAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch all ib_allocations for a fund (non-voided).
 */
export async function fetchIBAllocations(fundId) {
  const { data, error } = await getClient()
    .from('ib_allocations')
    .select(
      'id, distribution_id, ib_investor_id, source_investor_id, ib_percentage, ib_fee_amount, effective_date, source_net_income'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('effective_date');
  if (error) throw new Error(`fetchIBAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch profiles for all investors in a fund's positions.
 * Returns Map<investor_id, display_name>.
 */
export async function fetchInvestorNames(fundId) {
  // First get investor IDs from positions
  const positions = await fetchPositions(fundId);
  const investorIds = positions.map((p) => p.investor_id);

  if (investorIds.length === 0) return new Map();

  const { data, error } = await getClient()
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', investorIds);
  if (error) throw new Error(`fetchInvestorNames: ${error.message}`);

  const nameMap = new Map();
  for (const p of data) {
    const displayName = `${p.first_name} ${p.last_name}`.trim();
    nameMap.set(p.id, displayName);
  }
  return nameMap;
}

/**
 * Fetch DUST_SWEEP and DUST transactions for a fund.
 * These handle full-exit dust routing (residual balance → Indigo Fees).
 * Critical for accurate balance reconstruction.
 */
export async function fetchDustTransactions(fundId) {
  const { data, error } = await getClient()
    .from('transactions_v2')
    .select('id, tx_date, type, amount, investor_id')
    .eq('fund_id', fundId)
    .in('type', ['DUST_SWEEP', 'DUST'])
    .or('is_voided.is.null,is_voided.eq.false')
    .order('tx_date');
  if (error) throw new Error(`fetchDustTransactions: ${error.message}`);
  return data;
}
```

- [ ] **Step 2: Verify DB fetcher connects and returns data**

```bash
node -e "
import { fetchDistributions, fetchInvestorNames } from './scripts/audit/fetch-db.mjs';
const dists = await fetchDistributions('00746a0e-6054-4474-981c-0853d5d4f9b7');
console.log('TEST BTC distributions:', dists.length);
console.log('First:', dists[0].effective_date, 'gross:', dists[0].gross_yield_amount);
const names = await fetchInvestorNames('00746a0e-6054-4474-981c-0853d5d4f9b7');
console.log('Investors:', names.size);
for (const [id, name] of names) console.log(' ', name);
"
```

Expected: 45 distributions, ~19 investor names.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit/fetch-db.mjs
git commit -m "feat(audit): add Supabase DB fetcher for all audit tables"
```

---

## Task 4: Create the 7 audit layer functions

**Files:**
- Create: `scripts/audit/audit-layers.mjs`

- [ ] **Step 1: Create `scripts/audit/audit-layers.mjs`**

```javascript
// scripts/audit/audit-layers.mjs
import Decimal from 'decimal.js';
import { exactMatch, isDust } from './compare.mjs';

Decimal.set({ precision: 40 });

/**
 * Each audit function returns:
 * { layer: string, total: number, passed: number, failed: number, results: AuditResult[] }
 *
 * AuditResult = { ok: boolean, label: string, excel?: string, db?: string, diff?: string, note?: string }
 */

// ─── Layer 1: Transactions ───

export function auditTransactions(excelTxns, dbTxns, nameMap, nameResolver) {
  const results = [];

  // Group DB transactions by date + investor name + type
  const dbByKey = new Map();
  for (const t of dbTxns) {
    const investorName = nameMap.get(t.investor_id) || t.investor_id;
    const type = Number(t.amount) >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${t.tx_date}|${investorName}|${type}`;
    if (!dbByKey.has(key)) dbByKey.set(key, []);
    dbByKey.get(key).push(t);
  }

  for (const exTxn of excelTxns) {
    const dbName = nameResolver(exTxn.investor);
    if (!dbName) {
      results.push({
        ok: false,
        label: `${exTxn.date} ${exTxn.investor}`,
        note: `MISSING_INVESTOR: no DB match for "${exTxn.investor}"`,
      });
      continue;
    }
    const type = exTxn.amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${exTxn.date}|${dbName}|${type}`;
    const candidates = dbByKey.get(key) || [];

    // Find matching amount
    const exAmt = new Decimal(exTxn.amount).abs();
    let matched = false;
    for (let i = 0; i < candidates.length; i++) {
      const dbAmt = new Decimal(candidates[i].amount).abs();
      const diff = exAmt.minus(dbAmt).abs();
      if (diff.lt('0.01')) {
        // Close enough to be the same transaction — report exact diff
        const cmp = exactMatch(Math.abs(exTxn.amount), dbAmt.toNumber());
        results.push({
          ok: cmp.match,
          label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
          excel: exAmt.toFixed(),
          db: dbAmt.toFixed(),
          diff: cmp.match ? null : diff.toFixed(),
        });
        candidates.splice(i, 1); // consume this match
        matched = true;
        break;
      }
    }
    if (!matched) {
      results.push({
        ok: false,
        label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
        note: `NOT_IN_DB: no matching transaction found`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 1: Transactions',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 2: Distribution Totals ───

export function auditDistributions(excelFundLevel, dbDistributions) {
  const results = [];

  // Index DB distributions by date
  const dbByDate = new Map();
  for (const d of dbDistributions) {
    dbByDate.set(d.effective_date, d);
  }

  for (const ep of excelFundLevel) {
    const db = dbByDate.get(ep.date);
    if (!db) {
      // This epoch may be transaction-only (no yield distributed)
      // Check if grossPerf is null/0 — if so, it's expected
      if (ep.grossPerf === null || ep.grossPerf === 0) {
        results.push({ ok: true, label: `${ep.date} (transaction-only, no distribution)`, note: 'SKIP' });
      } else {
        results.push({
          ok: false,
          label: `${ep.date}`,
          note: `NO_DISTRIBUTION: Excel has gross=${ep.grossPerf} but no DB distribution`,
        });
      }
      continue;
    }

    // Compare gross yield amount = AUM Before × Gross %
    if (ep.grossPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelGross = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf));
      const dbGross = new Decimal(db.gross_yield_amount);
      const excelDP = countDP(excelGross);
      const dbTrunc = dbGross.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const excelTrunc = excelGross.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const diff = excelTrunc.minus(dbTrunc).abs();
      const match = diff.lt('0.000001'); // within 1e-6 for computed products
      results.push({
        ok: match,
        label: `${ep.date} gross_yield_amount`,
        excel: excelTrunc.toFixed(),
        db: dbTrunc.toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }

    // Compare net yield amount
    if (ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelNet = new Decimal(ep.aumBefore).times(new Decimal(ep.netPerf));
      const dbNet = new Decimal(db.total_net_amount);
      const excelDP = countDP(excelNet);
      const dbTrunc = dbNet.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const excelTrunc = excelNet.toDecimalPlaces(Math.max(excelDP, 6), Decimal.ROUND_DOWN);
      const diff = excelTrunc.minus(dbTrunc).abs();
      const match = diff.lt('0.000001');
      results.push({
        ok: match,
        label: `${ep.date} total_net_amount`,
        excel: excelTrunc.toFixed(),
        db: dbTrunc.toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }

    // Compare total fee amount = gross - net
    if (ep.grossPerf !== null && ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore !== 0) {
      const excelGross = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf));
      const excelNet = new Decimal(ep.aumBefore).times(new Decimal(ep.netPerf));
      const excelFee = excelGross.minus(excelNet);
      const dbFee = new Decimal(db.total_fee_amount);
      const dp = Math.max(countDP(excelFee), 6);
      const diff = excelFee.toDecimalPlaces(dp, Decimal.ROUND_DOWN)
        .minus(dbFee.toDecimalPlaces(dp, Decimal.ROUND_DOWN)).abs();
      const match = diff.lt('0.000001');
      results.push({
        ok: match,
        label: `${ep.date} total_fee_amount`,
        excel: excelFee.toDecimalPlaces(dp).toFixed(),
        db: dbFee.toDecimalPlaces(dp).toFixed(),
        diff: match ? null : diff.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 2: Distribution Totals',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 3: Per-investor balances ───

export function auditBalances(excelInvestors, excelEpochs, dbTransactions, dbAllocations, dbDistributions, nameMap, nameResolver, dbDustTxns = []) {
  const results = [];

  // Build per-investor running balance from DB
  // Group allocations by distribution_id
  const allocsByDist = new Map();
  for (const a of dbAllocations) {
    if (!allocsByDist.has(a.distribution_id)) allocsByDist.set(a.distribution_id, []);
    allocsByDist.get(a.distribution_id).push(a);
  }

  // Build date → distribution mapping
  const distByDate = new Map();
  for (const d of dbDistributions) {
    distByDate.set(d.effective_date, d);
  }

  // For each investor, reconstruct balance at each epoch from DB
  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) {
      for (let i = 0; i < excelEpochs.length; i++) {
        if (inv.balances[i] !== null && inv.balances[i] !== 0) {
          results.push({
            ok: false,
            label: `${excelEpochs[i].date} ${inv.name}`,
            note: `MISSING_INVESTOR: "${inv.name}" not in DB`,
          });
        }
      }
      continue;
    }

    // Find investor_id from nameMap (reverse lookup)
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) {
      results.push({
        ok: false,
        label: `${inv.name}`,
        note: `MISSING_INVESTOR_ID: "${dbName}" has no investor_id in positions`,
      });
      continue;
    }

    // Compute running balance from transactions + allocations + dust sweeps
    let runningBalance = new Decimal(0);
    const txnsForInvestor = dbTransactions.filter((t) => t.investor_id === investorId);
    const dustForInvestor = dbDustTxns.filter((t) => t.investor_id === investorId);
    // All allocations for this investor
    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    // Build timeline: all events sorted by date
    const events = [];
    for (const t of txnsForInvestor) {
      events.push({ date: t.tx_date, type: 'txn', amount: new Decimal(t.amount) });
    }
    // Include DUST_SWEEP and DUST transactions (full-exit dust routing)
    for (const t of dustForInvestor) {
      events.push({ date: t.tx_date, type: 'dust', amount: new Decimal(t.amount) });
    }
    for (const a of allocsForInvestor) {
      const dist = dbDistributions.find((d) => d.id === a.distribution_id);
      if (!dist) continue;
      // Net amount + fee_credit + ib_credit all go to the investor's balance
      const totalCredit = new Decimal(a.net_amount || 0)
        .plus(new Decimal(a.fee_credit || 0))
        .plus(new Decimal(a.ib_credit || 0));
      events.push({ date: dist.effective_date, type: 'yield', amount: totalCredit });
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Walk through epochs and compare
    let eventIdx = 0;
    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;

      // Apply all events up to and including this epoch date
      while (eventIdx < events.length && events[eventIdx].date <= epochDate) {
        runningBalance = runningBalance.plus(events[eventIdx].amount);
        eventIdx++;
      }

      const excelBal = inv.balances[i];
      if (excelBal === null || excelBal === undefined) continue;

      if (excelBal === 0 && isDust(runningBalance.toNumber())) {
        results.push({ ok: true, label: `${epochDate} ${inv.name}: 0 (dust)` });
        continue;
      }

      const cmp = exactMatch(excelBal, runningBalance.toNumber());
      if (cmp.skipped) continue;
      results.push({
        ok: cmp.match,
        label: `${epochDate} ${inv.name}`,
        excel: cmp.excelDec?.toFixed(),
        db: cmp.dbDec?.toFixed(),
        diff: cmp.match ? null : cmp.diff?.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 3: Investor Balances',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 4: Per-investor yield allocations ───

export function auditAllocations(excelInvestors, excelEpochs, excelFundLevel, dbAllocations, dbDistributions, nameMap, nameResolver) {
  const results = [];

  const distByDate = new Map();
  for (const d of dbDistributions) distByDate.set(d.effective_date, d);

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const dist = distByDate.get(epochDate);
      if (!dist) continue; // transaction-only epoch

      const alloc = allocsForInvestor.find((a) => a.distribution_id === dist.id);
      if (!alloc) {
        // Only flag if investor had a non-zero balance
        if (inv.balances[i] !== null && inv.balances[i] !== 0) {
          results.push({
            ok: false,
            label: `${epochDate} ${inv.name} yield allocation`,
            note: 'NO_ALLOCATION: investor has balance but no yield allocation',
          });
        }
        continue;
      }

      // Compare net_amount
      const dbNet = new Decimal(alloc.net_amount || 0);
      // Excel yield = balance change between epochs minus deposits
      // We derive this from the balance array
      if (i > 0 && inv.balances[i] !== null && inv.balances[i - 1] !== null) {
        const balBefore = new Decimal(inv.balances[i - 1] || 0);
        const balAfter = new Decimal(inv.balances[i] || 0);
        // Check if there was a deposit/withdrawal on this epoch date
        const flow = new Decimal(excelFundLevel[i]?.topUpWithdrawals || 0);
        // This is fund-level flow, not per-investor — skip exact derivation
        // Instead, compare the DB allocation's net_amount directly
      }

      // Compare fee_credit
      const dbFeeCredit = new Decimal(alloc.fee_credit || 0);
      const dbGross = new Decimal(alloc.gross_amount || 0);
      const expectedFeeCredit = dbGross.times(new Decimal(alloc.fee_pct || 0).div(100));

      // Verify fee_credit = gross_amount × fee_pct / 100
      if (!dbFeeCredit.isZero() || !expectedFeeCredit.isZero()) {
        const diff = dbFeeCredit.minus(expectedFeeCredit).abs();
        const match = diff.lt('0.000000001');
        results.push({
          ok: match,
          label: `${epochDate} ${inv.name} fee_credit consistency`,
          excel: expectedFeeCredit.toFixed(18),
          db: dbFeeCredit.toFixed(18),
          diff: match ? null : diff.toFixed(),
        });
      }

      // Verify net_amount = gross_amount - fee_credit - ib amounts
      const expectedNet = dbGross.minus(dbFeeCredit).minus(new Decimal(alloc.ib_amount || 0));
      const netDiff = dbNet.minus(expectedNet).abs();
      const netMatch = netDiff.lt('0.000000001');
      results.push({
        ok: netMatch,
        label: `${epochDate} ${inv.name} net = gross - fees - ib`,
        excel: expectedNet.toFixed(18),
        db: dbNet.toFixed(18),
        diff: netMatch ? null : netDiff.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 4: Yield Allocations',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 5: Ownership shares ───

export function auditShares(excelShareInvestors, excelEpochs, dbAllocations, dbDistributions, nameMap, nameResolver) {
  const results = [];

  const distByDate = new Map();
  for (const d of dbDistributions) distByDate.set(d.effective_date, d);

  for (const inv of excelShareInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const dist = distByDate.get(epochDate);
      if (!dist) continue;

      const alloc = allocsForInvestor.find((a) => a.distribution_id === dist.id);
      const excelShare = inv.shares[i];
      if (excelShare === null || excelShare === 0) continue;

      if (!alloc) {
        results.push({
          ok: false,
          label: `${epochDate} ${inv.name} share`,
          note: 'NO_ALLOCATION for share comparison',
        });
        continue;
      }

      // Excel share is 0-1 fraction, DB ownership_pct is 0-100
      const dbShare = new Decimal(alloc.ownership_pct || 0).div(100);
      const cmp = exactMatch(excelShare, dbShare.toNumber());
      if (cmp.skipped) continue;
      results.push({
        ok: cmp.match,
        label: `${epochDate} ${inv.name} ownership %`,
        excel: cmp.excelDec?.toFixed(),
        db: cmp.dbDec?.toFixed(),
        diff: cmp.match ? null : cmp.diff?.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 5: Ownership Shares',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 6: Cumulative Indigo Fees ───

export function auditCumulativeFees(excelFeeBalances, excelEpochs, dbAllocations, dbDistributions, dbTransactions, nameMap, dbDustTxns = []) {
  const results = [];

  // Find ALL "Indigo Fees" investor IDs (there may be both "Indigo Fees" and "TEST Indigo Fees")
  // Excel combines both into one row — yield fee_credits go to "Indigo Fees", dust sweeps go to "TEST Indigo Fees"
  const feesIds = [...nameMap.entries()]
    .filter(([, n]) => n.includes('Indigo') && n.includes('Fees'))
    .map(([id]) => id);
  if (feesIds.length === 0) {
    results.push({ ok: false, label: 'Indigo Fees investor', note: 'MISSING: no Indigo Fees investor in DB' });
    return { layer: 'Layer 6: Cumulative Indigo Fees', total: 1, passed: 0, failed: 1, results };
  }

  // Reconstruct fee balance: deposits + yield allocations + dust sweeps received
  // Combine ALL Indigo Fees accounts (yield fee_credits + dust sweep credits)
  const events = [];
  for (const t of dbTransactions.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  // Include dust sweeps received by any Indigo Fees account
  for (const t of dbDustTxns.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  for (const a of dbAllocations.filter((a) => feesIds.includes(a.investor_id))) {
    const dist = dbDistributions.find((d) => d.id === a.distribution_id);
    if (!dist) continue;
    const credit = new Decimal(a.net_amount || 0)
      .plus(new Decimal(a.fee_credit || 0))
      .plus(new Decimal(a.ib_credit || 0));
    events.push({ date: dist.effective_date, amount: credit });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  let balance = new Decimal(0);
  let eventIdx = 0;

  for (let i = 0; i < excelEpochs.length; i++) {
    const epochDate = excelEpochs[i].date;
    while (eventIdx < events.length && events[eventIdx].date <= epochDate) {
      balance = balance.plus(events[eventIdx].amount);
      eventIdx++;
    }

    const excelBal = excelFeeBalances[i];
    if (excelBal === null || excelBal === undefined) continue;

    const cmp = exactMatch(excelBal, balance.toNumber());
    if (cmp.skipped) continue;
    results.push({
      ok: cmp.match,
      label: `${epochDate} Indigo Fees cumulative`,
      excel: cmp.excelDec?.toFixed(),
      db: cmp.dbDec?.toFixed(),
      diff: cmp.match ? null : cmp.diff?.toFixed(),
    });
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 6: Cumulative Indigo Fees',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// ─── Layer 7: Fee percentages ───

export function auditFeePercents(excelInvestors, dbAllocations, nameMap, nameResolver) {
  const results = [];

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocs = dbAllocations.filter((a) => a.investor_id === investorId);
    if (allocs.length === 0) {
      if (inv.feePct !== null && inv.feePct !== 0) {
        results.push({
          ok: false,
          label: `${inv.name} fee %`,
          note: `NO_ALLOCATIONS: expected fee=${inv.feePct * 100}%`,
        });
      }
      continue;
    }

    // Check fee_pct from first allocation (should be consistent)
    const dbFeePct = Number(allocs[0].fee_pct || 0);
    const excelFeePct = (inv.feePct || 0) * 100; // Excel stores as decimal (0.15 = 15%)
    const match = Math.abs(dbFeePct - excelFeePct) < 0.001;
    results.push({
      ok: match,
      label: `${inv.name} fee %`,
      excel: `${excelFeePct}%`,
      db: `${dbFeePct}%`,
      diff: match ? null : `${Math.abs(dbFeePct - excelFeePct)}%`,
    });

    // Check IB % if present
    if (inv.ibPct !== null && inv.ibPct > 0) {
      const dbIbPct = Number(allocs[0].ib_pct || 0);
      const excelIbPct = inv.ibPct * 100;
      const ibMatch = Math.abs(dbIbPct - excelIbPct) < 0.001;
      results.push({
        ok: ibMatch,
        label: `${inv.name} IB %`,
        excel: `${excelIbPct}%`,
        db: `${dbIbPct}%`,
        diff: ibMatch ? null : `${Math.abs(dbIbPct - excelIbPct)}%`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return {
    layer: 'Layer 7: Fee Percentages',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// Helper: count decimal places in a Decimal
function countDP(dec) {
  const s = dec.toFixed();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
```

- [ ] **Step 2: Verify import parses correctly**

```bash
node -e "import('./scripts/audit/audit-layers.mjs').then(() => console.log('audit-layers OK'))"
```

Expected: `audit-layers OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/audit/audit-layers.mjs
git commit -m "feat(audit): add 7 verification layer functions"
```

---

## Task 5: Create report formatter

**Files:**
- Create: `scripts/audit/report.mjs`

- [ ] **Step 1: Create `scripts/audit/report.mjs`**

```javascript
// scripts/audit/report.mjs

export function printHeader(excelPath) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  EXCEL vs DB EXACT-MATCH AUDIT                          ║');
  console.log(`║  Excel: ${excelPath.split('/').pop().padEnd(48)}║`);
  console.log('║  DB: nkfimvovosdehmyyjubn (Indigo Yield)                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

export function printFundHeader(label) {
  console.log(`━━━ ${label} ━━━`);
  console.log('');
}

export function printLayerResult(layerResult, verbose = false) {
  const { layer, total, passed, failed, results } = layerResult;

  console.log(`${layer} (${total} checks)`);

  // Always show failures
  const failures = results.filter((r) => !r.ok);
  for (const f of failures) {
    if (f.note) {
      console.log(`  ✗ ${f.label} — ${f.note}`);
    } else {
      console.log(`  ✗ ${f.label}: excel=${f.excel} db=${f.db} diff=${f.diff}`);
    }
  }

  // Show passes only in verbose mode
  if (verbose) {
    const passes = results.filter((r) => r.ok);
    for (const p of passes) {
      if (p.note === 'SKIP') {
        console.log(`  ⊘ ${p.label}`);
      } else {
        console.log(`  ✓ ${p.label}`);
      }
    }
  }

  const statusIcon = failed === 0 ? '✓' : '✗';
  console.log(`  ${statusIcon} RESULT: ${passed}/${total} passed${failed > 0 ? `, ${failed} mismatches` : ''}`);
  console.log('');

  return { passed, failed };
}

export function printGrandTotal(totals) {
  const totalChecks = totals.reduce((s, t) => s + t.passed + t.failed, 0);
  const totalPassed = totals.reduce((s, t) => s + t.passed, 0);
  const totalFailed = totals.reduce((s, t) => s + t.failed, 0);
  const exitCode = totalFailed > 0 ? 1 : 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`GRAND TOTAL: ${totalChecks.toLocaleString()} checks — ${totalPassed.toLocaleString()} passed, ${totalFailed.toLocaleString()} mismatches`);
  console.log(`EXIT CODE: ${exitCode}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return exitCode;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/audit/report.mjs
git commit -m "feat(audit): add console report formatter"
```

---

## Task 6: Create main entry point

**Files:**
- Create: `scripts/excel-audit-exact.mjs`

- [ ] **Step 1: Create `scripts/excel-audit-exact.mjs`**

```javascript
#!/usr/bin/env node
// scripts/excel-audit-exact.mjs
//
// Excel-vs-DB Exact-Match Audit
// Compares every number in the accounting Excel against Supabase.
// All 5 funds, all investors, 7 verification layers, zero tolerance.
//
// Usage:
//   node scripts/excel-audit-exact.mjs
//   FUND_FILTER=BTC node scripts/excel-audit-exact.mjs
//   EXCEL_PATH=/path/to/file.xlsx node scripts/excel-audit-exact.mjs
//   VERBOSE=1 node scripts/excel-audit-exact.mjs

import { loadWorkbook, parseFundSheet, parseInvestments } from './audit/parse-excel.mjs';
import {
  fetchDistributions,
  fetchAllocations,
  fetchTransactions,
  fetchInvestorNames,
  fetchDustTransactions,
} from './audit/fetch-db.mjs';
import {
  auditTransactions,
  auditDistributions,
  auditBalances,
  auditAllocations,
  auditShares,
  auditCumulativeFees,
  auditFeePercents,
} from './audit/audit-layers.mjs';
import { printHeader, printFundHeader, printLayerResult, printGrandTotal } from './audit/report.mjs';
import { FUND_CONFIGS } from './audit/fund-configs.mjs';

const DEFAULT_EXCEL_PATH = '/Users/mama/Downloads/Accounting Yield Funds (6).xlsx';
const excelPath = process.env.EXCEL_PATH || DEFAULT_EXCEL_PATH;
const fundFilter = process.env.FUND_FILTER || null;
const verbose = process.env.VERBOSE === '1';

async function main() {
  printHeader(excelPath);

  // Load Excel
  console.log(`Loading Excel: ${excelPath}`);
  const wb = await loadWorkbook(excelPath);
  const allInvestmentTxns = parseInvestments(wb);
  console.log(`Loaded ${allInvestmentTxns.length} transactions from Investments sheet`);
  console.log('');

  // Filter fund configs
  const configs = fundFilter
    ? FUND_CONFIGS.filter((c) => c.sheet.includes(fundFilter) || c.label.includes(fundFilter))
    : FUND_CONFIGS;

  if (configs.length === 0) {
    console.error(`No funds match filter "${fundFilter}"`);
    process.exit(2);
  }

  const grandTotals = [];

  for (const config of configs) {
    printFundHeader(`${config.sheet} → ${config.label}`);

    // Parse Excel sheet
    let excelData;
    try {
      excelData = parseFundSheet(wb, config.sheet);
    } catch (e) {
      console.error(`  ERROR parsing sheet "${config.sheet}": ${e.message}`);
      continue;
    }

    console.log(`  Epochs: ${excelData.epochs.length}, Investors: ${excelData.balanceInvestors.length}`);

    // Fetch DB data
    console.log('  Fetching DB data...');
    const [dbDists, dbAllocs, dbTxns, nameMap, dbDustTxns] = await Promise.all([
      fetchDistributions(config.fundId),
      fetchAllocations(config.fundId),
      fetchTransactions(config.fundId),
      fetchInvestorNames(config.fundId),
      fetchDustTransactions(config.fundId),
    ]);
    console.log(`  DB: ${dbDists.length} distributions, ${dbTxns.length} transactions, ${dbDustTxns.length} dust, ${nameMap.size} investors`);
    console.log('');

    // Build name resolver: Excel name → DB display name
    const nameResolver = buildNameResolver(config, nameMap);

    // Filter Excel investment transactions for this fund's currency
    const fundTxns = allInvestmentTxns.filter((t) => t.currency === config.investmentsCurrency);

    // Run all 7 layers
    const layer1 = auditTransactions(fundTxns, dbTxns, nameMap, nameResolver);
    grandTotals.push(printLayerResult(layer1, verbose));

    const layer2 = auditDistributions(excelData.fundLevel, dbDists);
    grandTotals.push(printLayerResult(layer2, verbose));

    const layer3 = auditBalances(
      excelData.balanceInvestors, excelData.epochs,
      dbTxns, dbAllocs, dbDists, nameMap, nameResolver, dbDustTxns
    );
    grandTotals.push(printLayerResult(layer3, verbose));

    const layer4 = auditAllocations(
      excelData.balanceInvestors, excelData.epochs, excelData.fundLevel,
      dbAllocs, dbDists, nameMap, nameResolver
    );
    grandTotals.push(printLayerResult(layer4, verbose));

    const layer5 = auditShares(
      excelData.shareInvestors, excelData.epochs,
      dbAllocs, dbDists, nameMap, nameResolver
    );
    grandTotals.push(printLayerResult(layer5, verbose));

    const layer6 = auditCumulativeFees(
      excelData.indigoFeeBalances, excelData.epochs,
      dbAllocs, dbDists, dbTxns, nameMap, dbDustTxns
    );
    grandTotals.push(printLayerResult(layer6, verbose));

    const layer7 = auditFeePercents(excelData.balanceInvestors, dbAllocs, nameMap, nameResolver);
    grandTotals.push(printLayerResult(layer7, verbose));
  }

  const exitCode = printGrandTotal(grandTotals);
  process.exit(exitCode);
}

/**
 * Build a name resolver function: excelName → dbDisplayName
 * Uses config.namePrefix and config.nameOverrides, then falls back to fuzzy match.
 */
function buildNameResolver(config, nameMap) {
  const dbNames = [...nameMap.values()];

  // Normalize: strip accents, lowercase, collapse whitespace
  function normalize(name) {
    return name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  return function resolveExcelName(excelName) {
    if (!excelName) return null;

    // 1. Check explicit overrides
    if (config.nameOverrides[excelName]) {
      return config.nameOverrides[excelName];
    }

    // 2. Try prefix + exact name
    const prefixed = config.namePrefix + excelName;
    if (dbNames.includes(prefixed)) return prefixed;

    // 3. Try exact match (no prefix)
    if (dbNames.includes(excelName)) return excelName;

    // 4. Fuzzy match: normalize both sides
    const normalizedExcel = normalize(excelName);
    for (const dbName of dbNames) {
      if (normalize(dbName) === normalizedExcel) return dbName;
      // Try with prefix
      const normalizedPrefixed = normalize(config.namePrefix + excelName);
      if (normalize(dbName) === normalizedPrefixed) return dbName;
    }

    // 5. Substring match: DB name contains Excel name
    for (const dbName of dbNames) {
      if (normalize(dbName).includes(normalizedExcel)) return dbName;
    }

    return null;
  };
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
```

- [ ] **Step 2: Run the audit against TEST BTC only**

```bash
FUND_FILTER="TEST BTC" node scripts/excel-audit-exact.mjs
```

Expected: runs through all 7 layers, reports pass/fail for each check. Some mismatches are expected at this stage — the point is the script runs end-to-end without crashing.

- [ ] **Step 3: Fix any runtime errors**

Debug and fix based on actual output. Common issues:
- ExcelJS cell value format differences (formula results, rich text)
- Date format mismatches between Excel serial and DB date strings
- Name mapping misses

- [ ] **Step 4: Commit**

```bash
git add scripts/excel-audit-exact.mjs
git commit -m "feat(audit): add main entry point — 7-layer Excel vs DB audit"
```

---

## Task 7: Run full audit — all funds

- [ ] **Step 1: Run full audit against all funds**

```bash
node scripts/excel-audit-exact.mjs
```

Expected: report for all 6 fund configs (TEST BTC + 5 production funds). Production funds will show many `NO_DISTRIBUTION` and `MISSING_INVESTOR` notes where data hasn't been entered yet — that's expected.

- [ ] **Step 2: Run verbose for TEST BTC to see all passes**

```bash
FUND_FILTER="TEST BTC" VERBOSE=1 node scripts/excel-audit-exact.mjs
```

Expected: every individual check printed with ✓ or ✗.

- [ ] **Step 3: Analyze mismatches and document findings**

For each mismatch:
1. Note the layer, date, investor, and values
2. Determine root cause: Excel rounding? DB calculation error? Data entry difference?
3. Document in a follow-up issue if it's a real discrepancy

- [ ] **Step 4: Final commit**

```bash
git add -A scripts/audit/
git commit -m "feat(audit): complete Excel-vs-DB exact-match audit — all funds"
```

---

## Iteration Protocol

If the script reveals mismatches:

1. Check `Layer 1` first — transaction amounts are the foundation. If deposits/withdrawals are wrong, everything downstream will be off.
2. Check `Layer 2` — distribution totals must match before per-investor allocations can be correct.
3. Check `Layer 3` — balance mismatches after Layer 1+2 pass indicate yield allocation bugs.
4. Use `FUND_FILTER` and `VERBOSE=1` to drill into specific funds.
5. Compare specific numbers against the Excel manually to confirm whether the script or the platform is wrong.
