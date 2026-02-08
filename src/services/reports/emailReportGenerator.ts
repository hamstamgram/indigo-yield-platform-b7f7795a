import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/logger";
import { FUND_ICONS, FUND_NAME_BY_ASSET } from "@/types/domains/report";

interface InvestorReportData {
  investorId: string;
  investorName: string;
  email: string; // Legacy: primary email for backward compatibility
  emails: Array<{
    email: string;
    isPrimary: boolean;
    verified: boolean;
  }>; // All emails for the investor
  reportMonth: string; // YYYY-MM format
  positions: Array<{
    fundName: string;
    currencyName: string;
    openingBalance: number;
    additions: number;
    withdrawals: number;
    yield: number;
    closingBalance: number;
    rateOfReturn: number;
  }>;
}

/**
 * Normalize data for display (convert negative numbers to parentheses format)
 */
function normalizeNumber(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Get color for rate of return (green for positive, red for negative)
 */
function getReturnColor(rateOfReturn: number): string {
  return rateOfReturn >= 0 ? "#16a34a" : "#dc2626";
}

/**
 * Get fund icon URL from centralized CDN map
 */
function getFundIcon(fundName: string): string {
  // Direct lookup by fund display name
  if (FUND_ICONS[fundName]) return FUND_ICONS[fundName];
  // Normalize to uppercase for lookup
  const upper = fundName.toUpperCase();
  if (FUND_ICONS[upper]) return FUND_ICONS[upper];
  // Fallback to BTC icon
  return FUND_ICONS["BTC YIELD FUND"];
}

/**
 * Generate a single fund block HTML
 */
function generateFundBlock(position: InvestorReportData["positions"][0]): string {
  const returnColor = getReturnColor(position.rateOfReturn);
  const fundIcon = getFundIcon(position.fundName);

  return `
    <tr>
      <td style="padding: 24px 0; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 16px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px;">
                    <img src="${fundIcon}" alt="${position.fundName}" style="width: 48px; height: 48px; border-radius: 8px; display: block;" />
                  </td>
                  <td>
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">${position.fundName}</div>
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 0;">${position.currencyName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Opening Balance</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${normalizeNumber(position.openingBalance)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Additions</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${normalizeNumber(position.additions)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Withdrawals</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${normalizeNumber(position.withdrawals)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Yield Generated</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: ${returnColor};">${normalizeNumber(position.yield)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">Closing Balance</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #111827;">${normalizeNumber(position.closingBalance)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Rate of Return</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 700; color: ${returnColor};">${position.rateOfReturn.toFixed(2)}%</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate complete HTML email report
 */
export function generateInvestorReport(data: InvestorReportData): string {
  const reportDate = new Date(data.reportMonth + "-01").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const fundBlocks = data.positions.map(generateFundBlock).join("\n");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Investment Report - ${reportDate}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Montserrat', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content-padding {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="https://storage.mlcdn.com/account_image/855106/VpM1KYxEPvOaeLNp7IkP6K0xfOMSx6VmPaGM6vu7.png" alt="Indigo Yield" style="height: 40px; display: block;" />
                  </td>
                  <td align="right">
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 0;">${reportDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px;">
              <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Dear ${data.investorName},</h1>
              <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">Here is your monthly investment report for ${reportDate}.</p>
            </td>
          </tr>

          <!-- Fund Blocks -->
          <tr>
            <td class="content-padding" style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${fundBlocks}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
                      Thank you for trusting us with your investments. If you have any questions or need assistance, please don't hesitate to reach out to our team.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="https://twitter.com/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/ynQCiRhVa69hFdZz7wjBbKPlNaOPYQpZ8zBqzAJc.png" alt="Twitter" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                        <td style="padding-right: 12px;">
                          <a href="https://linkedin.com/company/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/aXU7WPG09xNjxKv9R9sWo0K5fU00FrG9pC37H2Lz.png" alt="LinkedIn" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                        <td>
                          <a href="https://instagram.com/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/pOPJaKxGjuVs2k9Oixh9CkxPGKDjsqDMXDPb4Wyu.png" alt="Instagram" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
                      © ${new Date().getFullYear()} Indigo Yield. All rights reserved.
                    </p>
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
</html>
  `.trim();
}

/**
 * Fetch investor report data from database
 */
export async function fetchInvestorReportData(
  investorId: string,
  reportMonth: string // YYYY-MM format
): Promise<InvestorReportData | null> {
  try {
    // 1. Fetch Investor Profile (Unified ID)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", investorId)
      .maybeSingle();

    if (profileError) {
      logError("emailReportGenerator.fetchInvestorReportData", profileError, { investorId });
      return null;
    }
    if (!profile) {
      logWarn("emailReportGenerator.fetchInvestorReportData", {
        reason: "profile not found",
        investorId,
      });
      return null;
    }

    const investorName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Valued Investor";

    // 2. Fetch Emails (using relinked investor_emails table)
    const { data: emailRecords } = await supabase
      .from("investor_emails")
      .select("email, is_primary, verified")
      .eq("investor_id", investorId)
      .order("is_primary", { ascending: false });

    const emails = (emailRecords || []).map((e) => ({
      email: e.email,
      isPrimary: e.is_primary,
      verified: e.verified,
    }));

    if (emails.length === 0 && profile.email) {
      emails.push({
        email: profile.email,
        isPrimary: true,
        verified: true, // Auth email is verified
      });
    }

    // 3. Resolve Report Period
    const [yearStr, monthStr] = reportMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const { data: period } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (!period) {
      logWarn("emailReportGenerator.fetchInvestorReportData", {
        reason: "no statement period",
        reportMonth,
      });
      return null;
    }

    // 4. Fetch Performance Data (V2 Source of Truth)
    const { data: performanceData, error: perfError } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("period_id", period.id)
      .eq("investor_id", investorId);

    if (perfError) {
      logError("emailReportGenerator.fetchInvestorReportData", perfError, {
        investorId,
        reportMonth,
      });
      return null;
    }

    if (!performanceData || performanceData.length === 0) {
      logWarn("emailReportGenerator.fetchInvestorReportData", {
        reason: "no performance data",
        investorId,
        reportMonth,
      });
      return null;
    }

    const primaryEmail = emails.find((e) => e.isPrimary)?.email || profile.email || "";

    // 5. Transform Data
    const reportData: InvestorReportData = {
      investorId: profile.id,
      investorName,
      email: primaryEmail,
      emails,
      reportMonth,
      positions: performanceData.map((rec) => {
        // Map Asset Code to Display Name
        let fundName = rec.fund_name || "Unknown Fund";
        const assetCode = rec.fund_name; // Assuming fund_name holds 'BTC', 'ETH' etc.

        // Branding Logic - use centralized map for all assets
        const mappedName =
          FUND_NAME_BY_ASSET[assetCode] || FUND_NAME_BY_ASSET[assetCode?.toUpperCase()];
        if (mappedName) fundName = mappedName;

        return {
          fundName,
          currencyName: assetCode || "Unknown",
          openingBalance: Number(rec.mtd_beginning_balance || 0),
          additions: Number(rec.mtd_additions || 0),
          withdrawals: Number(rec.mtd_redemptions || 0),
          yield: Number(rec.mtd_net_income || 0),
          closingBalance: Number(rec.mtd_ending_balance || 0),
          rateOfReturn: Number(rec.mtd_rate_of_return || 0),
        };
      }),
    };

    return reportData;
  } catch (error) {
    logError("emailReportGenerator.fetchInvestorReportData", error, { investorId, reportMonth });
    return null;
  }
}

/**
 * Generate report for a single investor
 */
export async function generateReportForInvestor(
  investorId: string,
  reportMonth: string
): Promise<{ html: string; data: InvestorReportData } | null> {
  const data = await fetchInvestorReportData(investorId, reportMonth);

  if (!data) {
    return null;
  }

  const html = generateInvestorReport(data);

  return { html, data };
}

/**
 * Generate reports for all investors for a given month
 */
export async function generateReportsForAllInvestors(
  reportMonth: string
): Promise<Array<{ html: string; data: InvestorReportData }>> {
  try {
    // Fetch all active investors (from PROFILES)
    const { data: investors, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .eq("is_admin", false);

    if (error || !investors) {
      logError("emailReportGenerator.generateReportsForAllInvestors", error, { reportMonth });
      return [];
    }

    // Generate reports for each investor
    const reports = await Promise.all(
      investors.map(async (investor) => {
        const report = await generateReportForInvestor(investor.id, reportMonth);
        return report;
      })
    );

    // Filter out null results
    return reports.filter(
      (report): report is { html: string; data: InvestorReportData } => report !== null
    );
  } catch (error) {
    logError("emailReportGenerator.generateReportsForAllInvestors", error, { reportMonth });
    return [];
  }
}

/**
 * Get all recipient emails for an investor
 * Returns verified emails + primary email (even if not verified)
 */
export function getRecipientEmails(reportData: InvestorReportData): string[] {
  const recipients = new Set<string>();

  reportData.emails.forEach((emailObj) => {
    // Include verified emails
    if (emailObj.verified) {
      recipients.add(emailObj.email);
    }
    // Always include primary email (even if not verified yet)
    if (emailObj.isPrimary) {
      recipients.add(emailObj.email);
    }
  });

  // Fallback to legacy email if no emails found
  if (recipients.size === 0 && reportData.email) {
    recipients.add(reportData.email);
  }

  return Array.from(recipients);
}
