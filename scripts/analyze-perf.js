const perf = require("./seed-data/performance.json");
const groups = {};
perf.forEach((p) => {
  const key = p.month + "|" + p.fund;
  if (!(key in groups)) groups[key] = { month: p.month, fund: p.fund, segments: 0, entries: [] };
  groups[key].segments++;
  groups[key].entries.push({
    grossPct: p.grossPct,
    openingAum: p.openingAum,
    closingAum: p.closingAum,
    flows: p.flows,
  });
});
Object.values(groups)
  .sort((a, b) => a.month.localeCompare(b.month) || a.fund.localeCompare(b.fund))
  .forEach((g) => {
    const lastEntry = g.entries[g.entries.length - 1];
    console.log(
      g.month +
        " | " +
        g.fund.padEnd(5) +
        " | segs=" +
        g.segments +
        " | closingAum=" +
        lastEntry.closingAum
    );
  });
console.log("\nTotal entries:", perf.length);
