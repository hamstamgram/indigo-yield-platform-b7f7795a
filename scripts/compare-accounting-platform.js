/**
 * Compare Accounting Excel Data with Platform Database
 *
 * This script compares extracted Excel data with platform database
 * to verify positions, fee rates, and IB percentages match.
 *
 * Run with: node scripts/compare-accounting-platform.js
 */

const fs = require("fs");
const path = require("path");

// Load Excel extracted data
const excelDataPath = path.join(__dirname, "../tests/fixtures/accounting-excel-data-v3.json");
const excelData = JSON.parse(fs.readFileSync(excelDataPath, "utf-8"));

// Platform data (from SQL queries - hardcoded for offline comparison)
const platformPositions = [
  { investor_name: "Blondish", fund_code: "IND-BTC", platform_position: 4.121 },
  { investor_name: "Danielle Richetta", fund_code: "IND-BTC", platform_position: 3.903 },
  { investor_name: "Jose Molla", fund_code: "IND-BTC", platform_position: 4.5647 },
  { investor_name: "Kabbaj", fund_code: "IND-BTC", platform_position: 6.6593 },
  { investor_name: "Nathanaël Cohen", fund_code: "IND-BTC", platform_position: 0.4483 },
  { investor_name: "Nath & Thomas", fund_code: "IND-BTC", platform_position: 1.0 },
  { investor_name: "NSVO Holdings", fund_code: "IND-BTC", platform_position: 0.622 },
  { investor_name: "Thomas Puech", fund_code: "IND-BTC", platform_position: 7.2898766 },
  { investor_name: "Advantage Blockchain", fund_code: "IND-ETH", platform_position: 50.0 },
  { investor_name: "alex jacobs", fund_code: "IND-ETH", platform_position: 0.0033697872 },
  { investor_name: "Babak Eftekhari", fund_code: "IND-ETH", platform_position: 66.11 },
  { investor_name: "Blondish", fund_code: "IND-ETH", platform_position: 124.793959352 },
  { investor_name: "Brandon Hood", fund_code: "IND-ETH", platform_position: 31.37 },
  { investor_name: "Jose Molla", fund_code: "IND-ETH", platform_position: 65.2063577386 },
  { investor_name: "Nathanaël Cohen", fund_code: "IND-ETH", platform_position: 48.1439054591 },
  { investor_name: "NSVO Holdings", fund_code: "IND-ETH", platform_position: 25.03 },
  { investor_name: "Tomer Zur", fund_code: "IND-ETH", platform_position: 190.5371 },
  { investor_name: "Jose Molla", fund_code: "IND-SOL", platform_position: 87.98 },
  { investor_name: "Alain Bensimon", fund_code: "IND-USDT", platform_position: 136737.0 },
  { investor_name: "Anne Cecile Noique", fund_code: "IND-USDT", platform_position: 222687.0 },
  { investor_name: "Babak Eftekhari", fund_code: "IND-USDT", platform_position: 233132.03 },
  { investor_name: "Bo Kriek", fund_code: "IND-USDT", platform_position: 273807.0 },
  { investor_name: "Dario Deiana", fund_code: "IND-USDT", platform_position: 199659.72 },
  { investor_name: "HALLEY86", fund_code: "IND-USDT", platform_position: 99990.0 },
  { investor_name: "Julien Grunebaum", fund_code: "IND-USDT", platform_position: 109392.0 },
  { investor_name: "Matthew Beatty", fund_code: "IND-USDT", platform_position: 334704.0 },
  {
    investor_name: "Monica Levy Chicheportiche",
    fund_code: "IND-USDT",
    platform_position: 840168.03,
  },
  { investor_name: "Pierre Bezençon", fund_code: "IND-USDT", platform_position: 109333.0 },
  { investor_name: "Sacha Oshry", fund_code: "IND-USDT", platform_position: 100000.0 },
  { investor_name: "Sam Johnson", fund_code: "IND-USDT", platform_position: 4200000.0 },
  { investor_name: "Terance Chen", fund_code: "IND-USDT", platform_position: 219747.0 },
  { investor_name: "Thomas Puech", fund_code: "IND-USDT", platform_position: 46750.8 },
  { investor_name: "Valeria Cruz", fund_code: "IND-USDT", platform_position: 50000.0 },
  { investor_name: "Ventures Life Style", fund_code: "IND-USDT", platform_position: 100000.0 },
];

