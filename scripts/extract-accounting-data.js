/**
 * Extract Accounting Data from Excel
 *
 * This script parses the accounting Excel file and extracts structured data
 * for verification against the platform database.
 *
 * Run with: node scripts/extract-accounting-data.js
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Excel serial date to JavaScript Date
const excelDateToJS = (serial) => {
  if (!serial || typeof serial !== "number") return null;
  return new Date((serial - 25569) * 86400 * 1000);
};

const formatDate = (date) => {
  if (!date) return null;
  return date.toISOString().split("T")[0];
};

// Main extraction function
async function extractAccountingData() {
  const excelPath = "/Users/mama/Downloads/Accounting Yield Funds.xlsx";
  const outputDir = "/Users/mama/indigo-yield-platform-v01/tests/fixtures";

  console.log("Reading Excel file:", excelPath);
  const workbook = XLSX.readFile(excelPath);

  const result = {
    extractionDate: new Date().toISOString(),
    funds: {},
    investments: [],
    performances: [],
  };

  // Extract fund-specific data
  const fundSheets = [
    { name: "BTC Yield Fund", code: "IND-BTC" },
    { name: "ETH Yield Fund", code: "IND-ETH" },
    { name: "USDT Yield Fund", code: "IND-USDT" },
    { name: "SOL Yield Fund", code: "IND-SOL" },
    { name: "XRP Yield Fund", code: "IND-XRP" },
  ];

  for (const fund of fundSheets) {
    console.log(`\nProcessing: ${fund.name}`);
    const sheet = workbook.Sheets[fund.name];
    if (!sheet) {
      console.log(`  Sheet not found: ${fund.name}`);
      continue;
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Extract dates from row 1 (starting from column D/index 3)
    const dateRow = data[0] || [];
    const dates = [];
    for (let i = 3; i < dateRow.length; i++) {
      const dateVal = dateRow[i];
      if (typeof dateVal === "number") {
        dates.push({
          colIndex: i,
          excelDate: dateVal,
          date: formatDate(excelDateToJS(dateVal)),
        });
      }
    }

    // Extract AUM progression (rows 1-3 in 0-indexed)
    const aumBefore = data[0] || [];
    const topUpWithdrawals = data[1] || [];
    const aumAfter = data[2] || [];
    const grossPerf = data[3] || [];
    const netPerf = data[4] || [];
    const yearlyApy = data[5] || [];

    // Build daily data
    const dailyData = [];
    for (const dateInfo of dates) {
      const idx = dateInfo.colIndex;
      dailyData.push({
        date: dateInfo.date,
        excelDate: dateInfo.excelDate,
        aumBefore: typeof aumBefore[idx] === "number" ? aumBefore[idx] : null,
        topUpWithdrawals: typeof topUpWithdrawals[idx] === "number" ? topUpWithdrawals[idx] : null,
        aumAfter: typeof aumAfter[idx] === "number" ? aumAfter[idx] : null,
        grossPerformance: typeof grossPerf[idx] === "number" ? grossPerf[idx] : null,
        netPerformance: typeof netPerf[idx] === "number" ? netPerf[idx] : null,
        yearlyApy: typeof yearlyApy[idx] === "number" ? yearlyApy[idx] : null,
      });
    }

    // Extract investor data (starting from row 9, index 8)
    const investors = [];
    const headerRow = data[7] || []; // Row 8 has "Investors", "Fees", "IB"

    for (let rowIdx = 8; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || !row[0]) continue;

      const investorName = row[0];
      if (investorName === "Total" || investorName === "Total AUM") continue;

      const fee = typeof row[1] === "number" ? row[1] : 0;
      const ib = typeof row[2] === "number" ? row[2] : 0;

      // Get positions for each date
      const positions = [];
      for (const dateInfo of dates) {
        const posVal = row[dateInfo.colIndex];
        if (typeof posVal === "number" && posVal !== 0) {
          positions.push({
            date: dateInfo.date,
            position: posVal,
          });
        }
      }

      if (positions.length > 0 || fee > 0) {
        investors.push({
          name: investorName,
          feePercent: fee * 100, // Convert to percentage
          ibPercent: ib * 100,
          positions,
        });
      }
    }

    result.funds[fund.code] = {
      sheetName: fund.name,
      code: fund.code,
      dates: dates.map((d) => d.date),
      dailyData: dailyData.filter((d) => d.date),
      investors,
    };

    console.log(`  Dates found: ${dates.length}`);
    console.log(`  Investors found: ${investors.length}`);
  }

  // Extract Investments sheet
  console.log("\nProcessing: Investments");
  const investSheet = workbook.Sheets["Investments"];
  if (investSheet) {
    const investData = XLSX.utils.sheet_to_json(investSheet, { header: 1 });

    for (let i = 1; i < investData.length; i++) {
      const row = investData[i];
      if (!row || !row[0]) continue;

      const dateVal = row[0];
      const date = typeof dateVal === "number" ? formatDate(excelDateToJS(dateVal)) : null;

      result.investments.push({
        date,
        investorName: row[1],
        currency: row[2],
        amount: row[3],
        usdValue: row[4],
        email: row[5] || null,
      });
    }
    console.log(`  Transactions found: ${result.investments.length}`);
  }

  // Extract Performances sheet
  console.log("\nProcessing: Performances");
  const perfSheet = workbook.Sheets["Performances"];
  if (perfSheet) {
    const perfData = XLSX.utils.sheet_to_json(perfSheet, { header: 1 });

    // Row 3 has headers: BTC, ETH, Stable, SOL, XRP
    // Rows 4+ have month data
    for (let i = 3; i < perfData.length && i < 50; i++) {
      const row = perfData[i];
      if (!row || !row[0]) continue;

      const dateVal = row[0];
      const date = typeof dateVal === "number" ? formatDate(excelDateToJS(dateVal)) : null;

      if (date) {
        result.performances.push({
          date,
          btcNetPerf: row[1],
          ethNetPerf: row[2],
          usdtNetPerf: row[3],
          solNetPerf: row[4],
          xrpNetPerf: row[5],
          btcApy: row[7],
          ethApy: row[8],
          usdtApy: row[9],
          solApy: row[10],
          xrpApy: row[11],
        });
      }
    }
    console.log(`  Performance records found: ${result.performances.length}`);
  }

  // Write output
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "accounting-excel-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);

  // Also write a summary
  const summary = {
    extractionDate: result.extractionDate,
    funds: Object.keys(result.funds).map((code) => ({
      code,
      dateCount: result.funds[code].dates.length,
      investorCount: result.funds[code].investors.length,
    })),
    investmentCount: result.investments.length,
    performanceCount: result.performances.length,
  };

  console.log("\nExtraction Summary:");
  console.log(JSON.stringify(summary, null, 2));

  return result;
}

// Run extraction
extractAccountingData()
  .then(() => console.log("\nDone!"))
  .catch((err) => console.error("Error:", err));
