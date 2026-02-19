const data = require("./fund-balances.json");

// Get last balance per investor-fund for Feb 2026
const lastBalances = {};
for (const e of data) {
  if (e.month === "2026-02") {
    const key = e.fund + "|" + e.investor;
    lastBalances[key] = e.balance; // last entry wins
  }
}

// Output as tab-separated for comparison
const entries = Object.entries(lastBalances)
  .filter(([k, v]) => Math.abs(v) > 0.001)
  .sort(([a], [b]) => a.localeCompare(b));

console.log("fund\tinvestor\tspreadsheet_balance");
for (const [key, balance] of entries) {
  const [fund, investor] = key.split("|");
  console.log(fund + "\t" + investor + "\t" + balance.toFixed(8));
}
