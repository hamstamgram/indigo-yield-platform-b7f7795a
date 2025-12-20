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
                              © {new Date().getFullYear()} Indigo Yield. All rights reserved.
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
 */
export function renderReportToHtml(investor: InvestorData): string {
  const fundBlocksHtml = investor.funds.map((fund, index) => {
    const iconUrl = FUND_ICONS[fund.name] || FUND_ICONS["USDC YIELD FUND"];
    const spacer = index > 0 ? '<tr><td style="height:16px;"></td></tr>' : '';
    
    return `${spacer}
    <tr>
      <td style="background-color:#ffffff;border-radius:10px;padding:20px;border:1px solid #e2e8f0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:40px;" valign="middle">
              <img src="${iconUrl}" alt="${fund.name}" width="32" style="border:0;max-width:100%;" />
            </td>
            <td valign="middle" style="padding-left:12px;">
              <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fund.name}</h2>
            </td>
          </tr>
        </table>
        
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <th scope="col" style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Capital Account Summary</th>
            <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">MTD (${fund.currency})</th>
            <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">QTD (${fund.currency})</th>
            <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">YTD (${fund.currency})</th>
            <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">ITD (${fund.currency})</th>
          </tr>
          <tr>
            <td style="padding:8px;font-size:14px;color:#334155;">Beginning Balance</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.begin_balance_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.begin_balance_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.begin_balance_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.begin_balance_itd}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-size:14px;color:#334155;">Additions</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.additions_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.additions_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.additions_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.additions_itd}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-size:14px;color:#334155;">Redemptions</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.redemptions_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.redemptions_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.redemptions_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;">${fund.redemptions_itd}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-size:14px;color:#334155;">Net Income</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.net_income_mtd)};">${fund.net_income_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.net_income_qtd)};">${fund.net_income_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.net_income_ytd)};">${fund.net_income_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.net_income_itd)};">${fund.net_income_itd}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:8px;font-size:14px;color:#334155;font-weight:600;">Ending Balance</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">${fund.ending_balance_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">${fund.ending_balance_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">${fund.ending_balance_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">${fund.ending_balance_itd}</td>
          </tr>
          <tr style="background-color:#f8fafc;">
            <td style="padding:8px;font-size:14px;color:#334155;font-weight:600;">Rate of Return</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.return_rate_mtd)};">${fund.return_rate_mtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.return_rate_qtd)};">${fund.return_rate_qtd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.return_rate_ytd)};">${fund.return_rate_ytd}</td>
            <td style="padding:8px;text-align:right;font-size:14px;font-weight:700;color:${getValueColor(fund.return_rate_itd)};">${fund.return_rate_itd}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Montserrat',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe;padding:20px 24px;border-radius:10px 10px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="Indigo Logo" height="24" style="display:block;border:0;height:24px;width:auto;" />
                  </td>
                  <td valign="middle" align="right">
                    <h1 style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;">Monthly Report</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Investor Header -->
          <tr>
            <td style="background-color:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:20px 24px;">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#334155;">Investor: ${investor.name}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Investor Statement for the Period Ended: <strong>${investor.reportDate}</strong></p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding:24px;background-color:#f8fafc;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${fundBlocksHtml}
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="text-align:center;padding-bottom:16px;">
                    <a href="https://linkedin.com" style="display:inline-block;margin-right:12px;">
                      <img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="border:0;" />
                    </a>
                    <a href="https://instagram.com" style="display:inline-block;margin-right:12px;">
                      <img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="border:0;" />
                    </a>
                    <a href="https://twitter.com" style="display:inline-block;">
                      <img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="24" height="24" style="border:0;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;font-size:12px;color:#64748b;line-height:1.5;">
                    <p style="margin:0 0 8px 0;">This report is confidential and intended solely for the named recipient.</p>
                    <p style="margin:0;">© ${new Date().getFullYear()} Indigo Yield. All rights reserved.</p>
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

export default InvestorReportTemplate;
