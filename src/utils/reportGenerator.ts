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

const FUND_ICONS: Record<string, string> = {
  "BTC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
  "ETH YIELD FUND": "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "USDC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "USDT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND": "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  "XRP YIELD FUND": "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  "XAUT YIELD FUND": "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
  DEFAULT: "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
};

const formatValue = (val: string | number): string => {
  if (!val || val === "-" || val === 0 || val === "0" || val === "0.0000") return "-";

  const numVal = typeof val === "string" ? parseFloat(val.replace(/,/g, "")) : val;
  if (isNaN(numVal) || numVal === 0) return "-";

  return numVal.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};

const formatReturnRate = (val: string | number): string => {
  if (!val || val === "-" || val === 0 || val === "0" || val === "0.00%") return "0%";

  const numVal = typeof val === "string" ? parseFloat(val.replace(/[%,]/g, "")) : val;
  if (isNaN(numVal)) return "0%";

  return `${numVal.toFixed(0)}%`;
};

export const generateInvestorReportHtml = (data: ReportData): string => {
  const fundBlocks = data.funds
    .map((fund) => {
      const iconUrl = FUND_ICONS[fund.fundName.toUpperCase()] || FUND_ICONS["DEFAULT"];

      return `
    <!-- ${fund.fundName} Section -->
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px;margin-top:24px;">
      <div style="display:flex;align-items:center;margin-bottom:20px;">
        <img src="${iconUrl}" height="32" style="margin-right:12px;" alt="${fund.currency}">
        <span style="font-size:18px;font-weight:bold;color:#0f172a;">${fund.fundName}</span>
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
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.begin_balance_mtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.begin_balance_qtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.begin_balance_ytd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.begin_balance_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Additions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.additions_mtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.additions_qtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.additions_ytd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.additions_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Redemptions</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.redemptions_mtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.redemptions_qtd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.redemptions_ytd)}</td>
            <td style="font-size:13px;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.redemptions_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Net Income</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.net_income_mtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.net_income_qtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.net_income_ytd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.net_income_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;font-weight:bold;color:#0f172a;padding:6px 0;">Ending Balance</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.ending_balance_mtd)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.ending_balance_qtd)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.ending_balance_ytd)}</td>
            <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">${formatValue(fund.metrics.ending_balance_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Rate of Return (%)</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatReturnRate(fund.metrics.return_rate_mtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatReturnRate(fund.metrics.return_rate_qtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatReturnRate(fund.metrics.return_rate_ytd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">${formatReturnRate(fund.metrics.return_rate_itd)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indigo Fund - Monthly Statement - ${data.investorName}</title>
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
                <img src="https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png" height="22" alt="Indigo Fund">
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
            Investor: ${data.investorName}
          </div>
          <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
            Investor Statement for the Period Ended: ${data.reportDate}
          </div>
        </div>
${fundBlocks}
        <!-- Footer -->
        <div style="margin:32px 16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
          <p>This statement is confidential and proprietary. All amounts are shown in their respective currencies.</p>
          <p>© 2025 Indigo Fund. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};
