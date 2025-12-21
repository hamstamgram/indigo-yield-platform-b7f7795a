import React from "react";
import {
  InvestorData,
  InvestorFund,
  FUND_ICONS,
  LOGO_URL,
  SOCIAL_ICONS,
  getValueColor,
} from "@/types/investor-report";

interface InvestorReportTemplateProps {
  investor: InvestorData;
}

const FundBlock: React.FC<{ fund: InvestorFund }> = ({ fund }) => {
  const iconUrl = FUND_ICONS[fund.name] || FUND_ICONS["USDC YIELD FUND"];

  return (
    <tr>
      <td style={{ backgroundColor: "#ffffff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0" }}>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ width: "40px" }} valign="middle">
                <img src={iconUrl} alt={fund.name} width="32" style={{ border: 0, maxWidth: "100%" }} />
              </td>
              <td valign="middle" style={{ paddingLeft: "12px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a202c" }}>{fund.name}</h2>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Data Table */}
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th scope="col" style={{ padding: "10px 8px", textAlign: "left", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Capital Account Summary</th>
              <th scope="col" style={{ padding: "10px 8px", textAlign: "right", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>MTD ({fund.currency})</th>
              <th scope="col" style={{ padding: "10px 8px", textAlign: "right", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>QTD ({fund.currency})</th>
              <th scope="col" style={{ padding: "10px 8px", textAlign: "right", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>YTD ({fund.currency})</th>
              <th scope="col" style={{ padding: "10px 8px", textAlign: "right", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>ITD ({fund.currency})</th>
            </tr>
          </thead>
          <tbody>
            {/* Beginning Balance */}
            <tr>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155" }}>Beginning Balance</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.begin_balance_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.begin_balance_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.begin_balance_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.begin_balance_itd}</td>
            </tr>

            {/* Additions */}
            <tr>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155" }}>Additions</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.additions_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.additions_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.additions_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.additions_itd}</td>
            </tr>

            {/* Redemptions */}
            <tr>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155" }}>Redemptions</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.redemptions_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.redemptions_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.redemptions_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b" }}>{fund.redemptions_itd}</td>
            </tr>

            {/* Net Income - with color logic */}
            <tr>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155" }}>Net Income</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.net_income_mtd) }}>{fund.net_income_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.net_income_qtd) }}>{fund.net_income_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.net_income_ytd) }}>{fund.net_income_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.net_income_itd) }}>{fund.net_income_itd}</td>
            </tr>

            {/* Ending Balance */}
            <tr style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155", fontWeight: 600 }}>Ending Balance</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>{fund.ending_balance_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>{fund.ending_balance_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>{fund.ending_balance_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>{fund.ending_balance_itd}</td>
            </tr>

            {/* Rate of Return - with color logic */}
            <tr style={{ backgroundColor: "#f8fafc" }}>
              <td style={{ padding: "8px", fontSize: "14px", color: "#334155", fontWeight: 600 }}>Rate of Return</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.return_rate_mtd) }}>{fund.return_rate_mtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.return_rate_qtd) }}>{fund.return_rate_qtd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.return_rate_ytd) }}>{fund.return_rate_ytd}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: getValueColor(fund.return_rate_itd) }}>{fund.return_rate_itd}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
};

export const InvestorReportTemplate: React.FC<InvestorReportTemplateProps> = ({ investor }) => {
  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%", fontFamily: "'Montserrat', Arial, sans-serif" }}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: "24px 12px" }}>
            <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "600px", maxWidth: "100%" }}>
              <tbody>
                {/* Brand Header */}
                <tr>
                  <td style={{ backgroundColor: "#edf0fe", padding: "20px 24px", borderRadius: "10px 10px 0 0" }}>
                    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                      <tbody>
                        <tr>
                          <td valign="middle">
                            <img src={LOGO_URL} alt="Indigo Logo" height="24" style={{ display: "block", border: 0, height: "24px", width: "auto" }} />
                          </td>
                          <td valign="middle" align="right">
                            <h1 style={{ margin: 0, fontSize: "22px", lineHeight: 1.2, color: "#0f172a", fontWeight: 700 }}>Monthly Report</h1>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Investor Header */}
                <tr>
                  <td style={{ backgroundColor: "#f8fafc", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "20px 24px" }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600, color: "#334155" }}>Investor: {investor.name}</p>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "#64748b" }}>
                      Investor Statement for the Period Ended: <strong>{investor.reportDate}</strong>
                    </p>
                  </td>
                </tr>

                {/* Main Content Area */}
                <tr>
                  <td style={{ padding: "24px", backgroundColor: "#f8fafc", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: 0 }}>
                    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                      <tbody>
                        {investor.funds.map((fund, index) => (
                          <React.Fragment key={fund.name}>
                            {index > 0 && (
                              <tr>
                                <td style={{ height: "16px" }}></td>
                              </tr>
                            )}
                            <FundBlock fund={fund} />
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Spacer */}
                <tr>
                  <td style={{ height: "24px" }}></td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ padding: "0 24px" }}>
                    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: "center", paddingBottom: "16px" }}>
                            <a href="https://linkedin.com" style={{ display: "inline-block", marginRight: "12px" }}>
                              <img src={SOCIAL_ICONS.linkedin} alt="LinkedIn" width="24" height="24" style={{ border: 0 }} />
                            </a>
                            <a href="https://instagram.com" style={{ display: "inline-block", marginRight: "12px" }}>
                              <img src={SOCIAL_ICONS.instagram} alt="Instagram" width="24" height="24" style={{ border: 0 }} />
                            </a>
                            <a href="https://twitter.com" style={{ display: "inline-block" }}>
                              <img src={SOCIAL_ICONS.twitter} alt="Twitter" width="24" height="24" style={{ border: 0 }} />
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                            <p style={{ margin: "0 0 8px 0" }}>
                              This report is confidential and intended solely for the named recipient.
                            </p>
                            <p style={{ margin: 0 }}>
                              © {new Date().getFullYear()} Indigo Fund. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

