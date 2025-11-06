/**
 * Monthly Email Statement Generator
 *
 * Generates HTML email statements matching Indigo's branding
 * Based on the provided template with exact styling and layout
 *
 * Features:
 * - Multi-fund support (up to 6 funds per investor)
 * - MTD/QTD/YTD/ITD columns
 * - Color-coded values (green positive, red negative)
 * - Responsive design
 * - Professional branding
 */

import { toDecimal } from '@/utils/financial';
import Decimal from 'decimal.js';

// Fund icon CDN URLs
const FUND_ICONS: Record<string, string> = {
  'BTC YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png',
  'ETH YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png',
  'SOL YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png',
  'USDT YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png',
  'USDC YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png',
  'EURC YIELD FUND': 'https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png',
};

// Currency mapping
const FUND_CURRENCY: Record<string, string> = {
  'BTC YIELD FUND': 'BTC',
  'ETH YIELD FUND': 'ETH',
  'SOL YIELD FUND': 'SOL',
  'USDT YIELD FUND': 'USDT',
  'USDC YIELD FUND': 'USDC',
  'EURC YIELD FUND': 'EURC',
};

export interface FundPerformance {
  fund_name: string;

  // MTD
  mtd_beginning_balance: string;
  mtd_additions: string;
  mtd_redemptions: string;
  mtd_net_income: string;
  mtd_ending_balance: string;
  mtd_rate_of_return: string;

  // QTD
  qtd_beginning_balance: string;
  qtd_additions: string;
  qtd_redemptions: string;
  qtd_net_income: string;
  qtd_ending_balance: string;
  qtd_rate_of_return: string;

  // YTD
  ytd_beginning_balance: string;
  ytd_additions: string;
  ytd_redemptions: string;
  ytd_net_income: string;
  ytd_ending_balance: string;
  ytd_rate_of_return: string;

  // ITD
  itd_beginning_balance: string;
  itd_additions: string;
  itd_redemptions: string;
  itd_net_income: string;
  itd_ending_balance: string;
  itd_rate_of_return: string;
}

export interface MonthlyStatementData {
  investor_name: string;
  investor_email: string;
  period_ended: string; // e.g., "October 31st, 2025"
  funds: FundPerformance[];
}

/**
 * Format number for display
 * - Zero values show as "-"
 * - Positive values formatted with commas
 * - Negative values shown with minus sign
 */
function formatStatementNumber(value: string | number | Decimal): string {
  const decimal = toDecimal(value);

  if (decimal.isZero()) {
    return '-';
  }

  // Format with commas and appropriate decimals
  const formatted = decimal.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });

  return formatted;
}

/**
 * Get color for value (green positive, red negative)
 */
function getValueColor(value: string | number | Decimal): string {
  const decimal = toDecimal(value);

  if (decimal.lessThan(0)) {
    return '#dc2626'; // Red
  } else if (decimal.greaterThan(0)) {
    return '#16a34a'; // Green
  }
  return '#1e293b'; // Default dark
}

/**
 * Format percentage (always include % sign)
 */
function formatPercentage(value: string | number | Decimal): string {
  const decimal = toDecimal(value);

  if (decimal.isZero()) {
    return '-';
  }

  return `${decimal.toFixed(2)}%`;
}

/**
 * Generate fund section HTML
 */
function generateFundSection(fund: FundPerformance): string {
  const currency = FUND_CURRENCY[fund.fund_name] || 'USD';
  const iconUrl = FUND_ICONS[fund.fund_name] || '';

  // Get colors for Net Income and Rate of Return
  const mtdIncomeColor = getValueColor(fund.mtd_net_income);
  const qtdIncomeColor = getValueColor(fund.qtd_net_income);
  const ytdIncomeColor = getValueColor(fund.ytd_net_income);
  const itdIncomeColor = getValueColor(fund.itd_net_income);

  const mtdRorColor = getValueColor(fund.mtd_rate_of_return);
  const qtdRorColor = getValueColor(fund.qtd_rate_of_return);
  const ytdRorColor = getValueColor(fund.ytd_rate_of_return);
  const itdRorColor = getValueColor(fund.itd_rate_of_return);

  return `
  <!-- ${fund.fund_name} -->
  <tr>
    <td style="background-color:#ffffff; border-radius:10px; padding:20px; border: 1px solid #e2e8f0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="width:40px;" valign="middle">
            <img src="${iconUrl}" alt="${fund.fund_name} icon" width="32" style="border:0;max-width:100%;">
          </td>
          <td valign="middle" style="padding-left:12px;">
            <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fund.fund_name}</h2>
          </td>
        </tr>
      </table>

      <!-- Capital Account Summary Table -->
      <table class="mobile-table" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:20px;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Capital Account Summary</th>
          <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">MTD (${currency})</th>
          <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">QTD (${currency})</th>
          <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">YTD (${currency})</th>
          <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">ITD (${currency})</th>
        </tr>
        <tr>
          <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Beginning Balance</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.mtd_beginning_balance)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.qtd_beginning_balance)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.ytd_beginning_balance)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.itd_beginning_balance)}</td>
        </tr>
        <tr>
          <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Additions</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.mtd_additions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.qtd_additions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.ytd_additions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.itd_additions)}</td>
        </tr>
        <tr>
          <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Redemptions</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.mtd_redemptions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.qtd_redemptions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.ytd_redemptions)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatStatementNumber(fund.itd_redemptions)}</td>
        </tr>
        <tr>
          <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Net Income</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${mtdIncomeColor};font-weight:700;">${formatStatementNumber(fund.mtd_net_income)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${qtdIncomeColor};font-weight:700;">${formatStatementNumber(fund.qtd_net_income)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${ytdIncomeColor};font-weight:700;">${formatStatementNumber(fund.ytd_net_income)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${itdIncomeColor};font-weight:700;">${formatStatementNumber(fund.itd_net_income)}</td>
        </tr>
        <tr style="border-top:1px solid #e2e8f0;">
          <td class="mobile-cell" style="padding:10px 8px;font-size:14px;color:#1e293b;font-weight:700;">Ending Balance</td>
          <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatStatementNumber(fund.mtd_ending_balance)}</td>
          <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatStatementNumber(fund.qtd_ending_balance)}</td>
          <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatStatementNumber(fund.ytd_ending_balance)}</td>
          <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatStatementNumber(fund.itd_ending_balance)}</td>
        </tr>
        <tr>
          <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Rate of Return</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${mtdRorColor};font-weight:700;">${formatPercentage(fund.mtd_rate_of_return)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${qtdRorColor};font-weight:700;">${formatPercentage(fund.qtd_rate_of_return)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${ytdRorColor};font-weight:700;">${formatPercentage(fund.ytd_rate_of_return)}</td>
          <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:${itdRorColor};font-weight:700;">${formatPercentage(fund.itd_rate_of_return)}</td>
        </tr>
      </table>
    </td>
  </tr>
  `;
}

