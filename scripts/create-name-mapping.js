#!/usr/bin/env node
/**
 * Create Name Mapping Between Excel and Platform Transactions
 *
 * This script:
 * 1. Extracts all unique investor names from master transactions
 * 2. Extracts all unique investor names from Excel
 * 3. Creates normalized versions for matching
 * 4. Identifies matches and mismatches
 * 5. Creates a mapping file for yield calculations
 */

const fs = require("fs");
const path = require("path");

// Load data
const excelData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);
const masterTx = JSON.parse(
  fs.readFileSync(path.join(__dirname, "master-transactions.json"), "utf8")
);

// Normalize name function - removes accents, lowercases, trims
function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s&]/g, "") // Remove special chars except &
    .replace(/\s+/g, " ")
    .trim();
}

// Extract unique names from transactions
const txNames = new Set();
masterTx.transactions.forEach((tx) => {
  if (tx.investor_name) {
    txNames.add(tx.investor_name);
  }
});

console.log("=== INVESTOR NAME MAPPING ANALYSIS ===\n");
console.log("Total unique investor names in transactions:", txNames.size);

// Extract unique names from Excel (all funds)
const excelNames = new Set();
const excelNamesByFund = {};

Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  excelNamesByFund[fundCode] = new Set();

  if (fund.investors) {
    fund.investors.forEach((inv) => {
      if (inv.name && inv.name !== "AUM Total") {
        excelNames.add(inv.name);
        excelNamesByFund[fundCode].add(inv.name);
      }
    });
  }
});

console.log("Total unique investor names in Excel:", excelNames.size);

// Create normalized maps
const txNormalizedMap = {}; // normalized -> original
const excelNormalizedMap = {}; // normalized -> original

txNames.forEach((name) => {
  const normalized = normalizeName(name);
  if (!txNormalizedMap[normalized]) {
    txNormalizedMap[normalized] = [];
  }
  txNormalizedMap[normalized].push(name);
});

excelNames.forEach((name) => {
  const normalized = normalizeName(name);
  if (!excelNormalizedMap[normalized]) {
    excelNormalizedMap[normalized] = [];
  }
  excelNormalizedMap[normalized].push(name);
});

// Find matches
console.log("\n=== EXACT MATCHES (after normalization) ===\n");
const exactMatches = [];
const txUnmatched = [];
const excelUnmatched = [];

Object.keys(txNormalizedMap).forEach((normalized) => {
  if (excelNormalizedMap[normalized]) {
    exactMatches.push({
      normalized,
      txNames: txNormalizedMap[normalized],
      excelNames: excelNormalizedMap[normalized],
    });
  } else {
    txNormalizedMap[normalized].forEach((name) => {
      txUnmatched.push({ original: name, normalized });
    });
  }
});

Object.keys(excelNormalizedMap).forEach((normalized) => {
  if (!txNormalizedMap[normalized]) {
    excelNormalizedMap[normalized].forEach((name) => {
      excelUnmatched.push({ original: name, normalized });
    });
  }
});

console.log("Matched investors:", exactMatches.length);
exactMatches.forEach((m) => {
  if (m.txNames.length > 1 || m.excelNames.length > 1) {
    console.log(
      "  VARIANTS: TX:",
      m.txNames.join(" / "),
      "  <->  Excel:",
      m.excelNames.join(" / ")
    );
  }
});

console.log("\n=== UNMATCHED IN TRANSACTIONS (not in Excel) ===\n");
console.log("Count:", txUnmatched.length);
txUnmatched.forEach((u) => {
  console.log("  " + u.original + "  (normalized: " + u.normalized + ")");
});

console.log("\n=== UNMATCHED IN EXCEL (not in Transactions) ===\n");
console.log("Count:", excelUnmatched.length);
excelUnmatched.forEach((u) => {
  console.log("  " + u.original + "  (normalized: " + u.normalized + ")");
});

// Try to find close matches using partial matching
console.log("\n=== POTENTIAL FUZZY MATCHES ===\n");

