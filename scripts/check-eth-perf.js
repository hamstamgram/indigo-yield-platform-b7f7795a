const perf = require("./seed-data/performance.json");
const balances = require("./seed-data/fund-balances.json");

// Check ETH performance for Jul 2025
console.log("ETH Performance Jul 2025:");
perf
  .filter((p) => p.fund === "ETH" && p.month === "2025-07")
  .forEach((p, i) => {
    console.log(
      "  Seg " +
        (i + 1) +
        ": open=" +
        p.openingAum +
        " close=" +
        p.closingAum +
        " flows=" +
        p.flows +
        " gross%=" +
        p.grossPct
    );
  });

// Check if ETH TAC investors appear in fund-balances before/after Jul 2025
console.log("\nETH fund-balances Jun 2025 investors:");
balances
  .filter((b) => b.fund === "ETH" && b.month === "2025-06")
  .forEach((b) => {
    console.log("  " + b.investor.padEnd(30) + " " + b.balance.toFixed(6));
  });

console.log("\nETH fund-balances Jul 2025 investors:");
balances
  .filter((b) => b.fund === "ETH" && b.month === "2025-07")
  .forEach((b) => {
    console.log("  " + b.investor.padEnd(30) + " " + b.balance.toFixed(6));
  });

console.log("\nETH fund-balances Aug 2025 investors:");
balances
  .filter((b) => b.fund === "ETH" && b.month === "2025-08")
  .forEach((b) => {
    console.log("  " + b.investor.padEnd(30) + " " + b.balance.toFixed(6));
  });
