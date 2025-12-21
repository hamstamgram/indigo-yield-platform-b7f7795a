import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  generateMonthlyReportHtml,
  generateFundBlockHtml,
  extractAssetFromFundName,
  validateGeneratedHtml,
} from "../_shared/monthly-report-template-v2.ts";

// Format period ended date as "October 31st, 2025"
function formatPeriodEndedLong(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Add ordinal suffix
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  
  return `${month} ${day}${suffix}, ${year}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create service role client for data operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ============ ADMIN AUTH CHECK (P0 Security Fix) ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth client to verify caller's identity
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth verification failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("Admin check failed - user is not admin:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} generating statement`);
    // ============ END AUTH CHECK ============

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

    if (!fundPerformance || fundPerformance.length === 0) {
      console.log("No fund positions found for investor");
      throw new Error("No fund positions found for this investor");
    }

    // Generate fund blocks for each fund the investor has
    const fundBlocks: string[] = [];
    const assetsIncluded: string[] = [];

    for (const fp of fundPerformance) {
      const fundName = fp.fund_name || "UNKNOWN FUND";
      const asset = extractAssetFromFundName(fundName);
      assetsIncluded.push(asset);

      const fundBlock = generateFundBlockHtml({
        fundName: fundName.toUpperCase(),
        asset,
        mtdBeginning: fp.mtd_beginning_balance,
        qtdBeginning: fp.qtd_beginning_balance,
        ytdBeginning: fp.ytd_beginning_balance,
        itdBeginning: fp.itd_beginning_balance,
        mtdAdditions: fp.mtd_additions,
        qtdAdditions: fp.qtd_additions,
        ytdAdditions: fp.ytd_additions,
        itdAdditions: fp.itd_additions,
        mtdRedemptions: fp.mtd_redemptions,
        qtdRedemptions: fp.qtd_redemptions,
        ytdRedemptions: fp.ytd_redemptions,
        itdRedemptions: fp.itd_redemptions,
        mtdNetIncome: fp.mtd_net_income,
        qtdNetIncome: fp.qtd_net_income,
        ytdNetIncome: fp.ytd_net_income,
        itdNetIncome: fp.itd_net_income,
        mtdEnding: fp.mtd_ending_balance,
        qtdEnding: fp.qtd_ending_balance,
        ytdEnding: fp.ytd_ending_balance,
        itdEnding: fp.itd_ending_balance,
        mtdRor: fp.mtd_rate_of_return,
        qtdRor: fp.qtd_rate_of_return,
        ytdRor: fp.ytd_rate_of_return,
        itdRor: fp.itd_rate_of_return,
      });

      fundBlocks.push(fundBlock);
    }

    // Generate full HTML using V2 template
    const htmlContent = generateMonthlyReportHtml({
      investorName,
      periodEndedLong: formatPeriodEndedLong(mtdEnd),
      fundBlocks,
    });

    // Validate generated HTML
    const validation = validateGeneratedHtml(htmlContent);
    if (!validation.valid) {
      console.warn("HTML validation warnings:", validation.errors);
    }

    console.log(`Generated statement with ${fundBlocks.length} fund blocks for assets: ${assetsIncluded.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        investorName,
        investorEmail,
        assetsIncluded,
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
