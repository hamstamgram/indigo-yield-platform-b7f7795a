import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STATEMENT_TEMPLATE } from "./template.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { monthlyStatementRequestSchema, parseAndValidate } from "../_shared/validation.ts";

// Helper to format numbers with commas and decimals
const formatNum = (num: number, decimals: number = 4) => {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate request body
    const validation = await parseAndValidate(req, monthlyStatementRequestSchema, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }

    const { investor_id, report_date } = validation.data;

    if (!investor_id || !report_date) {
      throw new Error("Missing investor_id or report_date");
    }

    // 1. Calculate Dates
    const currentDate = new Date(report_date);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based

    // Period definitions
    const mtdStart = new Date(currentYear, currentMonth, 1);
    const mtdEnd = new Date(currentYear, currentMonth + 1, 0); // End of current month

    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const qtdStart = new Date(currentYear, quarterStartMonth, 1);

    const ytdStart = new Date(currentYear, 0, 1);

    // ITD Start is handled by query (all records <= current date)

    console.log(
      `Generating statement for Investor ${investor_id} for period ending ${mtdEnd.toISOString()}`
    );

    // 2. Fetch Investor Details
    const { data: investor } = await supabaseClient
      .from("investors")
      .select("*, profiles(first_name, last_name, email)")
      .eq("id", investor_id)
      .single();

    if (!investor) throw new Error("Investor not found");

    const investorName = investor.profiles
      ? `${investor.profiles.first_name} ${investor.profiles.last_name}`
      : "Valued Investor";

    // 3. Fetch Monthly Reports
    // Fetch ALL reports up to the report date to calculate ITD and other aggs
    const { data: reports } = await supabaseClient
      .from("investor_monthly_reports")
      .select("*")
      .eq("investor_id", investor_id)
      .lte("report_month", mtdEnd.toISOString());

    if (!reports) throw new Error("No reports found");

    // 4. Aggregation Logic
    const assets = ["BTC", "ETH", "USDT"]; // Assets supported by template
    const templateData: Record<string, string> = {
      INVESTOR_NAME: investorName,
      PERIOD_END_DATE: mtdEnd.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };

    assets.forEach((asset) => {
      // Filter reports for this asset
      const assetReports = reports
        .filter((r) => r.asset_code === asset)
        .sort((a, b) => new Date(a.report_month).getTime() - new Date(b.report_month).getTime());

      // Define Aggregation Helper
      const aggregate = (startDate: Date, endDate: Date) => {
        const periodReports = assetReports.filter((r) => {
          const d = new Date(r.report_month);
          return d >= startDate && d <= endDate;
        });

        if (periodReports.length === 0) {
          return { begin: 0, add: 0, redeem: 0, income: 0, end: 0, rate: 0 };
        }

        const begin = Number(periodReports[0].opening_balance) || 0;
        const end = Number(periodReports[periodReports.length - 1].closing_balance) || 0;
        const add = periodReports.reduce((sum, r) => sum + (Number(r.additions) || 0), 0);
        const redeem = periodReports.reduce((sum, r) => sum + (Number(r.withdrawals) || 0), 0);
        const income = periodReports.reduce((sum, r) => sum + (Number(r.yield_earned) || 0), 0);

        // Rate of Return Calculation (Simplified Modified Dietz)
        // Return = Net Income / (Start + NetFlows/2)
        // Where NetFlows = Additions - Redemptions
        const netFlows = add - redeem;
        const denominator = begin + netFlows / 2;

        let rate = 0;
        if (denominator !== 0) {
          rate = (income / denominator) * 100;
        }

        return { begin, add, redeem, income, end, rate };
      };

      // Calculate Metrics for each Period
      const mtd = aggregate(mtdStart, mtdEnd);
      const qtd = aggregate(qtdStart, mtdEnd);
      const ytd = aggregate(ytdStart, mtdEnd);
      const itd = aggregate(new Date("2000-01-01"), mtdEnd); // All time

      // Map to Template Keys (e.g. BTC_BEGIN_MTD)
      const mapKeys = (periodName: string, data: any) => {
        templateData[`${asset}_BEGIN_${periodName}`] = formatNum(data.begin);
        templateData[`${asset}_ADD_${periodName}`] = formatNum(data.add);
        templateData[`${asset}_REDEEM_${periodName}`] = formatNum(data.redeem);
        templateData[`${asset}_INCOME_${periodName}`] = formatNum(data.income);
        templateData[`${asset}_END_${periodName}`] = formatNum(data.end);
        templateData[`${asset}_RATE_${periodName}`] = formatNum(data.rate, 2); // 2 decimals for %
      };

      mapKeys("MTD", mtd);
      mapKeys("QTD", qtd);
      mapKeys("YTD", ytd);
      mapKeys("ITD", itd);
    });

    // 5. Inject into Template
    let htmlContent = STATEMENT_TEMPLATE;
    Object.entries(templateData).forEach(([key, value]) => {
      // Global replace using Regex
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlContent = htmlContent.replace(regex, value);
    });

    // 6. Return HTML (Client can print)
    // In a full "180 IQ" automation, we would now send this HTML to a PDF API.
    // For now, returning the JSON with the HTML string allows the frontend to render/print or the next step to pipeline it.

    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        message: "Statement generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
