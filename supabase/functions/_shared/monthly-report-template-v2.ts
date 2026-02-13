// Monthly Report Template V2 - Exact match to provided HTML design
// Token-denominated only, no USD, no currency symbols
// Email-safe with bgcolor fallbacks for Outlook compatibility

// Fund icon URLs from CDN
export const FUND_ICONS: Record<string, string> = {
  BTC: "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/g9NxhkmgPwWcqGD0NHB8LYldfZcMJ5LCMsmQblMt.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/9xYhDjqnMJwYOoUK4NKBZHDz7NkuGCGPLuQhKsrR.png",
  USDC: "https://storage.mlcdn.com/account_image/855106/tVPxl7mDm2gBYCHJzclJ3NXbXe4cjdWIvSHMGzHx.png",
  EURC: "https://storage.mlcdn.com/account_image/855106/rTc1KcZ5RBmNqYLJxZ5nH8vPwQdMkF3gLyJhNxKm.png",
  XRP: "https://storage.mlcdn.com/account_image/855106/xrp_icon.png",
  XAUT: "https://storage.mlcdn.com/account_image/855106/xaut_icon.png",
};

// Social icon URLs
export const SOCIAL_ICONS = {
  linkedin:
    "https://storage.mlcdn.com/account_image/855106/RnXQ2wg2CWr8VjTAwj3NvFJoHT4GPmDSVU2sLNx6.png",
  instagram:
    "https://storage.mlcdn.com/account_image/855106/2zDqfXd7PHFzKDXCBwrmhVH4NmV2jEWY98LLT1UG.png",
  twitter:
    "https://storage.mlcdn.com/account_image/855106/DV8BqtRcMQvXfEJZh5yF0t42cg0l7TFHh1PHmVhj.png",
};

// Logo URL
export const LOGO_URL =
  "https://storage.mlcdn.com/account_image/855106/l1RYJRY7T2d0hJpEu0SdBnGMhw1WS0mYNNJFBNxZ.png";

// Decimal places per asset
export function getAssetDecimals(asset: string): number {
  const upperAsset = asset.toUpperCase();
  switch (upperAsset) {
    case "BTC":
      return 8;
    case "ETH":
    case "SOL":
    case "XRP":
    case "XAUT":
      return 4;
    case "USDC":
    case "USDT":
    case "EURC":
    default:
      return 2;
  }
}

// Format token value with appropriate decimals and thousands separators
export function formatTokenValue(value: number | null | undefined, asset: string): string {
  if (value === null || value === undefined) {
    return "0.00";
  }
  const decimals = getAssetDecimals(asset);
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

// Format value for additions/redemptions (show "-" for zero/null)
export function formatAdditionRedemption(value: number | null | undefined, asset: string): string {
  if (value === null || value === undefined || value === 0) {
    return "-";
  }
  return formatTokenValue(value, asset);
}

// Format net income with sign and color styling
export function formatNetIncomeWithStyle(value: number | null | undefined, asset: string): string {
  if (value === null || value === undefined || value === 0) {
    return `<span style="color:#1e293b">0.00</span>`;
  }
  const decimals = getAssetDecimals(asset);
  const absValue = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (value > 0) {
    return `<span style="color:#16a34a">+${absValue}</span>`;
  } else {
    return `<span style="color:#dc2626">-${absValue}</span>`;
  }
}

// Format rate of return with sign and color styling
export function formatRateOfReturnWithStyle(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return `<span style="color:#1e293b">0.00%</span>`;
  }
  const absValue = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `<span style="color:#16a34a">+${absValue}%</span>`;
  } else {
    return `<span style="color:#dc2626">-${absValue}%</span>`;
  }
}

