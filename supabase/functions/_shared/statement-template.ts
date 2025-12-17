// Fund icon URLs from CDN
export const FUND_ICONS: Record<string, string> = {
  BTC: "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  USDC: "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  EURC: "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  XRP: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  XAUT: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
};

export const COMPANY_LOGO = "https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png";

// Social icons
export const SOCIAL_ICONS = {
  linkedin: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  x: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

// Generate fund section HTML with placeholders
function generateFundSection(asset: string, fundName: string): string {
  const iconUrl = FUND_ICONS[asset as keyof typeof FUND_ICONS] || FUND_ICONS.BTC;
  
  return `
          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="width:40px;" valign="middle">
                          <img src="${iconUrl}" alt="${fundName} icon" width="32" style="border:0;max-width:100%;">
                        </td>
                        <td valign="middle" style="padding-left:8px;">
                          <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fundName}</h2>
                        </td>
                      </tr>
                    </table>
                    <table class="mobile-table" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:20px;">
                      <tr style="border-bottom:1px solid #e2e8f0;background:#ffffff;">
                        <th class="mobile-header" style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Capital Account Summary</th>
                        <th class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">MTD (${asset})</th>
                        <th class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">QTD (${asset})</th>
                        <th class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">YTD (${asset})</th>
                        <th class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">ITD (${asset})</th>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Beginning Balance</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_BEGIN_MTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_BEGIN_QTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_BEGIN_YTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_BEGIN_ITD}}</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Additions</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_ADD_MTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_ADD_QTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_ADD_YTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_ADD_ITD}}</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Redemptions</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_REDEEM_MTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_REDEEM_QTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_REDEEM_YTD}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">{{${asset}_REDEEM_ITD}}</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Net Income</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_INCOME_MTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_INCOME_QTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_INCOME_YTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_INCOME_ITD_STYLED}}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;background:#ffffff;">
                        <td class="mobile-cell" style="padding:10px 8px;font-size:14px;color:#1e293b;font-weight:700;">Ending Balance</td>
                        <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">{{${asset}_END_MTD}}</td>
                        <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">{{${asset}_END_QTD}}</td>
                        <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">{{${asset}_END_YTD}}</td>
                        <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">{{${asset}_END_ITD}}</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Rate of Return</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_RATE_MTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_RATE_QTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_RATE_YTD_STYLED}}</td>
                        <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;">{{${asset}_RATE_ITD_STYLED}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

// All supported assets
export const SUPPORTED_ASSETS = ["BTC", "ETH", "USDC", "USDT", "SOL", "EURC", "XRP", "XAUT"];

export const STATEMENT_TEMPLATE = `<!DOCTYPE html>
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
  </style>
</head>
<body style="margin:0;padding:0;width:100%;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Montserrat',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table class="sm-w-full" role="presentation" cellpadding="0" cellspacing="0" style="width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:#edf0fe; padding:18px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td valign="middle" style="width:1%; white-space:nowrap;">
                    <img src="${COMPANY_LOGO}" alt="Indigo Fund" height="22" class="mobile-logo" style="display:block;border:0;height:22px;width:auto;">
                  </td>
                  <td style="width:12px;"></td>
                  <td valign="middle" align="right">
                    <h1 class="mobile-h1" style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;">Monthly Report</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:12px;"></td>
          </tr>
          <!-- Investor Info -->
          <tr>
            <td style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:#334155;">Investor: {{INVESTOR_NAME}}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>{{PERIOD_END_DATE}}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="height:24px;"></td>
          </tr>
          <!-- Fund Sections -->
          {{FUND_SECTIONS}}
          <!-- Legal Disclaimer -->
          <tr>
            <td style="padding:24px 0;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;text-align:center;">
                This document is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.
              </p>
            </td>
          </tr>
          <!-- Social Icons -->
          <tr>
            <td align="center" style="padding:16px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 8px;">
                    <a href="https://linkedin.com/company/indigoyield" target="_blank"><img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" style="display:block;border:0;"></a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://instagram.com/indigoyield" target="_blank"><img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" style="display:block;border:0;"></a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://x.com/indigoyield" target="_blank"><img src="${SOCIAL_ICONS.x}" alt="X" width="24" style="display:block;border:0;"></a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Copyright & Unsubscribe -->
          <tr>
            <td align="center" style="padding:16px 0 24px;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">© 2025 Indigo Fund. All rights reserved.</p>
              <p style="margin:0;font-size:12px;">
                <a href="#" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Generate dynamic fund section for each asset investor has
export function generateFundSectionHtml(asset: string): string {
  const fundNames: Record<string, string> = {
    BTC: "BTC YIELD FUND",
    ETH: "ETH YIELD FUND",
    USDC: "USDC YIELD FUND",
    USDT: "USDT YIELD FUND",
    SOL: "SOL YIELD FUND",
    EURC: "EURC YIELD FUND",
    XRP: "XRP YIELD FUND",
    XAUT: "XAUT YIELD FUND",
  };
  return generateFundSection(asset, fundNames[asset] || `${asset} YIELD FUND`);
}
