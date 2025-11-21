/**
 * HTML template generator for investor statements
 */

import { formatNumber } from "../utils/formatting.js";

// Asset configuration
const ASSET_LOGOS = {
  BTC: "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/9EenamIVtIm3Rqfh63IZCQBrVZaDE2YHwRPwwpIN.png",
  USDC: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  EURC: null, // Text only, no logo
};

const COMPANY_LOGO =
  "https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png";

/**
 * Generate HTML for a single fund section
 * @param {string} assetCode - Asset code (BTC, ETH, etc.)
 * @param {object} data - Position data for this asset
 * @param {boolean} isFirst - Whether this is the first fund section
 * @returns {string} HTML for the fund section
 */
export function generateFundSection(assetCode, data, isFirst = false) {
  const fundName = `${assetCode} Yield Fund`;
  const logo = ASSET_LOGOS[assetCode];
  const marginTop = isFirst ? "24px" : "16px";

  // If no data for this fund, return empty string
  if (!data || data.current_balance === 0) {
    return "";
  }

  // Calculate financial metrics
  const endingBalance = data.current_balance;
  const beginningBalance = data.principal;
  const netIncome = data.total_earned || 0;
  const additions = 0; // Would come from transactions
  const redemptions = 0; // Would come from transactions
  const rateOfReturn = netIncome > 0 ? ((netIncome / beginningBalance) * 100).toFixed(2) : 0;

  let html = `
    <!-- ${assetCode} Fund Section -->
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px;margin-top:${marginTop};">
      <div style="display:flex;align-items:center;margin-bottom:20px;">`;

  if (logo) {
    html += `
        <img src="${logo}" height="32" style="margin-right:12px;" alt="${assetCode}">`;
  }

  html += `
        <span style="font-size:18px;font-weight:bold;color:#0f172a;">${fundName}</span>
      </div>
      
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;" width="40%"></th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;" width="15%">MTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;" width="15%">QTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;" width="15%">YTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;border-bottom:1px solid #e2e8f0;" width="15%">ITD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Beginning Balance</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(beginningBalance)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(beginningBalance)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(beginningBalance)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(beginningBalance)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Additions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(additions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(additions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(additions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(additions)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Redemptions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(redemptions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(redemptions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(redemptions)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatNumber(redemptions)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Net Income</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(netIncome, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(netIncome, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(netIncome, true)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(netIncome, true)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;font-weight:bold;color:#0f172a;padding:6px 0;">Ending Balance</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(endingBalance)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(endingBalance)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(endingBalance)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatNumber(endingBalance)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Rate of Return (%)</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${rateOfReturn}%</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${rateOfReturn}%</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${rateOfReturn}%</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${rateOfReturn}%</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  return html;
}

/**
 * Generate complete HTML statement document
 * @param {object} investor - Investor profile data
 * @param {array} positions - Array of position data
 * @param {string} periodEnd - Period end date string
 * @returns {string} Complete HTML document
 */
export function generateStatementHTML(investor, positions, periodEnd) {
  const fundOrder = ["BTC", "ETH", "USDT", "SOL", "USDC", "EURC"];

  // Group positions by asset code
  const positionsByAsset = {};
  for (const position of positions) {
    positionsByAsset[position.asset_code] = position;
  }

  let html = generateDocumentHeader(investor, periodEnd);

  // Add fund sections in the correct order
  let isFirst = true;
  for (const assetCode of fundOrder) {
    if (positionsByAsset[assetCode]) {
      html += generateFundSection(assetCode, positionsByAsset[assetCode], isFirst);
      isFirst = false;
    }
  }

  // Add footer
  html += generateDocumentFooter();

  return html;
}

/**
 * Generate HTML document header with styles and investor info
 * @param {object} investor - Investor profile data
 * @param {string} periodEnd - Period end date string
 * @returns {string} HTML header
 */
function generateDocumentHeader(investor, periodEnd) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indigo Fund - Monthly Statement - ${investor.first_name} ${investor.last_name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Montserrat', Arial, sans-serif; background-color: #ffffff; color: #0f172a; line-height: 1.5; }
        .container { max-width: 800px; margin: 0 auto; background: white; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Brand Header -->
        <div style="background-color: #edf0fe; padding: 16px;">
          <table width="100%">
            <tr>
              <td align="left">
                <img src="${COMPANY_LOGO}" height="22" alt="Indigo Fund">
              </td>
              <td align="right">
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">Monthly Report</h1>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Investor Header Card -->
        <div style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px;">
          <div style="font-size:15px;font-weight:bold;color:#0f172a;">
            Investor: ${investor.first_name} ${investor.last_name}
          </div>
          <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
            Investor Statement for the Period Ended: ${periodEnd}
          </div>
        </div>`;
}

/**
 * Generate HTML document footer
 * @returns {string} HTML footer
 */
function generateDocumentFooter() {
  return `
        <!-- Footer -->
        <div style="margin:32px 16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
          <p>This statement is confidential and proprietary. All amounts are shown in their respective currencies.</p>
          <p>© 2025 Indigo Fund. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}