function findPotentialMatches(name, candidates) {
  const normalized = normalizeName(name);
  const words = normalized.split(" ");

  const matches = [];
  candidates.forEach((candidate) => {
    const candNorm = normalizeName(candidate);

    // Check if any word matches
    const candWords = candNorm.split(" ");
    const sharedWords = words.filter((w) => candWords.includes(w) && w.length > 2);

    if (sharedWords.length > 0) {
      matches.push({ candidate, sharedWords, candNorm });
    }
  });

  return matches;
}

// Try to match unmatched tx names to unmatched Excel names
const potentialMatches = [];
txUnmatched.forEach((u) => {
  const matches = findPotentialMatches(
    u.original,
    excelUnmatched.map((e) => e.original)
  );
  if (matches.length > 0) {
    potentialMatches.push({
      txName: u.original,
      potentialExcelMatches: matches,
    });
  }
});

potentialMatches.forEach((pm) => {
  console.log('TX: "' + pm.txName + '"');
  pm.potentialExcelMatches.forEach((m) => {
    console.log(
      '  -> Excel: "' + m.candidate + '" (shared words: ' + m.sharedWords.join(", ") + ")"
    );
  });
});

// Create manual mapping for known mismatches
console.log("\n=== CREATING FINAL MAPPING ===\n");

const manualMapping = {
  // Format: Excel name -> Transaction name (or null if no match)
  "Bo De kriek": "Bo De Kriek", // Case variant
  "Pierre Bezençon": "Pierre Bezencon", // Accent variant
  "Nathanael Cohen": "Nathanaël Cohen", // Accent variant
  Kyle: "Kyle Gulamerian", // Partial name
  Jose: "Jose Molla", // Partial name
  Danielle: "Danielle Richetta", // Partial name
  "danielle Richetta": "Danielle Richetta", // Case variant
  "Victoria PC": "Victoria", // Variant
};

// Build final mapping
const finalMapping = {};

// First, add all exact matches (use TX name as canonical)
exactMatches.forEach((m) => {
  const txName = m.txNames[0]; // Use first TX name as canonical
  m.excelNames.forEach((excelName) => {
    finalMapping[excelName] = txName;
  });
  m.txNames.forEach((txName2) => {
    finalMapping[txName2] = txName;
  });
});

// Add manual mappings
Object.keys(manualMapping).forEach((excelName) => {
  finalMapping[excelName] = manualMapping[excelName];
});

// Add remaining unmatched TX names (self-mapping)
txUnmatched.forEach((u) => {
  if (!finalMapping[u.original]) {
    finalMapping[u.original] = u.original;
  }
});

console.log("Final mapping entries:", Object.keys(finalMapping).length);

// Create detailed investor analysis
console.log("\n=== DETAILED INVESTOR ANALYSIS ===\n");

// Group transactions by normalized investor name
const investorTx = {};
masterTx.transactions.forEach((tx) => {
  const normalized = normalizeName(tx.investor_name);
  if (!investorTx[normalized]) {
    investorTx[normalized] = {
      names: new Set(),
      funds: {},
      totalTx: 0,
    };
  }
  investorTx[normalized].names.add(tx.investor_name);
  if (!investorTx[normalized].funds[tx.fund_code]) {
    investorTx[normalized].funds[tx.fund_code] = { deposits: 0, withdrawals: 0, net: 0 };
  }
  investorTx[normalized].funds[tx.fund_code].net += tx.amount;
  investorTx[normalized].totalTx++;
  if (tx.amount > 0) {
    investorTx[normalized].funds[tx.fund_code].deposits += tx.amount;
  } else {
    investorTx[normalized].funds[tx.fund_code].withdrawals += Math.abs(tx.amount);
  }
});

