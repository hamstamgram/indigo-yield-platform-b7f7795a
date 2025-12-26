import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.log("[reset-positions] No authorization header");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.log("[reset-positions] Invalid token:", authError?.message);
    return new Response(JSON.stringify({ error: "Invalid token" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
  
  // Verify admin status
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();
  
  if (profileError || !profile?.is_admin) {
    console.log("[reset-positions] Non-admin access attempt by:", profile?.email || user.id);
    return new Response(JSON.stringify({ error: "Admin access required" }), { 
      status: 403, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
  
  console.log(`[reset-positions] Admin ${profile.email} initiating action`);
  
  try {
    const body = await req.json();
    const { action, confirmationCode } = body;
    
    // PREVIEW - returns counts without doing anything
    if (action === "preview") {
      console.log("[reset-positions] Generating preview");
      
      const [positions, performance, aum, transactions, investors] = await Promise.all([
        supabase.from("investor_positions").select("*", { count: "exact", head: true }),
        supabase.from("investor_fund_performance").select("*", { count: "exact", head: true }),
        supabase.from("fund_daily_aum").select("*", { count: "exact", head: true }),
        supabase.from("transactions_v2").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", false),
      ]);
      
      // Get total AUM
      const { data: aumData } = await supabase
        .from("investor_positions")
        .select("current_value");
      const totalAUM = (aumData || []).reduce((sum: number, p: { current_value: number | null }) => 
        sum + Number(p.current_value || 0), 0);
      
      // Get unique funds affected
      const { data: fundsData } = await supabase
        .from("investor_positions")
        .select("fund_id")
        .gt("current_value", 0);
      const uniqueFunds = new Set((fundsData || []).map(f => f.fund_id));
      
      console.log(`[reset-positions] Preview: ${positions.count} positions, ${totalAUM} AUM`);
      
      return new Response(JSON.stringify({
        success: true,
        preview: {
          positions: positions.count || 0,
          performance_records: performance.count || 0,
          aum_records: aum.count || 0,
          transactions: transactions.count || 0,
          investors_affected: investors.count || 0,
          funds_affected: uniqueFunds.size,
          total_aum: totalAUM,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // EXECUTE RESET
    if (action === "execute") {
      if (confirmationCode !== "RESET POSITIONS") {
        console.log("[reset-positions] Invalid confirmation code provided");
        return new Response(JSON.stringify({ 
          error: "Invalid confirmation. Type exactly: RESET POSITIONS" 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      console.log(`[reset-positions] Executing reset by admin ${profile.email}`);
      
      // Call the stored procedure
      const { data, error } = await supabase.rpc("reset_all_investor_positions", {
        p_admin_id: user.id,
        p_confirmation_code: confirmationCode
      });
      
      if (error) {
        console.error("[reset-positions] Reset error:", error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      console.log("[reset-positions] Reset completed successfully:", data);
      
      return new Response(JSON.stringify({
        success: true,
        result: data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // GET RESET HISTORY
    if (action === "history") {
      const { data: history, error: historyError } = await supabase
        .from("position_reset_log")
        .select("*, profiles:admin_user_id(email, first_name, last_name)")
        .order("initiated_at", { ascending: false })
        .limit(20);
      
      if (historyError) {
        console.error("[reset-positions] History error:", historyError);
        return new Response(JSON.stringify({ error: historyError.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        history
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // FULL RESET - Clears ALL transactional data, keeps profiles
    if (action === "full-reset") {
      if (confirmationCode !== "FULL RESET") {
        console.log("[reset-positions] Invalid full reset confirmation code");
        return new Response(JSON.stringify({ 
          error: "Invalid confirmation. Type exactly: FULL RESET" 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      console.log(`[reset-positions] Executing FULL RESET by admin ${profile.email}`);
      
      // Call the comprehensive reset function
      const { data, error } = await supabase.rpc("reset_all_data_keep_profiles", {
        p_admin_id: user.id,
        p_confirmation_code: confirmationCode
      });
      
      if (error) {
        console.error("[reset-positions] Full reset error:", error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      console.log("[reset-positions] Full reset completed successfully:", data);
      
      return new Response(JSON.stringify({
        success: true,
        result: data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ error: "Invalid action. Use: preview, execute, full-reset, or history" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
    
  } catch (error) {
    console.error("[reset-positions] Unexpected error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