// Extract asset symbol from fund name
export function extractAssetFromFundName(fundName: string): string {
  const upperName = fundName.toUpperCase();
  if (upperName.includes("BTC") || upperName.includes("BITCOIN")) return "BTC";
  if (upperName.includes("ETH") || upperName.includes("ETHEREUM")) return "ETH";
  if (upperName.includes("SOL") || upperName.includes("SOLANA")) return "SOL";
  if (upperName.includes("USDT") || upperName.includes("TETHER")) return "USDT";
  if (upperName.includes("USDC")) return "USDC";
  if (upperName.includes("EURC")) return "EURC";
  if (upperName.includes("XRP") || upperName.includes("RIPPLE")) return "XRP";
  if (upperName.includes("XAUT") || upperName.includes("GOLD")) return "XAUT";
  return "USDC"; // Default
}

// Fund icon URL helper
export function getFundIconUrl(asset: string): string {
  return FUND_ICONS[asset.toUpperCase()] || FUND_ICONS["USDC"];
}

// Fund block spacer HTML - exactly 16px as per template requirement
export const FUND_BLOCK_SPACER = `<!-- SPACER -->
                <tr>
                  <td style="height:16px;"></td>
                </tr>`;

// Generate a single fund block HTML with bgcolor fallbacks for email compatibility
export function generateFundBlockHtml(data: {
  fundName: string;
  asset: string;
  mtdBeginning: number | null;
  qtdBeginning: number | null;
  ytdBeginning: number | null;
  itdBeginning: number | null;
  mtdAdditions: number | null;
  qtdAdditions: number | null;
  ytdAdditions: number | null;
  itdAdditions: number | null;
  mtdRedemptions: number | null;
  qtdRedemptions: number | null;
  ytdRedemptions: number | null;
  itdRedemptions: number | null;
  mtdNetIncome: number | null;
  qtdNetIncome: number | null;
  ytdNetIncome: number | null;
  itdNetIncome: number | null;
  mtdEnding: number | null;
  qtdEnding: number | null;
  ytdEnding: number | null;
  itdEnding: number | null;
  mtdRor: number | null;
  qtdRor: number | null;
  ytdRor: number | null;
  itdRor: number | null;
}): string {
  const asset = data.asset;
  const iconUrl = getFundIconUrl(asset);

  return `<!-- START: Fund Block (${asset}) -->
                <tr>
                  <td style="padding: 0;">
                    <!-- Fund Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td width="40" style="vertical-align: middle;">
                          <img src="${iconUrl}" alt="${asset}" width="32" height="32" style="display: block; border-radius: 50%;">
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; text-transform: uppercase;">${data.fundName}</h2>
                        </td>
                      </tr>
                    </table>

                    <!-- Performance Table -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="mobile-table" style="border-collapse: collapse; font-size: 13px;">
                      <tr style="background-color: #0f172a;">
                        <th class="mobile-header" style="text-align: left; padding: 10px 8px; color: #ffffff; font-weight: 600; border-radius: 6px 0 0 0; background-color: #0f172a;" bgcolor="#0f172a">Capital Account Summary</th>
                        <th class="mobile-header" style="text-align: right; padding: 10px 8px; color: #ffffff; font-weight: 600; background-color: #0f172a;" bgcolor="#0f172a">MTD (${asset})</th>
                        <th class="mobile-header" style="text-align: right; padding: 10px 8px; color: #ffffff; font-weight: 600; background-color: #0f172a;" bgcolor="#0f172a">QTD (${asset})</th>
                        <th class="mobile-header" style="text-align: right; padding: 10px 8px; color: #ffffff; font-weight: 600; background-color: #0f172a;" bgcolor="#0f172a">YTD (${asset})</th>
                        <th class="mobile-header" style="text-align: right; padding: 10px 8px; color: #ffffff; font-weight: 600; border-radius: 0 6px 0 0; background-color: #0f172a;" bgcolor="#0f172a">ITD (${asset})</th>
                      </tr>
                      <tr style="background-color: #f8fafc;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 500; background-color: #f8fafc;" bgcolor="#f8fafc">Beginning Balance</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.mtdBeginning, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.qtdBeginning, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.ytdBeginning, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.itdBeginning, asset)}</td>
                      </tr>
                      <tr style="background-color: #ffffff;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 500; background-color: #ffffff;" bgcolor="#ffffff">Additions</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #ffffff;" bgcolor="#ffffff">${formatAdditionRedemption(data.mtdAdditions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #ffffff;" bgcolor="#ffffff">${formatAdditionRedemption(data.qtdAdditions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #ffffff;" bgcolor="#ffffff">${formatAdditionRedemption(data.ytdAdditions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #ffffff;" bgcolor="#ffffff">${formatAdditionRedemption(data.itdAdditions, asset)}</td>
                      </tr>
                      <tr style="background-color: #f8fafc;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 500; background-color: #f8fafc;" bgcolor="#f8fafc">Redemptions</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatAdditionRedemption(data.mtdRedemptions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatAdditionRedemption(data.qtdRedemptions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatAdditionRedemption(data.ytdRedemptions, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; background-color: #f8fafc;" bgcolor="#f8fafc">${formatAdditionRedemption(data.itdRedemptions, asset)}</td>
                      </tr>
                      <tr style="background-color: #ffffff;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 500; background-color: #ffffff;" bgcolor="#ffffff">Net Income</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatNetIncomeWithStyle(data.mtdNetIncome, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatNetIncomeWithStyle(data.qtdNetIncome, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatNetIncomeWithStyle(data.ytdNetIncome, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatNetIncomeWithStyle(data.itdNetIncome, asset)}</td>
                      </tr>
                      <tr style="background-color: #f8fafc;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 600; background-color: #f8fafc;" bgcolor="#f8fafc">Ending Balance</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; font-weight: 600; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.mtdEnding, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; font-weight: 600; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.qtdEnding, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; font-weight: 600; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.ytdEnding, asset)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; color: #1e293b; font-weight: 600; background-color: #f8fafc;" bgcolor="#f8fafc">${formatTokenValue(data.itdEnding, asset)}</td>
                      </tr>
                      <tr style="background-color: #ffffff;">
                        <td class="mobile-cell" style="padding: 10px 8px; color: #475569; font-weight: 500; border-radius: 0 0 0 6px; background-color: #ffffff;" bgcolor="#ffffff">Rate of Return</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatRateOfReturnWithStyle(data.mtdRor)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatRateOfReturnWithStyle(data.qtdRor)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; background-color: #ffffff;" bgcolor="#ffffff">${formatRateOfReturnWithStyle(data.ytdRor)}</td>
                        <td class="mobile-cell" style="text-align: right; padding: 10px 8px; border-radius: 0 0 6px 0; background-color: #ffffff;" bgcolor="#ffffff">${formatRateOfReturnWithStyle(data.itdRor)}</td>
                      </tr>
                    </table>

                  </td>
                </tr>
                <!-- END: Fund Block (${asset}) -->`;
}

