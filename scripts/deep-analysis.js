#!/usr/bin/env node
/**
 * Deep Analysis of Yield Calculations and Data Issues
 *
 * This script performs:
 * 1. Transaction-by-transaction reconciliation
 * 2. Month-by-month position tracking with yields
 * 3. Comparison with Excel investor positions
 * 4. Identification of all discrepancies
 */

const fs = require("fs");
const path = require("path");

// Load all data sources
const excelData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);
const masterTx = JSON.parse(
  fs.readFileSync(path.join(__dirname, "master-transactions.json"), "utf8")
);

console.log("=".repeat(80));
console.log("DEEP ANALYSIS: YIELD CALCULATIONS AND DATA ISSUES");
console.log("=".repeat(80));

// ============================================================================
// PART 1: Analyze Excel Data Structure
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 1: EXCEL DATA STRUCTURE ANALYSIS");
console.log("=".repeat(80));

// Count investors per fund in Excel
console.log("\n--- Investors per Fund (Excel) ---");
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  const investors = fund.investors || [];
  const withPosition = investors.filter((i) => i.latestPosition > 0.0001);
  const withSmallPosition = investors.filter(
    (i) => i.latestPosition > 0 && i.latestPosition < 0.01
  );
  console.log(
    `${fundCode}: ${investors.length} total, ${withPosition.length} with position > 0.0001, ${withSmallPosition.length} with tiny positions`
  );
});

// Identify name variants
console.log("\n--- Potential Name Duplicates in Excel ---");
const allExcelNames = {};
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  (fund.investors || []).forEach((inv) => {
    const normalizedName = inv.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!allExcelNames[normalizedName]) {
      allExcelNames[normalizedName] = [];
    }
    allExcelNames[normalizedName].push({
      fund: fundCode,
      name: inv.name,
      position: inv.latestPosition,
    });
  });
});

Object.keys(allExcelNames).forEach((key) => {
  const entries = allExcelNames[key];
  const uniqueNames = [...new Set(entries.map((e) => e.name))];
  if (uniqueNames.length > 1) {
    console.log(`  Name variants for "${key}":`);
    uniqueNames.forEach((n) => {
      const matching = entries.filter((e) => e.name === n);
      console.log(`    - "${n}" appears in ${matching.length} funds`);
    });
  }
});

// ============================================================================
// PART 2: Analyze Master Transactions
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 2: MASTER TRANSACTIONS ANALYSIS");
console.log("=".repeat(80));

// Group transactions by investor
const txByInvestor = {};
masterTx.transactions.forEach((tx) => {
  const key = tx.investor_email + "|" + tx.fund_code;
  if (!txByInvestor[key]) {
    txByInvestor[key] = {
      email: tx.investor_email,
      name: tx.investor_name,
      fund: tx.fund_code,
      transactions: [],
      totalDeposits: 0,
      totalWithdrawals: 0,
    };
  }
  txByInvestor[key].transactions.push(tx);
  if (tx.amount > 0) {
    txByInvestor[key].totalDeposits += tx.amount;
  } else {
    txByInvestor[key].totalWithdrawals += Math.abs(tx.amount);
  }
});

console.log("\n--- Transaction Summary by Investor ---");
console.log("Fund     | Investor                       | Deposits       | Withdrawals    | Net");
console.log("-".repeat(95));

Object.values(txByInvestor)
  .sort((a, b) => a.fund.localeCompare(b.fund) || a.name.localeCompare(b.name))
  .forEach((inv) => {
    const net = inv.totalDeposits - inv.totalWithdrawals;
    console.log(
      inv.fund.padEnd(8) +
        " | " +
        inv.name.padEnd(30) +
        " | " +
        inv.totalDeposits.toFixed(4).padStart(14) +
        " | " +
        inv.totalWithdrawals.toFixed(4).padStart(14) +
        " | " +
        net.toFixed(4).padStart(14)
    );
  });

// ============================================================================
// PART 3: Monthly Performance Rates Analysis
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 3: MONTHLY PERFORMANCE RATES ANALYSIS");
console.log("=".repeat(80));

