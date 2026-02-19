// Compare transactions.json (source of truth) vs DB active transactions
// Identify extra DB transactions that should be voided
const txs = require("./seed-data/transactions.json");

// Map currency to fund name
const currencyToFund = {
  BTC: "BTC",
  "ETH TAC": "ETH",
  SOL: "SOL",
  USDT: "USDT",
  XRP: "XRP",
  EURC: "EURC",
  xAUT: "xAUT",
};

// Count by fund
const fundCounts = {};
txs.forEach((t) => {
  const fund = currencyToFund[t.currency] || t.currency;
  if (!fundCounts[fund]) fundCounts[fund] = { deposits: 0, withdrawals: 0, total: 0 };
  if (t.type === "DEPOSIT") fundCounts[fund].deposits++;
  else fundCounts[fund].withdrawals++;
  fundCounts[fund].total++;
});

console.log("transactions.json counts by fund:");
Object.keys(fundCounts)
  .sort()
  .forEach((f) => {
    const c = fundCounts[f];
    console.log("  " + f + ": " + c.deposits + " DEP + " + c.withdrawals + " WD = " + c.total);
  });

let totalJson = txs.length;
console.log("  TOTAL: " + totalJson);

// Create a fingerprint for each transaction to match with DB
// fingerprint = date|investor|type|amount
console.log("\n\nBTC transactions from JSON (to compare with DB):");
const btcTxs = txs.filter((t) => t.currency === "BTC").sort((a, b) => a.date.localeCompare(b.date));
btcTxs.forEach((t) => {
  const sign = t.type === "WITHDRAWAL" ? -1 : 1;
  console.log(
    t.date +
      " | " +
      t.type.padEnd(10) +
      " | " +
      (sign * t.amount).toFixed(10).padStart(15) +
      " | " +
      t.investor
  );
});
console.log("Count: " + btcTxs.length);

// Now show what the DB has extra
console.log("\n\nExpected DB DEP/WD counts (from transactions.json):");
console.log("BTC: " + btcTxs.length);
console.log("DB has: 75 active (from earlier query)");
console.log("EXTRA: " + (75 - btcTxs.length));
