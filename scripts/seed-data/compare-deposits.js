// Compare Excel transactions.json deposits against DB query results
// to identify data mismatches

const fs = require("fs");
const path = require("path");

const txs = JSON.parse(fs.readFileSync(path.join(__dirname, "transactions.json"), "utf8"));

// Map currency to base asset
function mapAsset(currency) {
  if (["BTC", "BTC TAC", "BTC BOOST"].includes(currency)) return "BTC";
  if (["ETH", "ETH TAC"].includes(currency)) return "ETH";
  return currency;
}

// Aggregate Excel deposits per investor per asset
const excelFlows = {};
for (const tx of txs) {
  const asset = mapAsset(tx.currency);
  const name = tx.investor.toLowerCase().trim();
  const key = `${asset}:${name}`;

  if (!excelFlows[key]) excelFlows[key] = { deposits: 0, withdrawals: 0, count: 0 };

  if (tx.type === "DEPOSIT") {
    excelFlows[key].deposits += tx.amount;
    excelFlows[key].count++;
  } else {
    excelFlows[key].withdrawals += tx.amount;
    excelFlows[key].count++;
  }
}

// DB deposits (from SQL query - paste aggregated results)
const dbFlows = {
  "BTC:alok pavan batra": { deposits: 6.0, withdrawals: 0 },
  "BTC:blondish": { deposits: 4.0996, withdrawals: 0 },
  "BTC:danielle richetta": { deposits: 10.2335, withdrawals: 10.4598 },
  "BTC:indigo fees": { deposits: 0.0498, withdrawals: 0 },
  "BTC:jose molla": { deposits: 7.3307, withdrawals: 0 },
  "BTC:kabbaj": { deposits: 6.6593, withdrawals: 0 },
  "BTC:kyle gulamerian": { deposits: 8.1008, withdrawals: 8.1337 },
  "BTC:matthias reiser": { deposits: 9.4557, withdrawals: 9.6612 },
  "BTC:nathanaël cohen": { deposits: 0.446, withdrawals: 0 },
  "BTC:nath & thomas": { deposits: 1.0, withdrawals: 0 },
  "BTC:nsvo holdings": { deposits: 0.7993, withdrawals: 0 },
  "BTC:oliver loisel": { deposits: 2.115364, withdrawals: 0 },
  "BTC:paul johnson": { deposits: 0.4395, withdrawals: 0.4408 },
  "BTC:sam johnson": { deposits: 7.77, withdrawals: 7.7852 },
  "BTC:thomas puech": { deposits: 15.3841666, withdrawals: 6.7249 },
  "BTC:victoria pariente-cohen": { deposits: 0.1484, withdrawals: 0 },
  "BTC:vivie & liana": { deposits: 3.411, withdrawals: 3.4221 },
  "ETH:advantage blockchain": { deposits: 50.0, withdrawals: 0 },
  "ETH:alok pavan batra": { deposits: 103.38, withdrawals: 0 },
  "ETH:babak eftekhari": { deposits: 66.11, withdrawals: 0 },
  "ETH:blondish": { deposits: 124.580159352, withdrawals: 0 },
  "ETH:brandon hood": { deposits: 31.37, withdrawals: 0 },
  "ETH:indigo digital asset fund lp": { deposits: 175.0, withdrawals: 178.37 },
  "ETH:indigo fees": { deposits: 0.9339374502, withdrawals: 0 },
  "ETH:jose molla": { deposits: 113.6524577386, withdrawals: 0 },
  "ETH:nathanaël cohen": { deposits: 47.9896054591, withdrawals: 0 },
  "ETH:nsvo holdings": { deposits: 25.03, withdrawals: 0 },
  "ETH:paul johnson": { deposits: 24.0327, withdrawals: 24.22 },
  "ETH:sam johnson": { deposits: 212.5, withdrawals: 213.73 },
  "ETH:tomer zur": { deposits: 190.5371, withdrawals: 0 },
  "SOL:alok pavan batra": { deposits: 826.54, withdrawals: 0 },
  "SOL:indigo digital asset fund lp": { deposits: 1250.0, withdrawals: 1285.66 },
  "SOL:jose molla": { deposits: 481.75, withdrawals: 0 },
  "SOL:paul johnson": { deposits: 234.17, withdrawals: 236.02 },
  "SOL:sam johnson": { deposits: 4836.05, withdrawals: 4873.15 },
  "USDT:alain bensimon": { deposits: 136737, withdrawals: 0 },
  "USDT:anne cecile noique": { deposits: 222687, withdrawals: 0 },
  "USDT:babak eftekhari": { deposits: 233132.03, withdrawals: 0 },
  "USDT:bo de kriek": { deposits: 273807, withdrawals: 0 },
  "USDT:daniele francilia": { deposits: 109776, withdrawals: 114867.59 },
  "USDT:dario deiana": { deposits: 199659.72, withdrawals: 0 },
  "USDT:halley86": { deposits: 99990, withdrawals: 0 },
  "USDT:indigo digital asset fund lp": { deposits: 111370, withdrawals: 113841.65 },
  "USDT:indigo fees": { deposits: 0, withdrawals: 20000 },
  "USDT:indigo ventures": { deposits: 130000, withdrawals: 132709.59 },
  "USDT:jose molla": { deposits: 97695, withdrawals: 97908 },
  "USDT:julien grunebaum": { deposits: 109392, withdrawals: 0 },
  "USDT:matthew beatty": { deposits: 334704, withdrawals: 0 },
  "USDT:monica levy chicheportiche": { deposits: 840168.03, withdrawals: 0 },
  "USDT:nathanaël cohen": { deposits: 93819.18, withdrawals: 0 },
  "USDT:nath & thomas": { deposits: 299915.77, withdrawals: 301438.6 },
  "USDT:pierre bezencon": { deposits: 109333, withdrawals: 0 },
  "USDT:sacha oshry": { deposits: 100000, withdrawals: 0 },
  "USDT:sam johnson": { deposits: 6500000, withdrawals: 0 },
  "USDT:terance chen": { deposits: 219747, withdrawals: 0 },
  "USDT:thomas puech": { deposits: 46750.8, withdrawals: 47373.77 },
  "USDT:tomer mazar": { deposits: 28567.67, withdrawals: 0 },
  "USDT:valeria cruz": { deposits: 50000, withdrawals: 0 },
  "USDT:ventures life style": { deposits: 100000, withdrawals: 0 },
  "XRP:sam johnson": { deposits: 328603, withdrawals: 330500.42 },
};

