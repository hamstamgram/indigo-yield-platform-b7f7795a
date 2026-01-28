#!/usr/bin/env node
/**
 * Compare Excel expected positions vs our yield simulation
 */

const fs = require("fs");
const path = require("path");

// Load data
const excelData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);
const simResults = JSON.parse(
  fs.readFileSync(path.join(__dirname, "accurate-yield-results.json"), "utf8")
);

// Build Excel expected positions map
const excelPositions = {};
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  fund.investors.forEach((inv) => {
    const key = inv.name + "|" + fundCode;
    excelPositions[key] = {
      name: inv.name,
      fund: fundCode,
      expectedPosition: inv.latestPosition || 0,
      feePercent: inv.feePercent || 0.2,
    };
  });
});

// Build simulation positions map
const simPositions = {};
simResults.positions.forEach((p) => {
  const key = p.name + "|" + p.fund;
  simPositions[key] = {
    name: p.name,
    fund: p.fund,
    txSum: p.txSum,
    yield: p.yield,
    finalBalance: p.finalBalance,
  };
});

console.log("=== COMPARISON: Excel Expected vs Yield Simulation ===\n");
console.log(
  "Fund     | Investor                       | Excel Expected | Simulation     | Variance"
);
console.log("-".repeat(100));

const comparisons = [];
let totalVariance = 0;
let matchCount = 0;
let mismatchCount = 0;

Object.keys(excelPositions).forEach((key) => {
  const excel = excelPositions[key];
  const sim = simPositions[key];

  if (excel.expectedPosition === 0 && !sim) return; // Skip investors with no position

  const simFinal = sim ? sim.finalBalance : 0;
  const variance = excel.expectedPosition - simFinal;

  comparisons.push({
    fund: excel.fund,
    name: excel.name,
    excelExpected: excel.expectedPosition,
    simFinal: simFinal,
    variance: variance,
  });

  if (Math.abs(variance) < 0.01) {
    matchCount++;
  } else {
    mismatchCount++;
    totalVariance += Math.abs(variance);
  }
});

// Sort and print
comparisons
  .sort((a, b) => a.fund.localeCompare(b.fund) || a.name.localeCompare(b.name))
  .forEach((c) => {
    const status = Math.abs(c.variance) < 0.01 ? "✓" : "✗";
    console.log(
      c.fund.padEnd(8) +
        " | " +
        c.name.padEnd(30) +
        " | " +
        c.excelExpected.toFixed(6).padStart(14) +
        " | " +
        c.simFinal.toFixed(6).padStart(14) +
        " | " +
        c.variance.toFixed(6).padStart(12) +
        " " +
        status
    );
  });

// Summary by fund
console.log("\n=== FUND TOTALS COMPARISON ===\n");

const fundComparison = {};
comparisons.forEach((c) => {
  if (!fundComparison[c.fund]) {
    fundComparison[c.fund] = { excelTotal: 0, simTotal: 0, investors: 0 };
  }
  fundComparison[c.fund].excelTotal += c.excelExpected;
  fundComparison[c.fund].simTotal += c.simFinal;
  fundComparison[c.fund].investors++;
});

console.log("Fund     | Excel AUM         | Simulation AUM    | Variance          | Match?");
console.log("-".repeat(85));
Object.keys(fundComparison)
  .sort()
  .forEach((f) => {
    const fc = fundComparison[f];
    const variance = fc.excelTotal - fc.simTotal;
    const match = Math.abs(variance) < 1 ? "✓" : "✗";
    console.log(
      f.padEnd(8) +
        " | " +
        fc.excelTotal.toFixed(6).padStart(16) +
        " | " +
        fc.simTotal.toFixed(6).padStart(16) +
        " | " +
        variance.toFixed(6).padStart(16) +
        " | " +
        match
    );
  });

console.log("\n=== SUMMARY ===\n");
console.log("Positions matching (variance < 0.01): " + matchCount);
console.log("Positions mismatching: " + mismatchCount);
console.log("Total absolute variance: " + totalVariance.toFixed(6));

// Highlight significant mismatches
console.log("\n=== SIGNIFICANT MISMATCHES (variance > 0.1) ===\n");
const significant = comparisons.filter((c) => Math.abs(c.variance) > 0.1);
if (significant.length === 0) {
  console.log("None! All positions are within tolerance.");
} else {
  significant
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .forEach((c) => {
      console.log(
        c.fund +
          " | " +
          c.name.padEnd(30) +
          " | Excel: " +
          c.excelExpected.toFixed(6) +
          " | Sim: " +
          c.simFinal.toFixed(6) +
          " | Var: " +
          c.variance.toFixed(6)
      );
    });
}
