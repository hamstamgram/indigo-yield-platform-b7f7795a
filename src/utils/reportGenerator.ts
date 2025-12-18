/**
 * Report Generator - Generates HTML reports matching exact archive format
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

const COMPANY_LOGO = 'https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png';

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
  return value.toFixed(4);
}

function formatReturnRate(value: number | null): string {
  if (value === null || value === undefined || value === 0) return '-';
  return value.toFixed(2) + '%';
}

function getColor(value: number | null): string {
  if (value === null || value === undefined || value === 0) return '#0f172a';
  return value >= 0 ? '#16a34a' : '#dc2626';
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
  return `${asset} Yield Fund`;
}

function getFundIcon(fundName: string): string {
  const asset = getAssetCode(fundName);
  return FUND_ICONS[asset] || FUND_ICONS['BTC'];
}

function generateFundSection(fund: FundPerformanceData): string {
  const fundDisplayName = getFundDisplayName(fund.fund_name);
  const iconUrl = getFundIcon(fund.fund_name);

  const netIncomeColor = getColor(fund.mtd_net_income);
  const returnColor = getColor(fund.mtd_rate_of_return);

  return `
        <!-- ${fundDisplayName} Section -->
        <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px;">
            <div style="display:flex;align-items:center;margin-bottom:16px;">
                <img src="${iconUrl}" alt="${fundDisplayName}" style="width:28px;height:28px;margin-right:10px;border-radius:50%;">
                <span style="font-size:15px;font-weight:bold;color:#0f172a;">${fundDisplayName}</span>
            </div>
            <table width="100%" style="border-collapse:collapse;">
                <tr style="background-color:#e2e8f0;">
                    <th style="width:35%;padding:8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;"></th>
                    <th style="padding:8px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">MTD</th>
                    <th style="padding:8px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">QTD</th>
                    <th style="padding:8px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">YTD</th>
                    <th style="padding:8px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">ITD</th>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;">Beginning Balance</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.mtd_beginning_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.qtd_beginning_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.ytd_beginning_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.itd_beginning_balance)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;">Additions</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.mtd_additions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.qtd_additions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.ytd_additions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.itd_additions)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;">Redemptions</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.mtd_redemptions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.qtd_redemptions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.ytd_redemptions)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.itd_redemptions)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${netIncomeColor};">Net Income</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${netIncomeColor};">${formatNumber(fund.mtd_net_income)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${getColor(fund.qtd_net_income)};">${formatNumber(fund.qtd_net_income)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${getColor(fund.ytd_net_income)};">${formatNumber(fund.ytd_net_income)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:bold;color:${getColor(fund.itd_net_income)};">${formatNumber(fund.itd_net_income)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;">Ending Balance</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.mtd_ending_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.qtd_ending_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.ytd_ending_balance)}</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNumber(fund.itd_ending_balance)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;color:#0f172a;font-weight:bold;color:${returnColor};">Rate of Return (%)</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:bold;color:${returnColor};">${formatReturnRate(fund.mtd_rate_of_return)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:bold;color:${getColor(fund.qtd_rate_of_return)};">${formatReturnRate(fund.qtd_rate_of_return)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:bold;color:${getColor(fund.ytd_rate_of_return)};">${formatReturnRate(fund.ytd_rate_of_return)}</td>
                    <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:bold;color:${getColor(fund.itd_rate_of_return)};">${formatReturnRate(fund.itd_rate_of_return)}</td>
                </tr>
            </table>
        </div>`;
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indigo Fund - Monthly Statement - ${investorName}</title>
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
                Investor: ${investorName}
            </div>
            <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
                Investor Statement for the Period Ended: ${statementPeriod}
            </div>
        </div>

${fundSections}

        <!-- Footer -->
        <div style="margin:32px 16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            <p>This statement is confidential and proprietary. All amounts are shown in their respective currencies.</p>
            <p>© 2025 Indigo Fund. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

export default {
  generateInvestorReportHtml,
};
