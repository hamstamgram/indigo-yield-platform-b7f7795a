/**
 * Generate Yield JSON for Database Import
 *
 * Outputs a JSON file with all calculated yields that can be
 * imported into the database efficiently.
 */

const fs = require("fs");
const XLSX = require("xlsx");

// Excel serial number to JS date
function excelDateToJS(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// Load the main Excel file
const workbook = XLSX.readFile("/Users/mama/Downloads/Accounting Yield Funds.xlsx");

// Parse Performances sheet
const perfSheet = workbook.Sheets["Performances"];
const perfData = XLSX.utils.sheet_to_json(perfSheet, { header: 1 });

// Extract monthly performance data
const monthlyPerformance = [];

// Skip header rows, start from row 4 (index 3)
for (let i = 3; i < perfData.length; i++) {
  const row = perfData[i];
  if (!row || !row[0] || typeof row[0] !== "number") continue;

  const dateSerial = row[0];
  const date = excelDateToJS(dateSerial);

  if (isNaN(date.getTime()) || date > new Date()) continue;

  const btcNet = row[1] || 0;
  const ethNet = row[2] || 0;
  const usdtNet = row[3] || 0;
  const solNet = row[4] || 0;
  const xrpNet = row[5] || 0;

  if (btcNet || ethNet || usdtNet || solNet || xrpNet) {
    monthlyPerformance.push({
      date: date.toISOString().split("T")[0],
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      BTC: btcNet,
      ETH: ethNet,
      USDT: usdtNet,
      SOL: solNet,
      XRP: xrpNet,
    });
  }
}

// Load accounting transactions
const cleanData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/clean_accounting_data.json", "utf8")
);
const investorsData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/platform_investors.json", "utf8")
);

// Get fee structures
const feeStructures = {};
investorsData.investors.forEach((inv) => {
  feeStructures[inv.investor_id] = inv.fee_structures || {};
});

// Parse transactions
const transactions = cleanData.transactions
  .map((tx) => ({
    ...tx,
    date: new Date(tx.date),
    currency: tx.currency,
  }))
  .sort((a, b) => a.date - b.date);

// Build investor balances over time for each currency
function buildInvestorBalances(currency) {
  const balances = {};
  const currencyTxs = transactions.filter((tx) => tx.currency === currency);

  const investorIds = [...new Set(currencyTxs.map((tx) => tx.investor_id))];

  investorIds.forEach((invId) => {
    const invTxs = currencyTxs.filter((tx) => tx.investor_id === invId);
    let runningBalance = 0;
    const timeline = [];

    invTxs.forEach((tx) => {
      if (tx.transaction_type === "deposit") {
        runningBalance += tx.amount;
      } else if (tx.transaction_type === "withdrawal") {
        runningBalance -= tx.amount;
      }
      timeline.push({
        date: tx.date,
        balance: runningBalance,
      });
    });

    balances[invId] = timeline;
  });

  return balances;
}

// Get balance at specific date
function getBalanceAtDate(timeline, targetDate) {
  if (!timeline || timeline.length === 0) return 0;

  let lastBalance = 0;
  for (const entry of timeline) {
    if (entry.date > targetDate) break;
    lastBalance = entry.balance;
  }
  return Math.max(0, lastBalance);
}

// Get investor name
function getInvestorName(invId) {
  const investor = investorsData.investors.find((i) => i.investor_id === invId);
  return investor?.name || invId;
}

// Currency to fund code mapping
const currencyToFund = {
  BTC: "IND-BTC",
  ETH: "IND-ETH",
  USDT: "IND-USDT",
  SOL: "IND-SOL",
  XRP: "IND-XRP",
};

// Calculate yields for all currencies
const allYields = [];
const currencies = ["BTC", "ETH", "USDT", "SOL", "XRP"];

currencies.forEach((currency) => {
  const balances = buildInvestorBalances(currency);
  const investorIds = Object.keys(balances);

  if (investorIds.length === 0) return;

  // For each month with performance data
  monthlyPerformance.forEach((period) => {
    const netPerfRate = period[currency];
    if (!netPerfRate || netPerfRate <= 0) return;

    const periodDate = new Date(period.date);

    // Calculate each investor's yield
    investorIds.forEach((invId) => {
      const timeline = balances[invId];
      const balance = getBalanceAtDate(timeline, periodDate);

      if (balance <= 0) return;

      // Get fee structure
      const feeStructure = feeStructures[invId]?.[currency];
      const mgmtFee = feeStructure?.management_fee || 0.2;

      // Gross yield for this investor
      const grossYield = (balance * netPerfRate) / (1 - 0.2);

      // Net yield after their specific fee
      const netYield = grossYield * (1 - mgmtFee);

      if (netYield > 0.00000001) {
        allYields.push({
          investor_name: getInvestorName(invId),
          fund_code: currencyToFund[currency],
          month: period.month,
          tx_date: `${period.month}-28`,
          net_yield: netYield,
        });

        // Compound: add yield to balance for future periods
        const lastEntry = timeline[timeline.length - 1];
        if (lastEntry) {
          timeline.push({
            date: new Date(periodDate.getTime() + 1000),
            balance: lastEntry.balance + netYield,
          });
        }
      }
    });
  });
});

// Group by investor/fund/month
const groupedYields = {};
allYields.forEach((y) => {
  const key = `${y.investor_name}|${y.fund_code}|${y.month}`;
  if (!groupedYields[key]) {
    groupedYields[key] = {
      investor_name: y.investor_name,
      fund_code: y.fund_code,
      month: y.month,
      tx_date: y.tx_date,
      total_net: 0,
    };
  }
  groupedYields[key].total_net += y.net_yield;
});

// Convert to array and sort
const yields = Object.values(groupedYields)
  .filter((g) => g.total_net > 0.00000001)
  .sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.fund_code.localeCompare(b.fund_code) ||
      a.investor_name.localeCompare(b.investor_name)
  );

// Output JSON
const output = {
  generated_at: new Date().toISOString(),
  total_yields: yields.length,
  yields: yields,
};

const jsonPath = "/Users/mama/indigo-yield-platform-v01/scripts/yields-to-distribute.json";
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
console.log(`JSON written to: ${jsonPath}`);
console.log(`Total yield distributions: ${yields.length}`);

// Summary by fund
const fundSummary = {};
yields.forEach((y) => {
  if (!fundSummary[y.fund_code]) {
    fundSummary[y.fund_code] = { yield: 0, count: 0 };
  }
  fundSummary[y.fund_code].yield += y.total_net;
  fundSummary[y.fund_code].count++;
});

console.log("\n=== SUMMARY BY FUND ===");
Object.entries(fundSummary).forEach(([fund, data]) => {
  console.log(`${fund}: ${data.yield.toFixed(6)} total yield across ${data.count} distributions`);
});
