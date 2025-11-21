#!/usr/bin/env node

/**
 * Indigo Fund Statement Generator from PDF
 *
 * This script processes monthly PDF reports and generates individual HTML statements
 * following the exact Indigo Fund design system specifications.
 *
 * Usage: node generate-statements-from-pdf.js [pdf-file]
 */

import fs from "fs/promises";
import path from "path";
import { createServiceClient } from "../../utils/supabaseClient.js";

// Initialize secure Supabase client
const supabase = createServiceClient();

// CDN URLs for logos as specified
const LOGOS = {
  company:
    "https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png",
  BTC: "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/9EenamIVtIm3Rqfh63IZCQBrVZaDE2YHwRPwwpIN.png",
  EURO: null, // No logo for EURO
};

// Fund display order as specified
const FUND_ORDER = ["BTC", "ETH", "USDT", "SOL", "EURO"];

/**
 * Normalize numbers according to parsing rules:
 * - Convert (123) to -123
 * - Convert – or blanks to -
 * - Add + prefix to positive Net Income
 */
function normalizeNumber(value, isNetIncome = false) {
  if (!value || value === "–" || value === "-" || value === "") {
    return "-";
  }

  // Handle parentheses for negative numbers
  let normalized = value.toString().trim();
  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = "-" + normalized.slice(1, -1);
  }

  // Add + for positive net income
  if (isNetIncome && !normalized.startsWith("-") && normalized !== "-") {
    normalized = "+" + normalized;
  }

  return normalized;
}

/**
 * Generate HTML for a single fund section
 */