// Group Excel positions by normalized investor name
const investorExcel = {};
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  if (fund.investors) {
    fund.investors.forEach((inv) => {
      if (!inv.name || inv.name === "AUM Total") return;
      const normalized = normalizeName(inv.name);
      if (!investorExcel[normalized]) {
        investorExcel[normalized] = {
          names: new Set(),
          funds: {},
        };
      }
      investorExcel[normalized].names.add(inv.name);
      investorExcel[normalized].funds[fundCode] = {
        latestPosition: inv.latestPosition || 0,
        feePercent: inv.feePercent || 0.2,
      };
    });
  }
});

// Compare
console.log("Investor  | Fund     | TX Net       | Excel Pos    | Variance");
console.log("-".repeat(75));

const comparisons = [];
Object.keys(investorTx).forEach((normalized) => {
  const tx = investorTx[normalized];
  const excel = investorExcel[normalized];

  Object.keys(tx.funds).forEach((fundCode) => {
    const txNet = tx.funds[fundCode].net;
    const excelPos = excel && excel.funds[fundCode] ? excel.funds[fundCode].latestPosition : null;

    comparisons.push({
      normalized,
      txName: Array.from(tx.names)[0],
      excelName: excel ? Array.from(excel.names)[0] : "N/A",
      fund: fundCode,
      txNet,
      excelPos,
      variance: excelPos !== null ? excelPos - txNet : null,
      hasExcel: excel !== undefined && excel.funds[fundCode] !== undefined,
    });
  });
});

// Sort by absolute variance
comparisons
  .filter((c) => c.hasExcel)
  .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
  .slice(0, 30)
  .forEach((c) => {
    console.log(
      c.txName.substring(0, 25).padEnd(25) +
        " | " +
        c.fund.padEnd(8) +
        " | " +
        c.txNet.toFixed(4).padStart(12) +
        " | " +
        (c.excelPos !== null ? c.excelPos.toFixed(4) : "N/A").padStart(12) +
        " | " +
        (c.variance !== null ? c.variance.toFixed(4) : "N/A").padStart(12)
    );
  });

// Summary stats
console.log("\n=== SUMMARY STATISTICS ===\n");

const stats = {
  txInvestors: Object.keys(investorTx).length,
  excelInvestors: Object.keys(investorExcel).length,
  matched: 0,
  onlyTx: 0,
  onlyExcel: 0,
  totalVariance: 0,
};

Object.keys(investorTx).forEach((normalized) => {
  if (investorExcel[normalized]) {
    stats.matched++;
  } else {
    stats.onlyTx++;
  }
});

Object.keys(investorExcel).forEach((normalized) => {
  if (!investorTx[normalized]) {
    stats.onlyExcel++;
  }
});

console.log("Investors in transactions:", stats.txInvestors);
console.log("Investors in Excel:", stats.excelInvestors);
console.log("Matched (normalized):", stats.matched);
console.log("Only in transactions:", stats.onlyTx);
console.log("Only in Excel:", stats.onlyExcel);

// List investors only in TX
console.log("\n=== INVESTORS ONLY IN TRANSACTIONS ===");
Object.keys(investorTx).forEach((normalized) => {
  if (!investorExcel[normalized]) {
    const tx = investorTx[normalized];
    console.log("  " + Array.from(tx.names)[0] + " - Funds: " + Object.keys(tx.funds).join(", "));
  }
});

// List investors only in Excel
console.log("\n=== INVESTORS ONLY IN EXCEL ===");
Object.keys(investorExcel).forEach((normalized) => {
  if (!investorTx[normalized]) {
    const excel = investorExcel[normalized];
    console.log(
      "  " + Array.from(excel.names)[0] + " - Funds: " + Object.keys(excel.funds).join(", ")
    );
  }
});

// Save mapping
const output = {
  generated: new Date().toISOString(),
  summary: stats,
  exactMatches,
  txUnmatched,
  excelUnmatched,
  manualMapping,
  finalMapping,
  comparisons: comparisons.filter((c) => c.hasExcel),
};

fs.writeFileSync(
  path.join(__dirname, "name-mapping-results.json"),
  JSON.stringify(output, null, 2)
);

console.log("\n\nSaved to name-mapping-results.json");
