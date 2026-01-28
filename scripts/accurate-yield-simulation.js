#!/usr/bin/env node
/**
 * Accurate Yield Simulation
 *
 * Processes transactions chronologically and applies yields at each month-end
 * based on the actual position at that time.
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

// Parse monthly performance data - ONLY first 18 entries
const monthlyPerf = {};
excelData.monthlyPerformance.slice(0, 18).forEach((mp) => {
  const monthKey = mp.date.substring(0, 7);
  monthlyPerf[monthKey] = mp.netPerformance;
});

// Sort transactions by date
const sortedTx = [...masterTx.transactions].sort((a, b) => a.date.localeCompare(b.date));

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

function getLastDayOfMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, "0")}`;
}

// Track positions by investor/fund with full history
const positions = {};

// Group transactions by month
const txByMonth = {};
sortedTx.forEach((tx) => {
  const month = getMonthKey(tx.date);
  if (!txByMonth[month]) txByMonth[month] = [];
  txByMonth[month].push(tx);
});

// Get all months in order (from first tx to last tx)
const firstTxMonth = getMonthKey(sortedTx[0].date);
const lastTxMonth = getMonthKey(sortedTx[sortedTx.length - 1].date);
const allMonths = [];
let [year, month] = firstTxMonth.split("-").map(Number);
const [lastYear, lastMonth] = lastTxMonth.split("-").map(Number);

while (year < lastYear || (year === lastYear && month <= lastMonth)) {
  allMonths.push(`${year}-${String(month).padStart(2, "0")}`);
  month++;
  if (month > 12) {
    month = 1;
    year++;
  }
}

console.log("=== Accurate Yield Simulation ===\n");
console.log(
  "Processing " + allMonths.length + " months from " + firstTxMonth + " to " + lastTxMonth
);

// Process month by month
allMonths.forEach((monthKey) => {
  // 1. Apply all transactions for this month
  const monthTxs = txByMonth[monthKey] || [];
  monthTxs.forEach((tx) => {
    const key = tx.investor_email + "|" + tx.fund_code;
    if (!positions[key]) {
      positions[key] = {
        email: tx.investor_email,
        name: tx.investor_name,
        fund: tx.fund_code,
        balance: 0,
        totalYield: 0,
        txSum: 0,
      };
    }
    positions[key].balance += tx.amount;
    positions[key].txSum += tx.amount;
  });

  // 2. Apply month-end yield
  const perf = monthlyPerf[monthKey];
  if (perf) {
    Object.keys(positions).forEach((key) => {
      const pos = positions[key];
      if (pos.balance <= 0) return;

      const fundKey = fundKeyMap[pos.fund];
      const netRate = perf[fundKey];

      if (netRate && netRate > 0) {
        const yieldAmount = pos.balance * netRate;
        pos.totalYield += yieldAmount;
        pos.balance += yieldAmount;
      }
    });
  }
});

// Print results
console.log("\n=== EXPECTED FINAL POSITIONS (After Accurate Yield Simulation) ===\n");
console.log(
  "Fund     | Investor                       | Tx Sum          | Yield           | Final Balance"
);
console.log("-".repeat(105));

const results = Object.values(positions).sort(
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
console.log("\n=== EXPECTED FUND TOTALS ===\n");
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

// Compare with current platform AUM
console.log("\n=== COMPARISON: Current Platform vs Expected ===\n");
const currentAUM = {
  "IND-BTC": 34.4754,
  "IND-ETH": 599.81,
  "IND-SOL": 13.37,
  "IND-USDT": 7264098.92,
  "IND-XRP": -1897.42,
};

console.log("Fund     | Current AUM       | Expected AUM      | Yield Needed      | Variance");
console.log("-".repeat(85));
Object.keys(currentAUM)
  .sort()
  .forEach((f) => {
    const curr = currentAUM[f];
    const exp = fundTotals[f] ? fundTotals[f].balance : 0;
    const yieldNeeded = exp - curr;
    const variance = fundTotals[f] ? fundTotals[f].txSum - curr : 0;
    console.log(
      f.padEnd(8) +
        " | " +
        curr.toFixed(4).padStart(16) +
        " | " +
        exp.toFixed(4).padStart(16) +
        " | " +
        yieldNeeded.toFixed(4).padStart(16) +
        " | " +
        variance.toFixed(4).padStart(12)
    );
  });

// Check negative positions
console.log("\n=== POSITIONS STILL NEGATIVE AFTER YIELDS ===\n");
const negatives = results.filter((r) => r.balance < -0.0001);
if (negatives.length === 0) {
  console.log("None! All positions would be positive or zero.");
} else {
  console.log("Count: " + negatives.length);
  console.log("\nThese are DATA QUALITY ISSUES in the source Excel:");
  negatives.forEach((r) => {
    console.log("  " + r.fund + " | " + r.name.padEnd(28) + " | Final: " + r.balance.toFixed(6));
  });
}

// Summary
console.log("\n=== SUMMARY ===\n");
console.log("If we distribute yields as calculated:");
Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const t = fundTotals[f];
    const curr = currentAUM[f];
    console.log(
      "  " +
        f +
        ": " +
        curr.toFixed(2) +
        " -> " +
        t.balance.toFixed(2) +
        " (yield: " +
        t.yield.toFixed(2) +
        ")"
    );
  });

// Save results
fs.writeFileSync(
  path.join(__dirname, "accurate-yield-results.json"),
  JSON.stringify(
    {
      monthlyPerformance: monthlyPerf,
      fundTotals,
      positions: results.map((r) => ({
        email: r.email,
        name: r.name,
        fund: r.fund,
        txSum: r.txSum,
        yield: r.totalYield,
        finalBalance: r.balance,
      })),
    },
    null,
    2
  )
);
console.log("\nSaved to accurate-yield-results.json");
