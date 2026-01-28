#!/usr/bin/env node
/**
 * Comprehensive Yield Analysis v2
 *
 * Uses ONLY the first 18 performance entries (Jul 2024 - Dec 2025)
 * which have correct rates for all funds.
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

// Fund code to key mapping
const fundKeyMap = {
  "IND-BTC": "btc",
  "IND-ETH": "eth",
  "IND-USDT": "usdt",
  "IND-SOL": "sol",
  "IND-XRP": "xrp",
};

// Parse monthly performance data - ONLY first 18 entries (correct data)
const monthlyPerf = {};
excelData.monthlyPerformance.slice(0, 18).forEach((mp) => {
  const monthKey = mp.date.substring(0, 7); // YYYY-MM
  monthlyPerf[monthKey] = mp.netPerformance;
});

console.log("=== Monthly Net Performance Rates (Corrected - First 18 entries only) ===\n");
console.log("Month    | BTC      | ETH      | USDT     | SOL      | XRP");
console.log("-".repeat(65));
Object.keys(monthlyPerf)
  .sort()
  .forEach((m) => {
    const p = monthlyPerf[m];
    console.log(
      m +
        "  | " +
        ((p.btc || 0) * 100).toFixed(4).padStart(6) +
        "% | " +
        ((p.eth || 0) * 100).toFixed(4).padStart(6) +
        "% | " +
        ((p.usdt || 0) * 100).toFixed(4).padStart(6) +
        "% | " +
        ((p.sol || 0) * 100).toFixed(4).padStart(6) +
        "% | " +
        (p.xrp !== null ? ((p.xrp || 0) * 100).toFixed(4).padStart(6) + "%" : "   N/A")
    );
  });

// Sort transactions by date
const sortedTx = [...masterTx.transactions].sort((a, b) => a.date.localeCompare(b.date));

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

// Track positions by investor/fund
const investorPositions = {};

// Process transactions and apply yields month by month
let processedMonths = new Set();

sortedTx.forEach((tx) => {
  const key = tx.investor_email + "|" + tx.fund_code;
  const txMonth = getMonthKey(tx.date);

  // Initialize if needed
  if (!investorPositions[key]) {
    investorPositions[key] = {
      email: tx.investor_email,
      name: tx.investor_name,
      fund: tx.fund_code,
      balance: 0,
      totalYield: 0,
      txSum: 0,
    };
  }

  // Apply the transaction
  investorPositions[key].balance += tx.amount;
  investorPositions[key].txSum += tx.amount;
});

// Now apply monthly yields to all positions
// We need to track position at each month-end and apply yield
Object.keys(monthlyPerf)
  .sort()
  .forEach((month) => {
    const perf = monthlyPerf[month];

    Object.keys(investorPositions).forEach((key) => {
      const pos = investorPositions[key];
      if (pos.balance <= 0) return; // No yield on zero or negative balance

      const fundKey = fundKeyMap[pos.fund];
      const netRate = perf[fundKey];

      if (netRate && netRate > 0) {
        const yieldAmount = pos.balance * netRate;
        pos.totalYield += yieldAmount;
        pos.balance += yieldAmount; // Compound the yield
      }
    });
  });

// Print results
console.log("\n=== EXPECTED FINAL POSITIONS (After Yield Distribution) ===\n");
console.log(
  "Fund     | Investor                       | Tx Sum          | Yield           | Final Balance"
);
console.log("-".repeat(105));

const results = Object.values(investorPositions).sort(
  (a, b) => a.fund.localeCompare(b.fund) || a.name.localeCompare(b.name)
);

results.forEach((r) => {
  console.log(
    r.fund.padEnd(8) +
      " | " +
      r.name.padEnd(30) +
      " | " +
      r.txSum.toFixed(4).padStart(14) +
      " | " +
      r.totalYield.toFixed(4).padStart(14) +
      " | " +
      r.balance.toFixed(4).padStart(14)
  );
});

// Fund totals
console.log("\n=== EXPECTED FUND TOTALS (After Yields) ===\n");
const fundTotals = {};
results.forEach((r) => {
  if (!fundTotals[r.fund]) {
    fundTotals[r.fund] = { txSum: 0, yield: 0, balance: 0, investors: 0 };
  }
  fundTotals[r.fund].txSum += r.txSum;
  fundTotals[r.fund].yield += r.totalYield;
  fundTotals[r.fund].balance += r.balance;
  fundTotals[r.fund].investors++;
});

console.log("Fund     | Tx Sum            | Total Yield       | Expected AUM      | Investors");
console.log("-".repeat(80));
Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const t = fundTotals[f];
    console.log(
      f.padEnd(8) +
        " | " +
        t.txSum.toFixed(4).padStart(16) +
        " | " +
        t.yield.toFixed(4).padStart(16) +
        " | " +
        t.balance.toFixed(4).padStart(16) +
        " | " +
        t.investors
    );
  });

// Compare with current platform positions
console.log("\n=== COMPARISON: Expected vs Current Platform ===\n");
console.log("(Current platform positions from SQL query needed)");
console.log("\nFund     | Tx Sum (Curr)     | Expected Yield   | Expected AUM");
console.log("-".repeat(70));
Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const t = fundTotals[f];
    console.log(
      f.padEnd(8) +
        " | " +
        t.txSum.toFixed(4).padStart(16) +
        " | " +
        t.yield.toFixed(4).padStart(16) +
        " | " +
        t.balance.toFixed(4).padStart(14)
    );
  });

// Check for remaining negative positions
console.log("\n=== POSITIONS STILL NEGATIVE AFTER YIELDS ===\n");
const negatives = results.filter((r) => r.balance < -0.0001);
if (negatives.length === 0) {
  console.log("None! All positions would be positive or zero.");
} else {
  console.log("Count: " + negatives.length);
  negatives.forEach((r) => {
    console.log(
      r.fund +
        " | " +
        r.name.padEnd(30) +
        " | Tx: " +
        r.txSum.toFixed(4) +
        " | Yield: " +
        r.totalYield.toFixed(4) +
        " | Final: " +
        r.balance.toFixed(4)
    );
  });
}

// Output as JSON for further analysis
const output = {
  monthlyPerformanceUsed: monthlyPerf,
  summary: fundTotals,
  investors: results.map((r) => ({
    email: r.email,
    name: r.name,
    fund: r.fund,
    txSum: r.txSum,
    totalYield: r.totalYield,
    expectedBalance: r.balance,
  })),
};

fs.writeFileSync(
  path.join(__dirname, "expected-positions-v2.json"),
  JSON.stringify(output, null, 2)
);
console.log("\nSaved detailed results to expected-positions-v2.json");
