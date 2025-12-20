/**
 * Report Generator - Generates HTML reports matching exact email template format
 * Uses CDN URLs for fund icons and email-compatible HTML structure
 */

// Fund icon URLs from CDN - updated to match exact template
const FUND_ICONS: Record<string, string> = {
  'BTC': 'https://storage.mlcdn.com/account_image/855106/btc-icon.png',
  'ETH': 'https://storage.mlcdn.com/account_image/855106/eth-icon.png',
  'USDC': 'https://storage.mlcdn.com/account_image/855106/usdc-icon.png',
  'USDT': 'https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png',
  'SOL': 'https://storage.mlcdn.com/account_image/855106/sol-icon.png',
  'EURC': 'https://storage.mlcdn.com/account_image/855106/eurc-icon.png',
  'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  'XAUT': 'https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png',
};

// CDN URLs for branding and social icons
const COMPANY_LOGO = 'https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg';
const LINKEDIN_ICON = 'https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png';
const INSTAGRAM_ICON = 'https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png';
const X_ICON = 'https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png';

export interface FundPerformanceData {
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_ending_balance: number | null;
  mtd_rate_of_return: number | null;
  qtd_beginning_balance: number | null;
  qtd_additions: number | null;
  qtd_redemptions: number | null;
  qtd_net_income: number | null;
  qtd_ending_balance: number | null;
  qtd_rate_of_return: number | null;
  ytd_beginning_balance: number | null;
  ytd_additions: number | null;
  ytd_redemptions: number | null;
  ytd_net_income: number | null;
  ytd_ending_balance: number | null;
  ytd_rate_of_return: number | null;
  itd_beginning_balance: number | null;
  itd_additions: number | null;
  itd_redemptions: number | null;
  itd_net_income: number | null;
  itd_ending_balance: number | null;
  itd_rate_of_return: number | null;
}

export interface InvestorReportData {
  investor_name: string;
  statement_period: string;
  funds: FundPerformanceData[];
}

// Legacy interfaces for backward compatibility
export interface ReportFundData {
  fundName: string;
  currency: string;
  metrics: {
    begin_balance_mtd: string;
    begin_balance_qtd: string;
    begin_balance_ytd: string;
    begin_balance_itd: string;
    additions_mtd: string;
    additions_qtd: string;
    additions_ytd: string;
    additions_itd: string;
    redemptions_mtd: string;
    redemptions_qtd: string;
    redemptions_ytd: string;
    redemptions_itd: string;
    net_income_mtd: string;
    net_income_qtd: string;
    net_income_ytd: string;
    net_income_itd: string;
    ending_balance_mtd: string;
    ending_balance_qtd: string;
    ending_balance_ytd: string;
    ending_balance_itd: string;
    return_rate_mtd: string;
    return_rate_qtd: string;
    return_rate_ytd: string;
    return_rate_itd: string;
  };
}

