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
  "BTC YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  "ETH YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "Tokenized Gold":
    "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "Stablecoin Fund":
    "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  // Fallback/Generic
  DEFAULT:
    "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
};

const formatValue = (
  val: string | number,
  isPercentage = false
): { text: string; color: string } => {
  if (!val || val === "-" || val === 0 || val === "0") return { text: "-", color: "#1e293b" };

  const numVal = typeof val === "string" ? parseFloat(val.replace(/,/g, "")) : val;
  if (isNaN(numVal)) return { text: "-", color: "#1e293b" };

  const isNegative = numVal < 0;
  const color = isNegative ? "#dc2626" : "#16a34a";

  let formattedText = Math.abs(numVal).toLocaleString("en-US", {
    minimumFractionDigits: isPercentage ? 2 : 4,
    maximumFractionDigits: isPercentage ? 2 : 4,
  });

  if (isNegative) formattedText = `-${formattedText}`;
  else if (isPercentage) formattedText = `+${formattedText}`;

  if (isPercentage) formattedText += "%";

  return { text: formattedText, color };
};

export const generateInvestorReportHtml = (data: ReportData): string => {
  const fundBlocks = data.funds
    .map((fund) => {
      const iconUrl = FUND_ICONS[fund.fundName.toUpperCase()] || FUND_ICONS["DEFAULT"];

      // Process metrics with formatting rules
      const netIncomeMtd = formatValue(fund.metrics.net_income_mtd);
      const netIncomeQtd = formatValue(fund.metrics.net_income_qtd);
      const netIncomeYtd = formatValue(fund.metrics.net_income_ytd);
      const netIncomeItd = formatValue(fund.metrics.net_income_itd);

      const returnMtd = formatValue(fund.metrics.return_rate_mtd, true);
      const returnQtd = formatValue(fund.metrics.return_rate_qtd, true);
      const returnYtd = formatValue(fund.metrics.return_rate_ytd, true);
      const returnItd = formatValue(fund.metrics.return_rate_itd, true);

      return `
    <!-- START: Fund Block: ${fund.fundName} -->
    <tr>
      <td style="background-color:#ffffff; border-radius:10px; padding:20px; border: 1px solid #e2e8f0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:40px;" valign="middle">
              <img src="${iconUrl}" alt="${fund.fundName} icon" width="32" style="border:0;max-width:100%;">
            </td>
            <td valign="middle" style="padding-left:12px;">
              <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fund.fundName}</h2>
            </td>
          </tr>
        </table>
        <table class="mobile-table" role="presentation" aria-label="${fund.fundName} Capital Account Summary" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Capital Account Summary</th>
            <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">MTD (${fund.currency})</th>
            <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">QTD (${fund.currency})</th>
            <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">YTD (${fund.currency})</th>
            <th scope="col" class="mobile-header" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">ITD (${fund.currency})</th>
          </tr>
          <tr>
            <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Beginning Balance</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.begin_balance_mtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.begin_balance_qtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.begin_balance_ytd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.begin_balance_itd).text}</td>
          </tr>
          <tr>
            <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Additions</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.additions_mtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.additions_qtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.additions_ytd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.additions_itd).text}</td>
          </tr>
          <tr>
            <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Redemptions</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.redemptions_mtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.redemptions_qtd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.redemptions_ytd).text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${formatValue(fund.metrics.redemptions_itd).text}</td>
          </tr>
          <tr>
            <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Net Income</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${netIncomeMtd.color}">${netIncomeMtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${netIncomeQtd.color}">${netIncomeQtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${netIncomeYtd.color}">${netIncomeYtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${netIncomeItd.color}">${netIncomeItd.text}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td class="mobile-cell" style="padding:10px 8px;font-size:14px;color:#1e293b;font-weight:700;">Ending Balance</td>
            <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatValue(fund.metrics.ending_balance_mtd).text}</td>
            <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatValue(fund.metrics.ending_balance_qtd).text}</td>
            <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatValue(fund.metrics.ending_balance_ytd).text}</td>
            <td class="mobile-cell" style="padding:10px 8px;text-align:right;font-size:14px;color:#1e293b;font-weight:700;">${formatValue(fund.metrics.ending_balance_itd).text}</td>
          </tr>
          <tr>
            <td class="mobile-cell" style="padding:8px;font-size:14px;color:#334155;">Rate of Return</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${returnMtd.color}">${returnMtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${returnQtd.color}">${returnQtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${returnYtd.color}">${returnYtd.text}</td>
            <td class="mobile-cell" style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${returnItd.color}">${returnItd.text}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:16px;"></td></tr>
    `;
    })
    .join("");

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
    @media screen and (max-width:600px) {
      .sm-w-full { width: 100% !important }
      .mobile-logo { height: 22px !important; width: auto !important }
      .mobile-h1 { font-size: 18px !important }
      .mobile-table { font-size: 11px !important }
      .mobile-header { font-size: 10px !important; padding: 8px 6px !important }
      .mobile-cell { font-size: 11px !important; padding: 8px 6px !important }
      .mobile-footer-text { font-size: 10px !important; }
    }
    @media screen and (max-width:480px) {
      .mobile-h1 { font-size: 16px !important }
      .mobile-table { font-size: 10px !important }
      .mobile-header { font-size: 9px !important; padding: 6px 4px !important }
      .mobile-cell { font-size: 10px !important; padding: 6px 4px !important }
      .mobile-footer-text { font-size: 9px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Montserrat',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table class="sm-w-full" role="presentation" cellpadding="0" cellspacing="0" style="width:600px;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe; padding:20px 24px; border-radius: 10px 10px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td valign="middle">
                    <img src="https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg" alt="Indigo Logo" height="24" class="mobile-logo" style="display:block;border:0;height:24px;width:auto;">
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
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#334155;">Investor: ${data.investorName}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>${data.reportDate}</strong></p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:24px; background-color: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                
                ${fundBlocks}

              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td style="padding:0 24px;">
              <p class="mobile-footer-text" style="margin: 0; font-size:12px; color: #64748b; line-height: 1.6; text-align: center;">
                This document is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.
              </p>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="#" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png" alt="LinkedIn" width="24" style="border:0;">
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png" alt="Instagram" width="24" style="border:0;">
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                     <a href="#" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png" alt="X" width="24" style="border:0;">
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
                <a href="#" target="_blank" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