console.log("=== DEPOSIT COMPARISON: Excel (with TAC/BOOST mapped) vs DB ===\n");

// Compare
const allKeys = new Set([...Object.keys(excelFlows), ...Object.keys(dbFlows)]);
const mismatches = [];
const onlyExcel = [];
const onlyDb = [];
const matches = [];

for (const key of [...allKeys].sort()) {
  const excel = excelFlows[key];
  const db = dbFlows[key];

  if (!db && excel) {
    const net = excel.deposits - excel.withdrawals;
    onlyExcel.push({
      key,
      deposits: excel.deposits.toFixed(8),
      withdrawals: excel.withdrawals.toFixed(8),
      net: net.toFixed(8),
    });
    continue;
  }
  if (!excel && db) {
    const net = db.deposits - db.withdrawals;
    onlyDb.push({
      key,
      deposits: db.deposits.toFixed(8),
      withdrawals: db.withdrawals.toFixed(8),
      net: net.toFixed(8),
    });
    continue;
  }

  const excelNet = excel.deposits - excel.withdrawals;
  const dbNet = db.deposits - db.withdrawals;
  const diff = Math.abs(excelNet - dbNet);

  if (diff > 0.001) {
    mismatches.push({
      key,
      excelNet: excelNet.toFixed(8),
      dbNet: dbNet.toFixed(8),
      diff: diff.toFixed(8),
    });
  } else {
    matches.push(key);
  }
}

console.log(`MATCHES (${matches.length}):`);
for (const m of matches) console.log(`  ${m}`);

console.log(`\nMISMATCHES (${mismatches.length}):`);
for (const m of mismatches) {
  console.log(`  ${m.key}: Excel net=${m.excelNet}, DB net=${m.dbNet}, diff=${m.diff}`);
}

console.log(`\nONLY IN EXCEL (${onlyExcel.length}):`);
for (const m of onlyExcel) {
  console.log(`  ${m.key}: deposits=${m.deposits}, withdrawals=${m.withdrawals}, net=${m.net}`);
}

console.log(`\nONLY IN DB (${onlyDb.length}):`);
for (const m of onlyDb) {
  console.log(`  ${m.key}: deposits=${m.deposits}, withdrawals=${m.withdrawals}, net=${m.net}`);
}

// Per-asset totals
console.log("\n=== PER-ASSET NET FLOW TOTALS ===");
const assetTotals = {};
for (const key of allKeys) {
  const [asset] = key.split(":");
  if (!assetTotals[asset]) assetTotals[asset] = { excelNet: 0, dbNet: 0 };

  const excel = excelFlows[key];
  const db = dbFlows[key];

  if (excel) assetTotals[asset].excelNet += excel.deposits - excel.withdrawals;
  if (db) assetTotals[asset].dbNet += db.deposits - db.withdrawals;
}

for (const [asset, totals] of Object.entries(assetTotals).sort()) {
  const diff = (totals.excelNet - totals.dbNet).toFixed(8);
  console.log(
    `  ${asset}: Excel net=${totals.excelNet.toFixed(4)}, DB net=${totals.dbNet.toFixed(4)}, diff=${diff}`
  );
}
