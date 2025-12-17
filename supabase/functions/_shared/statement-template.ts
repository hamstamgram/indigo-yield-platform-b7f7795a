// Fund icon URLs from CDN
export const FUND_ICONS = {
  BTC: "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png",
  USDC: "https://storage.mlcdn.com/account_image/855106/w0V5YkYqj0Jb5K61Hl27zBw32mB8X0lT2Fh5G1i9.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/f0Z74sL9p2jI7u0O2j3y0f9J0l7b7U5n9f2T3t4f.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/r5N3D0u2n9k8A1n8w6n8d6C8k0V6i9n3f1o0W9s7.png",
  EURC: "https://storage.mlcdn.com/account_image/855106/u5D1G0v2g9r8j1y8c6a8z6n8r0z6w9w3t1f0l9v7.png",
};

export const COMPANY_LOGO = "https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png";
export const FOOTER_LOGO = "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";

// Social icons
export const SOCIAL_ICONS = {
  linkedin: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  x: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

// Generate fund section HTML
function generateFundSection(asset: string, fundName: string): string {
  const iconUrl = FUND_ICONS[asset as keyof typeof FUND_ICONS] || FUND_ICONS.BTC;
  
  return `
          <tr>
            <td style="background:#f8fafc;border-radius:10px;padding:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="width:40px;" valign="middle">
                    <img src="${iconUrl}" alt="${fundName} fund icon" width="32" style="border:0;max-width:100%;">
                  </td>
                  <td valign="middle" style="padding-left:8px;">
                    <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fundName}</h2>
                  </td>
                </tr>
              </table>
              <table class="mobile-table" role="presentation" aria-label="${fundName} Capital Account Summary" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:20px;">
                <tr style="border-bottom:1px solid #e2e8f0;background:#ffffff;">
                  <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Capital Account Summary</th>
                  <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">MTD (${asset})</th>
                  <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">QTD (${asset})</th>
                  <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">YTD (${asset})</th>
                  <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">ITD (${asset})</th>
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
          <tr>
            <td style="height:16px;"></td>
          </tr>`;
}

// All supported assets
export const SUPPORTED_ASSETS = ["BTC", "ETH", "USDC", "USDT", "SOL", "EURC"];

export const STATEMENT_TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @media (max-width:600px) {
      .sm-w-full {
        width: 100% !important
      }
      .mobile-logo {
        height: 22px !important;
        width: auto !important
      }
      .mobile-h1 {
        font-size: 18px !important
      }
      .mobile-table {
        font-size: 11px !important
      }
      .mobile-header {
        font-size: 10px !important;
        padding: 6px 4px !important
      }
      .mobile-cell {
        font-size: 11px !important;
        padding: 6px 4px !important
      }
      .mobile-footer-text {
        font-size: 10px !important;
      }
    }
    @media (max-width:480px) {
      .mobile-h1 {
        font-size: 16px !important
      }
      .mobile-table {
        font-size: 10px !important
      }
      .mobile-header {
        font-size: 9px !important;
        padding: 4px 2px !important
      }
      .mobile-cell {
        font-size: 10px !important;
        padding: 4px 2px !important
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Montserrat',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table class="sm-w-full" role="presentation" cellpadding="0" cellspacing="0" style="width:600px;">
          <tr>
            <td style="background:#edf0fe; padding:18px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td valign="middle" style="width:1%; white-space:nowrap;">
                    <img src="${COMPANY_LOGO}" alt="Company Logo" height="22" class="mobile-logo" style="display:block;border:0;height:22px;width:auto;">
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
          <tr>
            <td style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:#334155;">Investor: {{INVESTOR_NAME}}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>{{PERIOD_END_DATE}}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="height:24px;"></td>
          </tr>
          {{FUND_SECTIONS}}
          <tr>
            <td style="height:32px;"></td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 12px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td align="center">
                    <img src="${FOOTER_LOGO}" alt="Indigo Logo" width="100" style="display:block;border:0;width:100px;">
                  </td>
                </tr>
                <tr>
                  <td style="height:16px;"></td>
                </tr>
                <tr>
                  <td align="center">
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
                <tr>
                  <td style="height:16px;"></td>
                </tr>
                <tr>
                  <td class="mobile-footer-text" align="center" style="font-size:12px; line-height:1.5; color:#64748b;">
                    Indigo Labs, 2100 Geng Road, Palo Alto, CA 94303
                  </td>
                </tr>
                <tr>
                  <td style="height:12px;"></td>
                </tr>
                <tr>
                  <td class="mobile-footer-text" align="center" style="font-size:12px; line-height:1.5; color:#94a3b8;">
                    This email was sent to {{INVESTOR_EMAIL}} because you are an investor.
                    <br> You can <a href="#" target="_blank" style="color:#64748b; text-decoration:underline;">unsubscribe</a> or <a href="#" target="_blank" style="color:#64748b; text-decoration:underline;">update your preferences</a>.
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

// Generate dynamic fund section for each asset investor has
export function generateFundSectionHtml(asset: string): string {
  const fundNames: Record<string, string> = {
    BTC: "BTC YIELD FUND",
    ETH: "ETH YIELD FUND",
    USDC: "USDC YIELD FUND",
    USDT: "USDT YIELD FUND",
    SOL: "SOL YIELD FUND",
    EURC: "EURC YIELD FUND",
  };
  return generateFundSection(asset, fundNames[asset] || `${asset} YIELD FUND`);
}