// Use only first 18 entries (correct data)
const monthlyPerf = {};
excelData.monthlyPerformance.slice(0, 18).forEach((mp) => {
  const monthKey = mp.date.substring(0, 7);
  monthlyPerf[monthKey] = {
    btc: mp.netPerformance.btc || 0,
    eth: mp.netPerformance.eth || 0,
    usdt: mp.netPerformance.usdt || 0,
    sol: mp.netPerformance.sol || 0,
    xrp: mp.netPerformance.xrp || 0,
  };
});

console.log("\n--- Net Performance Rates (Annualized) ---");
console.log("Month    | BTC APY  | ETH APY  | USDT APY | SOL APY  | XRP APY");
console.log("-".repeat(65));
Object.keys(monthlyPerf)
  .sort()
  .forEach((m) => {
    const p = monthlyPerf[m];
    console.log(
      m +
        "  | " +
        (p.btc * 12 * 100).toFixed(1).padStart(6) +
        "% | " +
        (p.eth * 12 * 100).toFixed(1).padStart(6) +
        "% | " +
        (p.usdt * 12 * 100).toFixed(1).padStart(6) +
        "% | " +
        (p.sol * 12 * 100).toFixed(1).padStart(6) +
        "% | " +
        (p.xrp * 12 * 100).toFixed(1).padStart(6) +
        "%"
    );
  });

// ============================================================================
// PART 4: Simulate Positions Month by Month
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 4: MONTH-BY-MONTH POSITION SIMULATION");
console.log("=".repeat(80));

const fundKeyMap = {
  "IND-BTC": "btc",
  "IND-ETH": "eth",
  "IND-USDT": "usdt",
  "IND-SOL": "sol",
  "IND-XRP": "xrp",
};

// Sort transactions by date
const sortedTx = [...masterTx.transactions].sort((a, b) => a.date.localeCompare(b.date));

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

// Get all months
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

// Group transactions by month
const txByMonth = {};
sortedTx.forEach((tx) => {
  const month = getMonthKey(tx.date);
  if (!txByMonth[month]) txByMonth[month] = [];
  txByMonth[month].push(tx);
});

// Track positions
const positions = {};
const monthlySnapshots = {};

allMonths.forEach((monthKey) => {
  // Apply transactions for this month
  const monthTxs = txByMonth[monthKey] || [];
  monthTxs.forEach((tx) => {
    const key = tx.investor_name + "|" + tx.fund_code;
    if (!positions[key]) {
      positions[key] = {
        name: tx.investor_name,
        email: tx.investor_email,
        fund: tx.fund_code,
        balance: 0,
        yieldHistory: [],
      };
    }
    positions[key].balance += tx.amount;
  });

  // Apply month-end yield
  const perf = monthlyPerf[monthKey];
  if (perf) {
    Object.keys(positions).forEach((key) => {
      const pos = positions[key];
      if (pos.balance <= 0) return;

      const fundKey = fundKeyMap[pos.fund];
      const netRate = perf[fundKey];

      if (netRate && netRate > 0) {
        const yieldAmount = pos.balance * netRate;
        pos.yieldHistory.push({
          month: monthKey,
          preBalance: pos.balance,
          rate: netRate,
          yield: yieldAmount,
        });
        pos.balance += yieldAmount;
      }
    });
  }

  // Save snapshot
  monthlySnapshots[monthKey] = {};
  Object.keys(positions).forEach((key) => {
    monthlySnapshots[monthKey][key] = positions[key].balance;
  });
});

// ============================================================================
// PART 5: Compare with Excel Investor Positions
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 5: COMPARISON WITH EXCEL POSITIONS");
console.log("=".repeat(80));

// Build Excel positions map
const excelPositions = {};
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  (fund.investors || []).forEach((inv) => {
    if (inv.latestPosition > 0.0001) {
      const key = inv.name + "|" + fundCode;
      excelPositions[key] = {
        name: inv.name,
        fund: fundCode,
        position: inv.latestPosition,
        feePercent: inv.feePercent,
        positionHistory: inv.positionHistory || [],
      };
    }
  });
});

// Compare simulation with Excel
console.log("\n--- Detailed Comparison ---");
console.log(
  "Fund     | Investor                       | Simulation     | Excel          | Variance       | Match"
);
console.log("-".repeat(110));

const comparisons = [];

