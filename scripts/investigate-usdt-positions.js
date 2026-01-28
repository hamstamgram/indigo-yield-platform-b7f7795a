#!/usr/bin/env node
/**
 * Investigate USDT Position Mismatch
 *
 * The Excel shows proper USDT values but the comparison finds tiny values.
 * This investigates the name matching issue.
 */

const fs = require("fs");
const path = require("path");

const excelData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);

console.log("=== USDT EXCEL INVESTOR ANALYSIS ===\n");

const usdtFund = excelData.funds["IND-USDT"];

if (!usdtFund || !usdtFund.investors) {
  console.log("No USDT fund data found");
  process.exit(1);
}

// List all USDT investors with their positions
console.log("All USDT investors in Excel:\n");
console.log("Name                               | Latest Position    | Fee %");
console.log("-".repeat(70));

const byName = {};
usdtFund.investors.forEach((inv) => {
  if (!inv.name || inv.name === "AUM Total") return;

  if (!byName[inv.name]) {
    byName[inv.name] = [];
  }
  byName[inv.name].push(inv);

  console.log(
    inv.name.padEnd(35) +
      " | " +
      (inv.latestPosition || 0).toFixed(6).padStart(18) +
      " | " +
      ((inv.feePercent || 0) * 100).toFixed(1) +
      "%"
  );
});

// Check for duplicate names
console.log("\n=== DUPLICATE NAMES ===\n");
Object.keys(byName).forEach((name) => {
  if (byName[name].length > 1) {
    console.log(name + ": " + byName[name].length + " entries");
    byName[name].forEach((inv, i) => {
      console.log("  " + (i + 1) + ". Position: " + (inv.latestPosition || 0).toFixed(6));
    });
  }
});

// Check for lowercase variants
console.log("\n=== CASE VARIANTS ===\n");
const lowerNames = {};
Object.keys(byName).forEach((name) => {
  const lower = name.toLowerCase();
  if (!lowerNames[lower]) {
    lowerNames[lower] = [];
  }
  lowerNames[lower].push(name);
});

Object.keys(lowerNames).forEach((lower) => {
  if (lowerNames[lower].length > 1) {
    console.log("Variants: " + lowerNames[lower].join(" / "));
  }
});

// Show investors with large positions
console.log("\n=== TOP 15 USDT POSITIONS ===\n");
const allInvestors = usdtFund.investors
  .filter((inv) => inv.name && inv.name !== "AUM Total")
  .sort((a, b) => (b.latestPosition || 0) - (a.latestPosition || 0));

allInvestors.slice(0, 15).forEach((inv, i) => {
  console.log(i + 1 + ". " + inv.name.padEnd(35) + " " + (inv.latestPosition || 0).toFixed(2));
});

// Show investors with tiny positions (likely percentages or errors)
console.log("\n=== TINY USDT POSITIONS (<1) ===\n");
const tinyPositions = allInvestors.filter(
  (inv) => (inv.latestPosition || 0) < 1 && (inv.latestPosition || 0) > 0
);
console.log("Count: " + tinyPositions.length);
tinyPositions.forEach((inv) => {
  console.log("  " + inv.name.padEnd(35) + " " + (inv.latestPosition || 0).toFixed(6));
});

// Normalize function
function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s&]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Build Excel lookup by normalized name
console.log("\n=== NORMALIZED NAME COLLISIONS ===\n");
const normalizedLookup = {};
usdtFund.investors.forEach((inv) => {
  if (!inv.name || inv.name === "AUM Total") return;
  const normalized = normalizeName(inv.name);
  if (!normalizedLookup[normalized]) {
    normalizedLookup[normalized] = [];
  }
  normalizedLookup[normalized].push(inv);
});

// Show collisions
Object.keys(normalizedLookup).forEach((normalized) => {
  const entries = normalizedLookup[normalized];
  if (entries.length > 1) {
    console.log('Normalized: "' + normalized + '"');
    entries.forEach((inv, i) => {
      console.log(
        "  " + (i + 1) + '. "' + inv.name + '" - Position: ' + (inv.latestPosition || 0).toFixed(6)
      );
    });

    // Show which one has the larger position
    const sorted = entries.sort((a, b) => (b.latestPosition || 0) - (a.latestPosition || 0));
    console.log(
      "  -> Largest: " + sorted[0].name + " with " + (sorted[0].latestPosition || 0).toFixed(2)
    );
    console.log("");
  }
});

// Check if the tiny values are in a specific range that suggests percentages
console.log("\n=== ANALYZING TINY VALUES STRUCTURE ===\n");
const sumTiny = tinyPositions.reduce((sum, inv) => sum + (inv.latestPosition || 0), 0);
console.log("Sum of tiny positions: " + sumTiny.toFixed(6));
console.log(
  "If these were percentages, they would represent " + (sumTiny * 100).toFixed(2) + "% of AUM"
);

// Total USDT AUM
const totalUSDT = allInvestors.reduce((sum, inv) => sum + (inv.latestPosition || 0), 0);
console.log("\nTotal USDT AUM (from positions): " + totalUSDT.toFixed(2));
console.log("Large positions (>1): " + allInvestors.filter((inv) => inv.latestPosition > 1).length);
console.log("Tiny positions (<1): " + tinyPositions.length);