const platformFees = [
  { investor_name: "Blondish", fund_code: "IND-BTC", platform_fee_pct: 0.0 },
  { investor_name: "Danielle Richetta", fund_code: "IND-BTC", platform_fee_pct: 10.0 },
  { investor_name: "Jose Molla", fund_code: "IND-BTC", platform_fee_pct: 20.0 },
  { investor_name: "Kyle Gulamerian", fund_code: "IND-BTC", platform_fee_pct: 15.0 },
  { investor_name: "Nathanaël Cohen", fund_code: "IND-BTC", platform_fee_pct: 0.0 },
  { investor_name: "Nath & Thomas", fund_code: "IND-BTC", platform_fee_pct: 0.0 },
  { investor_name: "Oliver Loisel", fund_code: "IND-BTC", platform_fee_pct: 10.0 },
  { investor_name: "ryan van der wall", fund_code: "IND-BTC", platform_fee_pct: 20.0 },
  { investor_name: "Thomas Puech", fund_code: "IND-BTC", platform_fee_pct: 0.0 },
  { investor_name: "Vivie & Liana", fund_code: "IND-BTC", platform_fee_pct: 0.0 },
  { investor_name: "Advantage Blockchain", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "alec beckman", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "Blondish", fund_code: "IND-ETH", platform_fee_pct: 0.0 },
  { investor_name: "Brandon Hood", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "Jose Molla", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "Nathanaël Cohen", fund_code: "IND-ETH", platform_fee_pct: 0.0 },
  { investor_name: "ryan van der wall", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "Tomer Zur", fund_code: "IND-ETH", platform_fee_pct: 20.0 },
  { investor_name: "Jose Molla", fund_code: "IND-SOL", platform_fee_pct: 20.0 },
  { investor_name: "ryan van der wall", fund_code: "IND-SOL", platform_fee_pct: 20.0 },
  { investor_name: "Alain Bensimon", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Anne Cecile Noique", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Bo Kriek", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Daniele Francilia", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Dario Deiana", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Jose Molla", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Julien Grunebaum", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Matthew Beatty", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Monica Levy Chicheportiche", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Rabih Mokbel", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Sacha Oshry", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Terance Chen", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "Valeria Cruz", fund_code: "IND-USDT", platform_fee_pct: 20.0 },
  { investor_name: "ryan van der wall", fund_code: "IND-XRP", platform_fee_pct: 20.0 },
];

const platformIB = [
  { investor_name: "Babak Eftekhari", ib_parent_name: "lars ahlgreen", ib_percentage: 2.0 },
  { investor_name: "Paul Johnson", ib_parent_name: "alex jacobs", ib_percentage: 1.5 },
  { investor_name: "Sam Johnson", ib_parent_name: "ryan van der wall", ib_percentage: 4.0 },
];

// Normalize investor name for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s&]/g, "");
}

// Compare positions
function comparePositions() {
  console.log("\n=== POSITION COMPARISON ===\n");

  const results = {
    matches: [],
    mismatches: [],
    excelOnly: [],
    platformOnly: [],
  };

  // For each fund, compare latest positions
  for (const [fundCode, fundData] of Object.entries(excelData.funds)) {
    console.log(`\n--- ${fundCode} ---`);

    for (const excelInvestor of fundData.investors) {
      const excelName = normalizeName(excelInvestor.name);
      const excelPosition = excelInvestor.latestPosition;

      // Skip zero positions
      if (excelPosition === 0) continue;

      // Find matching platform position
      const platformMatch = platformPositions.find(
        (p) => normalizeName(p.investor_name) === excelName && p.fund_code === fundCode
      );

      if (platformMatch) {
        const platformPosition = platformMatch.platform_position;
        const variance = Math.abs(excelPosition - platformPosition);
        const variancePct = platformPosition > 0 ? (variance / platformPosition) * 100 : 0;

        const match = {
          fund: fundCode,
          investor: excelInvestor.name,
          excelPosition,
          platformPosition,
          variance,
          variancePct,
        };

        if (variancePct < 1.0) {
          // Allow 1% variance
          results.matches.push(match);
          console.log(
            `  ${excelInvestor.name}: ${excelPosition.toFixed(4)} ~ ${platformPosition.toFixed(4)} (${variancePct.toFixed(2)}% var)`
          );
        } else {
          results.mismatches.push(match);
          console.log(
            `  [MISMATCH] ${excelInvestor.name}: Excel=${excelPosition.toFixed(4)} Platform=${platformPosition.toFixed(4)} (${variancePct.toFixed(2)}% var)`
          );
        }
      } else {
        results.excelOnly.push({
          fund: fundCode,
          investor: excelInvestor.name,
          position: excelPosition,
        });
        console.log(`  [EXCEL ONLY] ${excelInvestor.name}: ${excelPosition.toFixed(4)}`);
      }
    }
  }

  // Check for platform-only positions
  for (const platformPos of platformPositions) {
    const fundData = excelData.funds[platformPos.fund_code];
    if (!fundData) continue;

    const normalizedPlatformName = normalizeName(platformPos.investor_name);
    const excelMatch = fundData.investors.find(
      (e) => normalizeName(e.name) === normalizedPlatformName && e.latestPosition > 0
    );

    if (!excelMatch) {
      results.platformOnly.push({
        fund: platformPos.fund_code,
        investor: platformPos.investor_name,
        position: platformPos.platform_position,
      });
    }
  }

  return results;
}

