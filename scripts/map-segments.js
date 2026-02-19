// Map performance segments to transaction dates for BTC fund
const perf = require("./seed-data/performance.json");
const txs = require("./seed-data/transactions.json");

const btcPerf = perf.filter((p) => p.fund === "BTC");
const btcTxs = txs.filter((t) => t.currency === "BTC");

// Group perf by month
const months = {};
btcPerf.forEach((p) => {
  if (!months[p.month]) months[p.month] = [];
  months[p.month].push(p);
});

console.log("BTC Performance Data by Month:");
console.log("Month      | Seg | openAUM    | closeAUM   | grossPct       | flows    | gross_yield");
console.log("-----------|-----|------------|------------|----------------|----------|------------");

Object.keys(months)
  .sort()
  .forEach((month) => {
    const segs = months[month];
    let totalGross = 0;
    segs.forEach((s, i) => {
      const grossYield = (s.openingAum * s.grossPct) / 100;
      totalGross += grossYield;
      console.log(
        month +
          "  | s" +
          (i + 1) +
          "  | " +
          s.openingAum.toFixed(4).padStart(10) +
          " | " +
          s.closingAum.toFixed(4).padStart(10) +
          " | " +
          s.grossPct.toFixed(10).padStart(14) +
          " | " +
          s.flows.toFixed(4).padStart(8) +
          " | " +
          grossYield.toFixed(10)
      );
    });
    if (segs.length > 1) {
      console.log(
        month +
          "  | TOT |            |            |                |          | " +
          totalGross.toFixed(10)
      );
    }
  });

// Show BTC transactions with dates
console.log("\nBTC Transactions (segment boundary candidates):");
btcTxs.forEach((t) => {
  console.log(
    t.date +
      " | " +
      t.type.padEnd(10) +
      " | " +
      t.amount.toFixed(4).padStart(10) +
      " | " +
      t.investor
  );
});

// Match flows to transactions
console.log("\n\nSegment Flow -> Transaction Matching:");
Object.keys(months)
  .sort()
  .forEach((month) => {
    const segs = months[month];
    if (segs.length <= 1) return;

    const monthTxs = btcTxs.filter((t) => t.date.startsWith(month));

    console.log("\n" + month + " (" + segs.length + " segments):");
    segs.forEach((s, i) => {
      if (s.flows !== 0) {
        console.log("  Segment " + (i + 1) + ": flows = " + s.flows.toFixed(4));
        // Find matching transactions
        const matchingTxs = monthTxs.filter((t) => {
          const flowSign = t.type === "WITHDRAWAL" ? -t.amount : t.amount;
          return Math.abs(flowSign) > 0;
        });
        if (matchingTxs.length > 0) {
          console.log("  Possible matching transactions:");
          monthTxs.forEach((t) => {
            const sign = t.type === "WITHDRAWAL" ? -1 : 1;
            console.log(
              "    " + t.date + " " + t.type + " " + (sign * t.amount).toFixed(4) + " " + t.investor
            );
          });
        }
      }
    });
  });
