#!/usr/bin/env node
/**
 * Analyze Excel Position Data Structure
 *
 * Hypothesis: Excel "latestPosition" values are ownership percentages (0-1),
 * not absolute token amounts.
 */

const fs = require("fs");
const path = require("path");

const excelData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);

console.log("=== EXCEL POSITION STRUCTURE ANALYSIS ===\n");

// For each fund, sum up all latestPosition values
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];

  if (!fund.investors || fund.investors.length === 0) {
    console.log(fundCode + ": No investors");
    return;
  }

  let totalPosition = 0;
  let investorCount = 0;
  const positions = [];

  fund.investors.forEach((inv) => {
    if (inv.name === "AUM Total" || !inv.name) return;

    const pos = inv.latestPosition || 0;
    totalPosition += pos;
    investorCount++;

    if (pos > 0) {
      positions.push({ name: inv.name, position: pos });
    }
  });

  console.log(fundCode + ":");
  console.log("  Investor count: " + investorCount);
  console.log("  Sum of latestPosition: " + totalPosition.toFixed(6));
  console.log(
    "  Interpretation: " +
      (totalPosition > 0.5 && totalPosition < 1.5
        ? "PERCENTAGES (sums to ~1.0)"
        : "ABSOLUTE VALUES")
  );

  // Show top positions
  positions.sort((a, b) => b.position - a.position);
  console.log("  Top 5 positions:");
  positions.slice(0, 5).forEach((p) => {
    console.log(
      "    " +
        p.name.padEnd(30) +
        " " +
        p.position.toFixed(6) +
        " (" +
        (p.position * 100).toFixed(2) +
        "%)"
    );
  });
  console.log("");
});

// Check if there's historical position data
console.log("\n=== CHECKING FOR HISTORICAL POSITION DATA ===\n");

const btcFund = excelData.funds["IND-BTC"];
if (btcFund && btcFund.investors) {
  console.log("Sample investor structure (IND-BTC first investor):");
  const sampleInv = btcFund.investors[0];
  console.log(JSON.stringify(sampleInv, null, 2));
}

// Check if there are position snapshots over time
console.log("\n=== CHECKING POSITION HISTORY STRUCTURE ===\n");

Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  if (!fund.investors || fund.investors.length === 0) return;

  const sampleInv = fund.investors.find((i) => i.name && i.name !== "AUM Total");
  if (!sampleInv) return;

  console.log(fundCode + " - Sample investor: " + sampleInv.name);
  console.log("  Fields: " + Object.keys(sampleInv).join(", "));

  if (sampleInv.positions) {
    console.log("  Has positions array: YES (" + sampleInv.positions.length + " entries)");
    if (sampleInv.positions.length > 0) {
      console.log("  First position: " + JSON.stringify(sampleInv.positions[0]));
      console.log(
        "  Last position: " + JSON.stringify(sampleInv.positions[sampleInv.positions.length - 1])
      );
    }
  } else {
    console.log("  Has positions array: NO");
  }
  console.log("");
});

// Check monthly performance structure
console.log("\n=== MONTHLY PERFORMANCE DATA (Sample) ===\n");

if (excelData.monthlyPerformance && excelData.monthlyPerformance.length > 0) {
  console.log("First 3 monthly performance entries:");
  excelData.monthlyPerformance.slice(0, 3).forEach((mp, i) => {
    console.log(i + 1 + ". Date: " + mp.date);
    console.log("   Net Performance: " + JSON.stringify(mp.netPerformance));
  });
}

// Check BTC daily data for AUM
console.log("\n=== BTC FUND AUM OVER TIME ===\n");

if (btcFund && btcFund.dailyData) {
  console.log("Date            | AUM");
  console.log("-".repeat(35));

  // Show select dates
  const keyDates = btcFund.dailyData.filter(
    (d) => d.date.endsWith("-01") || d.date.includes("2025-12") || d.date.includes("2026-01")
  );

  keyDates.slice(-15).forEach((d) => {
    console.log(d.date + "      | " + (d.aum || 0).toFixed(4));
  });
}

// Calculate expected absolute positions from percentages
console.log("\n=== CONVERTING PERCENTAGE POSITIONS TO ABSOLUTE ===\n");

// Get latest AUM for each fund
const fundAUM = {};

if (btcFund && btcFund.dailyData) {
  const lastEntry = btcFund.dailyData[btcFund.dailyData.length - 1];
  fundAUM["IND-BTC"] = lastEntry.aum;
}

// For other funds, we'd need to calculate from investors or use the AUM row
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  if (!fund.investors) return;

  // Find AUM Total row
  const aumRow = fund.investors.find((i) => i.name === "AUM Total");
  if (aumRow && aumRow.latestPosition) {
    fundAUM[fundCode] = aumRow.latestPosition;
  }
});

console.log("Fund AUM from Excel:");
Object.keys(fundAUM).forEach((f) => {
  console.log("  " + f + ": " + fundAUM[f]);
});

// Now recalculate absolute positions
console.log("\n=== SAMPLE ABSOLUTE POSITION CALCULATIONS ===\n");

Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  if (!fund.investors) return;

  const aum = fundAUM[fundCode];
  if (!aum) {
    console.log(fundCode + ": No AUM found");
    return;
  }

  console.log(fundCode + " (AUM: " + aum + "):");

  fund.investors
    .filter((i) => i.name && i.name !== "AUM Total" && i.latestPosition > 0)
    .slice(0, 5)
    .forEach((inv) => {
      const pctPosition = inv.latestPosition;
      const absPosition = pctPosition * aum;
      console.log(
        "  " +
          inv.name.padEnd(30) +
          " | " +
          (pctPosition * 100).toFixed(2) +
          "% | Absolute: " +
          absPosition.toFixed(4)
      );
    });

  console.log("");
});
