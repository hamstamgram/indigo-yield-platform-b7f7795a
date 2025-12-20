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

    const currentDate = new Date(report_date);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const mtdEnd = new Date(currentYear, currentMonth + 1, 0);

    console.log(`Generating statement for Investor ${investor_id} for period ending ${mtdEnd.toISOString()}`);

    // Fetch Investor Profile
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

    // Fetch from investor_fund_performance (single source of truth)
    // IMPORTANT: Only include 'reporting' purpose for investor-facing statements
    const { data: fundPerformance, error: perfError } = await supabaseClient
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", investor_id)
      .or("purpose.is.null,purpose.eq.reporting"); // Include legacy (null) + reporting only

    if (perfError) {
      console.error("Fund performance fetch error:", perfError);
    }

    console.log(`Found ${fundPerformance?.length || 0} fund performance records`);

    // Determine which assets this investor has
    const investorAssets = new Set<string>();
    
    if (fundPerformance && fundPerformance.length > 0) {
      fundPerformance.forEach(fp => {
        // Extract asset from fund_name (e.g., "BTC YIELD FUND" -> "BTC")
        const asset = fp.fund_name?.split(" ")[0];
        if (asset && SUPPORTED_ASSETS.includes(asset)) {
          investorAssets.add(asset);
        }
      });
    }

    const assetsToShow = investorAssets.size > 0 
      ? Array.from(investorAssets).filter(a => SUPPORTED_ASSETS.includes(a))
      : [];

    if (assetsToShow.length === 0) {
      console.log("No fund positions found for investor");
      throw new Error("No fund positions found for this investor");
    }

    const templateData: Record<string, string> = {
      INVESTOR_NAME: investorName,
      INVESTOR_EMAIL: investorEmail,
      PERIOD_END_DATE: mtdEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    };

    // Generate fund sections HTML
    let fundSectionsHtml = "";

    // Helper to extract metrics from fund performance data
    const getMetrics = (performance: typeof fundPerformance[0] | undefined, prefix: string) => {
      if (!performance) return { begin: 0, add: 0, redeem: 0, income: 0, end: 0, rate: 0 };
      return {
        begin: Number(performance[`${prefix}_beginning_balance`]) || 0,
        add: Number(performance[`${prefix}_additions`]) || 0,
        redeem: Number(performance[`${prefix}_redemptions`]) || 0,
        income: Number(performance[`${prefix}_net_income`]) || 0,
        end: Number(performance[`${prefix}_ending_balance`]) || 0,
        rate: Number(performance[`${prefix}_rate_of_return`]) || 0,
      };
    };

    assetsToShow.forEach((asset) => {
      // Find performance data for this asset
      const assetPerformance = fundPerformance?.find(fp => 
        fp.fund_name?.toUpperCase().startsWith(asset)
      );

      // Get metrics for each period directly from fund_performance
      const mtd = getMetrics(assetPerformance, "mtd");
      const qtd = getMetrics(assetPerformance, "qtd");
      const ytd = getMetrics(assetPerformance, "ytd");
      const itd = getMetrics(assetPerformance, "itd");

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

      fundSectionsHtml += generateFundSectionHtml(asset);
    });

    // Inject into Template
    let htmlContent = STATEMENT_TEMPLATE.replace("{{FUND_SECTIONS}}", fundSectionsHtml);
    
    Object.entries(templateData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlContent = htmlContent.replace(regex, value);
    });

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