// First, match by exact name
Object.keys(positions).forEach((simKey) => {
  const sim = positions[simKey];
  const excelMatch = excelPositions[simKey];

  comparisons.push({
    fund: sim.fund,
    name: sim.name,
    simBalance: sim.balance,
    excelPosition: excelMatch ? excelMatch.position : null,
    excelName: excelMatch ? excelMatch.name : null,
    matched: !!excelMatch,
  });
});

// Sort and print
comparisons
  .filter((c) => Math.abs(c.simBalance) > 0.0001 || c.excelPosition)
  .sort((a, b) => a.fund.localeCompare(b.fund) || a.name.localeCompare(b.name))
  .forEach((c) => {
    const excelVal = c.excelPosition || 0;
    const variance = c.simBalance - excelVal;
    const pctVar = excelVal !== 0 ? (variance / excelVal) * 100 : c.simBalance !== 0 ? 100 : 0;
    const match = Math.abs(variance) < 0.01 ? "✓" : Math.abs(pctVar) < 5 ? "~" : "✗";

    console.log(
      c.fund.padEnd(8) +
        " | " +
        c.name.padEnd(30) +
        " | " +
        c.simBalance.toFixed(6).padStart(14) +
        " | " +
        excelVal.toFixed(6).padStart(14) +
        " | " +
        variance.toFixed(6).padStart(14) +
        " | " +
        match
    );
  });

// ============================================================================
// PART 6: Identify Specific Issues
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 6: IDENTIFIED ISSUES");
console.log("=".repeat(80));

// Issue 1: Investors in simulation but not in Excel
console.log("\n--- Issue 1: Investors in Simulation but NOT in Excel ---");
const notInExcel = comparisons.filter((c) => !c.matched && Math.abs(c.simBalance) > 0.01);
notInExcel.forEach((c) => {
  console.log(`  ${c.fund} | ${c.name}: Simulation balance = ${c.simBalance.toFixed(6)}`);
});

// Issue 2: Investors in Excel but not matched to simulation
console.log("\n--- Issue 2: Investors in Excel with no Simulation Match ---");
const excelOnly = Object.values(excelPositions).filter((e) => {
  const simKey = e.name + "|" + e.fund;
  return !positions[simKey];
});
excelOnly.forEach((e) => {
  console.log(`  ${e.fund} | ${e.name}: Excel position = ${e.position.toFixed(6)}`);
});

// Issue 3: Large variances
console.log("\n--- Issue 3: Large Variances (> 1% of position) ---");
const largeVar = comparisons.filter((c) => {
  if (!c.excelPosition) return false;
  const variance = Math.abs(c.simBalance - c.excelPosition);
  const pctVar = Math.abs((variance / c.excelPosition) * 100);
  return pctVar > 1 && variance > 0.01;
});
largeVar.forEach((c) => {
  const variance = c.simBalance - c.excelPosition;
  const pctVar = (variance / c.excelPosition) * 100;
  console.log(
    `  ${c.fund} | ${c.name}: Sim=${c.simBalance.toFixed(6)}, Excel=${c.excelPosition.toFixed(6)}, Var=${variance.toFixed(6)} (${pctVar.toFixed(2)}%)`
  );
});

// Issue 4: Negative positions
console.log("\n--- Issue 4: Negative Positions After Yield ---");
Object.values(positions)
  .filter((p) => p.balance < -0.0001)
  .forEach((p) => {
    const totalYield = p.yieldHistory.reduce((sum, y) => sum + y.yield, 0);
    console.log(
      `  ${p.fund} | ${p.name}: Balance = ${p.balance.toFixed(6)}, Total Yield Earned = ${totalYield.toFixed(6)}`
    );
  });

// ============================================================================
// PART 7: Trace Specific Investors
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 7: DETAILED INVESTOR TRACES");
console.log("=".repeat(80));

