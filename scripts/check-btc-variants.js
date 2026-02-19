const txs = require("./seed-data/transactions.json");

console.log("BTC BOOST entries:");
txs
  .filter((t) => t.currency === "BTC BOOST")
  .forEach((t) => {
    const sign = t.type === "WITHDRAWAL" ? -1 : 1;
    console.log(
      t.date +
        " | " +
        t.type.padEnd(10) +
        " | " +
        (sign * t.amount).toFixed(10) +
        " | " +
        t.investor
    );
  });

console.log("\nBTC TAC entries:");
txs
  .filter((t) => t.currency === "BTC TAC")
  .forEach((t) => {
    const sign = t.type === "WITHDRAWAL" ? -1 : 1;
    console.log(
      t.date +
        " | " +
        t.type.padEnd(10) +
        " | " +
        (sign * t.amount).toFixed(10) +
        " | " +
        t.investor
    );
  });

console.log("\nETH TAC entries:");
txs
  .filter((t) => t.currency === "ETH TAC")
  .forEach((t) => {
    const sign = t.type === "WITHDRAWAL" ? -1 : 1;
    console.log(
      t.date +
        " | " +
        t.type.padEnd(10) +
        " | " +
        (sign * t.amount).toFixed(10) +
        " | " +
        t.investor
    );
  });

// Now compare: the "extra" DB transactions should be BTC BOOST + BTC TAC
console.log("\n\nExpected 'extra' DB BTC transactions (BTC BOOST + BTC TAC):");
const boostTac = txs.filter((t) => t.currency === "BTC BOOST" || t.currency === "BTC TAC");
boostTac
  .sort((a, b) => a.date.localeCompare(b.date))
  .forEach((t) => {
    const sign = t.type === "WITHDRAWAL" ? -1 : 1;
    console.log(
      t.date +
        " | " +
        t.type.padEnd(10) +
        " | " +
        (sign * t.amount).toFixed(10) +
        " | " +
        t.investor +
        " | " +
        t.currency
    );
  });