// Compare fee percentages
function compareFees() {
  console.log("\n\n=== FEE PERCENTAGE COMPARISON ===\n");

  const results = {
    matches: [],
    mismatches: [],
  };

  for (const [fundCode, fundData] of Object.entries(excelData.funds)) {
    console.log(`\n--- ${fundCode} ---`);

    for (const excelInvestor of fundData.investors) {
      const excelName = normalizeName(excelInvestor.name);
      const excelFee = excelInvestor.feePercent * 100; // Convert from decimal

      // Find matching platform fee
      const platformMatch = platformFees.find(
        (p) => normalizeName(p.investor_name) === excelName && p.fund_code === fundCode
      );

      if (platformMatch) {
        const platformFee = platformMatch.platform_fee_pct;
        const match = {
          fund: fundCode,
          investor: excelInvestor.name,
          excelFee,
          platformFee,
        };

        if (Math.abs(excelFee - platformFee) < 0.1) {
          results.matches.push(match);
          console.log(
            `  ${excelInvestor.name}: ${excelFee.toFixed(1)}% ~ ${platformFee.toFixed(1)}%`
          );
        } else {
          results.mismatches.push(match);
          console.log(
            `  [MISMATCH] ${excelInvestor.name}: Excel=${excelFee.toFixed(1)}% Platform=${platformFee.toFixed(1)}%`
          );
        }
      }
    }
  }

  return results;
}

// Compare IB percentages
function compareIB() {
  console.log("\n\n=== IB PERCENTAGE COMPARISON ===\n");

  const results = {
    matches: [],
    mismatches: [],
  };

  // Collect all IB relationships from Excel
  const excelIB = [];
  for (const [fundCode, fundData] of Object.entries(excelData.funds)) {
    for (const investor of fundData.investors) {
      if (investor.ibPercent > 0) {
        excelIB.push({
          fund: fundCode,
          investor: investor.name,
          ibPercent: investor.ibPercent * 100,
        });
      }
    }
  }

  // Compare with platform
  for (const excel of excelIB) {
    const excelName = normalizeName(excel.investor);
    const platformMatch = platformIB.find((p) => normalizeName(p.investor_name) === excelName);

    if (platformMatch) {
      if (Math.abs(excel.ibPercent - platformMatch.ib_percentage) < 0.1) {
        results.matches.push({
          investor: excel.investor,
          excelIB: excel.ibPercent,
          platformIB: platformMatch.ib_percentage,
          ibParent: platformMatch.ib_parent_name,
        });
        console.log(
          `  ${excel.investor}: ${excel.ibPercent}% ~ ${platformMatch.ib_percentage}% (via ${platformMatch.ib_parent_name})`
        );
      } else {
        results.mismatches.push({
          investor: excel.investor,
          excelIB: excel.ibPercent,
          platformIB: platformMatch.ib_percentage,
        });
        console.log(
          `  [MISMATCH] ${excel.investor}: Excel=${excel.ibPercent}% Platform=${platformMatch.ib_percentage}%`
        );
      }
    }
  }

  return results;
}