export interface ReportData {
  investorName: string;
  reportDate: string;
  funds: ReportFundData[];
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined || value === 0) return '-';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNetIncome(value: number | null): string {
  if (value === null || value === undefined || value === 0) return '-';
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatReturnRate(value: number | null): string {
  if (value === null || value === undefined || value === 0) return '-';
  const percentage = (value * 100).toFixed(2);
  return value >= 0 ? `+${percentage}%` : `${percentage}%`;
}

function getValueColor(value: number | null): string {
  if (value === null || value === undefined || value === 0) return 'rgb(30,41,59)';
  return value >= 0 ? 'rgb(22,163,74)' : 'rgb(220,38,38)';
}

function getAssetCode(fundName: string): string {
  const name = fundName.toUpperCase();
  if (name.includes('BTC')) return 'BTC';
  if (name.includes('ETH')) return 'ETH';
  if (name.includes('USDC')) return 'USDC';
  if (name.includes('USDT')) return 'USDT';
  if (name.includes('SOL')) return 'SOL';
  if (name.includes('EURC')) return 'EURC';
  if (name.includes('XRP')) return 'XRP';
  if (name.includes('XAUT')) return 'XAUT';
  return 'USD';
}

function getFundDisplayName(fundName: string): string {
  const asset = getAssetCode(fundName);
  return `${asset} YIELD FUND`;
}

function getFundIcon(fundName: string): string {
  const asset = getAssetCode(fundName);
  return FUND_ICONS[asset] || FUND_ICONS['USDT'];
}

function generateFundSection(fund: FundPerformanceData): string {
  const fundDisplayName = getFundDisplayName(fund.fund_name);
  const iconUrl = getFundIcon(fund.fund_name);
  const assetCode = getAssetCode(fund.fund_name);

  return `
                        <tr>
                          <td style="font-family:Montserrat,Arial,sans-serif; background-color:rgb(255,255,255); border-radius:10px; padding:20px; border:1px solid rgb(226,232,240)">
                            
                            <!-- Fund Header -->
                            <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Montserrat,Arial,sans-serif; width:100%">
                              <tbody>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; width:40px" valign="middle">
                                    <img src="${iconUrl}" alt="${fundDisplayName} icon" width="32" style="border:0; max-width:100%;">
                                  </td>
                                  <td valign="middle" style="font-family:Montserrat,Arial,sans-serif; padding-left:12px">
                                    <h2 style="font-family:Montserrat,Arial,sans-serif; margin:0px; font-size:18px; font-weight:700; color:rgb(26,32,44)">${fundDisplayName}</h2>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            
                            <!-- Financial Data Table -->
                            <table role="presentation" aria-label="${fundDisplayName} Capital Account Summary" cellpadding="0" cellspacing="0" style="font-family:Montserrat,Arial,sans-serif; width:100%; border-collapse:collapse; margin-top:20px">
                              <thead>
                                <tr style="border-bottom:1px solid #e2e8f0">
                                  <th scope="col" style="padding:10px 8px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700">Capital Account Summary</th>
                                  <th scope="col" style="padding:10px 8px; text-align:right; font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700">MTD (${assetCode})</th>
                                  <th scope="col" style="padding:10px 8px; text-align:right; font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700">QTD (${assetCode})</th>
                                  <th scope="col" style="padding:10px 8px; text-align:right; font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700">YTD (${assetCode})</th>
                                  <th scope="col" style="padding:10px 8px; text-align:right; font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700">ITD (${assetCode})</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; font-size:14px; color:rgb(51,65,85)">Beginning Balance</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.mtd_beginning_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.qtd_beginning_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.ytd_beginning_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.itd_beginning_balance)}</td>
                                </tr>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; font-size:14px; color:rgb(51,65,85)">Additions</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.mtd_additions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.qtd_additions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.ytd_additions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.itd_additions)}</td>
                                </tr>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; font-size:14px; color:rgb(51,65,85)">Redemptions</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.mtd_redemptions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.qtd_redemptions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.ytd_redemptions)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:rgb(30,41,59)">${formatNumber(fund.itd_redemptions)}</td>
                                </tr>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; font-size:14px; color:rgb(51,65,85)">Net Income</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.mtd_net_income)}; font-weight:700">${formatNetIncome(fund.mtd_net_income)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.qtd_net_income)}; font-weight:700">${formatNetIncome(fund.qtd_net_income)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.ytd_net_income)}; font-weight:700">${formatNetIncome(fund.ytd_net_income)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.itd_net_income)}; font-weight:700">${formatNetIncome(fund.itd_net_income)}</td>
                                </tr>
                                <tr style="border-top:1px solid #e2e8f0">
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:10px 8px; font-size:14px; color:rgb(30,41,59); font-weight:700">Ending Balance</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:10px 8px; text-align:right; font-size:14px; color:rgb(30,41,59); font-weight:700">${formatNumber(fund.mtd_ending_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:10px 8px; text-align:right; font-size:14px; color:rgb(30,41,59); font-weight:700">${formatNumber(fund.qtd_ending_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:10px 8px; text-align:right; font-size:14px; color:rgb(30,41,59); font-weight:700">${formatNumber(fund.ytd_ending_balance)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:10px 8px; text-align:right; font-size:14px; color:rgb(30,41,59); font-weight:700">${formatNumber(fund.itd_ending_balance)}</td>
                                </tr>
                                <tr>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; font-size:14px; color:rgb(51,65,85)">Rate of Return</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.mtd_rate_of_return)}; font-weight:700">${formatReturnRate(fund.mtd_rate_of_return)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.qtd_rate_of_return)}; font-weight:700">${formatReturnRate(fund.qtd_rate_of_return)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.ytd_rate_of_return)}; font-weight:700">${formatReturnRate(fund.ytd_rate_of_return)}</td>
                                  <td style="font-family:Montserrat,Arial,sans-serif; padding:8px; text-align:right; font-size:14px; color:${getValueColor(fund.itd_rate_of_return)}; font-weight:700">${formatReturnRate(fund.itd_rate_of_return)}</td>
                                </tr>
                              </tbody>
                            </table>

                          </td>
                        </tr>
                        <tr><td style="height:16px;"></td></tr>`;
}

function convertLegacyFund(legacyFund: ReportFundData): FundPerformanceData {
  return {
    fund_name: legacyFund.fundName,
    mtd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_mtd) || 0,
    mtd_additions: parseFloat(legacyFund.metrics.additions_mtd) || 0,
    mtd_redemptions: parseFloat(legacyFund.metrics.redemptions_mtd) || 0,
    mtd_net_income: parseFloat(legacyFund.metrics.net_income_mtd) || 0,
    mtd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_mtd) || 0,
    mtd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_mtd) / 100 || 0,
    qtd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_qtd) || 0,
    qtd_additions: parseFloat(legacyFund.metrics.additions_qtd) || 0,
    qtd_redemptions: parseFloat(legacyFund.metrics.redemptions_qtd) || 0,
    qtd_net_income: parseFloat(legacyFund.metrics.net_income_qtd) || 0,
    qtd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_qtd) || 0,
    qtd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_qtd) / 100 || 0,
    ytd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_ytd) || 0,
    ytd_additions: parseFloat(legacyFund.metrics.additions_ytd) || 0,
    ytd_redemptions: parseFloat(legacyFund.metrics.redemptions_ytd) || 0,
    ytd_net_income: parseFloat(legacyFund.metrics.net_income_ytd) || 0,
    ytd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_ytd) || 0,
    ytd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_ytd) / 100 || 0,
    itd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_itd) || 0,
    itd_additions: parseFloat(legacyFund.metrics.additions_itd) || 0,
    itd_redemptions: parseFloat(legacyFund.metrics.redemptions_itd) || 0,
    itd_net_income: parseFloat(legacyFund.metrics.net_income_itd) || 0,
    itd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_itd) || 0,
    itd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_itd) / 100 || 0,
  };
}

