#!/usr/bin/env node
/**
 * Comprehensive Yield Analysis
 *
 * Calculates expected investor positions by:
 * 1. Starting with master transactions
 * 2. Applying monthly net performance rates from Excel
 * 3. Comparing with current platform positions
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

// Parse monthly performance data
const monthlyPerf = {};
excelData.monthlyPerformance.forEach((mp) => {
  const monthKey = mp.date.substring(0, 7); // YYYY-MM
  monthlyPerf[monthKey] = mp.netPerformance;
});

console.log("=== Monthly Net Performance Rates ===\n");
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

// Build investor positions over time
// Structure: { 'email|fund': { balance: number, yields: number, history: [] } }
const positions = {};

// Sort transactions by date
const sortedTx = [...masterTx.transactions].sort((a, b) => a.date.localeCompare(b.date));

// Helper to get month-end from a date
function getMonthEnd(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
}

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

// Process each month chronologically
const allMonths = [...new Set(sortedTx.map((tx) => getMonthKey(tx.date)))].sort();

// Add all months from the performance data too
Object.keys(monthlyPerf).forEach((m) => {
  if (!allMonths.includes(m)) {
    allMonths.push(m);
  }
});
allMonths.sort();

console.log("\n=== Processing Transactions Month by Month ===\n");

// Track positions by investor/fund
const investorPositions = {};

// Default fee rate (20% management fee means 80% of gross goes to investor)
const DEFAULT_FEE_RATE = 0.2;

// Process transactions and apply yields month by month
let currentMonth = null;

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
    };
  }

  // If we've moved to a new month, apply yields for the previous month
  if (currentMonth && txMonth !== currentMonth && monthlyPerf[currentMonth]) {
    applyMonthlyYields(currentMonth);
  }

  // Apply the transaction
  investorPositions[key].balance += tx.amount;
  currentMonth = txMonth;
});

// Apply yields for the final month and any remaining months
const lastTxMonth = getMonthKey(sortedTx[sortedTx.length - 1].date);
Object.keys(monthlyPerf)
  .sort()
  .forEach((month) => {
    if (month >= getMonthKey(sortedTx[0].date) && month <= lastTxMonth) {
      applyMonthlyYields(month);
    }
  });

function applyMonthlyYields(month) {
  const perf = monthlyPerf[month];
  if (!perf) return;

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
}

// Print results
console.log("\n=== EXPECTED FINAL POSITIONS (After Yield Distribution) ===\n");
console.log("Fund     | Investor                       | Final Balance     | Total Yield");
console.log("-".repeat(90));

const results = Object.values(investorPositions).sort(
  (a, b) => a.fund.localeCompare(b.fund) || a.name.localeCompare(b.name)
);

results.forEach((r) => {
  console.log(
    r.fund.padEnd(8) +
      " | " +
      r.name.padEnd(30) +
      " | " +
      r.balance.toFixed(6).padStart(16) +
      " | " +
      r.totalYield.toFixed(6).padStart(12)
  );
});

// Fund totals
console.log("\n=== EXPECTED FUND TOTALS ===\n");
const fundTotals = {};
results.forEach((r) => {
  if (!fundTotals[r.fund]) {
    fundTotals[r.fund] = { balance: 0, yield: 0, investors: 0 };
  }
  fundTotals[r.fund].balance += r.balance;
  fundTotals[r.fund].yield += r.totalYield;
  fundTotals[r.fund].investors++;
});

console.log("Fund     | Expected AUM       | Total Yield       | Investors");
console.log("-".repeat(65));
Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const t = fundTotals[f];
    console.log(
      f.padEnd(8) +
        " | " +
        t.balance.toFixed(6).padStart(17) +
        " | " +
        t.yield.toFixed(6).padStart(16) +
        " | " +
        t.investors
    );
  });

// Check for remaining negative positions
console.log("\n=== POSITIONS STILL NEGATIVE AFTER YIELDS ===\n");
const negatives = results.filter((r) => r.balance < -0.0001);
if (negatives.length === 0) {
  console.log("None! All positions would be positive or zero.");
} else {
  negatives.forEach((r) => {
    console.log(r.fund + " | " + r.name.padEnd(30) + " | " + r.balance.toFixed(6));
  });
}

// Output as JSON for further analysis
const output = {
  summary: fundTotals,
  investors: results.map((r) => ({
    email: r.email,
    name: r.name,
    fund: r.fund,
    expectedBalance: r.balance,
    totalYield: r.totalYield,
  })),
};

fs.writeFileSync(path.join(__dirname, "expected-positions.json"), JSON.stringify(output, null, 2));
console.log("\nSaved detailed results to expected-positions.json");