// Main template generator with bgcolor fallbacks for email compatibility
export function generateMonthlyReportHtml(data: {
  investorName: string;
  periodEndedLong: string;
  fundBlocks: string[];
}): string {
  // Join fund blocks with spacers (no spacer after last block)
  const fundBlocksHtml = data.fundBlocks.join(FUND_BLOCK_SPACER);

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <style>td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif !important; mso-line-height-rule: exactly;}</style>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td, p, h1, h2 { font-family: 'Montserrat', Arial, sans-serif; }
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
      .mobile-footer-text { font-size: 9px !important; }
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f1f5f9;" bgcolor="#f1f5f9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Main Container -->
        <table role="presentation" class="sm-w-full" width="640" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" bgcolor="#ffffff">

          <!-- Header Bar with VML fallback for Outlook gradient -->
          <tr>
            <td style="padding: 0;">
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroked="false" style="width:640px;height:68px;">
              <v:fill type="gradient" color="#6366f1" color2="#8b5cf6" angle="135"/>
              <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true">
              <![endif]-->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); background-color: #6366f1; border-radius: 12px 12px 0 0;" bgcolor="#6366f1">
                <tr>
                  <td style="padding: 20px 24px; background-color: #6366f1;" bgcolor="#6366f1">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%">
                          <img src="${LOGO_URL}" alt="Indigo Fund" height="28" class="mobile-logo" style="display: block;">
                        </td>
                        <td width="50%" style="text-align: right;">
                          <h1 class="mobile-h1" style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Your Account Statement</h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- Investor Info Card -->
          <tr>
            <td style="padding: 24px; background-color: #ffffff;" bgcolor="#ffffff">
              <p style="margin: 0 0 4px 0; font-size: 15px; color: #1e293b; font-weight: 600;">Investor: ${data.investorName}</p>
              <p style="margin: 0; font-size: 13px; color: #64748b;">Investor Statement for the Period Ended: ${data.periodEndedLong}</p>
            </td>
          </tr>

          <!-- Fund Blocks Container -->
          <tr>
            <td style="padding: 0 24px 24px 24px; background-color: #ffffff;" bgcolor="#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Fund Blocks -->