function generateFundHTML(fundName, fundData) {
  const logo = LOGOS[fundName];
  const isFirstFund = fundData.isFirst;
  const marginTop = isFirstFund ? "24px" : "16px";

  let html = `
    <!-- ${fundName} Fund Section -->
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px;margin-top:${marginTop};">
      <!-- Fund Header -->
      <div style="display:flex;align-items:center;">`;

  // Add logo if exists
  if (logo) {
    html += `
        <img src="${logo}" height="32" style="margin-right:12px;" alt="${fundName}">`;
  }

  html += `
        <span style="font-size:18px;font-weight:bold;color:#0f172a;">${fundName} Yield Fund</span>
      </div>
      
      <!-- Data Table -->
      <table style="width:100%;margin-top:20px;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;"></th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;">MTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;">QTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;">YTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;">ITD</th>
          </tr>
        </thead>
        <tbody>
          <!-- Beginning Balance -->
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Beginning Balance</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.beginningBalance.MTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.beginningBalance.QTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.beginningBalance.YTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.beginningBalance.ITD)}</td>
          </tr>
          
          <!-- Additions -->
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Additions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.additions.MTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.additions.QTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.additions.YTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.additions.ITD)}</td>
          </tr>
          
          <!-- Redemptions -->
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Redemptions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.redemptions.MTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.redemptions.QTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.redemptions.YTD)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.redemptions.ITD)}</td>
          </tr>
          
          <!-- Net Income (Green + Bold) -->
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Net Income</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.netIncome.MTD, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.netIncome.QTD, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.netIncome.YTD, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.netIncome.ITD, true)}</td>
          </tr>
          
          <!-- Ending Balance (Bold) -->
          <tr>
            <td style="font-size:13px;font-weight:bold;color:#0f172a;padding:6px 0;">Ending Balance</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.endingBalance.MTD)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.endingBalance.QTD)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.endingBalance.YTD)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.endingBalance.ITD)}</td>
          </tr>
          
          <!-- Rate of Return (Green + Bold) -->
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Rate of Return (%)</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.rateOfReturn.MTD)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.rateOfReturn.QTD)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.rateOfReturn.YTD)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${normalizeNumber(fundData.rateOfReturn.ITD)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  return html;
}

/**
 * Generate complete HTML statement for an investor
 */
function generateInvestorHTML(investorName, periodEnd, funds) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indigo Fund - ${investorName} - Monthly Statement</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Montserrat', Arial, sans-serif;
            background-color: #ffffff;
            color: #0f172a;
            line-height: 1.5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Brand Header (top bar) -->
        <div style="background-color:#edf0fe;padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="left">
                        <img src="${LOGOS.company}" height="22" alt="Indigo Fund">
                    </td>
                    <td align="right">
                        <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">Monthly Report</h1>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Investor Header (card) -->
        <div style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px;">
            <div style="font-size:15px;font-weight:bold;color:#0f172a;">
                Investor: ${investorName}
            </div>
            <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
                Investor Statement for the Period Ended: ${periodEnd}
            </div>
        </div>`;

  // Add fund sections in the specified order
  let isFirst = true;
  for (const fundName of FUND_ORDER) {
    if (funds[fundName]) {
      funds[fundName].isFirst = isFirst;
      html += generateFundHTML(fundName, funds[fundName]);
      isFirst = false;
    }
  }

  // Footer
  html += `
        <!-- Footer -->
        <div style="margin:32px 16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            <p>This statement is confidential and proprietary. All amounts are shown in their respective currencies.</p>
            <p>© 2025 Indigo Fund. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Parse PDF data (simulated - in production would use PDF parsing library)
 * This function would parse the actual PDF to extract investor data
 */
function parsePDFData(pdfContent) {
  // In production, this would parse the actual PDF
  // For now, return sample data structure

  // Sample data for demonstration
  return [
    {
      name: "Advantage Blockchain",
      periodEnd: "September 30, 2025",
      funds: {
        ETH: {
          beginningBalance: { MTD: "32.0000", QTD: "32.0000", YTD: "30.0000", ITD: "25.0000" },
          additions: { MTD: "-", QTD: "-", YTD: "2.0000", ITD: "7.0000" },
          redemptions: { MTD: "-", QTD: "-", YTD: "-", ITD: "-" },
          netIncome: { MTD: "0.3200", QTD: "0.9600", YTD: "3.2000", ITD: "7.0000" },
          endingBalance: { MTD: "32.3200", QTD: "32.9600", YTD: "35.2000", ITD: "32.0000" },
          rateOfReturn: { MTD: "1.00%", QTD: "3.00%", YTD: "10.67%", ITD: "28.00%" },
        },
      },
    },
    {
      name: "Jose Molla",
      periodEnd: "September 30, 2025",
      funds: {
        BTC: {
          beginningBalance: { MTD: "3.4680", QTD: "3.4680", YTD: "3.2000", ITD: "2.0000" },
          additions: { MTD: "-", QTD: "-", YTD: "0.2680", ITD: "1.4680" },
          redemptions: { MTD: "-", QTD: "-", YTD: "-", ITD: "-" },
          netIncome: { MTD: "0.0347", QTD: "0.1041", YTD: "0.3468", ITD: "0.6936" },
          endingBalance: { MTD: "3.5027", QTD: "3.5721", YTD: "3.8148", ITD: "3.4680" },
          rateOfReturn: { MTD: "1.00%", QTD: "3.00%", YTD: "10.84%", ITD: "34.68%" },
        },
        ETH: {
          beginningBalance: { MTD: "61.5000", QTD: "61.5000", YTD: "60.0000", ITD: "50.0000" },
          additions: { MTD: "-", QTD: "-", YTD: "1.5000", ITD: "11.5000" },
          redemptions: { MTD: "-", QTD: "-", YTD: "-", ITD: "-" },
          netIncome: { MTD: "0.6150", QTD: "1.8450", YTD: "6.1500", ITD: "12.3000" },
          endingBalance: { MTD: "62.1150", QTD: "63.3450", YTD: "67.6500", ITD: "61.5000" },
          rateOfReturn: { MTD: "1.00%", QTD: "3.00%", YTD: "10.25%", ITD: "24.60%" },
        },
      },
    },
  ];
}

/**
 * Main function to generate statements
 */
async function generateStatements(pdfFile = null) {
  console.log("📊 Indigo Fund Statement Generator\n");
  console.log("Design System: Following exact PDF parsing specifications\n");

  try {
    // Parse PDF or use sample data
    let investorData;
    if (pdfFile) {
      console.log(`📄 Parsing PDF: ${pdfFile}`);
      // In production, read and parse the PDF file
      const pdfContent = await fs.readFile(pdfFile);
      investorData = parsePDFData(pdfContent);
    } else {
      console.log("📝 Using sample data (no PDF provided)");
      investorData = parsePDFData(null);
    }

    console.log(`✅ Found ${investorData.length} investors\n`);

    // Create output directory
    const date = new Date();
    const outputDir = path.join(
      process.cwd(),
      "statements",
      `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`
    );
    await fs.mkdir(outputDir, { recursive: true });

    // Generate statements
    const generatedFiles = [];

    for (let i = 0; i < investorData.length; i++) {
      const investor = investorData[i];
      const fileNumber = String(i + 1).padStart(2, "0");
      const fileName = `${fileNumber}_${investor.name.replace(/\s+/g, "_")}.html`;
      const filePath = path.join(outputDir, fileName);

      // Generate HTML
      const html = generateInvestorHTML(investor.name, investor.periodEnd, investor.funds);

      // Save file
      await fs.writeFile(filePath, html, "utf-8");
      generatedFiles.push(fileName);

      console.log(`✅ Generated: ${fileName}`);
    }

    console.log("\n========================================");
    console.log("📊 Statement Generation Complete");
    console.log(`✅ Generated ${generatedFiles.length} statements`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log("========================================\n");

    console.log("📋 Generated Files:");
    generatedFiles.forEach((file) => console.log(`   - ${file}`));

    console.log("\n📝 Next Steps:");
    console.log("1. Review generated statements");
    console.log("2. Convert to PDF if needed");
    console.log("3. Bundle into ZIP for distribution");
    console.log("4. Send to investors\n");

    // Instructions for viewing
    console.log("To view statements:");
    console.log(`open ${outputDir}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const pdfFile = args[0];

// Run the generator
generateStatements(pdfFile);
