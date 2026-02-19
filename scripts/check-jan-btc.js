const balances = require("./seed-data/fund-balances.json");

// Check BTC investors for Dec 2024 (last segment) and Jan 2025
console.log("BTC Dec 2024 final balances:");
const dec = balances.filter((b) => b.fund === "BTC" && b.month === "2024-12");
// Group by investor, take last entry per investor
const decByInvestor = {};
dec.forEach((b) => {
  if (!decByInvestor[b.investor]) decByInvestor[b.investor] = [];
  decByInvestor[b.investor].push(b.balance);
});
Object.keys(decByInvestor)
  .sort()
  .forEach((inv) => {
    const bals = decByInvestor[inv];
    console.log(
      "  " +
        inv.padEnd(30) +
        " entries: " +
        bals.length +
        " | last: " +
        bals[bals.length - 1].toFixed(10)
    );
  });

console.log("\nBTC Jan 2025 balances:");
const jan = balances.filter((b) => b.fund === "BTC" && b.month === "2025-01");
const janByInvestor = {};
jan.forEach((b) => {
  if (!janByInvestor[b.investor]) janByInvestor[b.investor] = [];
  janByInvestor[b.investor].push(b.balance);
});
Object.keys(janByInvestor)
  .sort()
  .forEach((inv) => {
    const bals = janByInvestor[inv];
    console.log(
      "  " +
        inv.padEnd(30) +
        " entries: " +
        bals.length +
        " | last: " +
        bals[bals.length - 1].toFixed(10)
    );
  });

console.log("\nBTC Apr 2025 balances:");
const apr = balances.filter((b) => b.fund === "BTC" && b.month === "2025-04");
const aprByInvestor = {};
apr.forEach((b) => {
  if (!aprByInvestor[b.investor]) aprByInvestor[b.investor] = [];
  aprByInvestor[b.investor].push(b.balance);
});
Object.keys(aprByInvestor)
  .sort()
  .forEach((inv) => {
    const bals = aprByInvestor[inv];
    console.log(
      "  " +
        inv.padEnd(30) +
        " entries: " +
        bals.length +
        " | last: " +
        bals[bals.length - 1].toFixed(10)
    );
  });

// Check sum of final balances for Jan
let janSum = 0;
Object.values(janByInvestor).forEach((bals) => (janSum += bals[bals.length - 1]));
console.log("\nJan 2025 sum of final balances: " + janSum.toFixed(10));