/**
 * Generate complete monthly statement HTML email
 */
export function generateMonthlyStatementHTML(data: MonthlyStatementData): string {
  // Generate all fund sections
  const fundSections = data.funds.map((fund, index) => {
    const section = generateFundSection(fund);

    // Add spacing between funds (except after last one)
    if (index < data.funds.length - 1) {
      return section + '\n  <tr><td style="height:16px;"></td></tr>\n';
    }
    return section;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">

  <style>
    body, table, td, p, h1, h2 {
      font-family: 'Montserrat', Arial, sans-serif;
    }
    @media (max-width:600px) {
      .sm-w-full { width: 100% !important }
      .mobile-logo { height: 22px !important; width: auto !important }
      .mobile-h1 { font-size: 18px !important }
      .mobile-table { font-size: 11px !important }
      .mobile-header { font-size: 10px !important; padding: 8px 6px !important }
      .mobile-cell { font-size: 11px !important; padding: 8px 6px !important }
      .mobile-footer-text { font-size: 10px !important; }
    }
    @media (max-width:480px) {
      .mobile-h1 { font-size: 16px !important }
      .mobile-table { font-size: 10px !important }
      .mobile-header { font-size: 9px !important; padding: 6px 4px !important }
      .mobile-cell { font-size: 10px !important; padding: 6px 4px !important }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#ffffff;">

  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Montserrat',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- Centered Content Wrapper -->
        <table class="sm-w-full" role="presentation" cellpadding="0" cellspacing="0" style="width:600px;">

          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe; padding:20px 24px; border-radius: 10px 10px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td valign="middle">
                    <img src="https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg"
                      alt="Indigo Logo" height="24" class="mobile-logo" style="display:block;border:0;height:24px;width:auto;">
                  </td>
                  <td valign="middle" align="right">
                    <h1 class="mobile-h1" style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;">Monthly Report</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Investor Header -->
          <tr>
            <td style="background-color:#f8fafc; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding:20px 24px;">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#334155;">Investor: ${data.investor_name}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>${data.period_ended}</strong></p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding:24px; background-color: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">

                ${fundSections}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td style="padding:0 24px;">
              <p class="mobile-footer-text" style="margin: 0; font-size:12px; color: #64748b; line-height: 1.6; text-align: center;">
                This document is not an offer to sell or a solicitation of an offer to buy any securities.
              </p>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://www.linkedin.com/company/indigo-fund" target="_blank">
                      <img src="https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png"
                        alt="LinkedIn" width="24" style="border:0;">
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://www.instagram.com/indigo.fund" target="_blank">
                      <img src="https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png"
                        alt="Instagram" width="24" style="border:0;">
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://twitter.com/indigo_fund" target="_blank">
                      <img src="https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png"
                        alt="X" width="24" style="border:0;">
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>
          <tr>
            <td align="center">
              <p class="mobile-footer-text" style="margin: 0 0 8px 0; font-size:12px; color: #94a3b8;">© 2025 Indigo Fund. All rights reserved.</p>
              <p class="mobile-footer-text" style="margin: 0; font-size:12px; color: #94a3b8;">
                <a href="{{unsubscribe_url}}" target="_blank" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate statement for preview (opens in browser)
 */
export function generateStatementPreview(data: MonthlyStatementData): string {
  const html = generateMonthlyStatementHTML(data);

  // Add preview notice at top
  const previewNotice = `
  <div style="background-color:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:16px;margin:20px auto;max-width:600px;text-align:center;">
    <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ PREVIEW MODE</p>
    <p style="margin:4px 0 0;font-size:12px;color:#78350f;">This is a preview. Statement has not been sent.</p>
  </div>
  `;

  return html.replace('<body', '<body' + '>' + previewNotice);
}
