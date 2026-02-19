// Analyze performance.json + fund-balances.json to compute expected recorded AUM
// for each month-fund, and determine how many V5 calls are needed

const perf = require("./seed-data/performance.json");
const balances = require("./seed-data/fund-balances.json");

// Compute AUM from fund-balances.json (sum of all investor balances per fund-month)
const aumByMonthFund = {};
balances.forEach((b) => {
  const key = b.month + "|" + b.fund;
  if (!(key in aumByMonthFund)) aumByMonthFund[key] = 0;
  aumByMonthFund[key] += b.balance;
});

// Group perf entries and compute segment yields
const groups = {};
perf.forEach((p) => {
  const key = p.month + "|" + p.fund;
  if (!(key in groups)) groups[key] = { month: p.month, fund: p.fund, segments: [] };
  groups[key].segments.push(p);
});

console.log("Month   | Fund  | Segs | Last closingAum | Sum(balances) | Diff");
console.log("--------|-------|------|-----------------|---------------|-----");

const sorted = Object.values(groups).sort(
  (a, b) => a.month.localeCompare(b.month) || a.fund.localeCompare(b.fund)
);

sorted.forEach((g) => {
  const key = g.month + "|" + g.fund;
  const balAum = aumByMonthFund[key] || 0;
  const lastSeg = g.segments[g.segments.length - 1];
  const diff = Math.abs(balAum - lastSeg.closingAum);
  const pctDiff = lastSeg.closingAum > 0 ? ((diff / lastSeg.closingAum) * 100).toFixed(4) : "N/A";

  // Compute total segment yield: sum of (openingAum * grossPct / 100)
  let totalGrossYield = 0;
  g.segments.forEach((s) => {
    totalGrossYield += (s.openingAum * s.grossPct) / 100;
  });

  console.log(
    g.month +
      " | " +
      g.fund.padEnd(5) +
      " | " +
      String(g.segments.length).padStart(4) +
      " | " +
      lastSeg.closingAum.toFixed(4).padStart(15) +
      " | " +
      balAum.toFixed(4).padStart(13) +
      " | " +
      pctDiff +
      "%"
  );
});
