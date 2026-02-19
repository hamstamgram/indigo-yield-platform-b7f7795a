const txs = require("./seed-data/transactions.json");

// List ALL "ETH" (non-TAC) entries
const ethOnly = txs
  .filter((t) => t.currency === "ETH")
  .sort((a, b) => a.date.localeCompare(b.date));
console.log("transactions.json 'ETH' entries (" + ethOnly.length + "):");
ethOnly.forEach((t) => {
  const sign = t.type === "WITHDRAWAL" ? -1 : 1;
  console.log(
    t.date +
      " | " +
      t.type.padEnd(10) +
      " | " +
      (sign * t.amount).toFixed(6).padStart(14) +
      " | " +
      t.investor
  );
});

// Check for Jul 11 2025 re-entries
console.log("\n\nJul 11 2025 ETH entries:");
ethOnly
  .filter((t) => t.date === "2025-07-11")
  .forEach((t) => {
    console.log("  " + t.type + " | " + t.amount + " | " + t.investor);
  });

// Check for ETH TAC Jul 11 exits
const ethTac = txs.filter((t) => t.currency === "ETH TAC" && t.date === "2025-07-11");
console.log("\nJul 11 2025 ETH TAC entries:");
ethTac.forEach((t) => {
  console.log("  " + t.type + " | " + t.amount + " | " + t.investor);
});