export function generateInvestorReportHtml(data: InvestorReportData | ReportData): string {
  // Handle both new and legacy data formats
  const investorName = 'investor_name' in data ? data.investor_name : data.investorName;
  const statementPeriod = 'statement_period' in data ? data.statement_period : data.reportDate;
  
  const fundSections = data.funds.map(fund => {
    // Convert legacy format to new format if needed
    if ('fundName' in fund) {
      return generateFundSection(convertLegacyFund(fund as ReportFundData));
    }
    return generateFundSection(fund as FundPerformanceData);
  }).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Indigo Yield Fund Report</title>
  <style>
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: Montserrat, Arial, sans-serif;
      background-color: #ffffff;
    }
    /* Mobile responsive styles */
    @media screen and (max-width: 600px) {
      .mobile-width {
        width: 100% !important;
      }
      .mobile-padding {
        padding: 10px !important;
      }
    }
  </style>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">

  <div dir="ltr">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-family:Montserrat,Arial,sans-serif; background-color: #ffffff;">
      <tbody>
        <tr>
          <td align="center" style="font-family:Montserrat,Arial,sans-serif; padding:24px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-width" style="font-family:Montserrat,Arial,sans-serif; width:600px; margin: 0 auto;">
              
              <!-- Header Section -->
              <tbody>
                <tr>
                  <td style="font-family:Montserrat,Arial,sans-serif; background-color:rgb(237,240,254); padding:20px 24px; border-radius:10px 10px 0px 0px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Montserrat,Arial,sans-serif; width:100%">
                      <tbody>
                        <tr>
                          <td valign="middle" style="font-family:Montserrat,Arial,sans-serif;">
                            <img src="${COMPANY_LOGO}" alt="Indigo Logo" height="24" style="display:block; border:0; height:24px; width:auto;">
                          </td>
                          <td valign="middle" align="right" style="font-family:Montserrat,Arial,sans-serif;">
                            <h1 style="font-family:Montserrat,Arial,sans-serif; margin:0px; font-size:22px; line-height:1.2; color:rgb(15,23,42); font-weight:700;">Monthly Report</h1>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Investor Info Section -->
                <tr>
                  <td style="font-family:Montserrat,Arial,sans-serif; background-color:rgb(248,250,252); border-left:1px solid rgb(226,232,240); border-right:1px solid rgb(226,232,240); padding:20px 24px;">
                    <p style="font-family:Montserrat,Arial,sans-serif; margin:0px 0px 4px; font-size:16px; font-weight:600; color:rgb(51,65,85);">Investor: ${investorName}</p>
                    <p style="font-family:Montserrat,Arial,sans-serif; margin:0px; font-size:13px; line-height:1.5; color:rgb(100,116,139);">Investor Statement for the Period Ended: <strong>${statementPeriod}</strong></p>
                  </td>
                </tr>
                
                <!-- Main Content / Table Section -->
                <tr>
                  <td style="font-family:Montserrat,Arial,sans-serif; padding:24px; background-color:rgb(248,250,252); border-radius:0px 0px 10px 10px; border-width:0px 1px 1px; border-right-style:solid; border-bottom-style:solid; border-left-style:solid; border-color:rgb(226,232,240);">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Montserrat,Arial,sans-serif; width:100%">
                      <tbody>
