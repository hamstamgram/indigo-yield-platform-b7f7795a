const perf = require("./seed-data/performance.json");
const balances = require("./seed-data/fund-balances.json");

const perfFunds = new Set(perf.map((p) => p.fund));
const balFunds = new Set(balances.map((b) => b.fund));

console.log("Fund names in performance.json:", [...perfFunds].sort());
console.log("Fund names in fund-balances.json:", [...balFunds].sort());

// Count entries per fund
const perfCounts = {};
perf.forEach((p) => {
  perfCounts[p.fund] = (perfCounts[p.fund] || 0) + 1;
});
const balCounts = {};
balances.forEach((b) => {
  balCounts[b.fund] = (balCounts[b.fund] || 0) + 1;
});

console.log("\nPerformance entries per fund:");
Object.keys(perfCounts)
  .sort()
  .forEach((f) => console.log("  " + f + ": " + perfCounts[f]));

console.log("\nBalance entries per fund:");
Object.keys(balCounts)
  .sort()
  .forEach((f) => console.log("  " + f + ": " + balCounts[f]));
