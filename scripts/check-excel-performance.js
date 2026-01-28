#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json"), "utf8")
);

console.log("=== Funds in Excel data ===");
console.log(Object.keys(data.funds));

// Check performance data for each fund
Object.keys(data.funds).forEach((fundCode) => {
  const fund = data.funds[fundCode];
  console.log("\n--- " + fundCode + " ---");

  if (fund.dailyData) {
    const withPerf = fund.dailyData.filter(
      (d) => d.netPerformancePct !== null && d.grossPerformancePct !== 1
    );
    console.log("Daily data entries: " + fund.dailyData.length);
    console.log("Entries with net performance: " + withPerf.length);

    // Sum up gross yield amounts
    const totalGross = withPerf.reduce((sum, d) => sum + (d.grossPerformanceAmount || 0), 0);
    console.log("Total gross performance amount: " + totalGross.toFixed(8));

    // Show sample performance entries
    if (withPerf.length > 0) {
      console.log("Sample performances:");
      withPerf.slice(0, 3).forEach((d) => {
        console.log(
          "  " +
            d.date +
            ": net=" +
            (d.netPerformancePct * 100).toFixed(4) +
            "%, gross=" +
            (d.grossPerformanceAmount || 0).toFixed(8)
        );
      });
    }
  } else {
    console.log("No dailyData found");
  }

  // Check for investor positions
  if (fund.investorPositions) {
    console.log("Investor positions: " + fund.investorPositions.length);
  }
});

// Check if there's a performances sheet
if (data.performances) {
  console.log("\n=== PERFORMANCES SHEET ===");
  console.log("Performance entries: " + data.performances.length);
  if (data.performances.length > 0) {
    console.log("Sample:");
    data.performances.slice(0, 3).forEach((p) => console.log(JSON.stringify(p, null, 2)));
  }
}
