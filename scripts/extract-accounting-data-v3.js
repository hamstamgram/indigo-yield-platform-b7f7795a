/**
 * Extract Accounting Data from Excel - V3
 *
 * Handles both fund sheet layouts:
 * - BTC: Investor data in columns H+ (index 8+), dates in row 0
 * - Others: Investor header "Investors" in column A, dates above header row
 *
 * Run with: node scripts/extract-accounting-data-v3.js
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

// Parse BTC Yield Fund (different layout)
function parseBTCFundSheet(sheet, fundCode) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // BTC layout: Row 0 has headers including "Investors" at col 8
  // Col 8 = Investors, Col 9 = Fees, Col 10 = IB, Col 11+ = Date columns
  const headerRow = data[0] || [];

  if (headerRow[8] !== "Investors") {
    console.log(`  BTC layout not detected for ${fundCode}`);
    return null;
  }

  // Extract dates from header row (starting col 11)
  const dates = [];
  for (let i = 11; i < headerRow.length; i++) {
    const val = headerRow[i];
    if (typeof val === "number" && val > 40000 && val < 50000) {
      dates.push({
        colIndex: i,
        excelDate: val,
        date: formatDate(excelDateToJS(val)),
      });
    }
  }

  const fundData = {
    code: fundCode,
    dates: dates.map((d) => d.date),
    dailyData: [],
    investors: [],
    aumProgression: [],
    performanceData: [],
    layout: "btc",
  };

  // Extract left-side time-series data (AUM, performance)
  // Row 0 headers: Date, AUM, Gross Performance (%), Gross Performance (BTC), Net Performance, Yearly APY
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const dateVal = row[0];
    if (typeof dateVal !== "number" || dateVal < 40000 || dateVal > 50000) continue;

    const date = formatDate(excelDateToJS(dateVal));
    const aum = typeof row[1] === "number" ? row[1] : null;
    const grossPerfPct = typeof row[2] === "number" ? row[2] : null;
    const grossPerfAmount = typeof row[3] === "number" ? row[3] : null;
    const netPerfPct = typeof row[4] === "number" ? row[4] : null;
    const yearlyApy = typeof row[5] === "number" ? row[5] : null;

    if (date && aum !== null) {
      fundData.dailyData.push({
        date,
        aum,
        grossPerformancePct: grossPerfPct,
        grossPerformanceAmount: grossPerfAmount,
        netPerformancePct: netPerfPct,
        yearlyApy,
      });
    }
  }

  // Extract investor data (rows 1+ in right side)
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[8]) continue;

    const investorName = String(row[8]).trim();
    if (
      !investorName ||
      investorName === "Total" ||
      investorName === "Total AUM" ||
      investorName.includes("Indigo")
    ) {
      continue;
    }

    const fee = typeof row[9] === "number" ? row[9] : 0;
    const ib = typeof row[10] === "number" ? row[10] : 0;

    // Get positions for each date
    const positions = [];
    for (const dateInfo of dates) {
      const posVal = row[dateInfo.colIndex];
      if (typeof posVal === "number") {
        positions.push({
          date: dateInfo.date,
          position: posVal,
        });
      }
    }

    if (positions.length > 0) {
      fundData.investors.push({
        name: investorName,
        feePercent: fee,
        ibPercent: ib,
        positionHistory: positions,
        initialPosition: positions[0]?.position || 0,
        latestPosition: positions[positions.length - 1]?.position || 0,
      });
    }
  }

  return fundData;
}

// Parse standard fund sheet (ETH, USDT, SOL, XRP layout)
function parseStandardFundSheet(sheet, fundCode) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find the header row (contains "Investors" in column A)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (row && row[0] === "Investors") {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.log(`  Could not find header row for ${fundCode}`);
    return null;
  }

  // The dates are in the header row, starting after "Investors", "Fees", "IB"
  const headerRow = data[headerRowIdx];
  const dates = [];
  for (let i = 3; i < headerRow.length; i++) {
    const val = headerRow[i];
    if (typeof val === "number" && val > 40000 && val < 50000) {
      dates.push({
        colIndex: i,
        excelDate: val,
        date: formatDate(excelDateToJS(val)),
      });
    }
  }

  const fundData = {
    code: fundCode,
    dates: dates.map((d) => d.date),
    dailyData: [],
    investors: [],
    aumProgression: [],
    performanceData: [],
    layout: "standard",
  };

  // Look for rows with specific labels above the header
  for (let i = 0; i < headerRowIdx; i++) {
    const row = data[i];
    if (!row) continue;

    const label = String(row[0] || "")
      .toLowerCase()
      .trim();

    if (label.includes("aum before") || label === "aum before") {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.aumProgression.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.aumProgression.push(existing);
          }
          existing.aumBefore = val;
        }
      }
    }

    if (label.includes("top up") || label.includes("withdrawal")) {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.aumProgression.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.aumProgression.push(existing);
          }
          existing.netFlow = val;
        }
      }
    }

    if (label.includes("aum after") || label === "aum after") {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.aumProgression.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.aumProgression.push(existing);
          }
          existing.aumAfter = val;
        }
      }
    }

    if (label.includes("gross performance")) {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.performanceData.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.performanceData.push(existing);
          }
          existing.grossPerformance = val;
        }
      }
    }

    if (label.includes("net performance") && !label.includes("gross")) {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.performanceData.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.performanceData.push(existing);
          }
          existing.netPerformance = val;
        }
      }
    }

    if (label.includes("yearly apy") || label.includes("apy")) {
      for (const dateInfo of dates) {
        const val = row[dateInfo.colIndex];
        if (typeof val === "number") {
          let existing = fundData.performanceData.find((d) => d.date === dateInfo.date);
          if (!existing) {
            existing = { date: dateInfo.date };
            fundData.performanceData.push(existing);
          }
          existing.yearlyApy = val;
        }
      }
    }
  }

  // Extract investor data (rows after header)
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const investorName = String(row[0]).trim();
    if (
      !investorName ||
      investorName === "Total" ||
      investorName === "Total AUM" ||
      investorName.includes("Indigo")
    ) {
      continue;
    }

    const fee = typeof row[1] === "number" ? row[1] : 0;
    const ib = typeof row[2] === "number" ? row[2] : 0;

    // Get positions for each date
    const positions = [];
    for (const dateInfo of dates) {
      const posVal = row[dateInfo.colIndex];
      if (typeof posVal === "number") {
        positions.push({
          date: dateInfo.date,
          position: posVal,
        });
      }
    }

    if (positions.length > 0) {
      fundData.investors.push({
        name: investorName,
        feePercent: fee,
        ibPercent: ib,
        positionHistory: positions,
        initialPosition: positions[0]?.position || 0,
        latestPosition: positions[positions.length - 1]?.position || 0,
      });
    }
  }

  return fundData;
}

async function extractAccountingData() {
  const excelPath = "/Users/mama/Downloads/Accounting Yield Funds.xlsx";
  const outputDir = "/Users/mama/indigo-yield-platform-v01/tests/fixtures";

  console.log("Reading Excel file:", excelPath);
  const workbook = XLSX.readFile(excelPath);

  const result = {
    extractionDate: new Date().toISOString(),
    funds: {},
    investments: [],
    monthlyPerformance: [],
  };

  // Extract fund-specific data
  const fundSheets = [
    { name: "BTC Yield Fund", code: "IND-BTC", parser: "btc" },
    { name: "ETH Yield Fund", code: "IND-ETH", parser: "standard" },
    { name: "USDT Yield Fund", code: "IND-USDT", parser: "standard" },
    { name: "SOL Yield Fund", code: "IND-SOL", parser: "standard" },
    { name: "XRP Yield Fund", code: "IND-XRP", parser: "standard" },
  ];

  for (const fund of fundSheets) {
    console.log(`\nProcessing: ${fund.name}`);
    const sheet = workbook.Sheets[fund.name];
    if (!sheet) {
      console.log(`  Sheet not found: ${fund.name}`);
      continue;
    }

    let fundData;
    if (fund.parser === "btc") {
      fundData = parseBTCFundSheet(sheet, fund.code);
    } else {
      fundData = parseStandardFundSheet(sheet, fund.code);
    }

    if (fundData) {
      result.funds[fund.code] = fundData;
      console.log(`  Layout: ${fundData.layout}`);
      console.log(`  Dates: ${fundData.dates.length}`);
      console.log(`  Investors: ${fundData.investors.length}`);
      if (fundData.dailyData.length > 0) {
        console.log(`  Daily data records: ${fundData.dailyData.length}`);
      }
      if (fundData.aumProgression.length > 0) {
        console.log(`  AUM records: ${fundData.aumProgression.length}`);
      }
      if (fundData.performanceData.length > 0) {
        console.log(`  Performance records: ${fundData.performanceData.length}`);
      }
    }
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

      if (date) {
        result.investments.push({
          date,
          investorName: row[1] || "",
          currency: row[2] || "",
          amount: typeof row[3] === "number" ? row[3] : 0,
          usdValue: typeof row[4] === "number" ? row[4] : null,
          email: row[5] || null,
        });
      }
    }
    console.log(`  Transactions found: ${result.investments.length}`);
  }

  // Extract Performances sheet (monthly summary)
  console.log("\nProcessing: Performances");
  const perfSheet = workbook.Sheets["Performances"];
  if (perfSheet) {
    const perfData = XLSX.utils.sheet_to_json(perfSheet, { header: 1 });

    // Start from row 4 (index 3) which has the data
    for (let i = 3; i < perfData.length && i < 50; i++) {
      const row = perfData[i];
      if (!row || typeof row[0] !== "number") continue;

      const date = formatDate(excelDateToJS(row[0]));
      if (date) {
        result.monthlyPerformance.push({
          date,
          netPerformance: {
            btc: row[1] || null,
            eth: row[2] || null,
            usdt: row[3] || null,
            sol: row[4] || null,
            xrp: row[5] || null,
          },
          apy: {
            btc: row[7] || null,
            eth: row[8] || null,
            usdt: row[9] || null,
            sol: row[10] || null,
            xrp: row[11] || null,
          },
        });
      }
    }
    console.log(`  Monthly records: ${result.monthlyPerformance.length}`);
  }

  // Write output
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "accounting-excel-data-v3.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);

  // Write summary for each fund
  console.log("\n=== FUND SUMMARIES ===\n");
  for (const [code, fund] of Object.entries(result.funds)) {
    console.log(`${code}:`);
    console.log(`  Layout: ${fund.layout}`);
    console.log(`  Date range: ${fund.dates[0]} to ${fund.dates[fund.dates.length - 1]}`);
    console.log(`  Investors: ${fund.investors.length}`);

    // Show sample investor positions
    if (fund.investors.length > 0) {
      const sample = fund.investors[0];
      console.log(`  Sample: ${sample.name}`);
      console.log(`    Fee: ${(sample.feePercent * 100).toFixed(1)}%`);
      console.log(`    Initial: ${sample.initialPosition}`);
      console.log(`    Latest: ${sample.latestPosition}`);
    }
    console.log("");
  }

  return result;
}

// Run extraction
extractAccountingData()
  .then(() => console.log("Done!"))
  .catch((err) => console.error("Error:", err));
