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
  const shareInvestors = [];
  let inShareSection = false;
  for (let r = balanceSectionEnd + 1; r <= ws.rowCount; r++) {
    const row = getRow(r);
    const name = cellStr(row[0]);
    if (!name) {
      if (inShareSection) break;
      continue;
    }
    if (name === 'Total AUM') {
      break;
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
