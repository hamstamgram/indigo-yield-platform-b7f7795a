const fs = require("fs");
const path = require("path");

const balances = require("./fund-balances.json");

// Name normalization: spreadsheet name -> platform name
const NAME_MAP = {
  "ALOK PAVAN BATRA": "Alok Pavan Batra",
  "Bo De kriek": "Bo De Kriek",
  "Pierre Bezençon": "Pierre Bezencon",
};

function normName(name) {
  const cleaned = name.replace(/\u00A0/g, " ");
  return NAME_MAP[cleaned] || cleaned;
}

// Get LAST balance per investor-fund for Feb 2026 (with name normalization)
const spreadsheet = {};
for (const e of balances) {
  if (e.month === "2026-02") {
    const inv = normName(e.investor);
    const key = e.fund + "|" + inv;
    spreadsheet[key] = e.balance;
  }
}

// Read platform balances from stdin (pipe-separated: asset|investor_name|balance)
const stdin = fs.readFileSync("/dev/stdin", "utf-8");
const platform = {};
for (const line of stdin.trim().split("\n")) {
  const parts = line.split("|").map((s) => s.trim());
  if (parts.length >= 3) {
    const key = parts[0] + "|" + parts[1];
    platform[key] = parseFloat(parts[2]);
  }
}

// Merge and compare
const allKeys = new Set([...Object.keys(spreadsheet), ...Object.keys(platform)]);
const results = [];

for (const key of allKeys) {
  const [fund, investor] = key.split("|");
  const ss = spreadsheet[key] || 0;
  const pl = platform[key] || 0;
  const diff = pl - ss;
  const pctDiff = ss !== 0 ? (diff / Math.abs(ss)) * 100 : pl !== 0 ? 999 : 0;

  if (Math.abs(ss) > 0.001 || Math.abs(pl) > 0.001) {
    results.push({ fund, investor, spreadsheet: ss, platform: pl, diff, pctDiff });
  }
}

results.sort((a, b) => a.fund.localeCompare(b.fund) || a.investor.localeCompare(b.investor));

console.log("Fund\tInvestor\tSpreadsheet\tPlatform\tDiff\t%Diff");
let totalOk = 0,
  totalBad = 0;
for (const r of results) {
  const status = Math.abs(r.pctDiff) < 0.01 ? "EXACT" : Math.abs(r.pctDiff) < 5 ? "OK" : "MISMATCH";
  console.log(
    `${r.fund}\t${r.investor.substring(0, 28).padEnd(28)}\t${r.spreadsheet.toFixed(8)}\t${r.platform.toFixed(8)}\t${r.diff.toFixed(10)}\t${r.pctDiff.toFixed(4)}%\t${status}`
  );
  if (status !== "MISMATCH") totalOk++;
  else totalBad++;
}
console.log(`\nTotal: ${results.length}, MATCHED (<5% diff): ${totalOk}, MISMATCH: ${totalBad}`);
