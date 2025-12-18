/**
 * Report Generator - Generates HTML reports matching exact email template format
 */

// Fund icon URLs from CDN
const FUND_ICONS: Record<string, string> = {
  'BTC': 'https://storage.mlcdn.com/account_image/325398/S8sLvrJ8CMGE9FKSZdFUHdqxaOiPJMGPpwA9yT7t.png',
  'ETH': 'https://storage.mlcdn.com/account_image/325398/OD30dyWZ59CfeijDblHMfDLiBh6qLRxKy9vdqRaD.png',
  'USDC': 'https://storage.mlcdn.com/account_image/325398/EJZ5OB4wKvCvpSJFIhxqR6aDYLjvwsNqJdZ8oVBm.png',
  'USDT': 'https://storage.mlcdn.com/account_image/325398/k9qnSrEP33RhzHGEXZAb4rYfzWJUgC2vGtJgn0L6.png',
  'SOL': 'https://storage.mlcdn.com/account_image/325398/jS6fPy69gqHdYVtjfPnV9KPnvUhX5vPUhSfKSiJs.png',
  'EURC': 'https://storage.mlcdn.com/account_image/325398/qs1vGTzP6qVKRqAo5vNMy5TWDL8kIZ3lDVD44bz5.png',
  'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  'XAUT': 'https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png',
};

// Social media icons
const SOCIAL_ICONS = {
  linkedin: 'https://storage.mlcdn.com/account_image/325398/8rnJPAkVKbZJsL7LjV1dxV0UxchJhPf79NX6jRk7.png',
  instagram: 'https://storage.mlcdn.com/account_image/325398/0WdCBiQa3GU27YF28LFl1OQ18pnVBPbQFy2T2wZ2.png',
  x: 'https://storage.mlcdn.com/account_image/325398/XF0NchyP7NI20BxRAKuFUJ8TNvI1LcCXfOVwS14A.png',
};

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
  if (value === null || value === undefined) return '0.00';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSignedNumber(value: number | null): { text: string; color: string } {
  if (value === null || value === undefined) return { text: '0.00', color: '#1e293b' };
  const isPositive = value >= 0;
  const prefix = isPositive ? '+' : '';
  const formatted = prefix + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    text: formatted,
    color: isPositive ? '#16a34a' : '#dc2626'
  };
}

function formatReturnRate(value: number | null): { text: string; color: string } {
  if (value === null || value === undefined) return { text: '0.00%', color: '#1e293b' };
  const isPositive = value >= 0;
  const prefix = isPositive ? '+' : '';
  const formatted = prefix + value.toFixed(2) + '%';
  return {
    text: formatted,
    color: isPositive ? '#16a34a' : '#dc2626'
  };
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
  return FUND_ICONS[asset] || FUND_ICONS['BTC'];
}

