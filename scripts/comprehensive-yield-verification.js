#!/usr/bin/env node
/**
 * Comprehensive Yield Verification
 *
 * Compares our yield simulation (transactions + calculated yields)
 * against Excel's final positions to verify correctness.
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

// Fund code mapping
const fundKeyMap = {
  "IND-BTC": "btc",
  "IND-ETH": "eth",
  "IND-USDT": "usdt",
  "IND-SOL": "sol",
  "IND-XRP": "xrp",
};

// Name normalization for matching
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

// Get monthly performance rates (first 18 entries only - validated)
const monthlyPerf = {};
excelData.monthlyPerformance.slice(0, 18).forEach((mp) => {
  const monthKey = mp.date.substring(0, 7);
  monthlyPerf[monthKey] = mp.netPerformance;
});

console.log("=== COMPREHENSIVE YIELD VERIFICATION ===\n");

// Step 1: Build Excel position lookup (by normalized name)
const excelPositions = {};
Object.keys(excelData.funds).forEach((fundCode) => {
  const fund = excelData.funds[fundCode];
  if (!fund.investors) return;

  fund.investors.forEach((inv) => {
    if (!inv.name || inv.name === "AUM Total") return;

    const normalized = normalizeName(inv.name);
    const key = normalized + "|" + fundCode;

    excelPositions[key] = {
      name: inv.name,
      fund: fundCode,
      initialPosition: inv.initialPosition || 0,
      latestPosition: inv.latestPosition || 0,
      feePercent: inv.feePercent || 0.2,
      positionHistory: inv.positionHistory || [],
    };
  });
});

// Step 2: Build transaction summary by normalized name
const txPositions = {};
masterTx.transactions.forEach((tx) => {
  const normalized = normalizeName(tx.investor_name);
  const key = normalized + "|" + tx.fund_code;

  if (!txPositions[key]) {
    txPositions[key] = {
      name: tx.investor_name,
      fund: tx.fund_code,
      txSum: 0,
      transactions: [],
    };
  }

  txPositions[key].txSum += tx.amount;
  txPositions[key].transactions.push({
    date: tx.date,
    amount: tx.amount,
    type: tx.type,
  });
});

// Step 3: Simulate yields month-by-month
function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

const sortedTx = [...masterTx.transactions].sort((a, b) => a.date.localeCompare(b.date));

// Group transactions by month
const txByMonth = {};
sortedTx.forEach((tx) => {
  const month = getMonthKey(tx.date);
  if (!txByMonth[month]) txByMonth[month] = [];
  txByMonth[month].push(tx);
});

// Get all months in order
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

// Simulate positions
const simPositions = {};

allMonths.forEach((monthKey) => {
  // Apply transactions for this month
  const monthTxs = txByMonth[monthKey] || [];
  monthTxs.forEach((tx) => {
    const normalized = normalizeName(tx.investor_name);
    const key = normalized + "|" + tx.fund_code;

    if (!simPositions[key]) {
      simPositions[key] = {
        name: tx.investor_name,
        fund: tx.fund_code,
        balance: 0,
        totalYield: 0,
        txSum: 0,
      };
    }

    simPositions[key].balance += tx.amount;
    simPositions[key].txSum += tx.amount;
  });

  // Apply month-end yield
  const perf = monthlyPerf[monthKey];
  if (perf) {
    Object.keys(simPositions).forEach((key) => {
      const pos = simPositions[key];
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

// Step 4: Compare simulation to Excel
console.log("=== POSITION COMPARISON ===\n");
console.log(
  "Name                         | Fund     | TX Sum       | Sim Balance  | Excel Pos    | Variance     | Status"
);
console.log("-".repeat(120));

const comparisons = [];
let matchCount = 0;
let mismatchCount = 0;
let noExcelCount = 0;

Object.keys(simPositions).forEach((key) => {
  const sim = simPositions[key];
  const excel = excelPositions[key];

  const excelPos = excel ? excel.latestPosition : null;
  const variance = excelPos !== null ? sim.balance - excelPos : null;
  const variancePct = excelPos && excelPos !== 0 ? (variance / excelPos) * 100 : null;

  let status = "NO EXCEL";
  if (excelPos !== null) {
    if (Math.abs(variance) < 0.01 || (variancePct !== null && Math.abs(variancePct) < 0.1)) {
      status = "MATCH";
      matchCount++;
    } else {
      status = "MISMATCH";
      mismatchCount++;
    }
  } else {
    noExcelCount++;
  }

  comparisons.push({
    name: sim.name,
    fund: sim.fund,
    txSum: sim.txSum,
    simBalance: sim.balance,
    simYield: sim.totalYield,
    excelPos,
    variance,
    variancePct,
    status,
  });
});

// Sort by absolute variance
comparisons.sort((a, b) => {
  if (a.variance === null && b.variance === null) return 0;
  if (a.variance === null) return 1;
  if (b.variance === null) return -1;
  return Math.abs(b.variance) - Math.abs(a.variance);
});

comparisons.forEach((c) => {
  const statusIcon = c.status === "MATCH" ? "✓" : c.status === "MISMATCH" ? "✗" : "?";
  console.log(
    c.name.substring(0, 28).padEnd(28) +
      " | " +
      c.fund.padEnd(8) +
      " | " +
      c.txSum.toFixed(2).padStart(12) +
      " | " +
      c.simBalance.toFixed(2).padStart(12) +
      " | " +
      (c.excelPos !== null ? c.excelPos.toFixed(2) : "N/A").padStart(12) +
      " | " +
      (c.variance !== null ? c.variance.toFixed(4) : "N/A").padStart(12) +
      " | " +
      statusIcon +
      " " +
      c.status
  );
});

// Summary by fund
console.log("\n=== FUND TOTALS ===\n");
const fundTotals = {};
comparisons.forEach((c) => {
  if (!fundTotals[c.fund]) {
    fundTotals[c.fund] = {
      txSum: 0,
      simBalance: 0,
      excelSum: 0,
      simYield: 0,
      investors: 0,
      matched: 0,
      mismatched: 0,
    };
  }
  fundTotals[c.fund].txSum += c.txSum;
  fundTotals[c.fund].simBalance += c.simBalance;
  fundTotals[c.fund].simYield += c.simYield || 0;
  if (c.excelPos !== null) fundTotals[c.fund].excelSum += c.excelPos;
  fundTotals[c.fund].investors++;
  if (c.status === "MATCH") fundTotals[c.fund].matched++;
  if (c.status === "MISMATCH") fundTotals[c.fund].mismatched++;
});

console.log(
  "Fund     | TX Sum         | Sim Balance    | Sim Yield     | Excel Total    | Variance"
);
console.log("-".repeat(100));

Object.keys(fundTotals)
  .sort()
  .forEach((f) => {
    const ft = fundTotals[f];
    const variance = ft.simBalance - ft.excelSum;
    console.log(
      f.padEnd(8) +
        " | " +
        ft.txSum.toFixed(2).padStart(14) +
        " | " +
        ft.simBalance.toFixed(2).padStart(14) +
        " | " +
        ft.simYield.toFixed(2).padStart(13) +
        " | " +
        ft.excelSum.toFixed(2).padStart(14) +
        " | " +
        variance.toFixed(4).padStart(12)
    );
  });

// Summary stats
console.log("\n=== SUMMARY ===\n");
console.log("Total positions analyzed:", comparisons.length);
console.log("Matches (variance < 0.01 or < 0.1%):", matchCount);
console.log("Mismatches:", mismatchCount);
console.log("No Excel data:", noExcelCount);

// Show worst mismatches
console.log("\n=== TOP 10 LARGEST VARIANCES ===\n");
const mismatches = comparisons.filter((c) => c.status === "MISMATCH").slice(0, 10);

mismatches.forEach((c, i) => {
  console.log(i + 1 + ". " + c.name + " (" + c.fund + ")");
  console.log("   TX Sum: " + c.txSum.toFixed(6));
  console.log("   Sim Balance (with yield): " + c.simBalance.toFixed(6));
  console.log("   Sim Yield: " + (c.simYield || 0).toFixed(6));
  console.log("   Excel Position: " + (c.excelPos || 0).toFixed(6));
  console.log(
    "   Variance: " + (c.variance || 0).toFixed(6) + " (" + (c.variancePct || 0).toFixed(2) + "%)"
  );
  console.log("");
});

// Check for investors only in Excel
console.log("\n=== INVESTORS ONLY IN EXCEL (no transactions) ===\n");
Object.keys(excelPositions).forEach((key) => {
  if (!simPositions[key]) {
    const excel = excelPositions[key];
    if (excel.latestPosition > 0.001) {
      console.log(
        excel.name + " | " + excel.fund + " | Latest: " + excel.latestPosition.toFixed(6)
      );
    }
  }
});

// Deep dive into specific investors
console.log("\n=== DEEP DIVE: JOSE MOLLA BTC POSITION ===\n");

const joseBTC = simPositions[normalizeName("Jose Molla") + "|IND-BTC"];
const joseExcel = excelPositions[normalizeName("Jose Molla") + "|IND-BTC"];

if (joseBTC && joseExcel) {
  console.log("Transaction history:");
  const joseTxs = masterTx.transactions
    .filter(
      (tx) =>
        normalizeName(tx.investor_name) === normalizeName("Jose Molla") &&
        tx.fund_code === "IND-BTC"
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = 0;
  joseTxs.forEach((tx) => {
    runningBalance += tx.amount;
    console.log(
      "  " +
        tx.date +
        " | " +
        (tx.amount > 0 ? "+" : "") +
        tx.amount.toFixed(6) +
        " | Balance: " +
        runningBalance.toFixed(6)
    );
  });

  console.log("\nExcel position history (last 5):");
  joseExcel.positionHistory.slice(-5).forEach((ph) => {
    console.log("  " + ph.date + " | Position: " + ph.position.toFixed(6));
  });

  console.log("\nComparison:");
  console.log("  TX Sum: " + joseBTC.txSum.toFixed(6));
  console.log("  Sim Balance (with yield): " + joseBTC.balance.toFixed(6));
  console.log("  Sim Yield: " + joseBTC.totalYield.toFixed(6));
  console.log("  Excel Latest: " + joseExcel.latestPosition.toFixed(6));
  console.log("  Variance: " + (joseBTC.balance - joseExcel.latestPosition).toFixed(6));
}

// Save results
const results = {
  generated: new Date().toISOString(),
  summary: {
    total: comparisons.length,
    matches: matchCount,
    mismatches: mismatchCount,
    noExcel: noExcelCount,
  },
  fundTotals,
  comparisons: comparisons.map((c) => ({
    name: c.name,
    fund: c.fund,
    txSum: c.txSum,
    simBalance: c.simBalance,
    simYield: c.simYield,
    excelPos: c.excelPos,
    variance: c.variance,
    variancePct: c.variancePct,
    status: c.status,
  })),
};

fs.writeFileSync(
  path.join(__dirname, "yield-verification-results.json"),
  JSON.stringify(results, null, 2)
);

console.log("\n\nSaved to yield-verification-results.json");
