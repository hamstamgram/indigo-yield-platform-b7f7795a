import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STATEMENT_TEMPLATE, SUPPORTED_ASSETS, generateFundSectionHtml } from "../_shared/statement-template.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper to format numbers with commas and decimals
const formatNum = (num: number, decimals: number = 4): string => {
  if (num === 0) return "-";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Helper to format with color styling for positive/negative values
const formatWithStyle = (num: number, decimals: number = 4, isPercent: boolean = false): string => {
  if (num === 0) return "-";
  
  const formatted = isPercent 
    ? `${num >= 0 ? "" : ""}${num.toFixed(2)}%`
    : `${num >= 0 ? "+" : ""}${formatNum(num, decimals)}`;
  
  const color = num >= 0 ? "#16a34a" : "#ef4444";
  return `<span style="color:${color}">${formatted}</span>`;
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

    const body = await req.json();
    const { investor_id, report_date } = body;

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

    console.log(`Generating statement for Investor ${investor_id} for period ending ${mtdEnd.toISOString()}`);

    // 2. Fetch Investor Details from profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", investor_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Investor profile not found");
    }

    const investorName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.email || "Valued Investor";
    
    const investorEmail = profile.email || "";

    // 3. Fetch Monthly Reports
    const { data: reports, error: reportsError } = await supabaseClient
      .from("investor_monthly_reports")
      .select("*")
      .eq("investor_id", investor_id)
      .lte("report_month", mtdEnd.toISOString());

    if (reportsError) {
      console.error("Reports fetch error:", reportsError);
    }

    // 4. Also fetch from investor_fund_performance for more complete data
    const { data: fundPerformance } = await supabaseClient
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", investor_id);

    // 5. Aggregation Logic - find which assets this investor has
    const investorAssets = new Set<string>();
    
    if (reports && reports.length > 0) {
      reports.forEach(r => {
        if (r.asset_code) investorAssets.add(r.asset_code);
      });
    }
    
    if (fundPerformance && fundPerformance.length > 0) {
      fundPerformance.forEach(fp => {
        // Extract asset from fund_name (e.g., "BTC YIELD FUND" -> "BTC")
        const asset = fp.fund_name?.split(" ")[0];
        if (asset && SUPPORTED_ASSETS.includes(asset)) {
          investorAssets.add(asset);
        }
      });
    }

    // If no assets found, include all supported assets with zero values
    const assetsToShow = investorAssets.size > 0 
      ? Array.from(investorAssets).filter(a => SUPPORTED_ASSETS.includes(a))
      : SUPPORTED_ASSETS;

    const templateData: Record<string, string> = {
      INVESTOR_NAME: investorName,
      INVESTOR_EMAIL: investorEmail,
      PERIOD_END_DATE: mtdEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    };

    // Generate fund sections HTML
    let fundSectionsHtml = "";

    assetsToShow.forEach((asset) => {
      // Filter reports for this asset
      const assetReports = (reports || [])
        .filter((r) => r.asset_code === asset)
        .sort((a, b) => new Date(a.report_month).getTime() - new Date(b.report_month).getTime());

      // Check fund performance data
      const assetPerformance = (fundPerformance || []).find(fp => 
        fp.fund_name?.toUpperCase().startsWith(asset)
      );

      // Define Aggregation Helper
      const aggregate = (startDate: Date, endDate: Date) => {
        const periodReports = assetReports.filter((r) => {
          const d = new Date(r.report_month);
          return d >= startDate && d <= endDate;
        });

        if (periodReports.length === 0 && !assetPerformance) {
          return { begin: 0, add: 0, redeem: 0, income: 0, end: 0, rate: 0 };
        }

        if (periodReports.length > 0) {
          const begin = Number(periodReports[0].opening_balance) || 0;
          const end = Number(periodReports[periodReports.length - 1].closing_balance) || 0;
          const add = periodReports.reduce((sum, r) => sum + (Number(r.additions) || 0), 0);
          const redeem = periodReports.reduce((sum, r) => sum + (Number(r.withdrawals) || 0), 0);
          const income = periodReports.reduce((sum, r) => sum + (Number(r.yield_earned) || 0), 0);

          const netFlows = add - redeem;
          const denominator = begin + netFlows / 2;
          let rate = 0;
          if (denominator !== 0) {
            rate = (income / denominator) * 100;
          }

          return { begin, add, redeem, income, end, rate };
        }

        return { begin: 0, add: 0, redeem: 0, income: 0, end: 0, rate: 0 };
      };

      // Use fund performance data if available
      const getFromPerformance = (prefix: string) => {
        if (!assetPerformance) return { begin: 0, add: 0, redeem: 0, income: 0, end: 0, rate: 0 };
        return {
          begin: Number(assetPerformance[`${prefix}_beginning_balance`]) || 0,
          add: Number(assetPerformance[`${prefix}_additions`]) || 0,
          redeem: Number(assetPerformance[`${prefix}_redemptions`]) || 0,
          income: Number(assetPerformance[`${prefix}_net_income`]) || 0,
          end: Number(assetPerformance[`${prefix}_ending_balance`]) || 0,
          rate: Number(assetPerformance[`${prefix}_rate_of_return`]) || 0,
        };
      };

      // Calculate Metrics for each Period
      let mtd = aggregate(mtdStart, mtdEnd);
      let qtd = aggregate(qtdStart, mtdEnd);
      let ytd = aggregate(ytdStart, mtdEnd);
      let itd = aggregate(new Date("2000-01-01"), mtdEnd);

      // Override with fund performance data if available
      if (assetPerformance) {
        mtd = getFromPerformance("mtd");
        qtd = getFromPerformance("qtd");
        ytd = getFromPerformance("ytd");
        itd = getFromPerformance("itd");
      }

      // Map to Template Keys
      const mapKeys = (periodName: string, data: typeof mtd) => {
        templateData[`${asset}_BEGIN_${periodName}`] = formatNum(data.begin);
        templateData[`${asset}_ADD_${periodName}`] = formatNum(data.add);
        templateData[`${asset}_REDEEM_${periodName}`] = formatNum(data.redeem);
        templateData[`${asset}_INCOME_${periodName}`] = formatNum(data.income);
        templateData[`${asset}_INCOME_${periodName}_STYLED`] = formatWithStyle(data.income);
        templateData[`${asset}_END_${periodName}`] = formatNum(data.end);
        templateData[`${asset}_RATE_${periodName}`] = formatNum(data.rate, 2);
        templateData[`${asset}_RATE_${periodName}_STYLED`] = formatWithStyle(data.rate, 2, true);
      };

      mapKeys("MTD", mtd);
      mapKeys("QTD", qtd);
      mapKeys("YTD", ytd);
      mapKeys("ITD", itd);

      // Add fund section HTML
      fundSectionsHtml += generateFundSectionHtml(asset);
    });

    // 6. Inject into Template
    let htmlContent = STATEMENT_TEMPLATE.replace("{{FUND_SECTIONS}}", fundSectionsHtml);
    
    Object.entries(templateData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlContent = htmlContent.replace(regex, value);
    });

    // 7. Return HTML
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        investorName,
        investorEmail,
        assetsIncluded: assetsToShow,
        message: "Statement generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating statement:", errorMessage);
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
