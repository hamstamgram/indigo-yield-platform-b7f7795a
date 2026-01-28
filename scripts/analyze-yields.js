#!/usr/bin/env node
/**
 * Analyze yield distributions and compare with expected positions
 */
const fs = require("fs");
const path = require("path");

// Load data
const yieldData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "monthly-yield-calculations.json"), "utf8")
);
const masterTx = JSON.parse(
  fs.readFileSync(path.join(__dirname, "master-transactions.json"), "utf8")
);

// Sum net yields by investor name and fund
const yieldSummary = {};
yieldData.allYields.forEach((y) => {
  const key = y.investor_name + "|" + y.fund_code;
  if (!yieldSummary[key]) {
    yieldSummary[key] = {
      investor_name: y.investor_name,
      fund_code: y.fund_code,
      total_net_yield: 0,
      total_gross_yield: 0,
      periods: 0,
    };
  }
  yieldSummary[key].total_net_yield += y.net_yield;
  yieldSummary[key].total_gross_yield += y.gross_yield;
  yieldSummary[key].periods++;
});

// Calculate transaction sums from master
const txSums = {};
masterTx.transactions.forEach((tx) => {
  const key = tx.investor_name + "|" + tx.fund_code;
  if (!txSums[key]) {
    txSums[key] = {
      investor_name: tx.investor_name,
      fund_code: tx.fund_code,
      total_amount: 0,
    };
  }
  txSums[key].total_amount += tx.amount;
});

// Combine and calculate expected final positions
console.log("=== EXPECTED FINAL POSITIONS (Transactions + Yields) ===\n");
console.log(
  "Fund     | Investor                       | Tx Sum        | + Net Yield   | = Expected Pos"
);
console.log("-".repeat(100));

const allKeys = new Set([...Object.keys(txSums), ...Object.keys(yieldSummary)]);
const results = [];

allKeys.forEach((key) => {
  const tx = txSums[key] || {
    investor_name: key.split("|")[0],
    fund_code: key.split("|")[1],
    total_amount: 0,
  };
  const yd = yieldSummary[key] || { total_net_yield: 0 };
  const expectedPos = tx.total_amount + yd.total_net_yield;

  results.push({
    fund_code: tx.fund_code,
    investor_name: tx.investor_name,
    tx_sum: tx.total_amount,
    net_yield: yd.total_net_yield,
    expected_pos: expectedPos,
  });
});

// Sort and print
results
  .sort(
    (a, b) =>
      a.fund_code.localeCompare(b.fund_code) || a.investor_name.localeCompare(b.investor_name)
  )
  .forEach((r) => {
    console.log(
      r.fund_code.padEnd(8) +
        " | " +
        r.investor_name.padEnd(30) +
        " | " +
        r.tx_sum.toFixed(4).padStart(12) +
        " | " +
        r.net_yield.toFixed(4).padStart(12) +
        " | " +
        r.expected_pos.toFixed(4).padStart(12)
    );
  });

// Fund totals
console.log("\n=== FUND TOTALS ===");
const fundTotals = {};
results.forEach((r) => {
  if (!fundTotals[r.fund_code]) {
    fundTotals[r.fund_code] = { tx_sum: 0, net_yield: 0, expected: 0, investors: 0 };
  }
  fundTotals[r.fund_code].tx_sum += r.tx_sum;
  fundTotals[r.fund_code].net_yield += r.net_yield;
  fundTotals[r.fund_code].expected += r.expected_pos;
  fundTotals[r.fund_code].investors++;
});

console.log("\nFund     | Tx Sum           | Net Yield       | Expected AUM    | Investors");
console.log("-".repeat(80));
Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const t = fundTotals[f];
    console.log(
      f.padEnd(8) +
        " | " +
        t.tx_sum.toFixed(4).padStart(15) +
        " | " +
        t.net_yield.toFixed(4).padStart(14) +
        " | " +
        t.expected.toFixed(4).padStart(14) +
        " | " +
        t.investors
    );
  });

// Check negative positions
console.log("\n=== POSITIONS THAT WOULD STILL BE NEGATIVE ===");
results
  .filter((r) => r.expected_pos < -0.0001)
  .forEach((r) => {
    console.log(
      r.fund_code +
        " | " +
        r.investor_name.padEnd(30) +
        " | " +
        "Tx: " +
        r.tx_sum.toFixed(4) +
        " + Yield: " +
        r.net_yield.toFixed(4) +
        " = " +
        r.expected_pos.toFixed(4)
    );
  });