${fundBlocksHtml}

              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding: 0 24px 24px 24px; background-color: #ffffff;" bgcolor="#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px;" bgcolor="#f8fafc">
                <tr>
                  <td style="padding: 16px; background-color: #f8fafc;" bgcolor="#f8fafc">
                    <p class="mobile-footer-text" style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">This document is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Icons -->
          <tr>
            <td style="padding: 0 24px 24px 24px; background-color: #ffffff;" bgcolor="#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://www.linkedin.com/company/indigofund" target="_blank">
                            <img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="display: block;">
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="https://www.instagram.com/indigofund" target="_blank">
                            <img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="display: block;">
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                           <a href="https://twitter.com/indigofund" target="_blank">
                            <img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="24" height="24" style="display: block;">
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td style="padding: 0 24px 24px 24px; text-align: center; background-color: #ffffff;" bgcolor="#ffffff">
              <p class="mobile-footer-text" style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">© ${new Date().getFullYear()} Indigo Fund. All rights reserved.</p>
              <p class="mobile-footer-text" style="margin: 0;">
                <a href="#" style="font-size: 11px; color: #6366f1; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Validation function to ensure generated HTML contains required elements and bgcolor attributes
export function validateGeneratedHtml(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const requiredElements = [
    "Your Account Statement",
    "Capital Account Summary",
    "storage.mlcdn.com",
    "Indigo Fund. All rights reserved",
    "This document is not an offer",
    "linkedin",
    "instagram",
    "twitter",
  ];

  for (const element of requiredElements) {
    if (!html.includes(element)) {
      errors.push(`Missing required element: ${element}`);
    }
  }

  // Check no USD or $ appears (except in stylesheets)
  if (html.includes("$") && !html.includes("stylesheet")) {
    errors.push("Found '$' symbol in HTML (not allowed - token-denominated only)");
  }
  if (html.includes("USD") && !html.includes("USDC") && !html.includes("USDT")) {
    errors.push("Found 'USD' in HTML (not allowed - use asset symbols only)");
  }

  // Validate bgcolor fallbacks are present for email compatibility
  const requiredBgColors = [
    { style: "background-color: #f1f5f9", bgcolor: 'bgcolor="#f1f5f9"', name: "Outer background" },
    { style: "background-color: #ffffff", bgcolor: 'bgcolor="#ffffff"', name: "White areas" },
    { style: "background-color: #f8fafc", bgcolor: 'bgcolor="#f8fafc"', name: "Light gray areas" },
    { style: "background-color: #0f172a", bgcolor: 'bgcolor="#0f172a"', name: "Table header" },
  ];

  for (const bg of requiredBgColors) {
    if (html.includes(bg.style) && !html.includes(bg.bgcolor)) {
      errors.push(`${bg.name}: Found ${bg.style} without matching ${bg.bgcolor}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