// Trace investors with good matches
const goodMatches = ["Jose Molla|IND-BTC", "Kabbaj|IND-BTC", "Thomas Puech|IND-BTC"];
goodMatches.forEach((key) => {
  const sim = positions[key];
  const excel = excelPositions[key];
  if (sim && excel) {
    console.log(`\n--- ${key} (GOOD MATCH) ---`);
    console.log(`  Simulation: ${sim.balance.toFixed(6)}`);
    console.log(`  Excel:      ${excel.position.toFixed(6)}`);
    console.log(`  Variance:   ${(sim.balance - excel.position).toFixed(6)}`);

    // Show yield history
    console.log("  Yield History:");
    sim.yieldHistory.slice(-5).forEach((y) => {
      console.log(
        `    ${y.month}: Balance ${y.preBalance.toFixed(6)} × ${(y.rate * 100).toFixed(4)}% = ${y.yield.toFixed(6)}`
      );
    });
  }
});

// Trace problematic investors
const problemInvestors = [
  "Sam Johnson|IND-XRP",
  "Matthias Reiser|IND-BTC",
  "INDIGO DIGITAL ASSET FUND LP|IND-SOL",
];
problemInvestors.forEach((key) => {
  const sim = positions[key];
  if (sim) {
    console.log(`\n--- ${key} (PROBLEM) ---`);
    console.log(`  Final Balance: ${sim.balance.toFixed(6)}`);

    // Find related transactions
    const relatedTx = sortedTx.filter((tx) => tx.investor_name + "|" + tx.fund_code === key);
    console.log("  Transactions:");
    relatedTx.forEach((tx) => {
      console.log(`    ${tx.date}: ${tx.type} ${tx.amount.toFixed(6)}`);
    });

    // Show yield history
    if (sim.yieldHistory.length > 0) {
      console.log("  Yield History:");
      sim.yieldHistory.forEach((y) => {
        console.log(
          `    ${y.month}: Balance ${y.preBalance.toFixed(6)} × ${(y.rate * 100).toFixed(4)}% = ${y.yield.toFixed(6)}`
        );
      });
    }

    const excel = excelPositions[key];
    if (excel) {
      console.log(`  Excel Position: ${excel.position.toFixed(6)}`);
    }
  }
});

// ============================================================================
// PART 8: Summary and Recommendations
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("PART 8: SUMMARY AND RECOMMENDATIONS");
console.log("=".repeat(80));

// Calculate totals
const fundTotals = { sim: {}, excel: {} };
Object.values(positions).forEach((p) => {
  if (!fundTotals.sim[p.fund]) fundTotals.sim[p.fund] = 0;
  fundTotals.sim[p.fund] += p.balance;
});
Object.values(excelPositions).forEach((e) => {
  if (!fundTotals.excel[e.fund]) fundTotals.excel[e.fund] = 0;
  fundTotals.excel[e.fund] += e.position;
});

console.log("\n--- Fund Totals Comparison ---");
console.log("Fund     | Simulation AUM    | Excel AUM         | Variance");
console.log("-".repeat(70));
["IND-BTC", "IND-ETH", "IND-SOL", "IND-USDT", "IND-XRP"].forEach((f) => {
  const sim = fundTotals.sim[f] || 0;
  const excel = fundTotals.excel[f] || 0;
  console.log(
    f.padEnd(8) +
      " | " +
      sim.toFixed(6).padStart(16) +
      " | " +
      excel.toFixed(6).padStart(16) +
      " | " +
      (sim - excel).toFixed(6).padStart(14)
  );
});

console.log("\n--- Issue Summary ---");
console.log(`1. Investors in simulation but not in Excel: ${notInExcel.length}`);
console.log(`2. Investors in Excel but not matched: ${excelOnly.length}`);
console.log(`3. Large variances (>1%): ${largeVar.length}`);
console.log(
  `4. Negative positions: ${Object.values(positions).filter((p) => p.balance < -0.0001).length}`
);

// Save detailed results
fs.writeFileSync(
  path.join(__dirname, "deep-analysis-results.json"),
  JSON.stringify(
    {
      positions: Object.values(positions).map((p) => ({
        name: p.name,
        email: p.email,
        fund: p.fund,
        balance: p.balance,
        yieldHistory: p.yieldHistory,
      })),
      excelPositions: Object.values(excelPositions),
      comparisons,
      issues: {
        notInExcel,
        excelOnly,
        largeVar: largeVar.map((c) => ({ ...c })),
        negatives: Object.values(positions).filter((p) => p.balance < -0.0001),
      },
    },
    null,
    2
  )
);

console.log("\nDetailed results saved to deep-analysis-results.json");
