#!/usr/bin/env node
/**
 * Phase 0: Reconcile Excel vs JSON Transactions
 * Identifies discrepancies between the accounting Excel and platform JSON
 */

const fs = require("fs");
const path = require("path");

// Excel serial date to JS Date
function excelDateToJS(serial) {
  if (!serial || typeof serial !== "number") return null;
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 86400000);
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

// Load data files
const excelInvestments = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/full_accounting_sheets/Investments.json", "utf8")
);

const platformTransactions = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/platform_transactions.json", "utf8")
);

const platformInvestors = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/platform_investors.json", "utf8")
);

// Create investor ID to name mapping
const investorIdToName = {};
platformInvestors.investors.forEach((inv) => {
  investorIdToName[inv.investor_id] = inv.name;
});

// Parse Excel transactions (skip header row)
const excelTxs = [];
for (let i = 1; i < excelInvestments.length; i++) {
  const row = excelInvestments[i];
  if (!row || row.length < 4 || !row[0]) continue;

  const dateSerial = row[0];
  const investorName = row[1];
  const currency = row[2];
  const amount = row[3];
  const usdValue = row[4] || 0;
  const notes = row[5] || "";

  if (typeof dateSerial !== "number") continue;

  const date = excelDateToJS(dateSerial);
  const type = amount < 0 ? "withdrawal" : "deposit";

  excelTxs.push({
    date: formatDate(date),
    dateSerial,
    investor: investorName,
    currency,
    amount: Math.abs(amount),
    signedAmount: amount,
    usdValue,
    type,
    notes,
    source: "excel",
  });
}

// Parse JSON transactions
const jsonTxs = platformTransactions.transactions.map((tx) => {
  const notes = tx.notes || "";
  const currencyMatch = notes.match(/Currency: (\w+)/);
  const currency = currencyMatch ? currencyMatch[1] : null;

  return {
    date: tx.date.split("T")[0],
    investor: investorIdToName[tx.investor_id] || tx.investor_id,
    investor_id: tx.investor_id,
    currency,
    amount: tx.amount,
    type: tx.transaction_type,
    notes: tx.notes,
    source: "json",
  };
});

console.log("=== PHASE 0: DATA RECONCILIATION ===\n");
console.log(`Excel Transactions: ${excelTxs.length}`);
console.log(`JSON Transactions: ${jsonTxs.length}`);
console.log(`Difference: ${excelTxs.length - jsonTxs.length}\n`);

// Normalize investor names for matching
function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[ç]/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

// Match transactions
const matched = [];
const excelOnly = [];
const jsonOnly = [];

const jsonMatched = new Set();

for (const excelTx of excelTxs) {
  let found = false;

  for (let j = 0; j < jsonTxs.length; j++) {
    if (jsonMatched.has(j)) continue;

    const jsonTx = jsonTxs[j];

    // Match criteria
    const dateMatch = excelTx.date === jsonTx.date;
    const nameMatch = normalizeName(excelTx.investor) === normalizeName(jsonTx.investor);
    const currencyMatch = excelTx.currency === jsonTx.currency;
    const amountMatch = Math.abs(excelTx.amount - jsonTx.amount) < 0.0001;
    const typeMatch = excelTx.type === jsonTx.type;

    if (dateMatch && nameMatch && currencyMatch && amountMatch && typeMatch) {
      matched.push({ excel: excelTx, json: jsonTx });
      jsonMatched.add(j);
      found = true;
      break;
    }
  }

  if (!found) {
    excelOnly.push(excelTx);
  }
}

// Find unmatched JSON transactions
jsonTxs.forEach((tx, i) => {
  if (!jsonMatched.has(i)) {
    jsonOnly.push(tx);
  }
});

console.log("=== MATCH RESULTS ===\n");
console.log(`Matched: ${matched.length}`);
console.log(`Excel Only: ${excelOnly.length}`);
console.log(`JSON Only: ${jsonOnly.length}\n`);

// List Excel-only transactions (missing from JSON)
console.log("=== TRANSACTIONS IN EXCEL BUT NOT IN JSON ===\n");
excelOnly.forEach((tx, i) => {
  console.log(
    `${i + 1}. ${tx.date} | ${tx.investor} | ${tx.currency} | ${tx.type} | ${tx.signedAmount} | ${tx.notes || ""}`
  );
});

console.log("\n=== TRANSACTIONS IN JSON BUT NOT IN EXCEL ===\n");
jsonOnly.forEach((tx, i) => {
  console.log(`${i + 1}. ${tx.date} | ${tx.investor} | ${tx.currency} | ${tx.type} | ${tx.amount}`);
});

// Unique investors in Excel
const excelInvestors = [...new Set(excelTxs.map((tx) => tx.investor))].sort();
console.log("\n=== UNIQUE INVESTORS IN EXCEL ===\n");
excelInvestors.forEach((inv, i) => {
  console.log(`${i + 1}. ${inv}`);
});