function generateFundSection(fund: FundPerformanceData): string {
  const asset = getAssetCode(fund.fund_name);
  const fundDisplayName = getFundDisplayName(fund.fund_name);
  const iconUrl = getFundIcon(fund.fund_name);

  const mtdNetIncome = formatSignedNumber(fund.mtd_net_income);
  const qtdNetIncome = formatSignedNumber(fund.qtd_net_income);
  const ytdNetIncome = formatSignedNumber(fund.ytd_net_income);
  const itdNetIncome = formatSignedNumber(fund.itd_net_income);

  const mtdReturn = formatReturnRate(fund.mtd_rate_of_return);
  const qtdReturn = formatReturnRate(fund.qtd_rate_of_return);
  const ytdReturn = formatReturnRate(fund.ytd_rate_of_return);
  const itdReturn = formatReturnRate(fund.itd_rate_of_return);

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#eef0fb;border-radius:12px;padding:16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:16px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="${iconUrl}" alt="${asset}" width="32" height="32" style="display:block;border-radius:50%;">
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:16px;font-weight:700;color:#1e293b;">${fundDisplayName}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:8px;">
                  <tr style="background-color:#f8fafc;">
                    <td style="padding:10px 8px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;width:30%;">Capital Account Summary</td>
                    <td style="padding:10px 8px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;text-align:right;">MTD (${asset})</td>
                    <td style="padding:10px 8px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;text-align:right;">QTD (${asset})</td>
                    <td style="padding:10px 8px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;text-align:right;">YTD (${asset})</td>
                    <td style="padding:10px 8px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;text-align:right;">ITD (${asset})</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;">Beginning Balance</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.mtd_beginning_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.qtd_beginning_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.ytd_beginning_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.itd_beginning_balance)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;">Additions</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.mtd_additions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.qtd_additions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.ytd_additions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.itd_additions)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;">Redemptions</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.mtd_redemptions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.qtd_redemptions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.ytd_redemptions)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;">${formatNumber(fund.itd_redemptions)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;font-weight:700;">Net Income</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${mtdNetIncome.color};">${mtdNetIncome.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${qtdNetIncome.color};">${qtdNetIncome.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${ytdNetIncome.color};">${ytdNetIncome.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${itdNetIncome.color};">${itdNetIncome.text}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;font-weight:700;">Ending Balance</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;">${formatNumber(fund.mtd_ending_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;">${formatNumber(fund.qtd_ending_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;">${formatNumber(fund.ytd_ending_balance)}</td>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;">${formatNumber(fund.itd_ending_balance)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;font-size:14px;color:#1e293b;border-top:1px solid #e2e8f0;font-weight:700;">Rate of Return</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${mtdReturn.color};">${mtdReturn.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${qtdReturn.color};">${qtdReturn.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${ytdReturn.color};">${ytdReturn.text}</td>
                    <td style="padding:10px 8px;font-size:14px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${itdReturn.color};">${itdReturn.text}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function generateInvestorReportHtml(data: InvestorReportData | ReportData): string {
  // Handle both new and legacy data formats
  const investorName = 'investor_name' in data ? data.investor_name : data.investorName;
  const statementPeriod = 'statement_period' in data ? data.statement_period : data.reportDate;
  
  const fundSections = data.funds.map(fund => {
    // Convert legacy format to new format if needed
    if ('fundName' in fund) {
      const legacyFund = fund as ReportFundData;
      const converted: FundPerformanceData = {
        fund_name: legacyFund.fundName,
        mtd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_mtd) || 0,
        mtd_additions: parseFloat(legacyFund.metrics.additions_mtd) || 0,
        mtd_redemptions: parseFloat(legacyFund.metrics.redemptions_mtd) || 0,
        mtd_net_income: parseFloat(legacyFund.metrics.net_income_mtd) || 0,
        mtd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_mtd) || 0,
        mtd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_mtd) || 0,
        qtd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_qtd) || 0,
        qtd_additions: parseFloat(legacyFund.metrics.additions_qtd) || 0,
        qtd_redemptions: parseFloat(legacyFund.metrics.redemptions_qtd) || 0,
        qtd_net_income: parseFloat(legacyFund.metrics.net_income_qtd) || 0,
        qtd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_qtd) || 0,
        qtd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_qtd) || 0,
        ytd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_ytd) || 0,
        ytd_additions: parseFloat(legacyFund.metrics.additions_ytd) || 0,
        ytd_redemptions: parseFloat(legacyFund.metrics.redemptions_ytd) || 0,
        ytd_net_income: parseFloat(legacyFund.metrics.net_income_ytd) || 0,
        ytd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_ytd) || 0,
        ytd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_ytd) || 0,
        itd_beginning_balance: parseFloat(legacyFund.metrics.begin_balance_itd) || 0,
        itd_additions: parseFloat(legacyFund.metrics.additions_itd) || 0,
        itd_redemptions: parseFloat(legacyFund.metrics.redemptions_itd) || 0,
        itd_net_income: parseFloat(legacyFund.metrics.net_income_itd) || 0,
        itd_ending_balance: parseFloat(legacyFund.metrics.ending_balance_itd) || 0,
        itd_rate_of_return: parseFloat(legacyFund.metrics.return_rate_itd) || 0,
      };
      return generateFundSection(converted);
    }
    return generateFundSection(fund as FundPerformanceData);
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Report - ${investorName}</title>
</head>
<body style="margin:0;padding:0;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f7f7ff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7ff">
    <tr>
      <td align="center" style="padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <img src="https://storage.mlcdn.com/account_image/325398/nBu3JuQaeiX2mp3ehXrrmQIKWMXijbAz6hU3Rffd.png" alt="Indigo Funds" height="40" style="display:block;">
                  </td>
                  <td style="text-align:right;">
                    <span style="font-size:20px;font-weight:700;color:#1e293b;">Monthly Report</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Investor Card -->
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <div style="font-size:14px;color:#94a3b8;margin-bottom:4px;">Investor</div>
                          <div style="font-size:24px;font-weight:700;color:#ffffff;">${investorName}</div>
                        </td>
                        <td style="text-align:right;">
                          <div style="font-size:14px;color:#94a3b8;margin-bottom:4px;">Statement Period</div>
                          <div style="font-size:18px;font-weight:600;color:#ffffff;">${statementPeriod}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fund Sections -->
          <tr>
            <td>
              ${fundSections}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="font-size:11px;color:#64748b;line-height:1.5;margin:0;text-align:center;">
                      This report is confidential and intended solely for the named recipient. The information contained herein is for informational purposes only and does not constitute investment advice. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="https://linkedin.com/company/indigo-funds" target="_blank">
                            <img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="display:block;">
                          </a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="https://instagram.com/indigo.funds" target="_blank">
                            <img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="display:block;">
                          </a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="https://x.com/IndigoFunds" target="_blank">
                            <img src="${SOCIAL_ICONS.x}" alt="X" width="24" height="24" style="display:block;">
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:8px;">
                    <span style="font-size:12px;color:#64748b;">© ${new Date().getFullYear()} Indigo Funds. All rights reserved.</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;">
                    <a href="#" style="font-size:11px;color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