${fundSections}
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Spacing -->
                <tr><td style="font-family:Montserrat,Arial,sans-serif; height:24px"></td></tr>
                
                <!-- Legal Disclaimer -->
                <tr>
                  <td style="font-family:Montserrat,Arial,sans-serif; padding:0px 24px;">
                    <p style="font-family:Montserrat,Arial,sans-serif; margin:0px; font-size:12px; color:rgb(100,116,139); line-height:1.6; text-align:center;">
                      This document is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.
                    </p>
                  </td>
                </tr>
                
                <!-- Spacing -->
                <tr><td style="font-family:Montserrat,Arial,sans-serif; height:20px"></td></tr>
                
                <!-- Social Media Links -->
                <tr>
                  <td align="center" style="font-family:Montserrat,Arial,sans-serif;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Montserrat,Arial,sans-serif;">
                      <tbody>
                        <tr>
                          <td style="font-family:Montserrat,Arial,sans-serif; padding:0px 10px;">
                            <a href="#" target="_blank" style="text-decoration:none; display:inline-block">
                              <img src="${LINKEDIN_ICON}" alt="LinkedIn" width="24" style="border:0;">
                            </a>
                          </td>
                          <td style="font-family:Montserrat,Arial,sans-serif; padding:0px 10px;">
                            <a href="#" target="_blank" style="text-decoration:none; display:inline-block">
                              <img src="${INSTAGRAM_ICON}" alt="Instagram" width="24" style="border:0;">
                            </a>
                          </td>
                          <td style="font-family:Montserrat,Arial,sans-serif; padding:0px 10px;">
                             <a href="#" target="_blank" style="text-decoration:none; display:inline-block">
                              <img src="${X_ICON}" alt="X" width="24" style="border:0;">
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Spacing -->
                <tr><td style="font-family:Montserrat,Arial,sans-serif; height:20px"></td></tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="font-family:Montserrat,Arial,sans-serif;">
                    <p style="font-family:Montserrat,Arial,sans-serif; margin:0px 0px 8px; font-size:12px; color:rgb(148,163,184)">© 2025 Indigo Fund. All rights reserved.</p>
                  </td>
                </tr>
                
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</body>
</html>`;
}

export default {
  generateInvestorReportHtml,
};