// Summary by month
console.log("\n=== TRANSACTION COUNT BY MONTH ===\n");
const byMonth = {};
excelTxs.forEach((tx) => {
  const month = tx.date.substring(0, 7);
  byMonth[month] = (byMonth[month] || 0) + 1;
});
Object.keys(byMonth)
  .sort()
  .forEach((month) => {
    console.log(`${month}: ${byMonth[month]} transactions`);
  });

// Create master transaction list
console.log("\n=== CREATING MASTER TRANSACTION LIST ===\n");

// Investor name to email mapping (from platform DB)
const investorEmailMap = {
  "Jose Molla": "jose.molla@example.com",
  "Kyle Gulamerian": "updated.email.1768776102586@test.indigo.fund",
  "Matthias Reiser": "matthias@example.com",
  "Thomas Puech": "thomas.puech@example.com",
  "Danielle Richetta": "danielle@example.com",
  "Nathanaël Cohen": "nathanael@indigo.fund",
  Blondish: "blondish@example.com",
  Victoria: "victoria.pc@example.com",
  Kabbaj: "kabbaj@example.com",
  "Babak Eftekhari": "babak.eftekhari@example.com",
  "INDIGO DIGITAL ASSET FUND LP": "Hello@test.fund",
  "Julien Grunebaum": "julien.grunebaum@example.com",
  "Daniele Francilia": "daniele.francilia@example.com",
  "Pierre Bezencon": "pierre.bezencon@example.com",
  "Pierre Bezençon": "pierre.bezencon@example.com",
  "Matthew Beatty": "matthew@example.com",
  "Bo De Kriek": "bokriek@example.com",
  "Bo De kriek": "bokriek@example.com",
  "Dario Deiana": "dario.deiana@example.com",
  "Alain Bensimon": "alain.bensimon@example.com",
  "Anne Cecile Noique": "anne.cecile.noique@example.com",
  "Terance Chen": "terance.chen@example.com",
  "Oliver Loisel": "oliver.loisel@example.com",
  "Advantage Blockchain": "advantage.blockchain@example.com",
  "INDIGO Ventures": "indigo.ventures@example.com",
  "Paul Johnson": "paul.johnson@example.com",
  "Tomer Zur": "tomer.zur@example.com",
  "Sacha Oshry": "sacha.oshry@example.com",
  HALLEY86: "halley86@example.com",
  "Indigo Fees": "indigo.lp@example.com", // System account
  "Nath & Thomas": "nath.thomas@example.com",
  "Sam Johnson": "sam.johnson@example.com",
  "Valeria Cruz": "valeria.cruz@example.com",
  "Ventures Life Style": "ventures.lifestyle@example.com",
  "Vivie & Liana": "vivie.liana@example.com",
  "Monica Levy Chicheportiche": "monica.levy.chicheportiche@example.com",
  "Brandon Hood": "brandon.hood@example.com",
  "NSVO Holdings": "nsvo.holdings@example.com",
  "danielle Richetta": "danielle@example.com", // case variant
};

// Fund code mapping
const currencyToFund = {
  BTC: "IND-BTC",
  ETH: "IND-ETH",
  USDT: "IND-USDT",
  SOL: "IND-SOL",
  XRP: "IND-XRP",
};

// Build master list from Excel (source of truth)
const masterTransactions = excelTxs
  .map((tx) => ({
    date: tx.date,
    investor_name: tx.investor,
    investor_email:
      investorEmailMap[tx.investor] ||
      `${tx.investor.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    currency: tx.currency,
    fund_code: currencyToFund[tx.currency],
    amount: tx.signedAmount,
    type: tx.type.toUpperCase(),
    usd_value: tx.usdValue,
    notes: tx.notes,
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

// Save master list
const output = {
  generated_at: new Date().toISOString(),
  total_transactions: masterTransactions.length,
  date_range: {
    start: masterTransactions[0]?.date,
    end: masterTransactions[masterTransactions.length - 1]?.date,
  },
  transactions: masterTransactions,
};

fs.writeFileSync(path.join(__dirname, "master-transactions.json"), JSON.stringify(output, null, 2));

console.log(`Master transaction list saved: scripts/master-transactions.json`);
console.log(`Total: ${masterTransactions.length} transactions`);

// Summary report
const report = {
  phase: "Phase 0 - Data Reconciliation",
  generated_at: new Date().toISOString(),
  excel_count: excelTxs.length,
  json_count: jsonTxs.length,
  matched: matched.length,
  excel_only: excelOnly.map((tx) => ({
    date: tx.date,
    investor: tx.investor,
    currency: tx.currency,
    amount: tx.signedAmount,
    type: tx.type,
  })),
  json_only: jsonOnly.map((tx) => ({
    date: tx.date,
    investor: tx.investor,
    currency: tx.currency,
    amount: tx.amount,
    type: tx.type,
  })),
  unique_investors: excelInvestors,
  monthly_counts: byMonth,
};

fs.writeFileSync(
  path.join(__dirname, "..", "tests", "TRANSACTION_RECONCILIATION.json"),
  JSON.stringify(report, null, 2)
);

console.log(`\nReconciliation report saved: tests/TRANSACTION_RECONCILIATION.json`);