// Verify yield compounding formula
function verifyYieldCompounding() {
  console.log("\n\n=== YIELD COMPOUNDING VERIFICATION ===\n");

  const results = [];

  for (const [fundCode, fundData] of Object.entries(excelData.funds)) {
    if (fundData.investors.length === 0) continue;

    console.log(`\n--- ${fundCode} ---`);

    // For each investor with position history, verify compounding
    for (const investor of fundData.investors.slice(0, 3)) {
      // Sample first 3
      if (investor.positionHistory.length < 2) continue;

      console.log(`\n  ${investor.name}:`);
      const fee = investor.feePercent;

      // Verify growth between consecutive positions
      for (let i = 1; i < Math.min(5, investor.positionHistory.length); i++) {
        const prev = investor.positionHistory[i - 1];
        const curr = investor.positionHistory[i];

        const growth = curr.position - prev.position;
        const growthPct = prev.position > 0 ? (growth / prev.position) * 100 : 0;

        // Get performance data for this date if available
        const perfData = fundData.performanceData.find((p) => p.date === curr.date);
        const grossPerf = perfData?.grossPerformance || 0;
        const netPerf = perfData?.netPerformance || 0;

        console.log(`    ${prev.date} -> ${curr.date}:`);
        console.log(
          `      Position: ${prev.position.toFixed(4)} -> ${curr.position.toFixed(4)} (${growth >= 0 ? "+" : ""}${growth.toFixed(4)})`
        );
        console.log(`      Growth: ${growthPct.toFixed(4)}%`);
        if (grossPerf || netPerf) {
          console.log(
            `      Fund Gross: ${(grossPerf * 100).toFixed(4)}%, Net: ${(netPerf * 100).toFixed(4)}%`
          );
        }
      }

      // Total growth from initial to latest
      const totalGrowth = investor.latestPosition - investor.initialPosition;
      const totalGrowthPct =
        investor.initialPosition > 0 ? (totalGrowth / investor.initialPosition) * 100 : 0;
      console.log(
        `    TOTAL: ${investor.initialPosition.toFixed(4)} -> ${investor.latestPosition.toFixed(4)} (${totalGrowthPct.toFixed(2)}%)`
      );

      results.push({
        fund: fundCode,
        investor: investor.name,
        initial: investor.initialPosition,
        latest: investor.latestPosition,
        totalGrowthPct,
        fee,
      });
    }
  }

  return results;
}

// Generate summary report
function generateReport(positionResults, feeResults, ibResults, yieldResults) {
  console.log("\n\n========================================");
  console.log("       ACCOUNTING RECONCILIATION REPORT");
  console.log("========================================\n");

  console.log("POSITION COMPARISON:");
  console.log(`  Matches: ${positionResults.matches.length}`);
  console.log(`  Mismatches: ${positionResults.mismatches.length}`);
  console.log(`  Excel Only: ${positionResults.excelOnly.length}`);
  console.log(`  Platform Only: ${positionResults.platformOnly.length}`);

  console.log("\nFEE PERCENTAGE COMPARISON:");
  console.log(`  Matches: ${feeResults.matches.length}`);
  console.log(`  Mismatches: ${feeResults.mismatches.length}`);

  console.log("\nIB PERCENTAGE COMPARISON:");
  console.log(`  Matches: ${ibResults.matches.length}`);
  console.log(`  Mismatches: ${ibResults.mismatches.length}`);

  if (positionResults.mismatches.length > 0) {
    console.log("\n\n=== POSITION MISMATCHES (>1% variance) ===\n");
    for (const m of positionResults.mismatches) {
      console.log(`${m.fund} - ${m.investor}:`);
      console.log(`  Excel: ${m.excelPosition}`);
      console.log(`  Platform: ${m.platformPosition}`);
      console.log(`  Variance: ${m.variancePct.toFixed(2)}%`);
    }
  }

  if (feeResults.mismatches.length > 0) {
    console.log("\n\n=== FEE MISMATCHES ===\n");
    for (const m of feeResults.mismatches) {
      console.log(`${m.fund} - ${m.investor}: Excel=${m.excelFee}% Platform=${m.platformFee}%`);
    }
  }

  // Save detailed report
  const report = {
    generatedAt: new Date().toISOString(),
    positions: positionResults,
    fees: feeResults,
    ib: ibResults,
    yields: yieldResults,
    summary: {
      positionMatchRate:
        positionResults.matches.length /
        (positionResults.matches.length + positionResults.mismatches.length || 1),
      feeMatchRate:
        feeResults.matches.length / (feeResults.matches.length + feeResults.mismatches.length || 1),
      ibMatchRate:
        ibResults.matches.length / (ibResults.matches.length + ibResults.mismatches.length || 1),
    },
  };

  const reportPath = path.join(__dirname, "../tests/accounting-reconciliation-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n\nDetailed report saved to: ${reportPath}`);
}

// Run comparison
console.log("=================================================");
console.log("  ACCOUNTING vs PLATFORM RECONCILIATION");
console.log("  Excel Data: accounting-excel-data-v3.json");
console.log("  Platform: Supabase Database");
console.log("=================================================");
console.log(`  Extraction Date: ${excelData.extractionDate}`);
console.log(`  Funds: ${Object.keys(excelData.funds).join(", ")}`);

const positionResults = comparePositions();
const feeResults = compareFees();
const ibResults = compareIB();
const yieldResults = verifyYieldCompounding();
generateReport(positionResults, feeResults, ibResults, yieldResults);
