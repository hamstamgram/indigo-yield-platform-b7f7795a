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
