const fs = require("fs");
const data = JSON.parse(fs.readFileSync("../tests/fixtures/accounting-excel-data-v3.json", "utf8"));

console.log("=== All Monthly Performance Entries ===\n");
data.monthlyPerformance.forEach((mp, i) => {
  const xrpVal =
    mp.netPerformance.xrp !== null ? ((mp.netPerformance.xrp || 0) * 100).toFixed(4) + "%" : "N/A";

  console.log(i + 1 + ". " + mp.date + ":");
  console.log("   BTC: " + ((mp.netPerformance.btc || 0) * 100).toFixed(4) + "%");
  console.log("   ETH: " + ((mp.netPerformance.eth || 0) * 100).toFixed(4) + "%");
  console.log("   USDT: " + ((mp.netPerformance.usdt || 0) * 100).toFixed(4) + "%");
  console.log("   SOL: " + ((mp.netPerformance.sol || 0) * 100).toFixed(4) + "%");
  console.log("   XRP: " + xrpVal);
});
