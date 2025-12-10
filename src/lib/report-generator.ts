// src/lib/report-generator.ts
import { supabase } from "@/integrations/supabase/client";
import { getAssetLogo, getAssetName } from "@/utils/assets"; // Import utilities

interface FundData {
  fundName: string;
  currencyName: string;
  data: {
    [key: string]: string | number;
  };
}

interface InvestorData {
  investorName: string;
  reportDate: string;
  funds: FundData[];
}

const masterHtmlTemplate = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
...
</html>`; // The full HTML template is omitted for brevity

function getColor(value: string): string {
  if (value.startsWith("-") || value.startsWith("(")) {
    return "#dc2626"; // Red
  }
  return "#16a34a"; // Green
}

export async function generateReportForInvestor(
  investorId: string,
  reportMonth: string // YYYY-MM-DD
): Promise<string> {
  // 1. Fetch Investor Profile (Unified ID)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", investorId)
    .single();

  if (profileError || !profile) throw profileError;

  const investorName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  // 2. Resolve Report Period
  const reportDateObj = new Date(reportMonth);
  const year = reportDateObj.getFullYear();
  const month = reportDateObj.getMonth() + 1; // 1-indexed

  const { data: period } = await supabase
    .from("statement_periods")
    .select("id, period_end_date")
    .eq("year", year)
    .eq("month", month)
    .single();

  if (!period) throw new Error(`No statement period found for ${reportMonth}`);

  // 3. Fetch Performance Data (V2 Source of Truth)
  const { data: performanceData, error: perfError } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("user_id", investorId)
    .eq("period_id", period.id);

  if (perfError) throw perfError;

  const investorData: InvestorData = {
    investorName: investorName,
    reportDate: new Date(period.period_end_date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      day: "numeric",
    }),
    funds: performanceData.map((rec: any) => ({
      fundName: rec.fund_name + " YIELD FUND", // Assumed format
      currencyName: rec.fund_name,
      data: {
        begin_balance_mtd: Number(rec.mtd_beginning_balance || 0).toFixed(4),
        begin_balance_qtd: Number(rec.qtd_beginning_balance || 0).toFixed(4),
        begin_balance_ytd: Number(rec.ytd_beginning_balance || 0).toFixed(4),
        begin_balance_itd: Number(rec.itd_beginning_balance || 0).toFixed(4), // Assuming ITD exists

        additions_mtd: Number(rec.mtd_additions || 0).toFixed(4),
        additions_qtd: Number(rec.qtd_additions || 0).toFixed(4),
        additions_ytd: Number(rec.ytd_additions || 0).toFixed(4),
        additions_itd: Number(rec.itd_additions || 0).toFixed(4),

        redemptions_mtd: Number(rec.mtd_redemptions || 0).toFixed(4),
        redemptions_qtd: Number(rec.qtd_redemptions || 0).toFixed(4),
        redemptions_ytd: Number(rec.ytd_redemptions || 0).toFixed(4),
        redemptions_itd: Number(rec.itd_redemptions || 0).toFixed(4),

        net_income_mtd: Number(rec.mtd_net_income || 0).toFixed(4),
        net_income_qtd: Number(rec.qtd_net_income || 0).toFixed(4),
        net_income_ytd: Number(rec.ytd_net_income || 0).toFixed(4),
        net_income_itd: Number(rec.itd_net_income || 0).toFixed(4),

        ending_balance_mtd: Number(rec.mtd_ending_balance || 0).toFixed(4),
        ending_balance_qtd: Number(rec.qtd_ending_balance || 0).toFixed(4),
        ending_balance_ytd: Number(rec.ytd_ending_balance || 0).toFixed(4),
        ending_balance_itd: Number(rec.itd_ending_balance || 0).toFixed(4),

        return_rate_mtd: (Number(rec.mtd_rate_of_return || 0) * 100).toFixed(2) + "%",
        return_rate_qtd: (Number(rec.qtd_rate_of_return || 0) * 100).toFixed(2) + "%",
        return_rate_ytd: (Number(rec.ytd_rate_of_return || 0) * 100).toFixed(2) + "%",
        return_rate_itd: (Number(rec.itd_rate_of_return || 0) * 100).toFixed(2) + "%",
      },
    })),
  };

  let finalFundBlocks = "";
  // Assuming masterHtmlTemplate contains the full template
  // And the placeholders are correctly set up within that template.
  // The fundBlockTemplate needs to be extracted from the masterHtmlTemplate correctly.
  const fundBlockTemplateStart = masterHtmlTemplate.indexOf("<!-- START : DYNAMIC FUND BLOCK TEMPLATE -->");
  const fundBlockTemplateEnd = masterHtmlTemplate.indexOf("<!-- END : DYNAMIC FUND BLOCK TEMPLATE -->") + "<!-- END : DYNAMIC FUND BLOCK TEMPLATE -->".length;
  const fundBlockHtml = masterHtmlTemplate.substring(fundBlockTemplateStart, fundBlockTemplateEnd);


  for (const fund of investorData.funds) {
    if (finalFundBlocks !== "") {
      finalFundBlocks += '<tr><td style="height:16px;"></td></tr>';
    }

    let fundBlock = fundBlockHtml; // Use the extracted template
    fundBlock = fundBlock.replace("[FUND_ICON_URL]", getAssetLogo(fund.currencyName));
    fundBlock = fundBlock.replace(/\[FUND_NAME\]/g, fund.fundName);
    fundBlock = fundBlock.replace(/\[CURRENCY_NAME\]/g, fund.currencyName);

    for (const key in fund.data) {
      // Ensure all placeholders are replaced, handling cases where they might be numbers
      fundBlock = fundBlock.replace(new RegExp(`\\[${key.toUpperCase()}\\]`, 'g'), String(fund.data[key]));
      if (key.includes("net_income") || key.includes("return_rate")) {
        fundBlock = fundBlock.replace(
          new RegExp(`\\[${key.toUpperCase()}_COLOR\\]`, 'g'),
          getColor(String(fund.data[key]))
        );
      }
    }
    finalFundBlocks += fundBlock;
  }

  let reportHtml = masterHtmlTemplate.replace("[INVESTOR_NAME]", investorData.investorName);
  reportHtml = reportHtml.replace("[REPORT_DATE]", investorData.reportDate);
  reportHtml = reportHtml.replace(fundBlockHtml, finalFundBlocks); // Replace the dynamic block
  return reportHtml;
}
