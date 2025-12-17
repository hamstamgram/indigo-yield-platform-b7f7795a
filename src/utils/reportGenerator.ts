// Report Generator - Generates HTML reports matching archive format exactly
// Reference: archive/statements/2025_09/14_Kabbaj_Fam.html

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
  BTC: "https://storage.mlcdn.com/account_image/325398/wJfhMFwB7eSWhZh4K8fjuNvMU8z3sQvUpxqnKq7r.png",
  ETH: "https://storage.mlcdn.com/account_image/325398/Bn7p0xF5xPejzC2P98T94O3R3FHbJT2Vdg5skphT.png",
  USDC: "https://storage.mlcdn.com/account_image/325398/VK8NJQ3OZZXGS2DuI53Lz3D1urRgKHGgWLcjQdJk.png",
  USDT: "https://storage.mlcdn.com/account_image/325398/bfBEE4o5sXYg8OVjQq4bNc0LNc1RqVLWE8qDvxLa.png",
  SOL: "https://storage.mlcdn.com/account_image/325398/1EIo6N7cHCLbQ0wjkJcBx8iYdfR2xvJSwJSWKJa3.png",
  EURC: "https://storage.mlcdn.com/account_image/325398/oF1kMwA74NZfGe4kZMXqJgPXH8HMfkhCLxJp1aB2.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  XAUT: "https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png",
  DEFAULT: "https://storage.mlcdn.com/account_image/325398/wJfhMFwB7eSWhZh4K8fjuNvMU8z3sQvUpxqnKq7r.png",
};

const COMPANY_LOGO = "https://storage.mlcdn.com/account_image/325398/6dNqhcGMUAaEb7sCT4U2u5nCiEglxjSOnC0hfKOZ.png";

// Get asset code from fund name
const getAssetCode = (fundName: string): string => {
  const upper = fundName.toUpperCase();
  if (upper.includes("BTC")) return "BTC";
  if (upper.includes("ETH")) return "ETH";
  if (upper.includes("USDC")) return "USDC";
  if (upper.includes("USDT")) return "USDT";
  if (upper.includes("SOL")) return "SOL";
  if (upper.includes("EURC")) return "EURC";
  if (upper.includes("XRP")) return "XRP";
  if (upper.includes("XAUT")) return "XAUT";
  return "BTC";
};

// Format fund name as title case: "BTC Yield Fund"
const formatFundName = (fundName: string): string => {
  const asset = getAssetCode(fundName);
  return `${asset} Yield Fund`;
};

// Format value - just return as-is or dash for empty/zero
const formatValue = (val: string | number): string => {
  if (!val || val === "-" || val === 0 || val === "0" || val === "0.0000") return "-";
  if (typeof val === "string") return val;
  return val.toFixed(4);
};

// Format return rate - just return as-is
const formatReturnRate = (val: string | number): string => {
  if (!val || val === "-" || val === 0 || val === "0" || val === "0.00%") return "-";
  if (typeof val === "string") return val;
  return `${val.toFixed(2)}%`;
};

export const generateInvestorReportHtml = (data: ReportData): string => {
  const fundBlocks = data.funds
    .map((fund) => {
      const asset = getAssetCode(fund.fundName);
      const iconUrl = FUND_ICONS[asset] || FUND_ICONS["DEFAULT"];
      const displayName = formatFundName(fund.fundName);

      return `
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <img src="${iconUrl}" alt="${asset}" style="width:32px;height:32px;border-radius:50%;">
        <span style="font-size:16px;font-weight:600;color:#0f172a;">${displayName}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <th style="text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;padding:8px 0;"></th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;padding:8px 0;">MTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;padding:8px 0;">QTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;padding:8px 0;">YTD</th>
            <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;padding:8px 0;">ITD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Beginning Balance</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.begin_balance_mtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.begin_balance_qtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.begin_balance_ytd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.begin_balance_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Additions</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.additions_mtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.additions_qtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.additions_ytd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.additions_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Redemptions</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.redemptions_mtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.redemptions_qtd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.redemptions_ytd)}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">${formatValue(fund.metrics.redemptions_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;">Net Income</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.net_income_mtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.net_income_qtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.net_income_ytd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.net_income_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;">Ending Balance</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.ending_balance_mtd)}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.ending_balance_qtd)}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.ending_balance_ytd)}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">${formatValue(fund.metrics.ending_balance_itd)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;">Rate of Return</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatReturnRate(fund.metrics.return_rate_mtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatReturnRate(fund.metrics.return_rate_qtd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatReturnRate(fund.metrics.return_rate_ytd)}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">${formatReturnRate(fund.metrics.return_rate_itd)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Report - ${data.investorName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin:0; padding:20px; font-family:'Montserrat',sans-serif; background:#ffffff; }
    .container { max-width:680px; margin:0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${COMPANY_LOGO}" alt="Indigo Fund" style="height:48px;margin-bottom:16px;">
      <h1 style="font-size:24px;font-weight:600;color:#0f172a;margin:0;">Monthly Report</h1>
    </div>

    <!-- Investor Info -->
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Investor</div>
          <div style="font-size:16px;color:#0f172a;font-weight:600;">${data.investorName}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Statement Period</div>
          <div style="font-size:16px;color:#0f172a;font-weight:600;">${data.reportDate}</div>
        </div>
      </div>
    </div>

    <!-- Fund Sections -->
    ${fundBlocks}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="font-size:11px;color:#64748b;line-height:1.5;margin:0 0 16px 0;">
        This statement is confidential and intended solely for the named recipient. 
        The information contained herein is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities.
      </p>
      <p style="font-size:11px;color:#94a3b8;margin:0;">
        © ${new Date().getFullYear()} Indigo Funds. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
};
