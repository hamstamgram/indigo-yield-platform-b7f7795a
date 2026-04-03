#!/usr/bin/env node
// scripts/excel-audit-exact.mjs
//
// Excel-vs-DB Exact-Match Audit
// Compares every number in the accounting Excel against Supabase.
// All 6 funds, all investors, 7 verification layers, zero tolerance.
//
// SETUP REQUIRED:
// Add to .env:
//   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
// Get from: https://app.supabase.com/project/nkfimvovosdehmyyjubn/settings/api
// (Service Role Key section under Auth)
//
// Usage:
//   node scripts/excel-audit-exact.mjs
//   FUND_FILTER="TEST BTC" node scripts/excel-audit-exact.mjs
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
