// src/lib/report-generator.ts
import { supabase } from "@/integrations/supabase/client";

interface FundData {
  fundName: string;
  currencyName: string;
  data: {
    [key: string]: string;
  };
}

interface InvestorData {
  investorName: string;
  reportDate: string;
  funds: FundData[];
}

const fundIconMap: { [key: string]: string } = {
  "BTC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  "ETH YIELD FUND": "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "USDC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "USDT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND": "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
};

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

export async function generateReportForInvestor(investorId: string, reportMonth: string): Promise<string> {
  const { data: investor, error: investorError } = await supabase
    .from("investors")
    .select("*, profile:profiles(*)")
    .eq("id", investorId)
    .single();

  if (investorError) throw investorError;

  const { data: reports, error: reportsError } = await supabase
    .from("investor_monthly_reports")
    .select("*")
    .eq("investor_id", investorId)
    .eq("report_month", reportMonth);

  if (reportsError) throw reportsError;

  const investorData: InvestorData = {
    investorName: `${investor.profile.first_name} ${investor.profile.last_name}`,
    reportDate: new Date(reportMonth).toLocaleDateString("en-US", { month: 'long', year: 'numeric' }),
    funds: reports.map(report => ({
      fundName: report.asset_code + " YIELD FUND", // This is an assumption
      currencyName: report.asset_code,
      data: {
        begin_balance_mtd: report.opening_balance,
        begin_balance_qtd: report.opening_balance, // Placeholder
        begin_balance_ytd: report.opening_balance, // Placeholder
        begin_balance_itd: report.opening_balance, // Placeholder
        additions_mtd: report.additions,
        additions_qtd: report.additions, // Placeholder
        additions_ytd: report.additions, // Placeholder
        additions_itd: report.additions, // Placeholder
        redemptions_mtd: report.withdrawals,
        redemptions_qtd: report.withdrawals, // Placeholder
        redemptions_ytd: report.withdrawals, // Placeholder
        redemptions_itd: report.withdrawals, // Placeholder
        net_income_mtd: report.yield_earned,
        net_income_qtd: report.yield_earned, // Placeholder
        net_income_ytd: report.yield_earned, // Placeholder
        net_income_itd: report.yield_earned, // Placeholder
        ending_balance_mtd: report.closing_balance,
        ending_balance_qtd: report.closing_balance, // Placeholder
        ending_balance_ytd: report.closing_balance, // Placeholder
        ending_balance_itd: report.closing_balance, // Placeholder
        return_rate_mtd: ((report.yield_earned / report.opening_balance) * 100).toFixed(2) + "%",
        return_rate_qtd: "0.00%", // Placeholder
        return_rate_ytd: "0.00%", // Placeholder
        return_rate_itd: "0.00%", // Placeholder
      }
    })),
  };

  let finalFundBlocks = "";
  const fundBlockTemplate = masterHtmlTemplate.substring(
    masterHtmlTemplate.indexOf("<!-- START : DYNAMIC FUND BLOCK TEMPLATE -->"),
    masterHtmlTemplate.indexOf("<!-- END : DYNAMIC FUND BLOCK TEMPLATE -->") + "<!-- END : DYNAMIC FUND BLOCK TEMPLATE -->".length
  );

  for (const fund of investorData.funds) {
    if (finalFundBlocks !== "") {
      finalFundBlocks += '<tr><td style="height:16px;"></td></tr>';
    }

    let fundBlock = fundBlockTemplate;
    fundBlock = fundBlock.replace("[FUND_ICON_URL]", fundIconMap[fund.fundName] || "");
    fundBlock = fundBlock.replace(/\[FUND_NAME\]/g, fund.fundName);
    fundBlock = fundBlock.replace(/\[CURRENCY_NAME\]/g, fund.currencyName);

    for (const key in fund.data) {
      fundBlock = fundBlock.replace(`[${key.toUpperCase()}]`, fund.data[key]);
      if (key.includes("net_income") || key.includes("return_rate")) {
        fundBlock = fundBlock.replace(`[${key.toUpperCase()}_COLOR]`, getColor(fund.data[key]));
      }
    }
    finalFundBlocks += fundBlock;
  }

  let reportHtml = masterHtmlTemplate.replace("[INVESTOR_NAME]", investorData.investorName);
  reportHtml = reportHtml.replace("[REPORT_DATE]", investorData.reportDate);
  reportHtml = reportHtml.replace(fundBlockTemplate, finalFundBlocks);
  
  return reportHtml;
}