/**
 * Renders the InvestorReportTemplate to an HTML string for email sending
 * Uses the exact HTML template structure with bgcolor fallbacks for email compatibility
 */
export function renderReportToHtml(investor: InvestorData): string {
  const fundBlocksHtml = investor.funds.map((fund, index) => {
    const iconUrl = FUND_ICONS[fund.name] || FUND_ICONS["USDC YIELD FUND"];
    // Spacer is exactly 16px as per template requirement
    const spacer = index > 0 ? '<tr><td style="height:16px;"></td></tr>' : '';
    
    return `${spacer}
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;" bgcolor="#ffffff">
                      <tr>
                        <td style="padding:16px 20px;background-color:#ffffff;" bgcolor="#ffffff">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="36" valign="middle">
                                <img src="${iconUrl}" alt="${fund.name}" width="28" height="28" style="display:block;border:0;">
                              </td>
                              <td valign="middle" style="padding-left:12px;">
                                <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fund.name}</h2>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px 20px 20px;background-color:#ffffff;" bgcolor="#ffffff">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;" class="mobile-table">
                            <tr style="background-color:#0f172a;">
                              <th scope="col" style="padding:10px 8px;text-align:left;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a" class="mobile-header">Capital Account Summary</th>
                              <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a" class="mobile-header">MTD (${fund.currency})</th>
                              <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a" class="mobile-header">QTD (${fund.currency})</th>
                              <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a" class="mobile-header">YTD (${fund.currency})</th>
                              <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a" class="mobile-header">ITD (${fund.currency})</th>
                            </tr>
                            <tr style="background-color:#f8fafc;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">Beginning Balance</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.begin_balance_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.begin_balance_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.begin_balance_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.begin_balance_itd}</td>
                            </tr>
                            <tr style="background-color:#ffffff;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">Additions</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.additions_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.additions_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.additions_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.additions_itd}</td>
                            </tr>
                            <tr style="background-color:#f8fafc;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">Redemptions</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.redemptions_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.redemptions_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.redemptions_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.redemptions_itd}</td>
                            </tr>
                            <tr style="background-color:#ffffff;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">Net Income</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.net_income_mtd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.net_income_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.net_income_qtd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.net_income_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.net_income_ytd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.net_income_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.net_income_itd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.net_income_itd}</td>
                            </tr>
                            <tr style="background-color:#f8fafc;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;font-weight:600;border-top:1px solid #e2e8f0;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">Ending Balance</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;border-top:1px solid #e2e8f0;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.ending_balance_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;border-top:1px solid #e2e8f0;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.ending_balance_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;border-top:1px solid #e2e8f0;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.ending_balance_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;border-top:1px solid #e2e8f0;background-color:#f8fafc;" bgcolor="#f8fafc" class="mobile-cell">${fund.ending_balance_itd}</td>
                            </tr>
                            <tr style="background-color:#ffffff;">
                              <td style="padding:10px 8px;font-size:13px;color:#334155;font-weight:600;background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">Rate of Return</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.return_rate_mtd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.return_rate_mtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.return_rate_qtd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.return_rate_qtd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.return_rate_ytd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.return_rate_ytd}</td>
                              <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(fund.return_rate_itd)};background-color:#ffffff;" bgcolor="#ffffff" class="mobile-cell">${fund.return_rate_itd}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
  }).join('\n');

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
<body style="margin:0;padding:0;width:100%;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;" bgcolor="#f1f5f9">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="sm-w-full" style="max-width:600px;width:100%;background-color:#ffffff;" bgcolor="#ffffff">

          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe;padding:20px 24px;border-radius:10px 10px 0 0;" bgcolor="#edf0fe">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="Indigo Logo" height="28" class="mobile-logo" style="display:block;border:0;height:28px;width:auto;">
                  </td>
                  <td valign="middle" align="right">
                    <h1 style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;" class="mobile-h1">Monthly Report</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Investor Header -->
          <tr>
            <td style="background-color:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:20px 24px;" bgcolor="#f8fafc">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#334155;">Investor: ${investor.name}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>${investor.reportDate}</strong></p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding:24px;background-color:#f8fafc;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0;" bgcolor="#f8fafc">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${fundBlocksHtml}
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:24px 0;background-color:#ffffff;" bgcolor="#ffffff">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;" class="mobile-footer-text">
                This document is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.
              </p>
            </td>
          </tr>

          <!-- Social Icons -->
          <tr>
            <td align="center" style="padding-bottom:16px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 10px;">
                    <a href="https://linkedin.com" style="display:block;">
                      <img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="display:block;border:0;">
                    </a>
                  </td>
                  <td style="padding:0 10px;">
                    <a href="https://instagram.com" style="display:block;">
                      <img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="display:block;border:0;">
                    </a>
                  </td>
                  <td style="padding:0 10px;">
                    <a href="https://twitter.com" style="display:block;">
                      <img src="${SOCIAL_ICONS.twitter}" alt="X" width="24" height="24" style="display:block;border:0;">
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Copyright & Unsubscribe -->
          <tr>
            <td align="center" style="padding-bottom:24px;background-color:#ffffff;" bgcolor="#ffffff">
              <p style="margin:0 0 8px 0;font-size:12px;color:#94a3b8;" class="mobile-footer-text">© 2025 Indigo Fund. All rights reserved.</p>
              <p style="margin:0;font-size:12px;" class="mobile-footer-text">
                <a href="#" style="color:#6366f1;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default InvestorReportTemplate;
