// Statement Template - Generates HTML emails matching archive format exactly
// Reference: archive/statements/2025_09/14_Kabbaj_Fam.html

export const FUND_ICONS: Record<string, string> = {
  BTC: "https://storage.mlcdn.com/account_image/325398/wJfhMFwB7eSWhZh4K8fjuNvMU8z3sQvUpxqnKq7r.png",
  ETH: "https://storage.mlcdn.com/account_image/325398/Bn7p0xF5xPejzC2P98T94O3R3FHbJT2Vdg5skphT.png",
  USDC: "https://storage.mlcdn.com/account_image/325398/VK8NJQ3OZZXGS2DuI53Lz3D1urRgKHGgWLcjQdJk.png",
  USDT: "https://storage.mlcdn.com/account_image/325398/bfBEE4o5sXYg8OVjQq4bNc0LNc1RqVLWE8qDvxLa.png",
  SOL: "https://storage.mlcdn.com/account_image/325398/1EIo6N7cHCLbQ0wjkJcBx8iYdfR2xvJSwJSWKJa3.png",
  EURC: "https://storage.mlcdn.com/account_image/325398/oF1kMwA74NZfGe4kZMXqJgPXH8HMfkhCLxJp1aB2.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  XAUT: "https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png",
};

export const COMPANY_LOGO = "https://storage.mlcdn.com/account_image/325398/6dNqhcGMUAaEb7sCT4U2u5nCiEglxjSOnC0hfKOZ.png";

export const SOCIAL_ICONS = {
  linkedin: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  x: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

export const SUPPORTED_ASSETS = ["BTC", "ETH", "USDC", "USDT", "SOL", "EURC", "XRP", "XAUT"];

// Generate fund section HTML with placeholders
function generateFundSection(asset: string): string {
  const iconUrl = FUND_ICONS[asset as keyof typeof FUND_ICONS] || FUND_ICONS.BTC;
  const displayName = `${asset} Yield Fund`;
  
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
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_BEGIN_MTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_BEGIN_QTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_BEGIN_YTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_BEGIN_ITD}}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Additions</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_ADD_MTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_ADD_QTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_ADD_YTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_ADD_ITD}}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;">Redemptions</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_REDEEM_MTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_REDEEM_QTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_REDEEM_YTD}}</td>
            <td style="font-size:13px;color:#0f172a;padding:6px 0;text-align:right;">{{${asset}_REDEEM_ITD}}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;">Net Income</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_INCOME_MTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_INCOME_QTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_INCOME_YTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_INCOME_ITD}}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;">Ending Balance</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_END_MTD}}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_END_QTD}}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_END_YTD}}</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_END_ITD}}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;">Rate of Return</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_RATE_MTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_RATE_QTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_RATE_YTD}}</td>
            <td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 0;text-align:right;">{{${asset}_RATE_ITD}}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

export const STATEMENT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Report</title>
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
          <div style="font-size:16px;color:#0f172a;font-weight:600;">{{INVESTOR_NAME}}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Statement Period</div>
          <div style="font-size:16px;color:#0f172a;font-weight:600;">{{PERIOD_END_DATE}}</div>
        </div>
      </div>
    </div>

    <!-- Fund Sections -->
    {{FUND_SECTIONS}}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="font-size:11px;color:#64748b;line-height:1.5;margin:0 0 16px 0;">
        This statement is confidential and intended solely for the named recipient. 
        The information contained herein is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities.
      </p>
      <p style="font-size:11px;color:#94a3b8;margin:0;">
        © {{CURRENT_YEAR}} Indigo Funds. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

// Generate dynamic fund section for each asset investor has
export function generateFundSectionHtml(asset: string): string {
  return generateFundSection(asset);
}
